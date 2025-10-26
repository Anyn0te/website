"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/modules/auth/AuthContext";
import { ThemePreference } from "../types";
import {
  clearGuestIdentity,
  ensureGuestIdentity,
  getStoredGuestId,
} from "../utils/guestIdentity";

const GUEST_THEME_STORAGE_KEY = "anynote:guest-theme-preference"; 

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
  setThemePreference: (theme: ThemePreference) => Promise<void>; 
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
  try {
    const cookieValue = encodeURIComponent(preference);
    document.cookie = `anynote_theme_pref=${cookieValue}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // ignore cookie failures
  }
};

const normalizeTheme = (value: unknown): ThemePreference => {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
};

export const useUserProfile = (): UseUserProfileResult => {
  const { user, token, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestId, setGuestId] = useState<string | null>(() => getStoredGuestId());
  const [guestTheme, setGuestTheme] = useState<ThemePreference>("system");
  const updateGuestTheme = useCallback((newTheme: ThemePreference) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GUEST_THEME_STORAGE_KEY, newTheme);
      applyThemePreference(newTheme);
      setGuestTheme(newTheme);
    }
  }, []);

  const resetThemeToSystem = useCallback(() => {
    if (typeof document === "undefined") {
      return;
    }
    applyThemePreference("system");
    setGuestTheme("system"); 
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!token) {
      setProfile(null);
      setProfileLoading(false);
      setError(null);
      if (typeof window !== "undefined") {
        const storedTheme = window.localStorage.getItem(GUEST_THEME_STORAGE_KEY);
        const resolvedTheme = normalizeTheme(storedTheme);
        applyThemePreference(resolvedTheme);
        setGuestTheme(resolvedTheme);
      } else {
        resetThemeToSystem();
      }
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
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(GUEST_THEME_STORAGE_KEY);
        }
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

    void fetchProfile();
  }, [authLoading, fetchProfile]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!token) {
      const id = ensureGuestIdentity();
      setGuestId(id);
    } else {
      clearGuestIdentity();
      setGuestId(null);
    }
  }, [token]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const currentPreference = profile?.themePreference ?? guestTheme;
      if (currentPreference === "system") {
        applyThemePreference("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [profile?.themePreference, guestTheme]);

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
      if (!token) {
        throw new Error("Cannot save username or display settings without signing in.");
      }
      
      if (!user?.uid) {
        throw new Error("User profile is not ready for authenticated update.");
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

  const setThemePreference = useCallback(async (newTheme: ThemePreference) => {
    applyThemePreference(newTheme); 

    if (!token) {
      updateGuestTheme(newTheme);
      return;
    }

    if (!profile) {
        updateGuestTheme(newTheme); 
        return;
    }
    
    try {
        await updateProfile({
            username: profile.username,
            displayUsername: profile.displayUsername,
            themePreference: newTheme,
        });
    } catch (error) {
        console.error("Failed to save theme for authenticated user:", error);
    }

  }, [token, profile, updateGuestTheme, updateProfile]);


  const resolvedUserId = useMemo(() => user?.uid ?? guestId, [user?.uid, guestId]);

  const guestProfile: UserProfile = useMemo(() => ({
    userId: resolvedUserId ?? '',
    username: null,
    displayUsername: false,
    themePreference: guestTheme,
    followers: [],
    following: [],
  }), [resolvedUserId, guestTheme]);

  const activeProfile = token ? profile : (resolvedUserId ? guestProfile : null); 

  return {
    userId: resolvedUserId,
    profile: activeProfile, 
    isLoading: authLoading || profileLoading,
    error,
    refreshProfile,
    updateProfile,
    setThemePreference, 
  };
};
