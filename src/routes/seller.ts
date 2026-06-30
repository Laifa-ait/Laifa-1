import { Request, Response, Router } from "express";
import { admin, db } from "../../server/services/firebase-admin";
import { ai } from "../config/gemini";
import { authenticateToken, authorizeSeller } from "../../server/middlewares/auth";
import rateLimit from "express-rate-limit";
import fetch from "node-fetch";

export interface AuthenticatedRequest extends Request {
  user?: any;
  file?: any;
  files?: any;
}

const router = Router();

const imageAnalyzeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  keyGenerator: (req: any) => req.user?.uid || req.ip,
  validate: { ip: false },
  message: { error: "Limite d'analyse d'images atteinte. Réessayez dans une minute." }
});

// --- Checkout & Order Status Updates ---
router.post(
  "/api/seller/orders/status",
  authenticateToken,
  authorizeSeller,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Non authentifié" });
    const { orderId, newStatus, carrier, trackingNumber } = req.body;
    const sellerId = req.user.uid;

    if (!orderId || !newStatus) {
      return res.status(400).json({ error: "orderId and newStatus are required" });
    }

    try {
      const orderRef = db.collection("orders").doc(orderId);
      let globalCommissionRate = 10;
      try {
         const commDoc = await db.collection("settings").doc("commission").get();
         if (commDoc && commDoc.exists) {
            globalCommissionRate = commDoc.data()?.globalRate ?? 10;
         }
      } catch (err) {
         console.warn("Could not fetch global commission rate, defaulting to 10%", err);
      }

      await db.runTransaction(async (t: any) => {
        const orderSnap = await t.get(orderRef);
        if (!orderSnap.exists) throw new Error("Commande introuvable");
        const oData = orderSnap.data() as any;

        // Security check: Only the seller assigned to this order can update its status
        const isAuthorizedSeller = (oData.sellerIds && oData.sellerIds.includes(sellerId)) || (oData.sellerId === sellerId);
        if (!isAuthorizedSeller) {
          throw new Error("Vous n'êtes pas autorisé à modifier cette commande");
        }

        const validTransitions: { [key: string]: string[] } = {
          pending: ["confirmed", "cancelled_by_seller"],
          confirmed: ["shipped", "cancelled_by_seller"],
          shipped: ["delivered", "failed_delivery"],
          delivered: [],
          failed_delivery: ["shipped"], // Retry mechanism
          cancelled_by_seller: [],
          cancelled_by_client: [],
        };

        const currentStatus = oData.status || "pending";
        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(newStatus)) {
          throw new Error(
            `Transition de statut invalide de ${currentStatus} vers ${newStatus}`,
          );
        }

        const updates: any = {
          status: newStatus,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (newStatus === "shipped") {
          updates.shippingDetails = {
            carrier: carrier || oData.shippingDetails?.carrier || "Olma Express",
            trackingNumber: trackingNumber || oData.shippingDetails?.trackingNumber || `OLM-${Math.floor(100000 + Math.random() * 900000)}`,
            shippedAt: new Date().toISOString(),
          };
        }

        if (newStatus === "delivered") {
          updates.deliveredAt = new Date().toISOString();
          updates.paymentStatus = "completed";

          const sellerRef = db.collection("users").doc(sellerId);
          const sellerSnap = await t.get(sellerRef);
          const sellerData = sellerSnap.exists ? sellerSnap.data() : {};

          // Use the commission rate set on the seller or the global setting, falling back to 10
          const commissionRate = oData.commissionRateApplied ?? sellerData?.commissionRate ?? globalCommissionRate;
          const subtotal = oData.subtotal || 0;
          const commissionToDeduct = (subtotal * commissionRate) / 100;
          const finalDisbursement = (oData.total || 0) - commissionToDeduct;

          // Increment wallet
          t.update(sellerRef, {
            walletBalance: admin.firestore.FieldValue.increment(finalDisbursement),
          });

          // Log transaction
          const walletTxRef = db.collection("wallet_transactions").doc();
          t.set(walletTxRef, {
            userId: sellerId,
            orderId,
            amount: finalDisbursement,
            type: "credit",
            description: `Paiement pour commande #${orderId.substring(0, 8)} après déduction de commission (${commissionRate}%)`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "completed",
          });

          // System Commission Ledger Log (Transparence de l'infrastructure OLMART)
          const adminLedgerRef = db.collection("system_commission_ledger").doc();
          t.set(adminLedgerRef, {
             orderId,
             sellerId,
             totalOrderAmount: oData.total || 0,
             subtotal,
             commissionRate,
             commissionAmount: commissionToDeduct,
             disbursedAmount: finalDisbursement,
             createdAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Buyer cashback accumulation
          if (oData.userId) {
             const buyerRef = db.collection("users").doc(oData.userId);
             const subtotal = oData.subtotal || 0;
             const earnedCashback = Math.round(subtotal * 0.01); // 1% cashback on delivered subtotal
             if (earnedCashback > 0) {
                t.update(buyerRef, {
                   cashbackBalance: admin.firestore.FieldValue.increment(earnedCashback)
                });
                
                // Log cashback transaction
                const cashbackTxRef = db.collection("cashback_transactions").doc();
                t.set(cashbackTxRef, {
                  userId: oData.userId,
                  orderId,
                  amount: earnedCashback,
                  type: "earning",
                  description: `Cashback gagné pour la commande #${orderId.substring(0, 8)}`,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  status: "completed"
                });
             }
          }
        }

        if (newStatus === "cancelled_by_seller") {
          // Restore Stock
          const productUpdates = new Map<string, any>();
          for (const item of oData.items || []) {
            if (!productUpdates.has(item.id)) {
              const pSnap = await t.get(db.collection("products").doc(item.id));
              if (pSnap.exists) productUpdates.set(item.id, pSnap.data());
            }
            const pData = productUpdates.get(item.id);
            if (pData) {
              if (item.selectedVariant) {
                pData.variants = (pData.variants || []).map((v: any) => {
                  if (v.name === item.selectedVariant) {
                    return {
                      ...v,
                      stock: Number(v.stock || 0) + item.quantity,
                    };
                  }
                  return v;
                });
                pData.stock = pData.variants.reduce(
                  (acc: number, curr: any) => acc + Math.max(0, Number(curr.stock) || 0),
                  0,
                );
                pData.hasOutOfStockVariants = pData.variants.some(
                  (v: any) => Math.max(0, Number(v.stock) || 0) <= 0,
                );
              } else {
                pData.stock = (pData.stock || 0) + item.quantity;
              }
            }
          }

          for (const [pId, pData] of productUpdates.entries()) {
            t.update(db.collection("products").doc(pId), pData);
          }

          // Refund Buyer Wallet if deducted
          if (oData.userId && oData.walletDeducted > 0) {
             const buyerRef = db.collection("users").doc(oData.userId);
             t.update(buyerRef, {
                walletBalance: admin.firestore.FieldValue.increment(oData.walletDeducted)
             });
             const walletTxRef = db.collection("wallet_transactions").doc();
             t.set(walletTxRef, {
               userId: oData.userId,
               orderId,
               amount: oData.walletDeducted,
               type: 'refund',
               description: `Remboursement suite à annulation de commande #${orderId} par le vendeur`,
               createdAt: admin.firestore.FieldValue.serverTimestamp(),
               status: 'completed'
             });
          }
          if (oData.userId && oData.cashbackApplied > 0) {
             const buyerRef = db.collection("users").doc(oData.userId);
             t.update(buyerRef, {
                cashbackBalance: admin.firestore.FieldValue.increment(oData.cashbackApplied)
             });
          }
        }

        t.update(orderRef, updates);

        // Add order status update log
        const logRef = orderRef.collection("order_logs").doc();
        t.set(logRef, {
          status: newStatus,
          type: "status_update",
          date: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Enqueue a notification for the buyer
        if (oData.userId) {
          const statusMessages: { [key: string]: { fr: string, ar: string, en: string } } = {
            confirmed: {
              fr: `Votre commande #${orderId.substring(0,8)} a été confirmée par le vendeur.`,
              ar: `تم تأكيد طلبك #${orderId.substring(0,8)} من قبل البائع.`,
              en: `Your order #${orderId.substring(0,8)} has been confirmed by the seller.`
            },
            shipped: {
              fr: `Votre commande #${orderId.substring(0,8)} a été expédiée. Suivez-la avec le numéro ${updates.shippingDetails?.trackingNumber}.`,
              ar: `تم شحن طلبك #${orderId.substring(0,8)}. تتبعه بالرقم ${updates.shippingDetails?.trackingNumber}.`,
              en: `Your order #${orderId.substring(0,8)} has been shipped. Track it using number ${updates.shippingDetails?.trackingNumber}.`
            },
            delivered: {
              fr: `Votre commande #${orderId.substring(0,8)} a été livrée !`,
              ar: `تم توصيل طلبك #${orderId.substring(0,8)}!`,
              en: `Your order #${orderId.substring(0,8)} has been delivered!`
            },
            failed_delivery: {
              fr: `La livraison de votre commande #${orderId.substring(0,8)} a échoué. Le vendeur tentera de vous recontacter.`,
              ar: `فشلت عملية توصيل طلبك #${orderId.substring(0,8)}. سيحاول البائع الاتصال بك مجددًا.`,
              en: `Delivery for your order #${orderId.substring(0,8)} failed. The seller will attempt to contact you.`
            },
            cancelled_by_seller: {
              fr: `Votre commande #${orderId.substring(0,8)} a été annulée par le vendeur.`,
              ar: `تم إلغاء طلبك #${orderId.substring(0,8)} من قبل البائع.`,
              en: `Your order #${orderId.substring(0,8)} was cancelled by the seller.`
            }
          };

          const msg = statusMessages[newStatus];
          if (msg) {
             const notifRef = db.collection("user_notifications").doc();
             t.set(notifRef, {
               recipientId: oData.userId,
               title: {
                 fr: "Mise à jour de commande",
                 ar: "تحديث الطلب",
                 en: "Order Update"
               },
               message: msg,
               type: `order_${newStatus}`,
               orderId,
               read: false,
               createdAt: admin.firestore.FieldValue.serverTimestamp()
             });
          }
        }
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Order update error:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/api/seller/analyze-image",
  authenticateToken,
  authorizeSeller,
  imageAnalyzeLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: "imageUrl requis" });

    try {
      const responseImage = await fetch(imageUrl);
      if (!responseImage.ok) {
        return res.status(400).json({ error: "Failed to download image" });
      }
      const buffer = await responseImage.arrayBuffer();
      const base64Data = Buffer.from(buffer).toString("base64");
      const mimeType =
        responseImage.headers.get("content-type") || "image/jpeg";

      const prompt = `Perform OCR on this image. Check if you can find any text that resembles:
    1. A phone number (e.g. starting with 05, 06, 07, 02, 03, 04, 09 and having 10 digits).
    2. Mentions of "WhatsApp", "Viber", "Telegram", "Instagram" to contact directly.
    Output ONLY a JSON with this format:
    {
      "safe": true_if_no_contact_info_found_else_false,
      "reason": "If unsafe, explain what was found (number, word, etc), else empty string"
    }`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt },
        ],
        config: { responseMimeType: "application/json" }
      });

      const responseText = result.text || "{}";
      const jsonStr = responseText.match(/\{[\s\S]*\}/)?.[0] || responseText;
      const resultJson = JSON.parse(jsonStr);

      res.json(resultJson);
    } catch (error: any) {
      console.error("OCR Check Error:", error);
      res.json({ safe: true, reason: "Check failed, safely bypassed" });
    }
  },
);

router.post(
  "/api/seller/withdraw",
  authenticateToken,
  authorizeSeller,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sellerId = req.user.uid;
      const { amount, method, bankInfo } = req.body;

      if (
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        amount < 2000
      )
        throw new Error("Le montant minimum est de 2000 DA.");

      await db.runTransaction(async (transaction: any) => {
        const userRef = db.collection("users").doc(sellerId);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) throw new Error("Vendeur introuvable");
        const userData = userSnap.data();

        if (userData.walletBalance < amount) {
          throw new Error("Solde insuffisant.");
        }

        // Deduct from walletBalance and add to lockedBalance
        transaction.update(userRef, {
          walletBalance: admin.firestore.FieldValue.increment(-amount),
          lockedBalance: admin.firestore.FieldValue.increment(amount),
        });

        const withdrawalRef = db.collection("withdrawals").doc();
        transaction.set(withdrawalRef, {
          sellerId,
          sellerName: userData.displayName || userData.shopName || "",
          amount,
          method,
          bankInfo,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post("/api/seller/ocr", authenticateToken, authorizeSeller, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentUrl, base64Data: reqBase64, mimeType: reqMimeType, type } = req.body; // type = 'ID' | 'RC'
    
    if (!type || (!documentUrl && !reqBase64)) {
      return res.status(400).json({ error: "Missing document or type" });
    }

    let base64Data = reqBase64;
    let mimeType = reqMimeType || 'image/jpeg';

    if (documentUrl && !base64Data) {
       const imageResp = await fetch(documentUrl);
       if (!imageResp.ok) throw new Error("Failed to fetch image");
       const arrayBuffer = await imageResp.arrayBuffer();
       const buffer = Buffer.from(arrayBuffer);
       base64Data = buffer.toString('base64');
       mimeType = imageResp.headers.get('content-type') || 'image/jpeg';
    }

    let prompt = "";
    if (type === "ID") {
       prompt = `Extraire les informations suivantes de cette pièce d'identité algérienne (Carte Nationale, Permis ou Passeport). 
Retourne UNIQUEMENT un objet JSON valide avec la clé suivante :
- documentNumber (Numéro d'Identification Nationale ou NIF)
`;
    } else {
       prompt = `Extraire les informations de ce Registre de Commerce algérien. 
Retourne UNIQUEMENT un objet JSON valide avec la clé suivante :
- rcNumber (Numéro du registre de commerce complet)
`;
    }

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }] }
      ]
    });

    const responseText = result.text || "{}";
    let extractedJson = responseText;
    const match = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) extractedJson = match[1];
    
    let parsed = {};
    try { parsed = JSON.parse(extractedJson); } catch(e) {}

    res.json({ result: parsed });
  } catch (err: any) {
    console.error("Seller OCR error:", err);
    res.status(500).json({ error: "Failed to process OCR" });
  }
});

export default router;
