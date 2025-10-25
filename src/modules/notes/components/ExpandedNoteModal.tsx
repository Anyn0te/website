"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { Note, NoteReactionType } from "../types";
import CommentThread, {
  CommentSubmitPayload,
  CommentUpdatePayload,
} from "./CommentThread";

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
  commentsLockPending?: boolean;
  onEditComment?: (commentId: string, payload: CommentUpdatePayload) => Promise<void> | void;
  onDeleteComment?: (commentId: string) => Promise<void> | void;
  isCommentEditPending?: (commentId: string) => boolean;
  isCommentDeletePending?: (commentId: string) => boolean;
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
  commentsLockPending = false,
  onEditComment,
  onDeleteComment,
  isCommentEditPending,
  isCommentDeletePending,
}: ExpandedNoteModalProps) => {
  const [activeNote, setActiveNote] = useState<Note | null>(note);
  const [isRendered, setIsRendered] = useState(Boolean(note));
  const [transitionState, setTransitionState] = useState<"closed" | "opening" | "open" | "closing">(
    note ? "open" : "closed",
  );
  const [isFollowBusy, setIsFollowBusy] = useState(false);

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
        className="modal-surface relative z-50 m-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-modal-bg)] p-6 shadow-[0_16px_32px_var(--color-glow)] transition-colors"
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
                  <audio
                    key={`${activeNote.id}-audio-${index}`}
                    controls
                    src={mediaItem.url}
                    className="w-full rounded-xl bg-[color:var(--color-audio-bg)] p-2 text-[color:var(--color-text-primary)]"
                  >
                    Your browser does not support the audio element.
                  </audio>
                );
              }

              return null;
            })}
          </div>
        )}

        <div className="rounded-2xl border border-[color:var(--color-card-border)] bg-[color:var(--color-card-bg)] p-5 text-[color:var(--color-text-primary)]">
          <p
            className="text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: safeContent }}
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[color:var(--color-card-border)] bg-[color:var(--color-card-bg)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
            Feelings
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                isLoved
                  ? "border-transparent bg-rose-500 text-white shadow-sm"
                  : "border-[color:var(--color-panel-border)] bg-[color:var(--color-button-muted-bg)] text-[color:var(--color-text-primary)] hover:border-[color:var(--color-text-accent)] hover:text-[color:var(--color-text-accent)]"
              } ${reactionActionPending ? "cursor-wait opacity-70" : ""}`}
              onClick={() => handleReactionClick("love")}
              disabled={reactionActionPending}
              aria-label={isLoved ? "Remove love reaction" : "React with love"}
            >
              <span>❤️</span>
              <span>{activeNote.reactions.love}</span>
            </button>
            <button
              type="button"
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                isDisliked
                  ? "border-transparent bg-slate-700 text-white shadow-sm"
                  : "border-[color:var(--color-panel-border)] bg-[color:var(--color-button-muted-bg)] text-[color:var(--color-text-primary)] hover:border-[color:var(--color-text-accent)] hover:text-[color:var(--color-text-accent)]"
              } ${reactionActionPending ? "cursor-wait opacity-70" : ""}`}
              onClick={() => handleReactionClick("dislike")}
              disabled={reactionActionPending}
              aria-label={isDisliked ? "Remove dislike reaction" : "React with dislike"}
            >
              <span>👎</span>
              <span>{activeNote.reactions.dislike}</span>
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
