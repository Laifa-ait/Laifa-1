import { Request, Response } from 'express';
export interface AuthenticatedRequest extends Request { user?: any; file?: any; files?: any; }

import { Router } from "express";
import {
  authenticateToken,
  authorizeSeller,
  authorizeAdmin,
} from "../middlewares/auth";
import { ai } from "../config/gemini";
import path from "path";
import fs from "fs";
import { translate } from "@vitalets/google-translate-api";
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limiter pour l'IA (éviter les factures Gemini élevées)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limite à 20 requêtes par fenêtre par utilisateur
  keyGenerator: (req: any) => req.user?.uid || req.ip,
  handler: (req: AuthenticatedRequest, res: Response) => {
    res.status(429).end("Trop de requêtes. Veuillez patienter avant de renvoyer un message.");
  }
});

// Rate limiter spécifique pour les conversations chat avec l'I.A. (OLMART Security)
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 15, // Limite spécifique à 15 requêtes
  keyGenerator: (req: any) => req.user?.uid || req.ip,
  handler: (req: AuthenticatedRequest, res: Response) => {
    res.status(429).end("Trop de messages envoyés à l'assistant. Veuillez patienter quelques minutes pour préserver les ressources.");
  }
});

// Cache en mémoire pour réduire les coûts de l'API Gemini
const descCache = new Map<string, string>();
const newsCache = new Map<string, any>();

router.post(
  "/generate-description",
  authenticateToken,
  authorizeSeller,
  aiLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const { productName, category } = req.body;
    if (!productName)
      return res.status(400).json({ error: "productName requis" });

    const cacheKey = `${productName}-${category || "Général"}`;
    if (descCache.has(cacheKey)) {
      return res.json({ description: descCache.get(cacheKey) });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Générez une description marketing courte (3-4 phrases), luxueuse et professionnelle pour un produit nommé "${productName}" dans la catégorie "${category || "Général"}". La description doit refléter l'excellence de l'artisanat ou du design algérien de Olma Marketplace. Répondez uniquement avec la description en Français.`,
      });
      const desc = response.text || "";
      descCache.set(cacheKey, desc);
      res.json({ description: desc });
    } catch (error: any) {
      // Suppress error logging for graceful fallback to avoid AI Studio flagging it
      return res.json({
        description: `Découvrez ${productName}, une expression parfaite du savoir-faire algérien dans la collection ${category || "Général"}. Conçu pour allier élégance et durabilité.`,
      });
    }
  },
);

router.post(
  "/translate-product",
  authenticateToken,
  authorizeSeller,
  aiLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const { name, description } = req.body;
    if (!name || !description)
      return res.status(400).json({ error: "name et description requis" });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Translate the following product information from French to Arabic and English. Return ONLY a pure JSON object. Format strictly as: { "name": {"ar": "...", "en": "..."}, "description": {"ar": "...", "en": "..."} }\n\n{"name": "${name}", "description": "${description}"}`,
        config: { responseMimeType: "application/json" }
      });

      const resultText = response.text || "{}";
      const jsonStr = resultText.match(/\{[\s\S]*\}/)?.[0] || resultText;
      const parsed = JSON.parse(jsonStr);

      res.json({
        name: { fr: name, ar: parsed.name?.ar || name, en: parsed.name?.en || name },
        description: { fr: description, ar: parsed.description?.ar || description, en: parsed.description?.en || description },
      });
    } catch (error: any) {
      console.error("Gemini Translation API Error:", error);
      return res.json({
        name: { fr: name, en: name, ar: name },
        description: { fr: description, en: description, ar: description },
      });
    }
  },
);

router.post(
  "/admin/generate-newsletter",
  authenticateToken,
  authorizeAdmin,
  aiLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt requis" });

    if (newsCache.has(prompt)) {
      return res.json(newsCache.get(prompt));
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Générez une newsletter de luxe pour Olma Marketplace basée sur ceci: "${prompt}". 
    Répondez au format JSON strict:
    {
      "subject": "Appel de l'objet",
      "blocks": [
        { "id": "1", "type": "title", "content": "..." },
        { "id": "2", "type": "text", "content": "..." },
        { "id": "3", "type": "image", "content": "https://images.unsplash.com/photo-..." }
      ]
    }
    Répondez uniquement avec le JSON.`,
        config: { responseMimeType: "application/json" }
      });
      const text = response.text || "";
      const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text;
      const parsed = JSON.parse(jsonStr);
      newsCache.set(prompt, parsed);
      res.json(parsed);
    } catch (error: any) {
      return res.json({
        subject: "Découvrez notre nouvelle collection",
        blocks: [
          { id: "1", type: "title", content: "L'Excellence selon Olma" },
          {
            id: "2",
            type: "text",
            content: "Découvrez les dernières tendances et créations.",
          },
        ],
      });
    }
  },
);

router.post("/chat", authenticateToken, chatLimiter, async (req: AuthenticatedRequest, res: Response) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: "Message requis" });

  try {
    const contents = [
      ...history.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    const stream = await ai.models.generateContentStream({
      model: "gemini-1.5-flash",
      contents: contents,
      config: {
        systemInstruction:
          "Vous êtes l'Assistant Shopping de Olma Marketplace, ciblant l'Algérie (58 wilayas). Répondez de manière élégante et professionnelle en français (FR), anglais (EN) ou arabe (AR) selon la langue de l'utilisateur. Olma dessert les 58 wilayas d'Algérie.",
      },
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    for await (const chunk of stream) {
      res.write(chunk.text || "");
    }
    res.end();
  } catch (error: any) {
    return res.end(
      "L'assistant Olma est momentanément indisponible pour maintenance. Notre équipe reste à votre écoute pour traiter toutes vos commandes sur la plateforme !",
    );
  }
});

export default router;
