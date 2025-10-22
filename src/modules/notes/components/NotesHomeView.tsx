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
  variant: "dashboard" | "followed" | "all" | "my";
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

  const myNotes = useMemo(() => {
    if (token) {
        return notes.filter((note) => note.isOwnNote);
    }
    return [];
  }, [notes, token]);

  const filteredNotes = useMemo(() => {
    if (variant === "followed") {
      return notes.filter((note) => note.isFollowedAuthor);
    }
    if (variant === "my") {
        return myNotes;
    }
    return notes;
  }, [notes, variant, myNotes]);

  const pageHeading = 
    variant === "followed" 
        ? "Followed" 
        : variant === "all" 
            ? "All Notes" 
            : variant === "my"
                ? "My Notes"
                : "Dashboard";

  const sectionTitle = 
    variant === "followed" 
        ? "Followed Notes" 
        : variant === "all" 
            ? "All Notes" 
            : variant === "my"
                ? "My Notes"
                : "All Notes";

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
    <div className="min-h-screen bg-[color:var(--color-app-bg)] p-6 pb-32 transition-colors">
      <header className="mx-auto mb-8 max-w-5xl rounded-2xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-panel-bg)] p-6 text-center shadow-[0_12px_24px_var(--color-glow)]">
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
          <section className="rounded-2xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-panel-bg)] p-6 text-center text-[color:var(--color-text-muted)] shadow-[0_8px_20px_var(--color-glow)]">
            Loading notes...
          </section>
        )}

        {combinedError && !isLoading && (
          <section className="rounded-2xl border border-red-200/70 bg-red-100 p-6 text-center text-red-900 shadow-md">
            {combinedError}
          </section>
        )}

        {!isLoading && !combinedError && variant === "dashboard" && token && (
            <NoteSection
                title="My Notes"
                notes={myNotes}
                emptyMessage="It's good to talk you know? it may calm you a little."
                viewAllPath="/minotes" 
            />
        )}
        
        {!isLoading && !combinedError && (
          <NoteSection
            title={sectionTitle}
            notes={filteredNotes}
            emptyMessage={emptyMessage}
            viewAllPath={variant === "dashboard" ? "/notes" : undefined} 
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