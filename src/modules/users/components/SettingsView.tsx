"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/navigation/BottomNav";
import CreateNoteModal from "@/modules/notes/components/CreateNoteModal";
import { useNotesData } from "@/modules/notes/hooks/useNotesData";
import { useAuth } from "@/modules/auth/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { ThemePreference } from "../types";

const themeOptions: Array<{ label: string; value: ThemePreference }> = [
  { label: "System (default)", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

const SettingsView = () => {
  const {
    token,
    loading: authLoading,
    signInWithGoogle,
    signOutUser,
  } = useAuth();
  const { userId, profile, isLoading, error, updateProfile, refreshProfile, setThemePreference } = useUserProfile();
  const { reload } = useNotesData(userId, token ?? null);

  const [username, setUsername] = useState("");
  const [displayUsername, setDisplayUsername] = useState(false);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system"); 
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? "");
      setDisplayUsername(Boolean(profile.displayUsername && profile.username));
      setThemePreferenceState(profile.themePreference); 
    }
  }, [profile]);

  useEffect(() => {
    if (!formSuccess) {
      return;
    }

    const timeout = window.setTimeout(() => setFormSuccess(null), 2500);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [formSuccess]);

  const canDisplayUsername = useMemo(
    () => username.trim().length > 0,
    [username],
  );

  const canEditProfile = Boolean(token);

  const handleThemeChange = async (newTheme: ThemePreference) => {
    setThemePreferenceState(newTheme); 
    try {
      await setThemePreference(newTheme);
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : "Unable to update theme.";
      setFormError(message);
    }
  };

  const isProfileChanged =
    username !== (profile?.username ?? "") ||
    displayUsername !== Boolean(profile?.displayUsername && profile?.username);

  const isSaveDisabled = useMemo(() => {
    if (isLoading || isSaving) return true;
    return !token || !isProfileChanged;
  }, [isLoading, isSaving, token, isProfileChanged]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !userId) {
      setFormError("Sign in to update your profile settings.");
      return;
    }
    
    if (!isProfileChanged) {
        return; 
    }

    if (displayUsername && !canDisplayUsername) {
      setFormError("Set a unique username before choosing to display it.");
      return;
    }

    setFormError(null);
    setFormSuccess(null);
    setIsSaving(true);

    try {
      await updateProfile({
        username: username.trim() || null,
        displayUsername,
        themePreference, 
      });
      await Promise.all([reload(), refreshProfile()]); 
      setFormSuccess("Profile settings saved successfully.");
    } catch (updateError) {
      setFormError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update settings."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const anonymousHint =
    displayUsername && canDisplayUsername && token
      ? `Your notes will appear as @${username.trim()}`
      : "Your notes remain anonymous to others.";
  const isDisabledForGuests = !canEditProfile || isSaving;

  return (
    <div className="min-h-screen bg-[color:var(--color-app-bg)] p-6 pb-[220px] md:pb-32 transition-colors">
      <header className="mx-auto mb-8 max-w-3xl rounded-2xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-panel-bg)] p-6 shadow-[0_12px_26px_var(--color-glow)] animate-fade-up">
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h1 className="text-3xl font-bold text-[color:var(--color-text-primary)]">
              Settings
            </h1>
            <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
              Control how your notes appear and how the app looks.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 md:flex-row">
            {!token && !authLoading && (
              <button
                onClick={signInWithGoogle}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] px-5 py-2 text-sm font-semibold text-[color:var(--color-on-accent)] shadow-[0_8px_18px_var(--color-glow)] transition-colors hover:bg-[color:var(--color-accent-hover)]"
              >
                <i className="bi bi-google" aria-hidden="true" />
                Sign in with Google
              </button>
            )}
            {token && (
              <button
                onClick={() =>
                  void signOutUser().catch((signOutError) =>
                    console.error("Sign out failed", signOutError),
                  )
                }
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-panel-border)] bg-[color:var(--color-button-muted-bg)] px-4 py-2 text-sm font-semibold text-[color:var(--color-text-accent)] shadow-sm transition-all hover:border-[color:var(--color-text-accent)] hover:bg-[color:var(--color-card-hover-bg)]"
              >
                <i className="bi bi-box-arrow-right" aria-hidden="true" />
                Sign out
              </button>
            )}
          </div>
        </div>
        {!token && !authLoading && (
          <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">
            Sign in to sync your username, preferences, and notes across every device.
          </p>
        )}
      </header>

      <main className="mx-auto max-w-2xl space-y-6">
        {isHydrated && error && !isLoading && (
          <section className="rounded-2xl border border-red-200/70 bg-red-100 p-6 text-center text-red-900 shadow-md animate-fade-up">
            {error}
          </section>
        )}

        <section className="rounded-2xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-panel-bg)] p-6 shadow-[0_12px_26px_var(--color-glow)] transition-colors animate-fade-up">
          {!isHydrated || (isLoading && !profile) ? (
            <div className="text-center text-sm text-[color:var(--color-text-muted)]">
              Loading your preferences...
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="off"
                maxLength={32}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[color:var(--color-divider)] bg-[color:var(--color-input-bg)] p-3 text-[color:var(--color-text-primary)] shadow-sm focus:border-[color:var(--color-text-accent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Choose something unique"
                disabled={isDisabledForGuests}
              />
              <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">
                Usernames must be unique. When visible, uploads use this name in their filenames.
                {!canEditProfile && " Sign in to claim a username."}
              </p>
            </div>

            <div className="rounded-xl bg-[color:var(--color-card-bg)] p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={displayUsername && canDisplayUsername}
                  onChange={(event) => setDisplayUsername(event.target.checked)}
                  disabled={isDisabledForGuests || !canDisplayUsername}
                  className="mt-1 h-5 w-5 rounded border-[color:var(--color-divider)] text-[color:var(--color-accent)] focus:ring-[color:var(--color-accent)]"
                />
                <span>
                  <span className="block text-sm font-semibold text-[color:var(--color-text-primary)]">
                    Display my username on notes
                  </span>
                  <span className="text-xs text-[color:var(--color-text-muted)]">
                    Turn off to remain anonymous. {anonymousHint}
                  </span>
                </span>
              </label>
            </div>

            <div>
              <label
                htmlFor="theme"
                className="block text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]"
              >
                Theme
              </label>
              <select
                id="theme"
                value={themePreference}
                onChange={(event) => void handleThemeChange(event.target.value as ThemePreference)}
                className="mt-2 w-full rounded-xl border border-[color:var(--color-divider)] bg-[color:var(--color-input-bg)] p-3 text-[color:var(--color-text-primary)] shadow-sm focus:border-[color:var(--color-text-accent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
              >
                {themeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">
                System uses your device preference automatically.
              </p>
            </div>

            {formError && (
              <p className="rounded-lg bg-red-100/80 p-3 text-sm font-semibold text-red-900">
                {formError}
              </p>
            )}

            {formSuccess && (
              <p className="rounded-lg bg-emerald-100/80 p-3 text-sm font-semibold text-emerald-900">
                {formSuccess}
              </p>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={isSaveDisabled}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                  isSaveDisabled
                    ? "cursor-not-allowed bg-[color:var(--color-button-disabled-bg)] text-[color:var(--color-button-disabled-text)]"
                    : "bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)]"
                }`}
              >
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>
            </form>
          )}
        </section>
      </main>

      <BottomNav
        onOpenCreateModal={handleOpenCreateModal}
        viewerId={userId}
        token={token ?? null}
      />
      <CreateNoteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={reload}
        token={token}
        userId={userId ?? ""}
        username={profile?.username ?? null}
        displayUsername={profile?.displayUsername ?? false}
      />
    </div>
  );
};

export default SettingsView;
