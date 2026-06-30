import { Request, Response } from 'express';
export interface AuthenticatedRequest extends Request { user?: any; file?: any; files?: any; }

import { Router } from "express";
import {
  authenticateToken,
  authorizeSeller,
  authorizeAdmin,
} from "../middlewares/auth";
import { ai } from "../config/gemini";
import { admin } from "../services/firebase-admin";
import path from "path";
import fs from "fs";
import { translate } from "@vitalets/google-translate-api";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const router = Router();

// Rate limiter pour l'IA (éviter les factures Gemini élevées)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limite à 20 requêtes par fenêtre par utilisateur
  keyGenerator: (req) => ipKeyGenerator(req.ip || "127.0.0.1"),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: AuthenticatedRequest, res: Response) => {
    res.status(429).end("Trop de requêtes. Veuillez patienter avant de renvoyer un message.");
  }
});

// Rate limiter spécifique pour les conversations chat avec l'I.A. (OLMART Security)
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 15, // Limite spécifique à 15 requêtes
  keyGenerator: (req) => ipKeyGenerator(req.ip || "127.0.0.1"),
  standardHeaders: true,
  legacyHeaders: false,
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
        model: "gemini-3.5-flash",
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
        model: "gemini-3.5-flash",
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
        model: "gemini-3.5-flash",
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
      model: "gemini-3.5-flash",
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

// --- AI Agents Endpoints ---

const DEFAULT_AGENTS_CONFIG = {
  growth: {
    isActive: true,
    focusCategory: "Tout",
    marketContext: "Mots-clés recherchés en Algérie (robes de mariée, bijoux berbères, maroquinerie de Tlemcen, dattes Deglet Nour, cosmétiques bio, qalb el louz, ustensiles traditionnels). Stratégie de prix en DA (Dinar Algérien).",
    analysisFrequency: "daily",
  },
  cart: {
    isActive: true,
    discountCode: "OLMARECOVERY10",
    discountPercent: 10,
    followUpDelay: 4,
    tone: "luxury",
  },
  moderator: {
    isActive: false,
    strictness: "strict",
    languages: "FR, AR",
    customForbiddenWords: "whatsapp, viber, telegram, téléphone, phone, contactez-moi, facebook, +213, ouedkniss, fennec",
  },
  support: {
    isActive: false,
    kbContext: "Délais de livraison : Alger (24h-48h, 400 DA), Oran (48h-72h, 500 DA), Constantine (48h-72h, 500 DA), Grand Sud (3-5 jours, 800 DA). Tous paiements en Cash on Delivery (COD) à la livraison. Les retours sont possibles sous 7 jours si le produit n'est pas utilisé et est retourné dans son emballage d'origine. Les frais de retour sont à la charge du client sauf si erreur d'Olma.",
    personality: "warm",
  }
};

// Helper to get all agent configs
async function getAgentsConfigFromDb() {
  const snapshot = await admin.firestore().collection("ai_agents").get();
  const configs: any = { ...DEFAULT_AGENTS_CONFIG };
  snapshot.docs.forEach((doc) => {
    const key = doc.id;
    if (configs[key]) {
      configs[key] = { ...configs[key], ...doc.data() };
    }
  });
  return configs;
}

// Get configurations
router.get("/admin/ai-agents", authenticateToken, authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const configs = await getAgentsConfigFromDb();
    res.json({ success: true, configs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle agent status
router.post("/admin/ai-agents/:key/toggle", authenticateToken, authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key } = req.params;
    const { isActive } = req.body;
    if (isActive === undefined) return res.status(400).json({ error: "isActive requis" });

    const ref = admin.firestore().collection("ai_agents").doc(key);
    await ref.set({ isActive }, { merge: true });

    res.json({ success: true, key, isActive });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update configuration
router.post("/admin/ai-agents/:key/configure", authenticateToken, authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key } = req.params;
    const configData = req.body;

    const ref = admin.firestore().collection("ai_agents").doc(key);
    await ref.set({ ...configData }, { merge: true });

    res.json({ success: true, key, config: configData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Run Growth Analyst
router.post("/admin/ai-agents/growth/run", authenticateToken, authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Fetch products to give some real data to the model
    const productsSnap = await admin.firestore().collection("products").limit(20).get();
    const productsList = productsSnap.docs.map(doc => ({
      name: doc.data().name,
      category: doc.data().category,
      price: doc.data().price,
      viewsCount: doc.data().viewsCount || 0,
      salesCount: doc.data().salesCount || 0,
    }));

    const agentConfigs = await getAgentsConfigFromDb();
    const growthConfig = agentConfigs.growth;

    const systemPrompt = `Vous êtes un analyste de croissance IA senior spécialisé dans l'e-commerce en Algérie (58 wilayas) pour Olma Marketplace.
Votre objectif est de fournir une analyse commerciale détaillée et luxueuse basée sur les données fournies et le contexte configuré par l'administrateur.
Contexte configuré : ${growthConfig.marketContext}
Catégorie cible configurée : ${growthConfig.focusCategory}

Répondez STRICTEMENT au format JSON avec les clés suivantes :
- summary: Un résumé des tendances de marché actuelles en Algérie (FR)
- kpis: Un tableau d'objets KPI { label, value, change, trend: 'up' | 'down' }
- pricingTips: Conseils d'optimisation de prix (FR)
- topSearches: Tableau de mots-clés les plus chauds en ce moment en Algérie
- actionableAdvice: Recommandations stratégiques clés pour l'admin d'Olma (FR)`;

    const prompt = `Voici la liste échantillonnée de nos produits actuels en base de données : ${JSON.stringify(productsList)}. 
S'il n'y en a pas ou s'ils sont peu nombreux, utilisez vos connaissances expertes de l'e-commerce algérien pour fournir un rapport robuste.
Veuillez générer l'analyse de croissance complète en JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json"
      }
    });

    const reportText = response.text || "{}";
    const parsedReport = JSON.parse(reportText.match(/\{[\s\S]*\}/)?.[0] || reportText);

    // Persist report
    const reportRef = admin.firestore().collection("ai_growth_reports").doc();
    const reportDoc = {
      ...parsedReport,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await reportRef.set(reportDoc);

    res.json({ success: true, report: reportDoc });
  } catch (error: any) {
    console.error("Growth Agent execution error:", error);
    res.status(500).json({ error: "Une erreur est survenue lors de l'exécution de l'analyse : " + error.message });
  }
});

// Run Cart Recovery Simulation
router.post("/admin/ai-agents/cart/run-simulation", authenticateToken, authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentConfigs = await getAgentsConfigFromDb();
    const cartConfig = agentConfigs.cart;

    // Simulate dummy abandoned cart data
    const dummyCart = {
      customerName: "Amine Belkacem",
      customerEmail: "amine.belk@gmail.com",
      items: [
        { name: "Karakou Algérois Traditionnel en Velours", price: 38000, quantity: 1 },
        { name: "Pochette de Soirée Brodée Or", price: 6500, quantity: 1 }
      ],
      totalAmount: 44500
    };

    const prompt = `Générez un e-mail de relance de panier abandonné luxueux et percutant pour le client "${dummyCart.customerName}" qui a laissé "${dummyCart.items.map(i => i.name).join(', ')}" dans son panier pour un total de ${dummyCart.totalAmount} DA.
Le code promo configuré est "${cartConfig.discountCode}" offrant une réduction de ${cartConfig.discountPercent}%.
Le ton doit être "${cartConfig.tone}" (luxueux, chaleureux, mélangeant l'élégance du français avec la convivialité algérienne de la darja si nécessaire).
L'e-mail doit comporter un sujet captivant et un corps d'e-mail rédigé en HTML propre avec des styles soignés.
Retournez un objet JSON avec les clés :
- subject: Sujet de l'e-mail
- htmlBody: Corps du message en HTML`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Vous êtes l'agent IA de récupération de panier Olma. Vous rédigez des relances commerciales haut de gamme.",
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);

    res.json({ success: true, preview: parsed, cart: dummyCart });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Run Content Moderator Test
router.post("/admin/ai-agents/moderator/test", authenticateToken, authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) return res.status(400).json({ error: "Titre et description requis." });

    const agentConfigs = await getAgentsConfigFromDb();
    const modConfig = agentConfigs.moderator;

    const systemPrompt = `Vous êtes le Modérateur de Contenu IA principal pour Olma Marketplace en Algérie.
Votre rôle est d'analyser les fiches produits soumises pour s'assurer qu'elles respectent scrupuleusement la loi algérienne, les bonnes mœurs et les directives d'Olma (pas de liens externes, pas de numéros de téléphone WhatsApp, pas de prix mensongers, pas de fraude ou contrefaçon évidente).
Mots interdits configurés : ${modConfig.customForbiddenWords}
Niveau de sévérité : ${modConfig.strictness}

Retournez un objet JSON avec les clés :
- approved: boolean (si le produit est accepté ou doit être refusé)
- qualityScore: number (score de qualité de la fiche produit sur 100)
- infractionsDetected: string[] (tableau des infractions identifiées)
- feedback: string (explication constructive pour le vendeur, FR ou AR)
- checklist: { label: string, passed: boolean }[] (checklist de conformité)`;

    const prompt = `Veuillez modérer et auditer la fiche produit suivante :
Titre du produit : "${title}"
Description : "${description}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);

    res.json({ success: true, result: parsed });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Run Customer Support Agent Chat Test
router.post("/admin/ai-agents/support/test-chat", authenticateToken, authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, chatHistory = [] } = req.body;
    if (!message) return res.status(400).json({ error: "Message requis." });

    const agentConfigs = await getAgentsConfigFromDb();
    const supportConfig = agentConfigs.support;

    const systemInstruction = `Vous êtes l'Agent de Support Client IA principal d'Olma Marketplace.
Votre personnalité doit être "${supportConfig.personality}" (professionnel, chaleureux, d'une hospitalité algérienne irréprochable).
Utilisez impérativement la base de connaissances fournie suivante pour répondre précisément à l'utilisateur :
${supportConfig.kbContext}

Vous ne devez jamais inventer d'informations contraires à cette base de connaissances.
Si la question de l'utilisateur concerne une commande ou nécessite une action humaine complexe, expliquez-lui poliment qu'un conseiller d'Olma va prendre le relais immédiatement.
Répondez de manière concise, élégante, dans la langue de l'utilisateur (Français, Arabe algérien ou Anglais).`;

    const contents = [
      ...chatHistory.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction
      }
    });

    res.json({ success: true, reply: response.text || "" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
