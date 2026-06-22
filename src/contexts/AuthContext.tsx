import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile } from "../types";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserPlan: (plan: "free" | "pro") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    // Attempt to load saved session
    const saved = localStorage.getItem("lexocr_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      // Mock Google Authentication Flow
      // In the future, this will trigger signInWithPopup(auth, provider)
      const mockGoogleUser: UserProfile = {
        uid: "google-oauth2-mock-12345",
        email: "nguyenvana@gmail.com",
        displayName: "Nguyễn Văn A",
        photoURL: undefined, // undefined to test avatar generation from initials
        plan: "free",
      };
      
      setUser(mockGoogleUser);
      localStorage.setItem("lexocr_user", JSON.stringify(mockGoogleUser));
    } catch (error) {
      console.error("Google authentication failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Mock Sign out
      // In the future: await signOut(auth)
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
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, updateUserPlan }}>
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