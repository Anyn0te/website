"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { Note, NoteReactionType } from "../types";
import CommentThread, {
  CommentSubmitPayload,
  CommentUpdatePayload,
} from "./CommentThread";
import AudioPlayer from "./AudioPlayer";

export interface NoteUpdatePayload {
  title: string;
  content: string;
}

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

interface ExpandedNoteModalProps {
  note: Note | null;
  onClose: () => void;
  onToggleFollow?: (authorId: string, shouldFollow: boolean) => Promise<void>;
  followActionPending?: boolean;
  onReact?: (reaction: NoteReactionType | null) => Promise<void> | void;
  reactionActionPending?: boolean;
  onSubmitComment?: (payload: CommentSubmitPayload) => Promise<void> | void;
  commentActionPending?: boolean;
  onToggleCommentsLock?: (locked: boolean) => Promise<void> | void;
  viewerId?: string | null;
  viewerDisplayName?: string | null;
  viewerGlobalCanModerate?: boolean;
  commentsLockPending?: boolean;
  onEditComment?: (commentId: string, payload: CommentUpdatePayload) => Promise<void> | void;
  onDeleteComment?: (commentId: string) => Promise<void> | void;
  isCommentEditPending?: (commentId: string) => boolean;
  isCommentDeletePending?: (commentId: string) => boolean;
  onUpdateNote?: (payload: NoteUpdatePayload) => Promise<void> | void;
  onDeleteNote?: () => Promise<void> | void;
  noteUpdatePending?: boolean;
  noteDeletePending?: boolean;
}

const EXIT_DURATION_MS = 220;

const ExpandedNoteModal = ({
  note,
  onClose,
  onToggleFollow,
  followActionPending = false,
  onReact,
  reactionActionPending = false,
  onSubmitComment,
  commentActionPending = false,
  onToggleCommentsLock,
  viewerId,
  viewerDisplayName,
  viewerGlobalCanModerate = false,
  commentsLockPending = false,
  onEditComment,
  onDeleteComment,
  isCommentEditPending,
  isCommentDeletePending,
  onUpdateNote,
  onDeleteNote,
  noteUpdatePending = false,
  noteDeletePending = false,
}: ExpandedNoteModalProps) => {
  const [activeNote, setActiveNote] = useState<Note | null>(note);
  const [isRendered, setIsRendered] = useState(Boolean(note));
  const [transitionState, setTransitionState] = useState<"closed" | "opening" | "open" | "closing">(
    note ? "open" : "closed",
  );
  const [isFollowBusy, setIsFollowBusy] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [noteActionError, setNoteActionError] = useState<string | null>(null);

  useEffect(() => {
    if (note) {
      setActiveNote(note);
      setIsRendered(true);
      setTransitionState("opening");
      setIsFollowBusy(false);
      const raf = window.requestAnimationFrame(() => {
        setTransitionState("open");
      });
      return () => {
        window.cancelAnimationFrame(raf);
      };
    }

    if (isRendered) {
      setTransitionState("closing");
      const timeout = window.setTimeout(() => {
        setTransitionState("closed");
        setIsRendered(false);
        setActiveNote(null);
      }, EXIT_DURATION_MS);
      return () => {
        window.clearTimeout(timeout);
      };
    }

    setTransitionState("closed");
    return;
  }, [note, isRendered]);

  useEffect(() => {
    if (note) {
      setEditTitle(note.title);
      setEditContent(note.content);
      setIsEditingNote(false);
      setNoteActionError(null);
    } else {
      setEditTitle("");
      setEditContent("");
      setIsEditingNote(false);
      setNoteActionError(null);
    }
  }, [note]);

  useEffect(() => {
    if (!activeNote) {
      return;
    }

    if (transitionState !== "open" && transitionState !== "opening") {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.classList.add("modal-open");

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.classList.remove("modal-open");
    };
  }, [transitionState, activeNote, onClose]);

  if (!isRendered || !activeNote) {
    return null;
  }

  const safeTitle = sanitizeHtml(activeNote.title);
  const safeContent = sanitizeHtml(activeNote.content);
  const authorLabel = activeNote.authorName ? `@${activeNote.authorName}` : "Anonymous";
  const createdAtLabel = formatDateTime(activeNote.createdAt);
  const canFollowAuthor =
    Boolean(activeNote.authorName) && !activeNote.isOwnNote && typeof onToggleFollow === "function";
  const isFollowButtonDisabled = followActionPending || isFollowBusy;
  const followButtonLabel = activeNote.isFollowedAuthor
    ? "Unfollow"
    : activeNote.authorName
      ? `Follow ${activeNote.authorName}`
      : "Follow";
  const totalPublicComments = activeNote.publicCommentCount;
  const isLoved = activeNote.viewerReaction === "love";
  const isDisliked = activeNote.viewerReaction === "dislike";
  const globalModeration = Boolean(viewerGlobalCanModerate);
  const canManageNote = Boolean(
    globalModeration || activeNote.viewerCanModerate || activeNote.isOwnNote,
  );
  const wrapperReactionClass =
    activeNote.viewerReaction === "love"
      ? "ring-2 ring-rose-400/70"
      : activeNote.viewerReaction === "dislike"
        ? "ring-2 ring-slate-500/60"
        : "";

  const handleFollowClick = async () => {
    if (!canFollowAuthor || !activeNote || !onToggleFollow) {
      return;
    }

    setIsFollowBusy(true);
    try {
      await onToggleFollow(activeNote.authorId, !activeNote.isFollowedAuthor);
    } catch (followError) {
      console.error("Follow action failed", followError);
    } finally {
      setIsFollowBusy(false);
    }
  };

  const handleReactionClick = (reaction: NoteReactionType) => {
    if (!onReact || reactionActionPending || !activeNote) {
      return;
    }

    const nextReaction = activeNote.viewerReaction === reaction ? null : reaction;
    void onReact(nextReaction);
  };

  const handleBeginNoteEdit = () => {
    if (!activeNote) {
      return;
    }
    setEditTitle(activeNote.title);
    setEditContent(activeNote.content);
    setNoteActionError(null);
    setIsEditingNote(true);
  };

  const handleCancelNoteEdit = () => {
    setIsEditingNote(false);
    setNoteActionError(null);
  };

  const handleSaveNoteEdit = async () => {
    if (!onUpdateNote || !activeNote || noteUpdatePending) {
      return;
    }

    const trimmedContent = editContent.trim();
    if (!trimmedContent) {
      setNoteActionError("Note content cannot be empty.");
      return;
    }

    const trimmedTitle = editTitle.trim();

    try {
      setNoteActionError(null);
      await onUpdateNote({
        title: trimmedTitle,
        content: trimmedContent,
      });
      setIsEditingNote(false);
    } catch (error) {
      setNoteActionError(
        error instanceof Error ? error.message : "Unable to update note.",
      );
    }
  };

  const handleDeleteNoteClick = async () => {
    if (!onDeleteNote || !activeNote || noteDeletePending) {
      return;
    }

    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm("Delete this note? This action cannot be undone.");

    if (!confirmed) {
      return;
    }

    try {
      setNoteActionError(null);
      await onDeleteNote();
    } catch (error) {
      setNoteActionError(
        error instanceof Error ? error.message : "Unable to delete note.",
      );
    }
  };

  return (
    <div
      className="modal-layer fixed inset-0 z-50 flex items-center justify-center"
      data-state={transitionState}
    >
      <div
        className="modal-backdrop absolute inset-0 h-full w-full bg-black/60"
        data-state={transitionState}
        onClick={onClose}
      />

      <div
        className={`modal-surface relative z-50 m-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-modal-bg)] p-6 shadow-[0_16px_32px_var(--color-glow)] transition-colors ${wrapperReactionClass}`}
        data-state={transitionState}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-3xl font-bold text-[color:var(--color-text-accent)] transition-colors hover:text-[color:var(--color-text-primary)]"
          aria-label="Close Note"
        >
          &times;
        </button>

        <header className="mb-6 border-b border-[color:var(--color-divider)] pb-5">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
              {activeNote.visibility === "public" ? "Visible Note" : "Anonymous Note"}
            </p>
            <h2
              className="text-3xl font-extrabold text-[color:var(--color-text-primary)]"
              dangerouslySetInnerHTML={{ __html: safeTitle }}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--color-text-accent)]">
                {authorLabel}
              </p>
              <p className="text-xs text-[color:var(--color-text-muted)]">
                {createdAtLabel}
              </p>
            </div>

            {canFollowAuthor && (
              <button
                onClick={handleFollowClick}
                disabled={isFollowButtonDisabled}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  isFollowButtonDisabled
                    ? "cursor-not-allowed bg-[color:var(--color-button-disabled-bg)] text-[color:var(--color-button-disabled-text)]"
                    : activeNote.isFollowedAuthor
                      ? "bg-[color:var(--color-neutral-button-bg)] text-[color:var(--color-neutral-button-text)] shadow-sm hover:bg-[color:var(--color-neutral-button-hover-bg)]"
                      : "bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] shadow-sm hover:bg-[color:var(--color-accent-hover)]"
                }`}
              >
                {isFollowButtonDisabled ? "Updating..." : followButtonLabel}
              </button>
            )}
          </div>
          {canManageNote && !isEditingNote && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleBeginNoteEdit}
                disabled={noteUpdatePending}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  noteUpdatePending
                    ? "cursor-not-allowed border-[color:var(--color-divider)] text-[color:var(--color-text-muted)]"
                    : "border-[color:var(--color-panel-border)] text-[color:var(--color-text-accent)] hover:border-[color:var(--color-text-accent)] hover:text-[color:var(--color-text-primary)]"
                }`}
              >
                <span aria-hidden="true">✏️</span>
                <span>Edit note</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteNoteClick}
                disabled={noteDeletePending}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  noteDeletePending
                    ? "cursor-not-allowed border-[color:var(--color-divider)] text-[color:var(--color-text-muted)]"
                    : "border-[color:var(--color-panel-border)] text-red-500 hover:border-red-500 hover:text-red-600"
                }`}
              >
                <span aria-hidden="true">🗑️</span>
                <span>{noteDeletePending ? "Removing..." : "Delete"}</span>
              </button>
            </div>
          )}
          {canManageNote && !isEditingNote && noteActionError && (
            <p className="mt-2 text-sm text-red-500">{noteActionError}</p>
          )}
        </header>

        {activeNote.media.length > 0 && (
          <div className="mb-6 space-y-4">
            {activeNote.media.map((mediaItem, index) => {
              if (!mediaItem.url) {
                return null;
              }

              if (mediaItem.type === "image") {
                return (
                  <Image
                    key={`${activeNote.id}-image-${index}`}
                    src={mediaItem.url}
                    alt={activeNote.title || "Anonymous Image"}
                    className="mb-4 max-h-96 w-full rounded-lg object-contain"
                    width={500}
                    height={500}
                  />
                );
              }

              if (mediaItem.type === "audio") {
                return (
                  <AudioPlayer 
                    key={`${activeNote.id}-audio-${index}`}
                    src={mediaItem.url} 
                  />
                );
              }

              return null;
            })}
          </div>
        )}

        {isEditingNote ? (
          <form
            className="space-y-4 rounded-2xl border border-[color:var(--color-card-border)] bg-[color:var(--color-card-bg)] p-5 text-[color:var(--color-text-primary)]"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveNoteEdit();
            }}
          >
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
                Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                disabled={noteUpdatePending}
                className="w-full rounded-xl border border-[color:var(--color-divider)] bg-[color:var(--color-input-bg)] p-3 text-sm focus:border-[color:var(--color-text-accent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
                Content
              </label>
              <textarea
                value={editContent}
                onChange={(event) => setEditContent(event.target.value)}
                disabled={noteUpdatePending}
                rows={8}
                className="w-full rounded-xl border border-[color:var(--color-divider)] bg-[color:var(--color-input-bg)] p-3 text-sm leading-relaxed focus:border-[color:var(--color-text-accent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            {noteActionError && (
              <p className="text-sm text-red-500">{noteActionError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelNoteEdit}
                disabled={noteUpdatePending}
                className="rounded-full border border-[color:var(--color-divider)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)] hover:border-[color:var(--color-text-accent)] hover:text-[color:var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={noteUpdatePending}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  noteUpdatePending
                    ? "cursor-not-allowed bg-[color:var(--color-button-disabled-bg)] text-[color:var(--color-button-disabled-text)]"
                    : "bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)]"
                }`}
              >
                {noteUpdatePending ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border border-[color:var(--color-card-border)] bg-[color:var(--color-card-bg)] p-5 text-[color:var(--color-text-primary)]">
            <p
              className="text-base leading-relaxed"
              dangerouslySetInnerHTML={{ __html: safeContent }}
            />
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[color:var(--color-card-border)] bg-[color:var(--color-card-bg)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
            Feelings
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                isLoved
                  ? "border-transparent bg-rose-500 text-white shadow-lg ring-2 ring-rose-300"
                  : "border-[color:var(--color-panel-border)] bg-[color:var(--color-button-muted-bg)] text-[color:var(--color-text-primary)] hover:border-[color:var(--color-text-accent)] hover:text-[color:var(--color-text-accent)]"
              } ${reactionActionPending ? "cursor-wait opacity-70" : ""}`}
              onClick={() => handleReactionClick("love")}
              disabled={reactionActionPending}
              aria-label={isLoved ? "Remove love reaction" : "React with love"}
              aria-pressed={isLoved}
            >
              <span aria-hidden="true">❤️</span>
              <span className={isLoved ? "font-bold" : ""}>{activeNote.reactions.love}</span>
            </button>
            <button
              type="button"
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                isDisliked
                  ? "border-transparent bg-slate-800 text-white shadow-lg ring-2 ring-slate-500/80"
                  : "border-[color:var(--color-panel-border)] bg-[color:var(--color-button-muted-bg)] text-[color:var(--color-text-primary)] hover:border-[color:var(--color-text-accent)] hover:text-[color:var(--color-text-accent)]"
              } ${reactionActionPending ? "cursor-wait opacity-70" : ""}`}
              onClick={() => handleReactionClick("dislike")}
              disabled={reactionActionPending}
              aria-label={isDisliked ? "Remove dislike reaction" : "React with dislike"}
              aria-pressed={isDisliked}
            >
              <span aria-hidden="true">👎</span>
              <span className={isDisliked ? "font-bold" : ""}>{activeNote.reactions.dislike}</span>
            </button>
          </div>
        </div>

        <div className="mt-6">
          <CommentThread
            comments={activeNote.comments}
            viewerId={viewerId ?? null}
            viewerDisplayName={viewerDisplayName ?? null}
            noteAuthorId={activeNote.authorId}
            noteCommentsLocked={activeNote.commentsLocked}
            publicCommentCount={totalPublicComments}
            createActionPending={commentActionPending ?? false}
            lockActionPending={commentsLockPending}
            onSubmitComment={onSubmitComment}
            onToggleCommentsLock={onToggleCommentsLock}
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
            isEditPending={isCommentEditPending}
            isDeletePending={isCommentDeletePending}
          />
        </div>
      </div>
    </div>
  );
};

export default ExpandedNoteModal;
