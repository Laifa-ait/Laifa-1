import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp as initClientApp } from "firebase/app";
import {
  getFirestore as getClientFirestore,
  collection as clientCollection,
  getDocs as clientGetDocs,
} from "firebase/firestore";
import fs from "fs";
import path from "path";

// Load Firebase Config
export let firebaseConfig: Record<string, any> = {};
export let clientApp: any = null;
export let clientDb: any = null;

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (firebaseConfig && Object.keys(firebaseConfig).length > 0) {
      clientApp = initClientApp(firebaseConfig);
      clientDb = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId || "(default)");
    }
  } else {
    (process.env.NODE_ENV === "development" ? console.log : function () {})(
      "firebase-applet-config.json introuvable, initialisation du client ignorée."
    );
  }
} catch (err) {
  console.error("Impossible de lire firebase-applet-config.json, utilisation des paramètres par défaut", err);
}

// Initialize Firebase Admin
(process.env.NODE_ENV === "development" ? console.log : function () {})(
  "------------------ FIREBASE INITIALIZATION ------------------"
);
// Prioritize Environment Project ID as it is guaranteed to match the Ambient Credentials (ADC)
const envProjectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
const configProjectId = firebaseConfig.projectId;
const targetProjectId = envProjectId || configProjectId;

(process.env.NODE_ENV === "development" ? console.log : function () {})("Environment Project ID:", envProjectId);
(process.env.NODE_ENV === "development" ? console.log : function () {})("Config Project ID:", configProjectId);
(process.env.NODE_ENV === "development" ? console.log : function () {})("Effective Target Project ID:", targetProjectId);

try {
  if (admin.apps.length > 0) {
    const existingApp = admin.app();
    (process.env.NODE_ENV === "development" ? console.log : function () {})(
      "Firebase: Reusing existing [DEFAULT] app:",
      existingApp.name
    );
  } else {
    // Prioritize targetProjectId from config / environment
    const runtimeProjectId = targetProjectId;
    if (!runtimeProjectId) {
      console.warn(
        "Firebase: targetProjectId is undefined. Provide FIREBASE_PROJECT_ID env var or firebase-applet-config.json"
      );
    }
    (process.env.NODE_ENV === "development" ? console.log : function () {})(
      "Firebase: Initializing with project ID:",
      runtimeProjectId
    );

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      (process.env.NODE_ENV === "development" ? console.log : function () {})(
        "Firebase: Initializing with explicit Service Account credentials."
      );
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      } catch (err) {
        console.error("Firebase Admin: FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON.");
      }

      if (serviceAccount) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: runtimeProjectId,
        });
      } else {
        admin.initializeApp({ projectId: runtimeProjectId });
      }
    } else {
      admin.initializeApp({
        projectId: runtimeProjectId,
      });
    }
  }
} catch (e: any) {
  console.error("Firebase Admin initialization error:", e.message);
}

export let db: admin.firestore.Firestore;
const setupFirestore = () => {
  try {
    const adminApp = admin.app();
    let configDatabaseId = firebaseConfig.firestoreDatabaseId;
    if (!configDatabaseId || configDatabaseId === "(default)") {
      if (process.env.VITE_FIREBASE_DATABASE_ID && process.env.VITE_FIREBASE_DATABASE_ID !== "(default)") {
        configDatabaseId = process.env.VITE_FIREBASE_DATABASE_ID;
      }
    }

    (process.env.NODE_ENV === "development" ? console.log : function () {})(
      "Firestore: Initializing for project",
      adminApp.options.projectId
    );

    // Attempt with named database if provided
    if (configDatabaseId && configDatabaseId !== "(default)") {
      (process.env.NODE_ENV === "development" ? console.log : function () {})(
        "Firestore: Attempting with Target database ID:",
        configDatabaseId
      );
      try {
        const testDb = getFirestore(adminApp, configDatabaseId);
        // We don't await here to avoid blocking startup excessively,
        // but we will use this logic to set 'db'
        db = testDb;
        (process.env.NODE_ENV === "development" ? console.log : function () {})(
          "Firestore: Initialized with Named DB:",
          configDatabaseId
        );
      } catch (dbErr: any) {
        console.error("Firestore: Named DB init failed, falling back to default.", dbErr.message);
        db = adminApp.firestore();
      }
    } else {
      db = adminApp.firestore();
      (process.env.NODE_ENV === "development" ? console.log : function () {})("Firestore: Using (default) database.");
    }
  } catch (err: any) {
    console.error("Firestore: Critical setup failure:", err.message);
  }
};

export const verifyAndFixDb = async () => {
  if (!db) {
    throw new Error("Firestore Admin SDK DB instance is not initialized.");
  }
  // Try a tiny read to check permissions
  await db.collection("products").limit(1).get();
  (process.env.NODE_ENV === "development" ? console.log : function () {})("Firestore: Connection verified.");
};

setupFirestore();
(process.env.NODE_ENV === "development" ? console.log : function () {})("-----------------------------------------");

export { admin, clientCollection, clientGetDocs };
