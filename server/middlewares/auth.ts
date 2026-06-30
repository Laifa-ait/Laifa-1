import { admin, db, firebaseConfig } from "../services/firebase-admin";
import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
    [key: string]: any;
  };
}

interface FirestoreDocument {
  fields?: {
    role?: { stringValue?: string };
  };
}

const fetchRoleFromRest = async (uid: string, idToken: string): Promise<string | null> => {
  try {
    const projectId = firebaseConfig?.projectId || process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
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
      const data: FirestoreDocument = await res.json();
      return data.fields?.role?.stringValue || null;
    }
  } catch (err: any) {
    // Silently fail to not expose anything
  }
  return null;
};

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

    if (decodedToken.admin === true) {
      role = "admin";
    } else if (decodedToken.email && decodedToken.email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()) {
      role = "admin";
      // Sync the custom claim for next time
      try {
        await admin.auth().setCustomUserClaims(decodedToken.uid, { admin: true, role: 'admin' });
      } catch (e) {
        console.warn("Failed to set admin custom claim:", e);
      }
      if (process.env.NODE_ENV === "development") {
        console.log(`[Admin Auth] Verified admin user ${decodedToken.email} (case-insensitive)`);
      }
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
        console.warn("Auth middleware: Failed to fetch user role from DB:", e.message);
        console.warn("Attempting Firestore REST API fallback...");
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
    return res.status(401).json({ error: `Jeton invalide ou expiré : ${error.message}` });
  }
};

export const authorizeAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "superadmin")) {
    return res.status(403).json({ error: "Accès refusé. Privilèges Administrateur requis." });
  }
  next();
};

export const authorizeSeller = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== "seller" && req.user.role !== "admin")) {
    return res.status(403).json({ error: "Accès refusé. Privilèges Vendeur ou Administrateur requis." });
  }
  next();
};
