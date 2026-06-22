import { admin, db, firebaseConfig } from "../config/firebase-admin";

const fetchRoleFromRest = async (uid: string, idToken: string): Promise<string | null> => {
  try {
    const projectId = firebaseConfig?.projectId || process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.warn("Firebase projectId is missing in auth.ts REST call");
    }
    const databaseId = firebaseConfig?.firestoreDatabaseId || "(default)";
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${uid}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (res.ok) {
      const data: any = await res.json();
      return data.fields?.role?.stringValue || null;
    }
  } catch (err: any) {
    // Silently fail to not expose anything
  }
  return null;
};

export const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const isProd = process.env.NODE_ENV === "production";

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentification requise. Jeton manquant." });
  }

  const idToken = authHeader.split("Bearer ")[1];
  if (!idToken || idToken === "undefined" || idToken === "null") {
    return res.status(401).json({ error: "Authentification requise. Jeton invalide." });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    let role = decodedToken.role || "buyer"; // Default to buyer for safety

    // Explicit hardcoded super-admin fallback by email (secure-by-design & resilient)
    if (decodedToken.email && decodedToken.email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()) {
      role = "admin";
      (process.env.NODE_ENV === "debug" ? console.log : function () {})(
        `[Admin Auth] Verified admin user ${decodedToken.email} (case-insensitive)`
      );
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
        console.warn(
          "Could not fetch user role from db (Admin SDK), attempting Firestore REST API fallback...",
          e.message || e
        );
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

    return res.status(401).json({ error: `Jeton invalide ou expiré : ${error.message}` });
  }
};

export const authorizeAdmin = (req: any, res: any, next: any) => {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "superadmin")) {
    return res.status(403).json({ error: "Accès refusé. Privilèges Administrateur requis." });
  }
  next();
};

export const authorizeSeller = (req: any, res: any, next: any) => {
  if (!req.user || (req.user.role !== "seller" && req.user.role !== "admin")) {
    return res.status(403).json({ error: "Accès refusé. Privilèges Vendeur ou Administrateur requis." });
  }
  next();
};
