import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Use the custom database ID if available
const databaseId = '(default)'; // Defaulting for now, will refine if I find the config source
const db = admin.firestore(); // Firebase Admin usually defaults to (default)

/**
 * DEPRECATED & REFACTORED:
 * Cloud Function Trigger: onReviewWritten
 * Under OLMART, this logic has been fully migrated and unified into the core Express API (/api/reviews) 
 * inside `src/routes/core.ts` to avoid out-of-sync data and double execution.
 * 
 * export const onReviewWritten = functions.firestore
 *   .document('products/{productId}/reviews/{reviewId}')
 *   .onWrite(async (change, context) => { ... });
 */

/**
 * Scheduled Cron Job: aggregateHomepageFeatured
 * Runs daily at 3:00 AM to denormalize top featured products into a single doc.
 * This minimizes Firestore reads on the homepage.
 */
export const aggregateHomepageFeatured = functions.pubsub
  .schedule('0 3 * * *')
  .timeZone('Africa/Algiers')
  .onRun(async (context) => {
    try {
      // 1. Query top 10 products
      // We use 'salesCount' or 'rating' as a metric, assuming 'status' is 'approved'
      const productsSnap = await db.collection('products')
        .where('status', '==', 'approved')
        .orderBy('rating', 'desc')
        .limit(10)
        .get();

      if (productsSnap.empty) {
        console.log('No products found to aggregate.');
        return null;
      }

      // 2. Extract essential data
      const featuredList = productsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          productId: doc.id,
          name: data.name || '',
          price: data.price || 0,
          promoPrice: data.promoPrice || null,
          image: data.image || '',
          category: data.category || '',
          sellerName: data.sellerName || 'Vendeur OLMART',
          rating: data.rating || 0
        };
      });

      // 3. Save to ui_elements/homepage_featured
      await db.collection('ui_elements').doc('homepage_featured').set({
        products: featuredList,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log('Successfully aggregated homepage featured products.');
      return null;
    } catch (error) {
      console.error('Error in aggregateHomepageFeatured:', error);
      return null;
    }
  });

/**
 * Manual Trigger: triggerAggregation
 * Allows admin to manually refresh the homepage cache if needed.
 */
export const triggerAggregationManual = functions.https.onCall(async (data, context) => {
  // Check if admin
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can trigger manual aggregation.');
  }

  try {
    const productsSnap = await db.collection('products')
      .where('status', '==', 'approved')
      .orderBy('rating', 'desc')
      .limit(10)
      .get();

    const featuredList = productsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        productId: doc.id,
        name: data.name || '',
        price: data.price || 0,
        promoPrice: data.promoPrice || null,
        image: data.image || '',
        category: data.category || '',
        sellerName: data.sellerName || 'Vendeur OLMART',
        rating: data.rating || 0
      };
    });

    await db.collection('ui_elements').doc('homepage_featured').set({
      products: featuredList,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, count: featuredList.length };
  } catch (error) {
    console.error('Manual aggregation failed:', error);
    throw new functions.https.HttpsError('internal', 'Aggregation failed.');
  }
});

/**
 * Scheduled Cron Job: updateGlobalTrending
 * Runs every 12 hours to update the global trending pool for guest users.
 */
export const updateGlobalTrending = functions.pubsub
  .schedule('0 */12 * * *')
  .timeZone('Africa/Algiers')
  .onRun(async (context) => {
    try {
      // 1. Query top dynamic products (based on sales or rating)
      const productsSnap = await db.collection('products')
        .where('status', '==', 'approved')
        .orderBy('rating', 'desc')
        .limit(20)
        .get();

      if (productsSnap.empty) return null;

      // 2. Map to lightweight Recommendation interface
      const trendingProducts = productsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          price: data.price || 0,
          promoPrice: data.promoPrice || null,
          image: data.image || '',
          category: data.category || '',
          sellerName: data.sellerName || 'Olma Seller'
        };
      });

      // 3. Atomically update the global trending doc
      await db.collection('ui_elements').doc('global_trending').set({
        products: trendingProducts,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log('Global trending recommendations updated.');
      return null;
    } catch (error) {
      console.error('Error updating global trending:', error);
      return null;
    }
  });

/**
 * Logic Module: Personalization Engine
 * This function updates user-specific recommendations based on their browsing categories.
 * Could be triggered by a PubSub message or a background task.
 */
export const syncUserRecommendations = functions.firestore
  .document('users/{userId}/habits/data')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    
    // FINOPS FIX: Stop condition to prevent infinite loops and unnecessary executions
    // Only execute if favoriteCategories actually changed
    const beforeData = change.before.exists ? change.before.data() : null;
    const afterData = change.after.exists ? change.after.data() : null;
    
    if (beforeData && afterData && 
        JSON.stringify(beforeData.favoriteCategories) === JSON.stringify(afterData.favoriteCategories)) {
      console.log(`[FINOPS] No change in categories for ${userId}, skipping update.`);
      return null;
    }

    if (!afterData || !afterData.favoriteCategories || afterData.favoriteCategories.length === 0) {
      return null;
    }

    try {
      const favCategories = afterData.favoriteCategories.slice(0, 3); // Take top 3 categories
      
      // Query top products in these categories
      const productsSnap = await db.collection('products')
        .where('status', '==', 'approved')
        .where('category', 'in', favCategories)
        .limit(10)
        .get();

      if (productsSnap.empty) return null;

      const recommendations = productsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          price: data.price || 0,
          promoPrice: data.promoPrice || null,
          image: data.image || '',
          category: data.category || '',
          sellerName: data.sellerName || 'Olma Seller'
        };
      });

      // Update the user's personal recommendation document (Cost: 1 write)
      await db.collection('user_recommendations').doc(userId).set({
        userId,
        products: recommendations,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Personal recommendations updated for user ${userId}`);
      return null;
    } catch (error) {
      console.error(`Error generating recommendations for user ${userId}:`, error);
      return null;
    }
  });

/**
 * Transactional Purchase Function: purchaseFlashSaleItem
 * Uses Firestore transactions to prevent overselling highly contested items.
 */
export const purchaseFlashSaleItem = functions.https.onCall(async (data, context) => {
  // 1. Auth check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { productId, campaignId } = data;
  if (!productId || !campaignId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing productId or campaignId.');
  }

  const userId = context.auth.uid;
  const flashSaleRef = db.collection('ui_elements').doc('active_flash_sale');

  try {
    return await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(flashSaleRef);
      if (!snap.exists) {
        throw new functions.https.HttpsError('not-found', 'Flash sale campaign not found.');
      }

      const flashData = snap.data() as any;
      
      // 2. Validate timing
      const now = admin.firestore.Timestamp.now();
      if (now < flashData.startTime || now >= flashData.endTime || !flashData.isActive) {
        throw new functions.https.HttpsError('failed-precondition', 'This flash sale is not active.');
      }

      // 3. Find product in array and check stock
      const products = flashData.products || [];
      const productIdx = products.findIndex((p: any) => p.id === productId);

      if (productIdx === -1) {
        throw new functions.https.HttpsError('not-found', 'Product not in this flash sale.');
      }

      const product = products[productIdx];
      if (product.remainingStock <= 0) {
        throw new functions.https.HttpsError('resource-exhausted', 'Item out of stock.');
      }

      // NEW: Deduplication Check (1 purchase per user per campaign)
      const existingPurchase = await transaction.get(
        db.collection('orders')
          .where('buyerId', '==', userId)
          .where('campaignId', '==', campaignId)
          .where('flashSaleProductId', '==', productId)
          .limit(1)
      );

      if (!existingPurchase.empty) {
        throw new functions.https.HttpsError('already-exists', 'You have already purchased this item in this flash sale.');
      }

      // 4. Atomic decrement
      product.remainingStock -= 1;
      transaction.update(flashSaleRef, { products });

      // 5. Create Secured Order
      const orderRef = db.collection('orders').doc();
      transaction.set(orderRef, {
        buyerId: userId,
        sellerId: product.sellerId,
        sellerName: product.sellerName,
        items: [{
          productId: product.id,
          name: product.name,
          priceAtPurchase: product.promoPrice,
          originalPrice: product.price,
          quantity: 1,
          image: product.image
        }],
        flashSaleProductId: product.id,
        campaignId: campaignId,
        isFlashSale: true,
        status: 'PENDING_PAYMENT',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        total: product.promoPrice,
        currency: 'DA'
      });

      return { success: true, orderId: orderRef.id };
    });
  } catch (error: any) {
    console.error('Flash sale transaction failed:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'Purchase failed.');
  }
});

/**
 * Scheduled Cron Job: cleanupExpiredFlashSale
 * Deactivates campaigns that have reached their endTime.
 */
export const cleanupExpiredFlashSale = functions.pubsub
  .schedule('every 5 minutes')
  .timeZone('Africa/Algiers')
  .onRun(async (context) => {
    const flashSaleRef = db.collection('ui_elements').doc('active_flash_sale');
    const snap = await flashSaleRef.get();
    
    if (!snap.exists) return null;
    
    const data = snap.data() as any;
    const now = admin.firestore.Timestamp.now();
    
    if (data.isActive && now >= data.endTime) {
      await flashSaleRef.update({ 
        isActive: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('Flash sale deactivated due to expiry.');
    }
    
    return null;
  });

/**
 * Flash Sale Stock Reconciliation logic.
 * Every 10 minutes, checks for 'PENDING_PAYMENT' flash sale orders older than 15 minutes.
 * Cancels them and restores the stock to the singleton.
 */
export const reconcileFlashSaleStock = functions.pubsub
  .schedule('every 10 minutes')
  .timeZone('Africa/Algiers')
  .onRun(async (context) => {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const expiredOrdersSnap = await db.collection('orders')
      .where('isFlashSale', '==', true)
      .where('status', '==', 'PENDING_PAYMENT')
      .where('createdAt', '<=', fifteenMinsAgo)
      .limit(50)
      .get();

    if (expiredOrdersSnap.empty) return null;

    const flashSaleRef = db.collection('ui_elements').doc('active_flash_sale');

    return await db.runTransaction(async (transaction) => {
      const flashSnap = await transaction.get(flashSaleRef);
      if (!flashSnap.exists) return null;
      
      const flashData = flashSnap.data() as any;
      const products = flashData.products || [];
      
      for (const orderDoc of expiredOrdersSnap.docs) {
        const orderData = orderDoc.data();
        const flashProductId = orderData.flashSaleProductId;
        
        // 1. Cancel the order
        transaction.update(orderDoc.ref, { 
          status: 'EXPIRED_UNPAID',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Restore stock to singleton if product found
        const pIdx = products.findIndex((p: any) => p.id === flashProductId);
        if (pIdx !== -1) {
          products[pIdx].remainingStock += 1;
        }
      }

      transaction.update(flashSaleRef, { products });
      console.log(`Reconciled ${expiredOrdersSnap.size} flash sale orders.`);
      return null;
    });
  });

/**
 * Callable Function: addToExceptionSelection
 * Restricted to admins. Manually adds a product to the curated "Exception Selection".
 */
export const addToExceptionSelection = functions.https.onCall(async (data, context) => {
  // 1. Authorization check: Must be an admin
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Only administrators can modify the Exception Selection.');
  }

  const { productId, premiumTier = 'silver' } = data;
  if (!productId) {
    throw new functions.https.HttpsError('invalid-argument', 'The productId is required.');
  }

  try {
    const productSnap = await db.collection('products').doc(productId).get();
    if (!productSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Product not found.');
    }

    const pData = productSnap.data() as any;
    const premiumProduct = {
      id: productId,
      name: pData.name || '',
      price: pData.price || 0,
      promoPrice: pData.promoPrice || null,
      image: pData.image || '',
      category: pData.category || '',
      sellerName: pData.sellerName || 'Olma Seller',
      premiumTier: premiumTier
    };

    const docRef = db.collection('ui_elements').doc('selection_exception');
    
    // Atomically append to the array
    await docRef.update({
      products: admin.firestore.FieldValue.arrayUnion(premiumProduct),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: 'Product added to Premium Selection.' };
  } catch (error: any) {
    console.error('Error adding to exception selection:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Update failed.');
  }
});

/**
 * Scheduled Cron Job: automatedPremiumSweep
 * Runs weekly to refresh the curated list based on performance and flags.
 */
export const automatedPremiumSweep = functions.pubsub
  .schedule('0 4 * * 1') // Every Monday at 4:00 AM
  .timeZone('Africa/Algiers')
  .onRun(async (context) => {
    try {
      // Find products that are high-performing or flagged as premium
      const productsSnap = await db.collection('products')
        .where('isPremium', '==', true)
        .where('status', '==', 'approved')
        .where('rating', '>=', 4.5)
        .limit(30)
        .get();

      if (productsSnap.empty) return null;

      const premiumSelection = productsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          price: data.price || 0,
          promoPrice: data.promoPrice || null,
          image: data.image || '',
          category: data.category || '',
          sellerName: data.sellerName || 'Olma Seller',
          premiumTier: data.premiumTier || 'silver'
        };
      });

      await db.collection('ui_elements').doc('selection_exception').set({
        products: premiumSelection,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log('Automated Premium Selection sweep completed.');
      return null;
    } catch (error) {
      console.error('Error in automated premium sweep:', error);
      return null;
    }
  });

