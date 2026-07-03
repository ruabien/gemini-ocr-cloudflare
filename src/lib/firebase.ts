import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDV_xac7TqSAE_L55vKAVaDx_8E3s-eHLY",
  authDomain: "lexocr-ec982.firebaseapp.com",
  projectId: "lexocr-ec982",
  storageBucket: "lexocr-ec982.firebasestorage.app",
  messagingSenderId: "816443536714",
  appId: "1:816443536714:web:13500f39fac357fc52bdb3",
  measurementId: "G-JTNB8EML49"
};

// Check if Firebase is configured (we require apiKey to be present)
export const isFirebaseConfigured = !!firebaseConfig.apiKey;

let app;
let auth: any = null;
let googleProvider: any = null;
let db: any = null;

if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  // Set browser local persistence to maintain sign-in state on page refresh
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Firebase persistence setup failed:", error);
  });
  googleProvider = new GoogleAuthProvider();
}

export { auth, googleProvider, db };
