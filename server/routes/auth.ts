import { Request, Response } from 'express';
export interface AuthenticatedRequest extends Request { user?: any; file?: any; files?: any; }

import { Router } from "express";
import { authenticateToken } from "../middlewares/auth";
import { admin, db } from "../services/firebase-admin";

const router = Router();

router.post("/sync-user-claims", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user.uid;
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      const customClaims = {
        role: userData?.role || 'customer'
      };
      
      await admin.auth().setCustomUserClaims(uid, customClaims);
      return res.json({ success: true, message: "Claims synced successfully" });
    } else {
      return res.status(404).json({ error: "User not found in Firestore" });
    }
  } catch (error: any) {
    console.error("Error syncing claims:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- 2FA Verification System ---
router.post(
  "/2fa/send-code",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Non authentifié" });
    const userId = req.user.uid;
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      await db
        .collection("users")
        .doc(userId)
        .update({
          "verification.code": code,
          "verification.expiresAt": admin.firestore.Timestamp.fromMillis(
            Date.now() + 10 * 60 * 1000,
          ),
        });
      (process.env.NODE_ENV === 'development' ? console.log : function(){})(`[SIMULATION] Sending code ${code} to user ${userId}`);
      res.json({ success: true, method: "email" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/2fa/verify",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Non authentifié" });
    const { code } = req.body;
    const userId = req.user.uid;

    try {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      if (
        !userData?.verification ||
        userData.verification.code !== code ||
        userData.verification.expiresAt.toMillis() < Date.now()
      ) {
        return res.status(403).json({ error: "Code invalide ou expiré" });
      }

      await userRef.update({
        "verification.verified": true,
        "verification.code": admin.firestore.FieldValue.delete(),
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
