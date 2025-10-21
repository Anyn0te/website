"use client";

import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/navigation/BottomNav";
import { useNotesData } from "../hooks/useNotesData";
import { useUserProfile } from "@/modules/users/hooks/useUserProfile";
import { updateFollowStatus } from "@/modules/users/services/followService";
import { useAuth } from "@/modules/auth/AuthContext";
import NoteSection from "./NoteSection";
import CreateNoteModal from "./CreateNoteModal";

interface NotesHomeViewProps {
  variant: "dashboard" | "followed";
}

const NotesHomeView = ({ variant }: NotesHomeViewProps) => {
  const {
    user,
    token,
    loading: authLoading,
    signInWithGoogle,
    signOutUser,
  } = useAuth();
  const {
    profile,
    isLoading: isProfileLoading,
    error: profileError,
    refreshProfile,
  } = useUserProfile();
  const {
    notes,
    isLoading: isNotesLoading,
    error: notesError,
    reload,
  } = useNotesData(token);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFollowPending, setIsFollowPending] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [showAuthNotice, setShowAuthNotice] = useState(false);

  const filteredNotes = useMemo(() => {
    if (variant === "followed") {
      return notes.filter((note) => note.isFollowedAuthor);
    }
    return notes;
  }, [notes, variant]);

  const pageHeading = variant === "followed" ? "Followed" : "Dashboard";
  const sectionTitle = variant === "followed" ? "Followed Notes" : "All Notes";
  const emptyMessage =
    variant === "followed"
      ? "Follow creators to see their notes here."
      : "No notes yet. Be the first to share a thought.";

  const combinedError = profileError ?? notesError ?? followError;
  const isLoading = authLoading || isProfileLoading || isNotesLoading;
  const isAuthenticated = Boolean(user && token);

  const handleFollowStatusChange = async (targetUserId: string, shouldFollow: boolean) => {
    if (!token) {
      setFollowError("Sign in to manage following.");
      return;
    }

    setFollowError(null);
    setIsFollowPending(true);

    try {
      await updateFollowStatus({
        token,
        targetUserId,
        action: shouldFollow ? "follow" : "unfollow",
      });

      await Promise.all([reload(), refreshProfile()]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update follow status.";
      setFollowError(message);
    } finally {
      setIsFollowPending(false);
    }
  };

  const handleOpenCreateModal = () => {
    if (!isAuthenticated) {
      setShowAuthNotice(true);
      return;
    }
    setIsCreateModalOpen(true);
  };

  const hideAuthNotice = () => setShowAuthNotice(false);

  useEffect(() => {
    if (isAuthenticated) {
      setShowAuthNotice(false);
    }
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-[color:var(--color-app-bg)]/40 p-6 pb-32 transition-colors">
      <header className="mx-auto mb-8 max-w-5xl rounded-2xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-panel-bg)]/92 p-6 shadow-[0_35px_90px_var(--color-glow)] backdrop-blur-xl">
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h1 className="text-3xl font-bold tracking-wide text-[color:var(--color-text-primary)]">
              {pageHeading}
            </h1>
            {profile?.username && profile.displayUsername && (
              <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
                Signed in as @{profile.username}
              </p>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 md:flex-row">
            {!isAuthenticated && (
              <button
                onClick={() =>
                  void signInWithGoogle().catch((signInError) =>
                    console.error("Google sign-in failed", signInError),
                  )
                }
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] px-5 py-2 text-sm font-semibold text-[color:var(--color-on-accent)] shadow-[0_20px_45px_var(--color-glow)] transition-colors hover:bg-[color:var(--color-accent-hover)]"
              >
                <i className="bi bi-google" aria-hidden="true" />
                Sign in with Google
              </button>
            )}
            {isAuthenticated && (
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
        {!isAuthenticated && !authLoading && (
          <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">
            Sign in to sync notes across devices and follow other creators.
          </p>
        )}
      </header>

      <main className="mx-auto max-w-5xl space-y-6">
        {isLoading && (
          <section className="rounded-2xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-panel-bg)]/88 p-6 text-center text-[color:var(--color-text-muted)] shadow-[0_30px_70px_var(--color-glow)] backdrop-blur-xl">
            Loading notes...
          </section>
        )}

        {combinedError && !isLoading && (
          <section className="rounded-2xl border border-red-200/40 bg-red-100/80 p-6 text-center text-red-900 shadow-[0_25px_60px_rgba(248,113,113,0.35)]">
            {combinedError}
          </section>
        )}

        {!isLoading && !combinedError && (
          <NoteSection
            title={sectionTitle}
            notes={filteredNotes}
            emptyMessage={emptyMessage}
            onFollowStatusChange={
              token && (variant === "followed" || variant === "dashboard")
                ? handleFollowStatusChange
                : undefined
            }
            followActionPending={isFollowPending && Boolean(token)}
          />
        )}

        {showAuthNotice && !isAuthenticated && (
          <section className="rounded-2xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-panel-bg)]/92 p-6 text-center text-[color:var(--color-text-accent)] shadow-[0_25px_65px_var(--color-glow)]">
            <p className="mb-3 text-sm font-semibold">
              Sign in with Google to create notes and follow other users.
            </p>
            <button
              onClick={() => {
                void signInWithGoogle().catch((signInError) =>
                  console.error("Google sign-in failed", signInError),
                );
                hideAuthNotice();
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] px-4 py-2 text-sm font-semibold text-[color:var(--color-on-accent)] shadow-[0_18px_40px_var(--color-glow)] transition-colors hover:bg-[color:var(--color-accent-hover)]"
            >
              <i className="bi bi-google" aria-hidden="true" />
              Continue with Google
            </button>
          </section>
        )}
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

export default NotesHomeView;
