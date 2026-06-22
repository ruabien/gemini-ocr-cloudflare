import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile } from "../types";
import { auth, googleProvider, isFirebaseConfigured } from "../lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserPlan: (plan: "free" | "pro") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize auth state listener
  useEffect(() => {
    if (!isFirebaseConfigured) {
      // No Firebase config – remain unauthenticated and clear any mock session
      setUser(null);
      localStorage.removeItem("lexocr_user");
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
        };
        setUser(profile);
        localStorage.setItem("lexocr_user", JSON.stringify(profile));
      } else {
        setUser(null);
        localStorage.removeItem("lexocr_user");
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    if (!isFirebaseConfigured) {
      console.error("Chưa cấu hình Firebase Google Login.");
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
        plan: "free",
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
      value={{ user, loading, loginWithGoogle, logout, updateUserPlan }}
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