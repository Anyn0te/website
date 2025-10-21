"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { Note } from "../types";

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
}

const ExpandedNoteModal = ({
  note,
  onClose,
  onToggleFollow,
  followActionPending = false,
}: ExpandedNoteModalProps) => {
  const [isFollowBusy, setIsFollowBusy] = useState(false);

  useEffect(() => {
    setIsFollowBusy(false);
  }, [note?.id]);
  useEffect(() => {
    if (!note) {
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
  }, [note, onClose]);

  if (!note) {
    return null;
  }

  const safeTitle = sanitizeHtml(note.title);
  const safeContent = sanitizeHtml(note.content);
  const authorLabel = note.authorName ? `@${note.authorName}` : "Anonymous";
  const createdAtLabel = formatDateTime(note.createdAt);
  const canFollowAuthor =
    Boolean(note.authorName) && !note.isOwnNote && typeof onToggleFollow === "function";
  const isFollowButtonDisabled = followActionPending || isFollowBusy;
  const followButtonLabel = note.isFollowedAuthor
    ? "Unfollow"
    : note.authorName
      ? `Follow ${note.authorName}`
      : "Follow";

  const handleFollowClick = async () => {
    if (!canFollowAuthor || !note || !onToggleFollow) {
      return;
    }

    setIsFollowBusy(true);
    try {
      await onToggleFollow(note.authorId, !note.isFollowedAuthor);
    } catch (followError) {
      console.error("Follow action failed", followError);
    } finally {
      setIsFollowBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 h-full w-full bg-black/60"
        onClick={onClose}
      />

      <div
        className="relative z-50 m-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-modal-bg)] p-6 shadow-[0_16px_32px_var(--color-glow)] transition-colors"
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
              {note.visibility === "public" ? "Visible Note" : "Anonymous Note"}
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
                    : note.isFollowedAuthor
                      ? "bg-[color:var(--color-neutral-button-bg)] text-[color:var(--color-neutral-button-text)] shadow-sm hover:bg-[color:var(--color-neutral-button-hover-bg)]"
                      : "bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] shadow-sm hover:bg-[color:var(--color-accent-hover)]"
                }`}
              >
                {isFollowButtonDisabled ? "Updating..." : followButtonLabel}
              </button>
            )}
          </div>
        </header>

        {note.media.length > 0 && (
          <div className="mb-6 space-y-4">
            {note.media.map((mediaItem, index) => {
              if (!mediaItem.url) {
                return null;
              }

              if (mediaItem.type === "image") {
                return (
                  <Image
                    key={`${note.id}-image-${index}`}
                    src={mediaItem.url}
                    alt={note.title || "Anonymous Image"}
                    className="mb-4 max-h-96 w-full rounded-lg object-contain"
                    width={500}
                    height={500}
                  />
                );
              }

              if (mediaItem.type === "audio") {
                return (
                  <audio
                    key={`${note.id}-audio-${index}`}
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
      </div>
    </div>
  );
};

export default ExpandedNoteModal;
