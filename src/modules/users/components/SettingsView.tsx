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
  const { userId, profile, isLoading, error, updateProfile, refreshProfile } = useUserProfile();
  const { reload } = useNotesData(token);

  const [username, setUsername] = useState("");
  const [displayUsername, setDisplayUsername] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleOpenCreateModal = () => {
    if (!token) {
      void signInWithGoogle().catch((signInError) =>
        console.error("Google sign-in failed", signInError),
      );
      return;
    }
    setIsCreateModalOpen(true);
  };

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? "");
      setDisplayUsername(Boolean(profile.displayUsername && profile.username));
      setThemePreference(profile.themePreference);
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token || !userId) {
      setFormError("Sign in to update your profile settings.");
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
      await Promise.all([refreshProfile(), reload()]);
      setFormSuccess("Settings saved successfully.");
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
    displayUsername && canDisplayUsername
      ? `Your notes will appear as @${username.trim()}`
      : "Your notes remain anonymous to others.";

  return (
    <div className="min-h-screen bg-[color:var(--color-app-bg)]/40 p-6 pb-32 transition-colors">
      <header className="mx-auto mb-8 max-w-3xl rounded-2xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-panel-bg)]/92 p-6 shadow-[0_35px_90px_var(--color-glow)] backdrop-blur-xl">
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
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] px-5 py-2 text-sm font-semibold text-[color:var(--color-on-accent)] shadow-[0_20px_45px_var(--color-glow)] transition-colors hover:bg-[color:var(--color-accent-hover)]"
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
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-panel-border)] bg-[color:var(--color-button-muted-bg)] px-4 py-2 text-sm font-semibold text-[color:var(--color-text-accent)] shadow-[0_15px_35px_var(--color-glow)] transition-all hover:border-[color:var(--color-text-accent)] hover:bg-[color:var(--color-card-hover-bg)]"
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
        {(isLoading && !profile) && (
          <section className="rounded-2xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-panel-bg)]/88 p-6 text-center text-[color:var(--color-text-muted)] shadow-[0_30px_70px_var(--color-glow)] backdrop-blur-xl">
            Loading your preferences...
          </section>
        )}

        {error && !isLoading && (
          <section className="rounded-2xl border border-red-200/40 bg-red-100/85 p-6 text-center text-red-900 shadow-[0_25px_60px_rgba(248,113,113,0.35)]">
            {error}
          </section>
        )}

        <section className="rounded-2xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-panel-bg)]/92 p-6 shadow-[0_35px_85px_var(--color-glow)] backdrop-blur-xl transition-colors">
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
                className="mt-2 w-full rounded-xl border border-[color:var(--color-divider)] bg-[color:var(--color-input-bg)] p-3 text-[color:var(--color-text-primary)] shadow-sm focus:border-[color:var(--color-text-accent)] focus:outline-none"
                placeholder="Choose something unique"
              />
              <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">
                Usernames must be unique. When visible, uploads use this name in their filenames.
              </p>
            </div>

            <div className="rounded-xl bg-[color:var(--color-card-bg)] p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={displayUsername && canDisplayUsername}
                  onChange={(event) => setDisplayUsername(event.target.checked)}
                  disabled={!canDisplayUsername || isSaving || !token}
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
                onChange={(event) => setThemePreference(event.target.value as ThemePreference)}
                className="mt-2 w-full rounded-xl border border-[color:var(--color-divider)] bg-[color:var(--color-input-bg)] p-3 text-[color:var(--color-text-primary)] shadow-sm focus:border-[color:var(--color-text-accent)] focus:outline-none"
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
                disabled={isSaving || isLoading || !token}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                  isSaving || isLoading || !token
                    ? "cursor-not-allowed bg-[color:var(--color-button-disabled-bg)] text-[color:var(--color-button-disabled-text)]"
                    : "bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)]"
                }`}
              >
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        </section>
      </main>

      <BottomNav onOpenCreateModal={handleOpenCreateModal} />
      <CreateNoteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={reload}
        token={token}
        username={profile?.username ?? null}
        displayUsername={profile?.displayUsername ?? false}
      />
    </div>
  );
};

export default SettingsView;
