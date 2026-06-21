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
  sendEmailVerification
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { ALGERIA_WILAYAS, ALGERIA_SHIPPING_DATA } from "../constants";

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: any | null;
  loading: boolean;
  signInWithGoogle: (role?: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
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
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
              console.log("AuthContext: Auto-syncing user profile for", user.email);
              const initialProfile = {
                uid: user.uid,
                displayName: user.displayName || "Utilisateur",
                email: user.email,
                role: user.email === 'laifa.ait@gmail.com' ? 'admin' : 'buyer',
                onboardingCompleted: true,
                createdAt: serverTimestamp(),
                lastAuthMethod: 'auto_sync'
              };
              await setDoc(userDocRef, initialProfile);
              setUserProfile(initialProfile);
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
      unsubscribeProfile = onSnapshot(doc(db, "users", currentUser.uid), async (snapshot) => {
        if (snapshot.exists()) {
          const profileData = snapshot.data();
          setUserProfile(profileData);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      }, (err) => {
        console.error("Auth snapshot error:", err);
        setUserProfile(null);
        setLoading(false);
      });
    }
    return () => unsubscribeProfile();
  }, [currentUser]);

  const signInWithGoogle = async (role?: string) => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Create/update user doc
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const userRole = user.email === 'laifa.ait@gmail.com' ? 'admin' : (role || 'buyer');
      const userStatus = userRole === 'seller' ? 'pending_verification' : 'active';
      
      const defaultTariffs: Record<string, number> = {};
      if (userRole === 'seller') {
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
        ...(userRole === 'seller' ? { isVerified: false, trustScore: 50, shippingTariffs: defaultTariffs } : {})
      });
      
      if (userRole === "seller") {
        try {
          await addDoc(collection(db, "internal_notifications"), {
            type: "NEW_SELLER_REGISTRATION",
            title: "Nouvelle Inscription Vendeur (Google)",
            message: `Le vendeur "${user.displayName}" vient de s'inscrire sur la plateforme et attend la vérification de compte.`,
            sellerId: user.uid,
            createdAt: serverTimestamp(),
            read: false
          });
        } catch (err) {
           console.warn("Failed sending seller registration internal notification", err);
        }
      }
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
          lastAuthMethod: 'email',
          ...(userRole === 'seller' ? { isVerified: false, trustScore: 50, shippingTariffs: defaultTariffs } : {})
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
              read: false
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
    
    // Update profile in Auth
    await updateProfile(result.user, { displayName: name });
    
    // Send verification email
    await sendEmailVerification(result.user);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      userProfile, 
      loading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
