"use client";

import { useCallback, useMemo, useState } from "react";
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
  const { token } = useAuth();
  const {
    userId,
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
  } = useNotesData(userId, token ?? null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFollowPending, setIsFollowPending] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);

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

  const combinedError = notesError ?? profileError ?? followError;
  const isLoading = isNotesLoading || (token ? isProfileLoading : false);

  const handleFollowStatusChange = useCallback(
    async (targetUserId: string, shouldFollow: boolean) => {
      if (!userId) {
        return;
      }

      setFollowError(null);
      setIsFollowPending(true);

      try {
        await updateFollowStatus({
          userId,
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
    },
    [userId, token, reload, refreshProfile],
  );

  const followHandler = userId ? handleFollowStatusChange : undefined;

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[color:var(--color-app-bg)]/40 p-6 pb-32 transition-colors">
      <header className="mx-auto mb-8 max-w-5xl rounded-2xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-panel-bg)]/92 p-6 text-center shadow-[0_35px_90px_var(--color-glow)] backdrop-blur-xl">
        <h1 className="text-3xl font-bold tracking-wide text-[color:var(--color-text-primary)]">
          {pageHeading}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
          Browse every public note, anonymous or otherwise.
        </p>
        {profile?.username && profile.displayUsername && (
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-accent)]">
            Signed in as @{profile.username}
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
              followHandler && (variant === "followed" || variant === "dashboard")
                ? followHandler
                : undefined
            }
            followActionPending={Boolean(followHandler) && isFollowPending}
          />
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
        userId={userId ?? ""}
      />
    </div>
  );
};

export default NotesHomeView;
