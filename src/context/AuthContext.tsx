import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { ALGERIA_WILAYAS, ALGERIA_SHIPPING_DATA } from "../constants";
import { UserProfile } from "../types";
import toast from "react-hot-toast";

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: (role?: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const checkIsAdminEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const adminEmailEnv = import.meta.env.VITE_ADMIN_EMAIL;
  return email === adminEmailEnv;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        setUserProfile(null);
        setLoading(false);
      } else {
        // Auto-heal missing user documents (Only if email is verified)
        if (user.emailVerified) {
          try {
            const userDocRef = doc(db, "users", user.uid);
            let userDoc;
            try {
              userDoc = await getDoc(userDocRef);
            } catch (err) {
              console.warn("AuthContext: getDoc failed", err);
              throw err;
            }

            const isAdminEmail = checkIsAdminEmail(user.email);

            if (!userDoc.exists()) {
              if (process.env.NODE_ENV === "development") {
                console.log("AuthContext: Auto-syncing user profile for", user.email);
              }
              const initialProfile = {
                uid: user.uid,
                displayName: user.displayName || "Utilisateur",
                email: user.email,
                role: isAdminEmail ? "admin" : "buyer",
                onboardingCompleted: true,
                createdAt: serverTimestamp(),
                lastAuthMethod: "auto_sync",
                status: "active",
              };
              try {
                await setDoc(userDocRef, initialProfile);
                if (process.env.NODE_ENV === "development") {
                  console.log("AuthContext: Auto-sync successful");
                }
              } catch (err) {
                console.warn("AuthContext: setDoc failed", err);
                throw err;
              }
            } else if (isAdminEmail && userDoc.data()?.role !== "admin") {
              if (process.env.NODE_ENV === "development") {
                console.log("AuthContext: Auto-promoting to admin for", user.email);
              }
              try {
                await setDoc(userDocRef, { role: "admin" }, { merge: true });
              } catch (err) {
                console.warn("AuthContext: Admin promotion failed", err);
              }
            }
          } catch (err) {
            console.warn("AuthContext: Failed to auto-heal profile", err);
          }
        }
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    let unsubscribeProfile: () => void = () => {};
    if (currentUser) {
      unsubscribeProfile = onSnapshot(
        doc(db, "users", currentUser.uid),
        async (snapshot) => {
          if (snapshot.exists()) {
            const profileData = snapshot.data();
            setUserProfile(profileData as UserProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        },
        (err) => {
          console.error("Auth snapshot error:", err);
          setUserProfile(null);
          setLoading(false);
        }
      );
    }
    return () => unsubscribeProfile();
  }, [currentUser]);

  const signInWithGoogle = async (role?: string) => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
      });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Create/update user doc
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const userRole = checkIsAdminEmail(user.email) ? "admin" : role || "buyer";
        const userStatus = userRole === "seller" ? "pending_verification" : "active";

        const defaultTariffs: Record<string, number> = {};
        if (userRole === "seller") {
          ALGERIA_WILAYAS.forEach((w) => {
            const cleanName = w.replace(/^\d+\s+/, "").trim();
            const known = ALGERIA_SHIPPING_DATA[cleanName] || ALGERIA_SHIPPING_DATA.Default;
            defaultTariffs[w] = known.price;
          });
        }

        await setDoc(userDocRef, {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          role: userRole,
          onboardingCompleted: false,
          status: userStatus,
          createdAt: serverTimestamp(),
          ...(userRole === "seller" ? { isVerified: false, trustScore: 50, shippingTariffs: defaultTariffs } : {}),
        });

        if (userRole === "seller") {
          try {
            await addDoc(collection(db, "internal_notifications"), {
              type: "NEW_SELLER_REGISTRATION",
              title: "Nouvelle Inscription Vendeur (Google)",
              message: `Le vendeur "${user.displayName}" vient de s'inscrire sur la plateforme et attend la vérification de compte.`,
              sellerId: user.uid,
              createdAt: serverTimestamp(),
              read: false,
            });
          } catch (err) {
            console.warn("Failed sending seller registration internal notification", err);
          }
        }
      }
    } catch (err: any) {
      if (err.code === "auth/popup-blocked") {
        toast.error("Veuillez autoriser les popups pour vous connecter avec Google");
      } else if (err.code === "auth/network-request-failed") {
        toast.error("Erreur réseau. Vérifiez votre connexion.");
      } else {
        toast.error("Erreur de connexion Google");
      }
      console.error("Google sign-in error:", err);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    const user = result.user;

    // Ensure doc exists ONLY if verified
    if (user.emailVerified) {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        const pendingRole = localStorage.getItem("olmart_pending_registration_role") || "buyer";
        const userRole = pendingRole === "seller" ? "seller" : "buyer";
        const userStatus = userRole === "seller" ? "pending_verification" : "active";

        const defaultTariffs: Record<string, number> = {};
        if (userRole === "seller") {
          ALGERIA_WILAYAS.forEach((w) => {
            const cleanName = w.replace(/^\d+\s+/, "").trim();
            const known = ALGERIA_SHIPPING_DATA[cleanName] || ALGERIA_SHIPPING_DATA.Default;
            defaultTariffs[w] = known.price;
          });
        }

        const nextDocData: any = {
          uid: user.uid,
          displayName: user.displayName || email.split("@")[0],
          email: user.email,
          role: userRole,
          onboardingCompleted: false,
          status: userStatus,
          createdAt: serverTimestamp(),
          lastAuthMethod: "email",
          ...(userRole === "seller" ? { isVerified: false, trustScore: 50, shippingTariffs: defaultTariffs } : {}),
        };

        await setDoc(userDocRef, nextDocData);
        localStorage.removeItem("olmart_pending_registration_role");

        if (userRole === "seller") {
          try {
            await addDoc(collection(db, "internal_notifications"), {
              type: "NEW_SELLER_REGISTRATION",
              title: "Nouvelle Inscription Vendeur (Email)",
              message: `Le vendeur "${user.displayName || email}" vient de s'inscrire via e-mail.`,
              sellerId: user.uid,
              createdAt: serverTimestamp(),
              read: false,
            });
          } catch (err) {
            console.warn("Failed sending seller registration internal notification", err);
          }
        }
      }
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, role: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    const userRole = checkIsAdminEmail(email) ? "admin" : role || "buyer";

    // Update profile in Auth
    await updateProfile(result.user, { displayName: name });

    // Save to Firestore immediately to securely store the requested role
    const userDocRef = doc(db, "users", result.user.uid);
    const userStatus = userRole === "seller" ? "pending_verification" : "active";

    const defaultTariffs: Record<string, number> = {};
    if (userRole === "seller") {
      ALGERIA_WILAYAS.forEach((w) => {
        const cleanName = w.replace(/^\d+\s+/, "").trim();
        const known = ALGERIA_SHIPPING_DATA[cleanName] || ALGERIA_SHIPPING_DATA.Default;
        defaultTariffs[w] = known.price;
      });
    }

    await setDoc(userDocRef, {
      uid: result.user.uid,
      displayName: name,
      email: email,
      role: userRole,
      onboardingCompleted: false,
      status: userStatus,
      createdAt: serverTimestamp(),
      ...(userRole === "seller" ? { isVerified: false, trustScore: 50, shippingTariffs: defaultTariffs } : {}),
    });

    // Send verification email
    await sendEmailVerification(result.user);

    // Remember locally in case of auto-login healing needed across refresh
    try {
      localStorage.setItem("olmart_pending_registration_role", userRole);
    } catch { /* ignore */ }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = React.useMemo(
    () => ({
      currentUser,
      userProfile,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      logout,
    }),
    [currentUser, userProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
