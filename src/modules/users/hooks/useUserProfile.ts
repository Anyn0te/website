"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/modules/auth/AuthContext";
import { ThemePreference } from "../types";

const GUEST_ID_STORAGE_KEY = "anynote:guest-id";

const createGuestId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `guest-${crypto.randomUUID()}`;
  }

  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export interface UserProfile {
  userId: string;
  username: string | null;
  displayUsername: boolean;
  themePreference: ThemePreference;
  following: string[];
  followers: string[];
}

interface UseUserProfileResult {
  userId: string | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: {
    username: string | null;
    displayUsername: boolean;
    themePreference: ThemePreference;
  }) => Promise<void>;
}

const resolveTheme = (preference: ThemePreference): ThemePreference => {
  if (preference === "light" || preference === "dark") {
    return preference;
  }
  if (typeof window !== "undefined") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }
  return "light";
};

const applyThemePreference = (preference: ThemePreference) => {
  if (typeof document === "undefined") {
    return;
  }

  const resolved = resolveTheme(preference);
  document.documentElement.setAttribute("data-theme", resolved);
};

export const useUserProfile = (): UseUserProfileResult => {
  const { user, token, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);

  const resetThemeToSystem = useCallback(() => {
    if (typeof document === "undefined") {
      return;
    }
    applyThemePreference("system");
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!token) {
      setProfile(null);
      resetThemeToSystem();
      setProfileLoading(false);
      setError(null);
      return;
    }

    setProfileLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Unable to load user settings.");
      }

      const payload = (await response.json()) as { user?: UserProfile };
      if (payload.user) {
        setProfile(payload.user);
        applyThemePreference(payload.user.themePreference);
      }
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load user profile.",
      );
    } finally {
      setProfileLoading(false);
    }
  }, [token, resetThemeToSystem]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!token) {
      setProfile(null);
      resetThemeToSystem();
      return;
    }

    void fetchProfile();
  }, [authLoading, token, fetchProfile, resetThemeToSystem]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!token) {
      let stored = window.localStorage.getItem(GUEST_ID_STORAGE_KEY);
      if (!stored) {
        stored = createGuestId();
        window.localStorage.setItem(GUEST_ID_STORAGE_KEY, stored);
      }
      document.cookie = `anynote_guest_id=${stored}; path=/; max-age=31536000`;
      setGuestId(stored);
    } else {
      document.cookie = "anynote_guest_id=; path=/; max-age=0";
      setGuestId(null);
    }
  }, [token]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (profile?.themePreference === "system") {
        applyThemePreference("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [profile?.themePreference]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async ({
      username,
      displayUsername,
      themePreference,
    }: {
      username: string | null;
      displayUsername: boolean;
      themePreference: ThemePreference;
    }) => {
      if (!token || !user?.uid) {
        throw new Error("User profile is not ready.");
      }

      setProfileLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/user", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            username,
            displayUsername,
            themePreference,
          }),
        });

        const payload = (await response.json()) as {
          user?: UserProfile;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to update settings.");
        }

        if (payload.user) {
          setProfile(payload.user);
          applyThemePreference(payload.user.themePreference);
        }
      } catch (updateError) {
        const normalizedError =
          updateError instanceof Error
            ? updateError
            : new Error("Unable to update user profile.");
        setError(normalizedError.message);
        throw normalizedError;
      } finally {
        setProfileLoading(false);
      }
    },
    [token, user?.uid]
  );

  const resolvedUserId = useMemo(() => user?.uid ?? guestId, [user?.uid, guestId]);

  return {
    userId: resolvedUserId,
    profile,
    isLoading: authLoading || profileLoading,
    error,
    refreshProfile,
    updateProfile,
  };
};
