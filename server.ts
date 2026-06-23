import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { promises as fsPromises } from "fs";
import { doc, getDoc } from "firebase/firestore";
import dotenv from "dotenv";

dotenv.config();

// Cache in-memory HTML for production
let cachedHtmlTemplate = "";

// Imports extracted into modules
import { admin, db, clientDb, verifyAndFixDb } from "./src/config/firebase-admin";
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

// Tell Express to trust reverse proxy headers securely by whitelisting trusted local and internal subnets
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

import rateLimit from "express-rate-limit";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Trop de requêtes, veuillez réessayer dans 15 minutes."
});

const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: "Trop de requêtes, veuillez réessayer dans une minute."
});

app.use("/api/chat", strictLimiter);
app.use("/api/place-order", strictLimiter);
app.use("/api", apiLimiter);

if (process.env.NODE_ENV === "production") {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com", "https://www.gstatic.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        connectSrc: ["'self'", "https:", "wss:", "ws:"],
        frameSrc: ["'self'", "https://*.firebaseapp.com", "https://*.google.com", "https://apis.google.com"],
        frameAncestors: ["'self'", "https://aistudio.google.com", "https://*.google.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      },
    },
    crossOriginEmbedderPolicy: false,
    xFrameOptions: false,
  }));
} else {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    xFrameOptions: false,
  }));
}
app.use(compression());

const allowedOrigins = [
  "https://aistudio.google.com",
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || 
                      /^https:\/\/ais-.*\.europe-west2\.run\.app$/.test(origin) || 
                      /^http:\/\/localhost:\d+$/.test(origin);
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error("Accès refusé par la politique de CORS OLMART"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

// Health Check Endpoint
app.get("/api/health", async (req, res) => {
  const checks = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    firebase: "unknown",
  };
  
  try {
    await admin.firestore().collection("_health").doc("ping").get();
    checks.firebase = "ok";
  } catch (e) {
    checks.firebase = "error";
  }
  
  const allOk = checks.firebase === "ok";
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "healthy" : "unhealthy",
    ...checks,
  });
});

import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Olma API',
      version: '1.0.0',
      description: 'API for Olma Marketplace',
    },
  },
  apis: ['./src/routes/*.ts'], // read from routes
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const debugLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, message: "Trop de requêtes debug." });
app.use("/api/debug", debugLimiter);

// Mount extracted routers
app.use("/api/auth", authRouter);
app.use("/api", aiRouter);
app.use("/api", ordersRouter);
app.use("/api", adminRouter);
app.use("/api/workspace", workspaceRouter);
app.use("/", coreRouter); // All remaining endpoints

import { Request, Response, NextFunction } from 'express';

// Add Global Error Handler right after API routes
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Global Error Handler caught an error:", err);
  res.status(500).json({ error: "Une erreur interne du serveur est survenue." });
});

async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use('/locales', express.static(path.join(distPath, 'locales'), { maxAge: '1y' }));
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

setupVite().then(async () => {
  try {
    await verifyAndFixDb();
  } catch (err: any) {
    console.error("Firestore Admin verification failed or restricted credentials:", err.message || err);
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    (process.env.NODE_ENV === 'debug' ? console.log : function(){})(`Server running on http://localhost:${PORT}`);
  });

  // Graceful shutdown handling
  const shutdown = (signal: string) => {
    (process.env.NODE_ENV === 'debug' ? console.log : function(){})(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(() => {
      (process.env.NODE_ENV === 'debug' ? console.log : function(){})("Closed out remaining connections.");
      process.exit(0);
    });

    // Force close after 10s if connections are hanging
    setTimeout(() => {
      console.error("Could not close connections in time, forcefully shutting down");
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
});
