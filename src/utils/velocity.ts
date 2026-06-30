import { admin, db } from "../../server/services/firebase-admin";

export async function checkSellerVelocityLimit(sellerId: string) {
  try {
    const ordersSnap = await db.collection("orders")
      .where("sellerIds", "array-contains", sellerId)
      .orderBy("createdAt", "desc")
      .limit(300)
      .get();
    
    const pendingStatuses = ['pending', 'confirmed', 'preparing', 'processing'];
    let pendingCount = 0;
    
    for (const doc of ordersSnap.docs) {
      const orderData = doc.data();
      const status = (orderData.status || '').toLowerCase();
      if (pendingStatuses.includes(status)) {
        const paymentMethod = (orderData.paymentMethod || '').toLowerCase();
        const paymentStatus = (orderData.paymentStatus || '').toLowerCase();
        
        // 1. If it's prepaid (Wallet, Card, etc.), it's safe to count towards velocity limit
        if (paymentMethod === 'wallet' || paymentStatus === 'paid') {
          pendingCount++;
          continue;
        }

        // 2. Otherwise (COD or Split COD), check if the buyer is established to prevent competitor spam DoS
        const buyerId = orderData.userId || orderData.buyerId;
        if (buyerId) {
          // Fetch buyer's orders history
          const buyerOrdersSnap = await db.collection("orders")
            .where("userId", "==", buyerId)
            .orderBy("createdAt", "desc")
            .limit(20)
            .get();
          
          const hasSuccessfulPurchase = buyerOrdersSnap.docs.some(d => {
            const dData = d.data();
            const dStatus = (dData.status || '').toLowerCase();
            return ['shipped', 'delivered', 'completed', 'received'].includes(dStatus);
          });

          // Fetch buyer's profile creation date for age check as a fallback
          const buyerSnap = await db.collection("users").doc(buyerId).get();
          const buyerData = buyerSnap.exists ? buyerSnap.data() : null;
          let isOldAccount = false;
          if (buyerData && buyerData.createdAt) {
            const createdAtTime = buyerData.createdAt.toDate 
              ? buyerData.createdAt.toDate().getTime() 
              : new Date(buyerData.createdAt).getTime();
            isOldAccount = (Date.now() - createdAtTime) > 2 * 24 * 60 * 60 * 1000; // Account > 2 days old
          }

          if (hasSuccessfulPurchase || isOldAccount) {
            pendingCount++;
          } else {
            (process.env.NODE_ENV === 'development' ? console.log : function(){})(`[VELOCITY DOS DEFENSE] Ignored unverified/guest/new COD order ${doc.id} for seller ${sellerId} to prevent malicious shutdown attacks.`);
          }
        } else {
          // Anonymous or untracked buyer accounts are ignored from velocity counts to block bots
          (process.env.NODE_ENV === 'development' ? console.log : function(){})(`[VELOCITY DOS DEFENSE] Ignored untracked buyer order ${doc.id} for seller ${sellerId} to prevent malicious shutdowns.`);
        }
      }
    }
    
    const sellerRef = db.collection("users").doc(sellerId);
    const sellerSnap = await sellerRef.get();
    if (!sellerSnap.exists) return;
    const sellerData = sellerSnap.data();
    
    if (pendingCount > 5) {
      await sellerRef.update({
        isActive: false,
        is_active: false,
        velocitySuspended: true,
        bgSuspended_reason: `Alerte Rouge : Limite de vélocité dépassée (${pendingCount} commandes en attente non expédiées).`
      });
      
      await db.collection("admin_alerts").add({
        type: 'velocity_kill_switch',
        sellerId,
        shopName: sellerData?.shopName || sellerData?.displayName || sellerId,
        pendingCount,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        resolved: false
      });
      (process.env.NODE_ENV === 'development' ? console.log : function(){})(`[KILL SWITCH] Suspended seller ${sellerId} (${pendingCount} pending orders).`);
    } else if (pendingCount <= 5 && sellerData?.velocitySuspended) {
      await sellerRef.update({
        isActive: true,
        is_active: true,
        velocitySuspended: false,
        bgSuspended_reason: null
      });
      (process.env.NODE_ENV === 'development' ? console.log : function(){})(`[KILL SWITCH] Realigned seller ${sellerId} (${pendingCount} pending orders).`);
    }
  } catch (err) {
    console.error("Error in checkSellerVelocityLimit:", err);
  }
}
