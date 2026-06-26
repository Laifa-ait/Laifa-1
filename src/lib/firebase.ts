import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser,
  updateProfile,
  sendPasswordResetEmail,
  connectAuthEmulator,
  Auth,
} from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  connectFirestoreEmulator,
  Firestore,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator, FirebaseStorage } from "firebase/storage";

const clientConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "(default)",
};

const requiredVars = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID'];
for (const key of requiredVars) {
  if (!import.meta.env[key]) {
    console.warn(`Variable d'environnement manquante : ${key}`);
  }
}

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

try {
  const dbOptions = { experimentalForceLongPolling: true };
  
  app = getApps().length === 0 ? initializeApp(clientConfig) : getApp();
  db = initializeFirestore(app, dbOptions, clientConfig.firestoreDatabaseId);
  auth = getAuth(app);
  storage = getStorage(app);
} catch (err: any) {
  if (err.code === 'app/duplicate-app') {
    app = getApp();
    db = getFirestore(app, clientConfig.firestoreDatabaseId);
    auth = getAuth(app);
    storage = getStorage(app);
  } else {
    console.error("Firebase initialization failed:", err);
    // Au lieu de crash (écran blanc ou Vite bloqué), nous utilisons une config factice (dummy)
    // Cela permet au SDK d'instancier les objets Auth/Firestore sans bloquer l'exécution JS.
    // L'interface React pourra donc se charger et afficher l'erreur proprement.
    const fallbackConfig = {
      apiKey: "AIzaSy_dummy_key_to_prevent_crash",
      authDomain: "dummy.firebaseapp.com",
      projectId: "dummy-project",
      storageBucket: "dummy.appspot.com",
      messagingSenderId: "123456789012",
      appId: "1:123456789012:web:1234567890123456789012"
    };
    app = initializeApp(fallbackConfig, "DummyAppForErrorRecovery");
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
  }
}

export { app, db, auth, storage };

// FINOPS FIX: Emulators disabled for AI Studio preview environment
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Auth helpers
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// Firestore Error Handler
export const OperationType = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LIST: "list",
  GET: "get",
  WRITE: "write",
} as const;
export type OperationType = (typeof OperationType)[keyof typeof OperationType];

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  // throw new Error(JSON.stringify(errInfo));
}

// User Profile helpers
export async function syncUserProfile(user: User) {
  const userRef = doc(db, "users", user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: "buyer",
        addresses: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastAuthMethod: "sync_helper",
      });
    }
  } catch (error) {
    console.warn("Sync Profile error (Client):", error);
  }
}

// Timeout helper to avoid indefinite hanging on slow Firestore/network connections
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 15000,
  errorMsg = "La requête de base de données a expiré. Veuillez vérifier votre connexion."
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMsg));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

