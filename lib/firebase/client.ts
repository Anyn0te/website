import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const ensureFirebaseApp = () => {
  if (!firebaseConfig.apiKey) {
    throw new Error(
      "Missing Firebase client configuration. Set NEXT_PUBLIC_FIREBASE_* environment variables.",
    );
  }

  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
};

export const getFirebaseAuth = () => {
  ensureFirebaseApp();
  return getAuth();
};

