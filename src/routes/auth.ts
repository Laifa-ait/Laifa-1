import { Request, Response } from 'express';
export interface AuthenticatedRequest extends Request { user?: any; file?: any; files?: any; }

import { Router } from "express";
import { authenticateToken } from "../middlewares/auth";
import { admin, db } from "../config/firebase-admin";

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

export default router;
