import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { promises as fsPromises } from "fs";
import { doc, getDoc } from "firebase/firestore";

// Cache in-memory HTML for production
let cachedHtmlTemplate = "";

// Imports extracted into modules
import { admin, db, clientDb } from "./src/config/firebase-admin";
import { ai } from "./src/config/gemini";
import { authenticateToken, authorizeAdmin, authorizeSeller } from "./src/middlewares/auth";

import authRouter from "./src/routes/auth";
import aiRouter from "./src/routes/ai";
import ordersRouter from "./src/routes/orders";
import adminRouter from "./src/routes/admin";
import coreRouter from "./src/routes/core";
import workspaceRouter from "./src/routes/workspace";

const app = express();
const PORT = 3000;

// Tell Express to trust reverse proxy headers (Cloud Run, Nginx, etc.)
app.set('trust proxy', 1);

import rateLimit from "express-rate-limit";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Trop de requêtes, veuillez réessayer dans 15 minutes.",
  validate: { default: false }
});

const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: "Trop de requêtes, veuillez réessayer dans une minute.",
  validate: { default: false }
});

app.use("/api/chat", strictLimiter);
app.use("/api/place-order", strictLimiter);
app.use("/api", apiLimiter);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

// Mount extracted routers
app.use("/api/auth", authRouter);
app.use("/api", authRouter); // Sync user claims
app.use("/api", aiRouter);
app.use("/api", ordersRouter);
app.use("/api", adminRouter);
app.use("/api/workspace", workspaceRouter);
app.use("/", coreRouter); // All remaining endpoints

async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));

    // PERFORMANCE : Lecture du fichier index.html UNE SEULE FOIS au démarrage
    try {
      cachedHtmlTemplate = await fsPromises.readFile(path.join(distPath, 'index.html'), 'utf-8');
    } catch (e) {
      console.error("Erreur de chargement du template HTML:", e);
    }

    app.get('/', (req, res) => {
      res.send(cachedHtmlTemplate);
    });

    app.get('/product/:id', async (req, res) => {
      try {
        const productId = req.params.id;
        const productSnap = await getDoc(doc(clientDb, 'products', productId));
        let html = cachedHtmlTemplate || "";

        if (productSnap.exists()) {
          const product = productSnap.data();
          const title = product.name || 'Olma Marketplace';
          const description = (product.description || 'Découvrez ce produit sur Olma Marketplace.').substring(0, 160).replace(/"/g, '&quot;');
          const images = product.images || [];
          const image = images.length > 0 ? images[0] : (product.image || '');

          html = html.replace(/<title>.*?<\/title>/i, `<title>${title} | Olma</title>`);
          const metaTags = `
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
</head>`;
          html = html.replace('</head>', metaTags);

          // CDN CLOUDFLARE : Permet de cacher la page du produit pendant 1h sur le CDN
          res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        }
        res.send(html);
      } catch (err) {
        console.error('Erreur SSR Produit:', err);
        res.send(cachedHtmlTemplate);
      }
    });

    app.get('*', (req, res) => res.send(cachedHtmlTemplate));
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
