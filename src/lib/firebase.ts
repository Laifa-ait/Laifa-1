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
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCsGYo1B0vavSQbKdFvu0-7jfzILFHvejA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "original-micron-7sjh2.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "original-micron-7sjh2",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "original-micron-7sjh2.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "76420360525",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:76420360525:web:d6781ea77ef0c2257aef04",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XQW5YY2C36",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "(default)",
};

const app = initializeApp(clientConfig);

export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  clientConfig.firestoreDatabaseId
);

export const auth = getAuth(app);
export const storage = getStorage(app);

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
