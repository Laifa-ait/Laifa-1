import { admin, db, firebaseConfig } from "../config/firebase-admin";

const fetchRoleFromRest = async (uid: string, idToken: string): Promise<string | null> => {
  try {
    const projectId = firebaseConfig?.projectId || "original-micron-7sjh2";
    const databaseId = firebaseConfig?.firestoreDatabaseId || "(default)";
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${uid}`;
    
    console.log(`[Auth Fallback] Fetching user role from Firestore REST API: ${url}`);
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${idToken}`
      }
    });
    
    if (res.ok) {
      const data: any = await res.json();
      const role = data.fields?.role?.stringValue || null;
      console.log(`[Auth Fallback] REST API successfully returned role: ${role}`);
      return role;
    } else {
      console.warn(`[Auth Fallback] REST fetch failed with status: ${res.status}`);
    }
  } catch (err: any) {
    console.warn(`[Auth Fallback] REST fetch error:`, err.message || err);
  }
  return null;
};

export const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const isProd = process.env.NODE_ENV === "production";
  
  // Create a base guest user in case of failure or missing token for dev mode
  const guestUser = { 
    uid: "guest_user_" + Math.random().toString(36).substring(7), 
    role: "admin", 
    email: "guest@olmart.com",
    name: "Utilisateur Démo"
  };

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    if (isProd) {
      return res.status(401).json({ error: "Authentification requise. Jeton manquant." });
    }
    req.user = guestUser;
    return next();
  }

  const idToken = authHeader.split("Bearer ")[1];
  if (!idToken || idToken === "undefined" || idToken === "null") {
    if (isProd) {
      return res.status(401).json({ error: "Authentification requise. Jeton invalide." });
    }
    req.user = guestUser;
    return next();
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    let role = decodedToken.role || "buyer"; // Default to buyer for safety
    
    // Explicit hardcoded super-admin fallback by email (secure-by-design & resilient)
    if (decodedToken.email?.toLowerCase() === 'laifa.ait@gmail.com') {
      role = "admin";
      console.log(`[Admin Auth] Verified admin user ${decodedToken.email} (case-insensitive)`);
    } else {
      // Check DB for role if possible
      try {
        if (db) {
          const userDoc = await db.collection("users").doc(decodedToken.uid).get();
          if (userDoc.exists) {
            role = userDoc.data()?.role || role;
          }
        }
      } catch (e: any) {
        console.warn("Could not fetch user role from db (Admin SDK), attempting Firestore REST API fallback...", e.message || e);
        const restRole = await fetchRoleFromRest(decodedToken.uid, idToken);
        if (restRole) {
          role = restRole;
        } else {
          console.warn("REST API fallback failed as well, using token/default role.");
        }
      }
    }

    req.user = { ...decodedToken, role };
    next();
  } catch (error: any) {
    const errString = String(error.message || error);
    
    // Only allow payload decoding bypass in development / preview mode if audience mismatches
    if (errString.includes('incorrect "aud"') && !isProd) {
      try {
        const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString('utf8'));
        console.warn("Bypassed aud claim check for dev environment. Token uid:", payload.user_id);
        let role = payload.role || "admin";
        if (payload.email?.toLowerCase() === 'laifa.ait@gmail.com') {
          role = "admin";
        } else {
          try {
            if (db) {
              const userDoc = await db.collection("users").doc(payload.user_id).get();
              if (userDoc.exists) {
                role = userDoc.data()?.role || role;
              }
            }
          } catch (e: any) {
            console.warn("Could not fetch user role in bypass block (Admin SDK), attempting REST API fallback...", e.message || e);
            const restRole = await fetchRoleFromRest(payload.user_id, idToken);
            if (restRole) {
              role = restRole;
            }
          }
        }
        req.user = { uid: payload.user_id, role, email: payload.email, ...payload };
        return next();
      } catch (decodeErr) {
        // Fallback below
      }
    }
    
    if (isProd) {
      return res.status(401).json({ error: `Jeton invalide ou expiré : ${error.message}` });
    }

    console.warn("Token verification failed, continuing as guest admin:", error.message);
    req.user = guestUser;
    next();
  }
};

export const authorizeAdmin = (req: any, res: any, next: any) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    return res.status(403).json({ error: "Accès refusé. Privilèges Administrateur requis." });
  }
  next();
};

export const authorizeSeller = (req: any, res: any, next: any) => {
  if (!req.user || (req.user.role !== 'seller' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: "Accès refusé. Privilèges Vendeur ou Administrateur requis." });
  }
  next();
};
