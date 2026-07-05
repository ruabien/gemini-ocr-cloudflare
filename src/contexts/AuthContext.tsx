import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile, PlanType } from "../types";
import { auth, googleProvider, db, isFirebaseConfigured } from "../lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserPlan: (plan: "free" | "pro") => void;
  isPro: boolean;
  expiredAt: number | null;
  planType: PlanType | null;
  loadingSubscription: boolean;
  subscription: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [isPro, setIsPro] = useState(false);
  const [expiredAt, setExpiredAt] = useState<number | null>(null);
  const [planType, setPlanType] = useState<PlanType | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  // Initialize auth state listener
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setUser(null);
      localStorage.removeItem("lexocr_user");
      setLoadingSubscription(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const profile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? "",
          displayName: firebaseUser.displayName ?? "",
          photoURL: firebaseUser.photoURL ?? undefined,
          plan: "free",
          providerData: firebaseUser.providerData,
          metadata: {
            creationTime: firebaseUser.metadata.creationTime,
            lastSignInTime: firebaseUser.metadata.lastSignInTime,
          },
        };
        setUser(profile);
        localStorage.setItem("lexocr_user", JSON.stringify(profile));
      } else {
        setUser(null);
        localStorage.removeItem("lexocr_user");
        setIsPro(false);
        setExpiredAt(null);
        setPlanType(null);
        setSubscription(null);
        setLoadingSubscription(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Realtime subscription listener
  useEffect(() => {
    if (!user || !db) {
      setLoadingSubscription(false);
      return;
    }

    setLoadingSubscription(true);
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSubscription(data);
        
        let expTime: number | null = null;
        if (data.expiredAt) {
          expTime = data.expiredAt.toMillis ? data.expiredAt.toMillis() : new Date(data.expiredAt).getTime();
        }
        
        setExpiredAt(expTime);
        setPlanType(data.planType || null);
        
        const isCurrentlyPro = expTime !== null && expTime > Date.now();
        setIsPro(isCurrentlyPro);
        
        // Cập nhật lại user.plan
        const currentPlan = isCurrentlyPro ? "pro" : "free";
        setUser(prev => prev ? { ...prev, plan: currentPlan } : null);
        
      } else {
        // Fallback to FREE if no document
        setSubscription(null);
        setExpiredAt(null);
        setPlanType(null);
        setIsPro(false);
        setUser(prev => prev ? { ...prev, plan: "free" } : null);
      }
      setLoadingSubscription(false);
    }, (error) => {
      console.error("Error fetching realtime subscription:", error);
      setLoadingSubscription(false);
    });

    return () => unsubscribeSnapshot();
  }, [user?.uid]);

  const loginWithGoogle = async () => {
    if (!isFirebaseConfigured) {
      window.alert("Cấu hình Firebase chưa hoàn thiện. Vui lòng kiểm tra file .env hoặc src/lib/firebase.ts!");
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      const profile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? "",
        displayName: firebaseUser.displayName ?? "",
        photoURL: firebaseUser.photoURL ?? undefined,
        plan: "free", // Plan will be synced from Firestore
        providerData: firebaseUser.providerData,
        metadata: {
          creationTime: firebaseUser.metadata.creationTime,
          lastSignInTime: firebaseUser.metadata.lastSignInTime,
        },
      };
      setUser(profile);
      localStorage.setItem("lexocr_user", JSON.stringify(profile));
    } catch (error) {
      console.error("Google authentication failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (!isFirebaseConfigured) {
      setUser(null);
      localStorage.removeItem("lexocr_user");
      return;
    }
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      localStorage.removeItem("lexocr_user");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserPlan = (plan: "free" | "pro") => {
    if (user) {
      const updated = { ...user, plan };
      setUser(updated);
      localStorage.setItem("lexocr_user", JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        loading, 
        loginWithGoogle, 
        logout, 
        updateUserPlan,
        isPro,
        expiredAt,
        planType,
        loadingSubscription,
        subscription
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}