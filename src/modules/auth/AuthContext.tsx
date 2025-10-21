"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const tokenRefreshIntervalMs = 15 * 60 * 1000;

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const auth = getFirebaseAuth();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const freshToken = await firebaseUser.getIdToken();
        setToken(freshToken);
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    const interval = setInterval(async () => {
      if (!auth.currentUser) {
        return;
      }

      try {
        const refreshed = await auth.currentUser.getIdToken(true);
        setToken(refreshed);
      } catch (refreshError) {
        console.error("Failed to refresh auth token", refreshError);
      }
    }, tokenRefreshIntervalMs);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [auth]);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
  }, [auth]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, [auth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      signInWithGoogle,
      signOutUser,
    }),
    [user, token, loading, signInWithGoogle, signOutUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

