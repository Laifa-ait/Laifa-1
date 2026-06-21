import { Router } from "express";
import { admin, db } from "../config/firebase-admin";
import { authenticateToken, authorizeAdmin, authorizeSeller } from "../middlewares/auth";

const router = Router();

router.post("/admin/danger-zone-wipe", authenticateToken, authorizeAdmin, async (req: any, res) => {
  try {
    const { confirmWipe, adminEmail } = req.body;
    
    // Hardened verification barrier (Anti-XSS/Token hijacking defense)
    if (confirmWipe !== "WIPE_OLMART_PLATFORM_62") {
      return res.status(403).json({ error: "Code de confirmation incorrect. Autorisation refusée." });
    }
    if (!adminEmail || adminEmail !== req.user.email || req.user.email !== "laifa.ait@gmail.com") {
      return res.status(403).json({ error: "Seul l'administrateur principal autorisé peut mener à bien un nettoyage complet." });
    }

    let userUids: string[] = [];
    let nextPageToken: string | undefined = undefined;
    do {
      const listUsersResult: any = await admin.auth().listUsers(1000, nextPageToken);
      userUids = userUids.concat(listUsersResult.users.map((u: any) => u.uid));
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    const collectionsToClear = ["users", "products", "orders"];
    for (const collName of collectionsToClear) {
      let hasMore = true;
      while (hasMore) {
        const snap = await db.collection(collName).limit(450).get();
        if (snap.empty) {
          hasMore = false;
          break;
        }
        const batch = db.batch();
        snap.docs.forEach((doc: any) => batch.delete(doc.ref));
        await batch.commit();
      }
    }

    // Safely delete users in chunks of 1000 (avoiding critical OOM / request count API limits in Firebase Auth)
    if (userUids.length > 0) {
      const authChunkSize = 1000;
      for (let i = 0; i < userUids.length; i += authChunkSize) {
        const chunk = userUids.slice(i, i + authChunkSize);
        await admin.auth().deleteUsers(chunk);
      }
    }
    res.json({ success: true, message: "Nettoyage complet effectué en toute sécurité de la base de données et de l'authentification." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Update Order Status Securely

router.get("/banners", async (req, res) => {
  try {
    const activeOnly = req.query.activeOnly === "true";
    let queryRef = db.collection("banners").orderBy("sort_order", "asc");
    if (activeOnly) {
      queryRef = queryRef.where("is_active", "==", true);
    }
    const snap = await queryRef.get();
    const banners = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.json({ banners });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUBLIC: Get specific banner details
router.get("/banners/:id", async (req, res) => {
  try {
    const docRef = await db.collection("banners").doc(req.params.id).get();
    if (!docRef.exists) {
      return res.status(404).json({ error: "Bannière non trouvée" });
    }
    res.json({ id: docRef.id, ...docRef.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN ONLY: Create a banner
router.post("/banners", authenticateToken, authorizeAdmin, async (req: any, res) => {
  try {
    const { 
      title, 
      title_color, 
      subtitle, 
      subtitle_color, 
      button_text, 
      btn_bg_color, 
      btn_text_color, 
      desktop_image, 
      mobile_image, 
      tag_id, 
      is_active,
      featured_products
    } = req.body;
    if (!title || !button_text || !desktop_image || !tag_id) {
      return res.status(400).json({ error: "Champs requis manquants: title, button_text, desktop_image, tag_id" });
    }

    // Get highest sort_order
    const snap = await db.collection("banners").orderBy("sort_order", "desc").limit(1).get();
    let nextOrder = 1;
    if (!snap.empty) {
      nextOrder = (snap.docs[0].data().sort_order || 0) + 1;
    }

    const docData = {
      title,
      title_color: title_color || "#FFFFFF",
      subtitle: subtitle || "",
      subtitle_color: subtitle_color || "#FFFFFF",
      button_text,
      btn_bg_color: btn_bg_color || "#FFFFFF",
      btn_text_color: btn_text_color || "#18181b",
      desktop_image,
      mobile_image: mobile_image || null,
      tag_id,
      sort_order: nextOrder,
      is_active: is_active === undefined ? false : is_active,
      featured_products: Array.isArray(featured_products) ? featured_products : [],
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: req.user.uid
    };

    const docRef = await db.collection("banners").add(docData);
    res.status(200).json({ success: true, id: docRef.id, banner: { id: docRef.id, ...docData } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// SELLER ONLY: Request Withdrawal
router.post("/seller/withdraw", authenticateToken, authorizeSeller, async (req: any, res) => {
  try {
    const sellerId = req.user.uid;
    const { amount, method, bankInfo } = req.body;
    
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 2000) throw new Error("Le montant minimum est de 2000 DA.");

    await db.runTransaction(async (transaction: any) => {
       const userRef = db.collection('users').doc(sellerId);
       const userSnap = await transaction.get(userRef);
       if (!userSnap.exists) throw new Error("Vendeur introuvable");
       const userData = userSnap.data();

       if (userData.walletBalance < amount) {
          throw new Error("Solde insuffisant.");
       }

       // Deduct from walletBalance and add to lockedBalance
       transaction.update(userRef, {
          walletBalance: admin.firestore.FieldValue.increment(-amount),
          lockedBalance: admin.firestore.FieldValue.increment(amount)
       });

       const withdrawalRef = db.collection('withdrawals').doc();
       transaction.set(withdrawalRef, {
          sellerId,
          sellerName: userData.displayName || userData.shopName || '',
          amount,
          method,
          bankInfo,
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
       });
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN ONLY: Approve Withdrawal
router.post("/admin/withdrawals/:id/approve", authenticateToken, authorizeAdmin, async (req: any, res) => {
  try {
    const withdrawalId = req.params.id;
    const { proofUrl } = req.body;
    
    await db.runTransaction(async (transaction: any) => {
       const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
       const withdrawalSnap = await transaction.get(withdrawalRef);
       if (!withdrawalSnap.exists) throw new Error("Retrait introuvable");
       const withdrawal = withdrawalSnap.data();
       if (withdrawal.status !== 'pending') throw new Error("Le retrait n'est pas en attente");

       const sellerRef = db.collection('users').doc(withdrawal.sellerId);
       const sellerSnap = await transaction.get(sellerRef);
       if (!sellerSnap.exists) throw new Error("Vendeur introuvable");
       const seller = sellerSnap.data();

       // Deduct from lockedBalance
       transaction.update(sellerRef, {
          lockedBalance: admin.firestore.FieldValue.increment(-withdrawal.amount)
       });

       transaction.update(withdrawalRef, {
          status: 'completed',
          proofUrl: proofUrl || null,
          processedAt: admin.firestore.FieldValue.serverTimestamp()
       });

       const notificationRef = db.collection("notifications").doc();
       transaction.set(notificationRef, {
         userId: withdrawal.sellerId,
         title: "Retrait traité",
         message: `Votre retrait de ${withdrawal.amount} DA a été validé et viré avec succès.`,
         type: "SUCCESS",
         read: false,
         createdAt: admin.firestore.FieldValue.serverTimestamp(),
       });
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN ONLY: Reject Withdrawal
router.post("/admin/withdrawals/:id/reject", authenticateToken, authorizeAdmin, async (req: any, res) => {
  try {
    const withdrawalId = req.params.id;
    const { reason } = req.body;
    
    await db.runTransaction(async (transaction: any) => {
       const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
       const withdrawalSnap = await transaction.get(withdrawalRef);
       if (!withdrawalSnap.exists) throw new Error("Retrait introuvable");
       const withdrawal = withdrawalSnap.data();
       if (withdrawal.status !== 'pending') throw new Error("Le retrait n'est pas en attente");

       const sellerRef = db.collection('users').doc(withdrawal.sellerId);
       const sellerSnap = await transaction.get(sellerRef);
       if (!sellerSnap.exists) throw new Error("Vendeur introuvable");
       
       // Refund blocked amount back to walletBalance
       transaction.update(sellerRef, {
          lockedBalance: admin.firestore.FieldValue.increment(-withdrawal.amount),
          walletBalance: admin.firestore.FieldValue.increment(withdrawal.amount)
       });

       transaction.update(withdrawalRef, {
          status: 'failed',
          rejectionReason: reason,
          processedAt: admin.firestore.FieldValue.serverTimestamp()
       });

       const notificationRef = db.collection("notifications").doc();
       transaction.set(notificationRef, {
         userId: withdrawal.sellerId,
         title: "Retrait refusé",
         message: `Votre demande de retrait de ${withdrawal.amount} DA a été refusée ("${reason}"). Les fonds ont été recrédités.`,
         type: "ERROR",
         read: false,
         createdAt: admin.firestore.FieldValue.serverTimestamp(),
       });
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN ONLY: Handle sellers query and pagination using offset
router.get("/admin/sellers", authenticateToken, authorizeAdmin, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limitNum = parseInt(req.query.limit || "50");
    const status = req.query.status;
    const search = req.query.search;
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder || "desc";

    let allSellers: any[] = [];
    if (status) {
      if (status === 'pending') {
        const snapshot = await db.collection('users')
          .where('status', 'in', ['pending', 'pending_verification'])
          .limit(500)
          .get();
        allSellers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      } else {
        const snapshot = await db.collection('users')
          .where('role', '==', 'seller')
          .where('status', '==', status)
          .limit(500)
          .get();
        allSellers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      }
    } else {
      // High-scale union query
      const [sellersSnap, pendingSnap, pendingVerifSnap] = await Promise.all([
        db.collection('users').where('role', '==', 'seller').limit(500).get(),
        db.collection('users').where('status', '==', 'pending').limit(200).get(),
        db.collection('users').where('status', '==', 'pending_verification').limit(200).get()
      ]);

      const mergedMap = new Map<string, any>();
      sellersSnap.docs.forEach((doc: any) => mergedMap.set(doc.id, { id: doc.id, ...doc.data() }));
      pendingSnap.docs.forEach((doc: any) => mergedMap.set(doc.id, { id: doc.id, ...doc.data() }));
      pendingVerifSnap.docs.forEach((doc: any) => mergedMap.set(doc.id, { id: doc.id, ...doc.data() }));
      allSellers = Array.from(mergedMap.values());
    }

    // Memory filter by search (only on the subset of real sellers/applicants)
    if (search) {
       const lowerSearch = search.toLowerCase();
       allSellers = allSellers.filter(s => 
          (s.shopName && s.shopName.toLowerCase().includes(lowerSearch)) || 
          (s.displayName && s.displayName.toLowerCase().includes(lowerSearch)) ||
          (s.email && s.email.toLowerCase().includes(lowerSearch))
       );
    }

    // Memory sort
    allSellers.sort((a: any, b: any) => {
       let valA = a[sortBy];
       let valB = b[sortBy];
       
       if (sortBy === 'createdAt') {
           valA = valA?.toMillis ? valA.toMillis() : (valA ? new Date(valA).getTime() : 0);
           valB = valB?.toMillis ? valB.toMillis() : (valB ? new Date(valB).getTime() : 0);
       } else if (sortBy === 'commissionRate') {
           valA = valA || 0;
           valB = valB || 0;
       }

       if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
       if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
       return 0;
    });

    const totalCount = allSellers.length;
    const offset = (page - 1) * limitNum;
    const paginatedSellers = allSellers.slice(offset, offset + limitNum);

    res.json({
      sellers: paginatedSellers,
      total: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limitNum)
    });
  } catch (error: any) {
    console.error("Error fetching sellers:", error);
    res.status(500).json({ error: error.message });
  }
});

// ADMIN ONLY: Approve Seller
router.post("/admin/sellers/:id/approve", authenticateToken, authorizeAdmin, async (req: any, res) => {
  try {
    const sellerId = req.params.id;
    const userRef = db.collection('users').doc(sellerId);
    
    const userSnap = await userRef.get();
    const userData = userSnap.data();

    // Verify user and promote status as well as role to 'seller' to complete onboarding
    await userRef.update({
      role: 'seller',
      status: 'active',
      isVerified: true,
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    if (userData) {
      await db.collection('publicProfiles').doc(sellerId).set({
        shopName: userData.shopName || userData.displayName || '',
        shopDescription: userData.shopDescription || '',
        logoUrl: userData.logoUrl || '',
        bannerUrl: userData.bannerUrl || '',
        wilaya: userData.wilaya || ''
      }, { merge: true });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN ONLY: Reject Seller
router.post("/admin/sellers/:id/reject", authenticateToken, authorizeAdmin, async (req: any, res) => {
  try {
    const sellerId = req.params.id;
    const { reasons, comment } = req.body;
    
    const userRef = db.collection('users').doc(sellerId);
    await userRef.update({
      status: 'rejected',
      rejectionReasons: reasons,
      rejectionComment: comment,
      rejectedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await userRef.collection('moderation_logs').add({
      status: 'rejected',
      reasons,
      comment,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      adminId: req.user.uid
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN ONLY: Suspend Seller
router.post("/admin/sellers/:id/suspend", authenticateToken, authorizeAdmin, async (req: any, res) => {
  try {
    const sellerId = req.params.id;
    const userRef = db.collection('users').doc(sellerId);
    await userRef.update({
      status: 'suspended',
      suspendedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN ONLY: Update a banner
router.put("/banners/:id", authenticateToken, authorizeAdmin, async (req: any, res) => {
  try {
    const { 
      title, 
      title_color, 
      subtitle, 
      subtitle_color, 
      button_text, 
      btn_bg_color, 
      btn_text_color, 
      desktop_image, 
      mobile_image, 
      tag_id, 
      is_active, 
      sort_order,
      featured_products
    } = req.body;
    const docRef = db.collection("banners").doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Bannière non trouvée" });
    }

    const updateData: any = {
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    if (title !== undefined) updateData.title = title;
    if (title_color !== undefined) updateData.title_color = title_color;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (subtitle_color !== undefined) updateData.subtitle_color = subtitle_color;
    if (button_text !== undefined) updateData.button_text = button_text;
    if (btn_bg_color !== undefined) updateData.btn_bg_color = btn_bg_color;
    if (btn_text_color !== undefined) updateData.btn_text_color = btn_text_color;
    if (desktop_image !== undefined) updateData.desktop_image = desktop_image;
    if (mobile_image !== undefined) updateData.mobile_image = mobile_image;
    if (tag_id !== undefined) updateData.tag_id = tag_id;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (featured_products !== undefined) updateData.featured_products = Array.isArray(featured_products) ? featured_products : [];

    await docRef.update(updateData);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN ONLY: Delete a banner
router.delete("/banners/:id", authenticateToken, authorizeAdmin, async (req: any, res) => {
  try {
    const docRef = db.collection("banners").doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Bannière non trouvée" });
    }
    await docRef.delete();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN ONLY: Reorder banners
router.put("/banners/reorder", authenticateToken, authorizeAdmin, async (req: any, res) => {
  try {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: "Le paramètre 'orders' au format tableau est requis" });
    }

    const batch = db.batch();
    for (const item of orders) {
      if (item.id && typeof item.sort_order === "number") {
        const ref = db.collection("banners").doc(item.id);
        batch.update(ref, { 
          sort_order: item.sort_order,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    await batch.commit();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/tags", async (req, res) => {
  try {
    const snap = await db.collection("tags").orderBy("name", "asc").limit(300).get();
    const tags = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.json({ tags });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/tags", authenticateToken, authorizeAdmin, async (req: any, res) => {
  try {
    const { name, slug } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: "Champs requis manquants: name, slug" });
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
    
    // Check if tag with slug exists
    const checkSnap = await db.collection("tags").where("slug", "==", cleanSlug).get();
    if (!checkSnap.empty) {
      return res.status(400).json({ error: "Ce tag existe déjà (le slug doit être unique)" });
    }

    const docData = {
      name: name.trim(),
      slug: cleanSlug,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection("tags").add(docData);
    res.status(200).json({ success: true, id: docRef.id, tag: { id: docRef.id, ...docData } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/tags/:id", authenticateToken, authorizeAdmin, async (req: any, res) => {
  try {
    const docRef = db.collection("tags").doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Tag non trouvé" });
    }
    await docRef.delete();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/homepage/sections', async (req, res) => {
  try {
    const snap = await db.collection('homepage_sections').orderBy('orderIndex', 'asc').limit(50).get();
    res.json({ sections: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/homepage/sections', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const data = req.body;
    data.createdAt = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await db.collection('homepage_sections').add(data);
    res.json({ success: true, id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.put('/homepage/sections/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const data = req.body;
    data.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await db.collection('homepage_sections').doc(req.params.id).update(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.delete('/homepage/sections/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    await db.collection('homepage_sections').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get('/homepage/banners', async (req, res) => {
  try {
    const snap = await db.collection('banners').orderBy('orderIndex', 'asc').limit(50).get();
    res.json({ banners: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/homepage/banners', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const data = req.body;
    data.createdAt = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await db.collection('banners').add(data);
    res.json({ success: true, id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.put('/homepage/banners/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const data = req.body;
    await db.collection('banners').doc(req.params.id).update(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.delete('/homepage/banners/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    await db.collection('banners').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/admin/save-translation', authenticateToken, authorizeAdmin, async (req: any, res) => {
  try {
    const { key, fr, ar, en } = req.body;
    if (!key) {
      return res.status(400).json({ error: "Champs requis manquants: key" });
    }

    const fs = await import("fs");
    const path = await import("path");

    const frPath = path.join(process.cwd(), 'public/locales/fr.json');
    const arPath = path.join(process.cwd(), 'public/locales/ar.json');
    const enPath = path.join(process.cwd(), 'public/locales/en.json');

    const frContent = fs.existsSync(frPath) ? JSON.parse(fs.readFileSync(frPath, 'utf8')) : {};
    const arContent = fs.existsSync(arPath) ? JSON.parse(fs.readFileSync(arPath, 'utf8')) : {};
    const enContent = fs.existsSync(enPath) ? JSON.parse(fs.readFileSync(enPath, 'utf8')) : {};

    if (fr !== undefined) frContent[key] = fr;
    if (ar !== undefined) arContent[key] = ar;
    if (en !== undefined) enContent[key] = en;

    // Dual-write helper
    const dualWrite = (lang: string, content: any) => {
      const p1 = path.join(process.cwd(), 'public/locales', `${lang}.json`);
      const p2 = path.join(process.cwd(), 'dist/locales', `${lang}.json`);
      
      const dir1 = path.dirname(p1);
      if (!fs.existsSync(dir1)) {
        fs.mkdirSync(dir1, { recursive: true });
      }
      fs.writeFileSync(p1, JSON.stringify(content, null, 2), 'utf8');

      if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
        const dir2 = path.dirname(p2);
        if (!fs.existsSync(dir2)) {
          fs.mkdirSync(dir2, { recursive: true });
        }
        fs.writeFileSync(p2, JSON.stringify(content, null, 2), 'utf8');
      }
    };

    dualWrite('fr', frContent);
    dualWrite('ar', arContent);
    dualWrite('en', enContent);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// API: Product Moderation (Admin)

router.post('/admin/products/recalculate-scores', authenticateToken, authorizeAdmin, async (req: any, res: any) => {
  try {
    const snap = await db.collection('products').where('status', '==', 'active').get();
    const batch = db.batch();
    snap.docs.forEach(doc => {
      const p = doc.data();
      const salesCount = p.salesCount || 0;
      const viewsCount = p.viewsCount || 0;
      const sellerRating = p.sellerRating || 4.5;
      const rtoRate = p.rtoRate || 0;
      const score = Math.max(0, parseFloat(((salesCount * 10) + (viewsCount * 0.1) + (sellerRating * 5) - (rtoRate * 50)).toFixed(2)));
      batch.update(doc.ref, { qualityScore: score });
    });
    await batch.commit();

    await db.collection('audit_logs').add({
      action: 'RECALCULATE_SCORES',
      details: { count: snap.size },
      adminId: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'unknown',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, count: snap.size });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin/products/:id/approve', authenticateToken, authorizeAdmin, async (req: any, res: any) => {
  try {
    const productId = req.params.id;
    const productRef = db.collection('products').doc(productId);
    const productSnap = await productRef.get();
    if (!productSnap.exists) return res.status(404).json({ error: 'Not found' });
    
    const p = productSnap.data();
    const salesCount = p?.salesCount || 0;
    const viewsCount = p?.viewsCount || 0;
    const sellerRating = p?.sellerRating || 4.5;
    const rtoRate = p?.rtoRate || 0;
    const score = Math.max(0, parseFloat(((salesCount * 10) + (viewsCount * 0.1) + (sellerRating * 5) - (rtoRate * 50)).toFixed(2)));
    
    await productRef.update({
      status: 'active',
      qualityScore: score,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      rejectionReason: null
    });
    
    if (p?.sellerId) {
      await db.collection('user_notifications').add({
        recipientId: p.sellerId,
        type: 'PRODUCT_APPROVED',
        title: 'Produit en ligne ! 🚀',
        message: 'Excellente nouvelle ! Votre produit "' + p.name + '" a été approuvé et est maintenant visible par nos clients.',
        productId: productId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      });
      
      const userSnap = await db.collection('users').where('uid', '==', p.sellerId).get();
      if (!userSnap.empty) {
        const sellerEmail = userSnap.docs[0].data().email;
         if (sellerEmail) {
           await db.collection('mail').add({
             to: sellerEmail,
             message: {
               subject: 'Votre produit est en ligne sur Olmart 🎉',
               html: '<p>Félicitations,</p><p>Votre produit <strong>' + p.name + '</strong> a passé notre contrôle qualité et est désormais disponible sur Olmart !</p><p>Préparez-vous à recevoir des commandes !</p>'
             }
           });
         }
      }
    }

    await db.collection('audit_logs').add({
      action: 'APPROVE_PRODUCT',
      details: { productId, productName: p?.name, sellerId: p?.sellerId, score },
      adminId: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'unknown',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, score });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/products/:id/reject', authenticateToken, authorizeAdmin, async (req: any, res: any) => {
  try {
    const productId = req.params.id;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason is required' });
    
    const productRef = db.collection('products').doc(productId);
    const productSnap = await productRef.get();
    if (!productSnap.exists) return res.status(404).json({ error: 'Not found' });
    const p = productSnap.data();
    
    await productRef.update({
      status: 'rejected',
      rejectionReason: reason,
      rejectedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    if (p?.sellerId) {
      await db.collection('user_notifications').add({
        recipientId: p.sellerId,
        type: 'PRODUCT_REJECTED',
        title: 'Action requise sur votre produit ⚠️',
        message: 'Votre produit "' + p.name + '" n\'a pas pu être approuvé. Raison : ' + reason + '. Veuillez corriger et soumettre à nouveau.',
        productId: productId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      });
      
      const userSnap = await db.collection('users').where('uid', '==', p.sellerId).get();
      if (!userSnap.empty) {
        const sellerEmail = userSnap.docs[0].data().email;
         if (sellerEmail) {
           await db.collection('mail').add({
             to: sellerEmail,
             message: {
               subject: 'Action requise : Mise à jour de votre produit sur Olmart',
               html: '<p>Bonjour,</p><p>Lors de la révision de votre catalogue, nous avons dû suspendre la publication du produit <strong>' + p.name + '</strong>.</p>' +
                      '<p><strong>Motif de refus :</strong> ' + reason + '</p>' +
                      '<p>Veuillez corriger ces points dans votre espace vendeur pour que nous puissions le publier.</p>'
             }
           });
         }
      }
    }
    
    await db.collection('audit_logs').add({
      action: 'REJECT_PRODUCT',
      details: { productId, productName: p?.name, sellerId: p?.sellerId, reason },
      adminId: req.user?.uid || 'unknown',
      adminEmail: req.user?.email || 'unknown',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
