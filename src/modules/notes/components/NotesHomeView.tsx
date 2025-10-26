"use client";

import { useCallback, useMemo, useState } from "react";
import BottomNav from "@/components/navigation/BottomNav";
import { useNotesData } from "../hooks/useNotesData";
import { useUserProfile } from "@/modules/users/hooks/useUserProfile";
import { updateFollowStatus } from "@/modules/users/services/followService";
import { useAuth } from "@/modules/auth/AuthContext";
import NoteSection from "./NoteSection";
import { ensureGuestIdentity } from "@/modules/users/utils/guestIdentity";
import CreateNoteModal from "./CreateNoteModal";
import {
  addCommentToNote,
  deleteCommentFromNote,
  reactToNote,
  setCommentsLocked,
  updateCommentOnNote,
} from "../services/noteService";
import type { Note, NoteReactionType } from "../types";

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
  const [reactionError, setReactionError] = useState<string | null>(null);
  const [pendingReactionKeys, setPendingReactionKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [commentError, setCommentError] = useState<string | null>(null);
  const [pendingCommentKeys, setPendingCommentKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingLockKeys, setPendingLockKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingEditCommentIds, setPendingEditCommentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingDeleteCommentIds, setPendingDeleteCommentIds] = useState<Set<string>>(
    () => new Set(),
  );

  const myNotes = useMemo(() => {
    if (!userId) {
      return [];
    }

    return notes.filter(
      (note) => note.isOwnNote || note.authorId === userId,
    );
  }, [notes, userId]);

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
      : variant === "my"
        ? "You haven't created any notes yet. Start by sharing your first note."
        : "No notes yet. Be the first to share a thought.";

  const combinedError =
    notesError ?? profileError ?? followError ?? reactionError ?? commentError;
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

  const resolveViewerId = useCallback(() => {
    return userId ?? ensureGuestIdentity();
  }, [userId]);

  const handleReactionChange = useCallback(
    async (note: Note, desiredReaction: NoteReactionType | null) => {
      const viewerKey = resolveViewerId();
      const key = `${note.authorId}::${note.id}`;
      setReactionError(null);
      setPendingReactionKeys((previous) => {
        const next = new Set(previous);
        next.add(key);
        return next;
      });

      try {
        await reactToNote({
          noteId: note.id,
          authorId: note.authorId,
          reaction: desiredReaction,
          token,
          userId: viewerKey,
        });
        await reload();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to update reaction.";
        setReactionError(message);
      } finally {
        setPendingReactionKeys((previous) => {
          const next = new Set(previous);
          next.delete(key);
          return next;
        });
      }
    },
    [resolveViewerId, token, reload],
  );

  const handleSubmitComment = useCallback(
    async (
      note: Note,
      payload: {
        content: string;
        isPrivate: boolean;
        participantUserId?: string | null;
        replyToCommentId?: string | null;
      },
    ) => {
      const viewerKey = resolveViewerId();
      const key = `${note.authorId}::${note.id}`;
      const commenterName =
        profile?.displayUsername && profile.username ? profile.username : null;

      setCommentError(null);
      setPendingCommentKeys((previous) => {
        const next = new Set(previous);
        next.add(key);
        return next;
      });

      try {
        await addCommentToNote({
          noteId: note.id,
          authorId: note.authorId,
          content: payload.content,
          isPrivate: payload.isPrivate,
          participantUserId: payload.participantUserId,
          replyToCommentId: payload.replyToCommentId,
          token,
          userId: viewerKey,
          commenterName,
        });
        await reload();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to submit comment.";
        setCommentError(message);
        throw new Error(message);
      } finally {
        setPendingCommentKeys((previous) => {
          const next = new Set(previous);
          next.delete(key);
          return next;
        });
      }
    },
    [resolveViewerId, token, reload, profile?.displayUsername, profile?.username],
  );

  const handleToggleCommentsLock = useCallback(
    async (note: Note, locked: boolean) => {
      const viewerKey = resolveViewerId();
      const key = `${note.authorId}::${note.id}`;
      setCommentError(null);
      setPendingLockKeys((previous) => {
        const next = new Set(previous);
        next.add(key);
        return next;
      });

      try {
        await setCommentsLocked({
          noteId: note.id,
          authorId: note.authorId,
          locked,
          token,
          userId: viewerKey,
        });
        await reload();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to update comment settings.";
        setCommentError(message);
        throw new Error(message);
      } finally {
        setPendingLockKeys((previous) => {
          const next = new Set(previous);
          next.delete(key);
          return next;
        });
      }
    },
    [resolveViewerId, token, reload],
  );

  const handleEditComment = useCallback(
    async (note: Note, commentId: string, content: string) => {
      const viewerKey = resolveViewerId();
      setCommentError(null);
      setPendingEditCommentIds((previous) => {
        const next = new Set(previous);
        next.add(commentId);
        return next;
      });

      try {
        await updateCommentOnNote({
          noteId: note.id,
          authorId: note.authorId,
          commentId,
          content,
          token,
          userId: viewerKey,
        });
        await reload();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to update thought.";
        setCommentError(message);
        throw new Error(message);
      } finally {
        setPendingEditCommentIds((previous) => {
          const next = new Set(previous);
          next.delete(commentId);
          return next;
        });
      }
    },
    [resolveViewerId, token, reload],
  );

  const handleDeleteComment = useCallback(
    async (note: Note, commentId: string) => {
      const viewerKey = resolveViewerId();
      setCommentError(null);
      setPendingDeleteCommentIds((previous) => {
        const next = new Set(previous);
        next.add(commentId);
        return next;
      });

      try {
        await deleteCommentFromNote({
          noteId: note.id,
          authorId: note.authorId,
          commentId,
          token,
          userId: viewerKey,
        });
        await reload();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to delete thought.";
        setCommentError(message);
        throw new Error(message);
      } finally {
        setPendingDeleteCommentIds((previous) => {
          const next = new Set(previous);
          next.delete(commentId);
          return next;
        });
      }
    },
    [resolveViewerId, token, reload],
  );

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const isCommentEditPending = useCallback(
    (_note: Note, commentId: string) => pendingEditCommentIds.has(commentId),
    [pendingEditCommentIds],
  );

  const isCommentDeletePending = useCallback(
    (_note: Note, commentId: string) => pendingDeleteCommentIds.has(commentId),
    [pendingDeleteCommentIds],
  );

  return (
    <div className="min-h-screen bg-[color:var(--color-app-bg)] p-6 pb-[220px] md:pb-32 transition-colors">
      <header className="mx-auto mb-10 max-w-5xl rounded-2xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-panel-bg)] p-6 text-center shadow-[0_12px_24px_var(--color-glow)] animate-fade-up">
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

      <main className="mx-auto w-full space-y-6">
        {isLoading && (
          <section className="rounded-2xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-panel-bg)] p-6 text-center text-[color:var(--color-text-muted)] shadow-[0_8px_20px_var(--color-glow)] animate-fade-up">
            Loading notes...
          </section>
        )}

        {combinedError && !isLoading && (
          <section className="rounded-2xl border border-red-200/70 bg-red-100 p-6 text-center text-red-900 shadow-md animate-fade-up">
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
            onReactToNote={handleReactionChange}
            isReactionPending={(note) =>
              pendingReactionKeys.has(`${note.authorId}::${note.id}`)
            }
            onSubmitComment={handleSubmitComment}
            commentActionPending={(note) =>
              pendingCommentKeys.has(`${note.authorId}::${note.id}`)
            }
            onToggleCommentsLock={handleToggleCommentsLock}
            commentLockActionPending={(note) =>
              pendingLockKeys.has(`${note.authorId}::${note.id}`)
            }
            viewerId={userId ?? null}
            viewerDisplayName={
              profile?.displayUsername && profile?.username
                ? `@${profile.username}`
                : null
            }
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
            isCommentEditPending={isCommentEditPending}
            isCommentDeletePending={isCommentDeletePending}
          />
        )}
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
        username={profile?.username ?? null}
        displayUsername={profile?.displayUsername ?? false}
        userId={userId ?? ""}
      />
    </div>
  );
};

export default NotesHomeView;
