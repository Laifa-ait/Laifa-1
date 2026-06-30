import { Request, Response, Router } from "express";
import { admin, db } from "../../server/services/firebase-admin";
import { authenticateToken, authorizeAdmin } from "../../server/middlewares/auth";
import validator from "validator";

export interface AuthenticatedRequest extends Request {
  user?: any;
  file?: any;
  files?: any;
}

const router = Router();

// --- Dispute Actions & Wallet ---
router.post("/api/buyer/orders/dispute", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const buyerId = req.user.uid;
  const { orderId, disputeReason, disputeDetails, disputePhotos } = req.body;

  if (!orderId || !disputeReason) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    await db.runTransaction(async (t: any) => {
      const orderRef = db.collection("orders").doc(orderId);
      const orderSnap = await t.get(orderRef);

      if (!orderSnap.exists) {
        throw new Error("Commande introuvable.");
      }

      const orderData = orderSnap.data() as any;

      // Only the buyer can open a dispute
      if (orderData.userId !== buyerId && orderData.buyerId !== buyerId) {
        throw new Error("Accès refusé.");
      }

      if (orderData.status !== "delivered") {
        throw new Error("Impossible d'ouvrir un litige sur une commande non livrée.");
      }

      if (orderData.disputeRequest) {
        throw new Error("Un litige est déjà ouvert pour cette commande.");
      }

      // Identify the seller
      const targetSellerUid = (orderData.sellerIds && orderData.sellerIds[0]) || orderData.sellerId;
      if (!targetSellerUid) throw new Error("Vendeur introuvable pour ce litige.");

      // Calculate amount to freeze
      let globalCommissionRate = 10;
      const commDoc = await t.get(db.collection("settings").doc("commission"));
      if (commDoc.exists) {
         globalCommissionRate = commDoc.data()?.globalRate ?? 10;
      }
      
      const sellerRef = db.collection("users").doc(targetSellerUid);
      const sellerSnap = await t.get(sellerRef);
      const sellerData = sellerSnap.exists ? sellerSnap.data() : {};
      
      const commissionRate = orderData.commissionRateApplied ?? sellerData?.commissionRate ?? globalCommissionRate;
      const subtotal = orderData.subtotal || 0;
      const commissionToDeduct = (subtotal * commissionRate) / 100;
      const amountToFreeze = (orderData.total || 0) - commissionToDeduct;

      if (amountToFreeze > 0) {
         // Freeze the funds! (Deduct from wallet, add to locked)
         t.update(sellerRef, {
            walletBalance: admin.firestore.FieldValue.increment(-amountToFreeze),
            lockedBalance: admin.firestore.FieldValue.increment(amountToFreeze),
         });
      }

      const disputeObj = {
        status: 'open',
        reason: disputeReason,
        details: disputeDetails || '',
        photos: disputePhotos || [],
        frozenAmount: amountToFreeze,
        createdAt: new Date().toISOString()
      };

      t.update(orderRef, {
        status: 'dispute_open',
        disputeRequest: disputeObj,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const notifRef = db.collection("user_notifications").doc();
      t.set(notifRef, {
        recipientId: targetSellerUid,
        title: {
          fr: "Alerte de Litige",
          ar: "تنبيه نزاع",
          en: "Dispute Alert"
        },
        message: {
          fr: `Le client a ouvert un litige pour la commande #${orderId.substring(0,8)}. Vos fonds (${amountToFreeze} DA) sont gelés en attendant la résolution.`,
          ar: `قام العميل بفتح نزاع للطلب #${orderId.substring(0,8)}. تم تجميد أموالك (${amountToFreeze} دينار) لحين الحل.`,
          en: `The customer opened a dispute for order #${orderId.substring(0,8)}. Your funds (${amountToFreeze} DZD) are frozen pending resolution.`
        },
        type: "dispute_opened",
        orderId: orderId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Dispute error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post(
  "/api/admin/orders/:orderId/resolve-dispute",
  authenticateToken,
  authorizeAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const { orderId } = req.params;
    const { resolution, refundAmount = 0 } = req.body; // resolution = 'refund_to_wallet' | 'close'

    try {
      const orderRef = db.collection("orders").doc(orderId);
      
      let globalCommissionRate = 10;
      try {
         const commDoc = await db.collection("settings").doc("commission").get();
         if (commDoc && commDoc.exists) {
            globalCommissionRate = commDoc.data()?.globalRate ?? 10;
         }
      } catch (err) {
         console.warn("Could not fetch global commission rate", err);
      }

      await db.runTransaction(async (transaction: any) => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) throw new Error("Order not found");
        const orderData: any = orderDoc.data();

        if (resolution === "refund_to_wallet" && refundAmount > 0) {
          const buyerRef = db.collection("users").doc(orderData.userId); // userId instead of buyerId to match our schema
          const buyerDoc = await transaction.get(buyerRef);
          const currentBalance = buyerDoc.data()?.walletBalance || 0;

          transaction.update(buyerRef, {
            walletBalance: currentBalance + refundAmount,
          });

          // Debit vendor (Seller) if they were previously credited (anti-fraud double disbursement prevention)
          const targetSellerUid = orderData?.sellerIds?.[0] || orderData?.sellerId;
          if (targetSellerUid) {
            const sellerRef = db.collection("users").doc(targetSellerUid);
            const sellerDoc = await transaction.get(sellerRef);
            if (sellerDoc.exists) {
              const sellerData = sellerDoc.data();
              const commissionRate = orderData.commissionRateApplied ?? sellerData?.commissionRate ?? globalCommissionRate;
              const subtotal = orderData.subtotal || 0;
              const commissionToDeduct = (subtotal * commissionRate) / 100;
              const amountToDebit = (orderData.total || 0) - commissionToDeduct;
              
              // The funds were frozen when the dispute was opened. We must deduct from lockedBalance.
              // If the dispute was opened before the freeze feature, frozen amount might be 0, so we deduct from walletBalance.
              const frozenAmount = orderData.disputeRequest?.frozenAmount || 0;
              const currentSellerBalance = sellerData?.walletBalance || 0;
              const currentLockedBalance = sellerData?.lockedBalance || 0;
              
              // 🔴 SÉCURITÉ CRITIQUE : Pénalité du Trust Score (-10) car litige perdu
              const currentTrustScore = sellerData?.trustScore ?? 50;
              const newTrustScore = Math.max(0, currentTrustScore - 10);

              if (frozenAmount > 0) {
                 transaction.update(sellerRef, {
                   lockedBalance: currentLockedBalance - frozenAmount,
                   walletBalance: currentSellerBalance + (frozenAmount - amountToDebit),
                   trustScore: newTrustScore
                 });
              } else {
                 transaction.update(sellerRef, {
                   walletBalance: currentSellerBalance - amountToDebit,
                   trustScore: newTrustScore
                 });
              }

              // Log seller debit transaction
              const sLogRef = db.collection("wallet_transactions").doc();
              transaction.set(sLogRef, {
                userId: targetSellerUid,
                orderId: orderId,
                amount: -amountToDebit,
                type: "dispute_debit",
                description: `Débit suite à litige régularisé commande #${orderId.substring(0, 8)}`,
                createdAt: new Date().toISOString(),
              });

              // Inform seller they lost the dispute AND their trust score dropped
              const notificationRef = db.collection("notifications").doc();
              transaction.set(notificationRef, {
                userId: targetSellerUid,
                title: "Litige résolu en faveur du client",
                message: `La commande #${orderId.substring(0, 8)} a été remboursée. Vous avez été débité(e) et votre Trust Score a baissé de 10 points. Si c'est une erreur, ouvrez une contestation via le Support.`,
                type: "ALERT",
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }

          transaction.update(orderRef, {
            status: "REFUNDED",
            "returnRequest.status": "completed",
            disputeStatus: "resolved_refunded",
            refundedAmount: refundAmount,
            refundMethod: "Olma Wallet",
            updatedAt: new Date().toISOString(),
          });

          // Create a wallet transaction log
          const logRef = db.collection("wallet_transactions").doc();
          transaction.set(logRef, {
            userId: orderData.userId,
            orderId: orderId,
            amount: refundAmount,
            type: "refund",
            description: `Remboursement commande #${orderId.substring(0, 8)} (Litige clos)`,
            createdAt: new Date().toISOString(),
          });
        } else {
          // If closed in favor of seller, release frozen funds
          const frozenAmount = orderData.disputeRequest?.frozenAmount || 0;
          if (frozenAmount > 0) {
            const targetSellerUid = orderData?.sellerIds?.[0] || orderData?.sellerId;
            if (targetSellerUid) {
               const sellerRef = db.collection("users").doc(targetSellerUid);
               transaction.update(sellerRef, {
                 lockedBalance: admin.firestore.FieldValue.increment(-frozenAmount),
                 walletBalance: admin.firestore.FieldValue.increment(frozenAmount)
               });
            }
          }

          transaction.update(orderRef, {
            status: "DISPUTE_RESOLVED",
            "returnRequest.status": "rejected",
            "disputeRequest.status": "resolved_rejected",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Resolve Dispute Error:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
