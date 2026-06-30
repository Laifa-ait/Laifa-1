import { Request, Response, Router } from "express";
import { admin, db } from "../services/firebase-admin";
import { ai } from "../config/gemini";
import { authenticateToken } from "../middlewares/auth";

export interface AuthenticatedRequest extends Request {
  user?: any;
  file?: any;
  files?: any;
}

const router = Router();

// --- Internal Messaging & DLP (Data Loss Prevention) ---
router.post(
  "/api/messages/send",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Non authentifié" });
    const { orderId, text } = req.body;
    const senderId = req.user.uid;

    if (!text || !orderId)
      return res.status(400).json({ error: "Missing fields" });

    try {
      const orderRef = db.collection("orders").doc(orderId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) return res.status(404).json({ error: "Order not found" });

      const orderData = orderSnap.data() as any;
      const buyerId = orderData.userId || orderData.buyerId;
      const sellerId = orderData.sellerId || (orderData.sellerIds && orderData.sellerIds[0]);

      if (senderId !== buyerId && senderId !== sellerId) {
         return res.status(403).json({ error: "Not a participant" });
      }

      const recipientId = senderId === buyerId ? sellerId : buyerId;

      // NLP Regex Filter for Phone Numbers, URLs and Social Media
      const phoneRegex = /(0[5672349][0-9]{8}|(\+213|00213)[5672349][0-9]{8})/g;
      const socialRegex = /(whatsapp|viber|telegram|insta|fb|facebook|appel[e]?)/gi;
      const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;

      let secureText = text;
      let violationDetected = false;

      if (phoneRegex.test(secureText) || socialRegex.test(secureText) || urlRegex.test(secureText)) {
        violationDetected = true;
        secureText = secureText.replace(phoneRegex, "[NUMÉRO MASQUÉ]");
        secureText = secureText.replace(socialRegex, "[MOT INTERDIT]");
        secureText = secureText.replace(urlRegex, "[LIEN INTERDIT]");
      }

      const messageObj = {
        orderId,
        senderId,
        recipientId,
        text: secureText,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        violation: violationDetected,
      };

      await db.collection("orders").doc(orderId).collection("messages").add(messageObj);

      if (violationDetected) {
        // Create admin alert
        await db.collection("admin_alerts").add({
          type: "DLP_VIOLATION",
          userId: senderId,
          orderId: orderId,
          originalText: text,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          resolved: false
        });

        // Punish seller if sender is seller
        const userDoc = await db.collection("users").doc(senderId).get();
        if (userDoc.exists && userDoc.data()?.role === "seller") {
          const currentScore = userDoc.data()?.trustScore || 50;
          await db.collection("users").doc(senderId).update({
              trustScore: Math.max(0, currentScore - 10),
          });
          
          await db.collection("notifications").add({
            userId: senderId,
            title: "Avertissement de sécurité : Message modéré",
            message: "Votre message a été bloqué pour non-respect de nos règles (ex: partage de coordonnées externes). Votre Trust Score a baissé de 10 points. Si c'est une erreur, ouvrez une contestation via le Support.",
            type: "ALERT",
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      // Enqueue a notification for the recipient
      await db.collection("user_notifications").add({
        recipientId: recipientId,
        title: {
          fr: "Nouveau message",
          ar: "رسالة جديدة",
          en: "New message"
        },
        message: {
          fr: `Vous avez reçu un nouveau message pour la commande #${orderId.substring(0,8)}.`,
          ar: `تلقيت رسالة جديدة للطلب #${orderId.substring(0,8)}.`,
          en: `You received a new message for order #${orderId.substring(0,8)}.`
        },
        type: "new_message",
        orderId: orderId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({
        success: true,
        masked: violationDetected,
        deliveredText: secureText,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// --- Route API: Système de notifications internes (Acheteur <-> Vendeur) avec Traduction Gemini ---
router.post(
  "/api/notifications/send",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Non authentifié" });
    const {
      recipientId,
      title,
      message,
      type,
      orderId,
      productId,
      conversationId,
    } = req.body;
    const senderId = req.user.uid;

    if (!recipientId || !title || !message) {
      return res
        .status(400)
        .json({ error: "recipientId, title, et message sont obligatoires." });
    }

    try {
      let translations = {
        title: {
          fr: title,
          en: `${title} (EN)`,
          ar: `${title} (AR)`,
        },
        message: {
          fr: message,
          en: `${message} (EN)`,
          ar: `${message} (AR)`,
        },
      };

      // Auto-translation using Gemini AI to FR, EN, and AR
      try {
        const prompt = `Vous êtes Mabrouk, l'expert traducteur e-commerce d'OLMART Algérie (58 wilayas).
Traduisez les chaînes de caractères e-commerce suivantes en Arabe d'Algérie littéraire (soigné, professionnel) et en Anglais :
1. Titre: "${title}"
2. Message: "${message}"

Format de retour JSON STRICT (sans markdown, uniquement le JSON):
{
  "title": {
    "fr": "${title.replace(/"/g, '\\"')}",
    "ar": "La traduction en Arabe",
    "en": "La traduction en Anglais"
  },
  "message": {
    "fr": "${message.replace(/"/g, '\\"')}",
    "ar": "La traduction du message en Arabe",
    "en": "La traduction du message en Anglais"
  }
}
Répondez uniquement avec le JSON.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });

        const resultText = response.text || "";
        const jsonStr = resultText.match(/\{[\s\S]*\}/)?.[0] || resultText;
        const parsed = JSON.parse(jsonStr);
        if (parsed.title && parsed.message) {
          translations = parsed;
        }
      } catch (geminiErr: any) {
        console.warn(
          "Gemini automatic translation failed for notifications, using fallback suffixes:",
          geminiErr,
        );
      }

      const notificationPayload = {
        senderId,
        recipientId,
        title: translations.title,
        message: translations.message,
        type: type || "system",
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(orderId && { orderId }),
        ...(productId && { productId }),
        ...(conversationId && { conversationId }),
      };

      const docRef = await db
        .collection("user_notifications")
        .add(notificationPayload);

      res.status(201).json({
        success: true,
        notificationId: docRef.id,
        notification: {
          id: docRef.id,
          ...notificationPayload,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("Failed to register notification:", error);
      res
        .status(500)
        .json({
          error:
            error.message || "Erreur lors de la création de la notification.",
        });
    }
  },
);

export default router;
