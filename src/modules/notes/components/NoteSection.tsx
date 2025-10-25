import { useEffect, useState } from "react";
import { Note, NoteReactionType } from "../types";
import ExpandedNoteModal from "./ExpandedNoteModal";
import NoteCard, { type NoteCardSize } from "./NoteCard";
import type { CommentSubmitPayload } from "./CommentThread";

interface NoteSectionProps {
  title: string;
  notes: Note[];
  emptyMessage?: string;
  onFollowStatusChange?: (targetUserId: string, shouldFollow: boolean) => Promise<void>;
  followActionPending?: boolean;
  onReactToNote?: (note: Note, reaction: NoteReactionType | null) => Promise<void> | void;
  isReactionPending?: (note: Note) => boolean;
  onSubmitComment?: (note: Note, payload: CommentSubmitPayload) => Promise<void> | void;
  commentActionPending?: (note: Note) => boolean;
  onToggleCommentsLock?: (note: Note, locked: boolean) => Promise<void> | void;
  viewerId?: string | null;
  viewerDisplayName?: string | null;
  commentLockActionPending?: (note: Note) => boolean;
  onEditComment?: (note: Note, commentId: string, content: string) => Promise<void> | void;
  onDeleteComment?: (note: Note, commentId: string) => Promise<void> | void;
  isCommentEditPending?: (note: Note, commentId: string) => boolean;
  isCommentDeletePending?: (note: Note, commentId: string) => boolean;
}

type GridSpanTier = 1 | 2 | 3 | 4 | 5 | 6;

const NoteSection = ({
  title,
  notes,
  emptyMessage,
  onFollowStatusChange,
  followActionPending = false,
  onReactToNote,
  isReactionPending,
  onSubmitComment,
  commentActionPending,
  onToggleCommentsLock,
  viewerId,
  viewerDisplayName,
  commentLockActionPending,
  onEditComment,
  onDeleteComment,
  isCommentEditPending,
  isCommentDeletePending,
}: NoteSectionProps) => {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!selectedNote) {
      return;
    }

    const updated = notes.find(
      (candidate) =>
        candidate.id === selectedNote.id && candidate.authorId === selectedNote.authorId,
    );

    if (!updated) {
      setSelectedNote(null);
      return;
    }

    if (updated !== selectedNote) {
      setSelectedNote(updated);
    }
  }, [notes, selectedNote]);

  const stripHtml = (value: string) => value.replace(/<[^>]+>/g, "");

  const measureCharacters = (note: Note): number => {
    const title = stripHtml(note.title ?? "");
    const content = stripHtml(note.content ?? "");
    return `${title} ${content}`.replace(/\s+/g, " ").trim().length;
  };

  const determineCardSize = (characters: number): NoteCardSize => {
    if (characters <= 160) {
      return "small";
    }
    if (characters <= 360) {
      return "medium";
    }
    return "large";
  };

  const determineGridSpan = (characters: number): GridSpanTier => {
    if (characters <= 60) {
      return 1;
    }
    if (characters <= 140) {
      return 2;
    }
    if (characters <= 240) {
      return 3;
    }
    if (characters <= 360) {
      return 4;
    }
    if (characters <= 520) {
      return 5;
    }
    return 6;
  };

  const resolveGridClass = (tier: GridSpanTier) => {
    const spanClasses: Record<GridSpanTier, string> = {
      1: "sm:col-span-1 lg:col-span-2 xl:col-span-2",
      2: "sm:col-span-2 lg:col-span-3 xl:col-span-3",
      3: "sm:col-span-3 lg:col-span-4 xl:col-span-4",
      4: "sm:col-span-4 lg:col-span-5 xl:col-span-5",
      5: "sm:col-span-5 lg:col-span-6 xl:col-span-6",
      6: "sm:col-span-6 lg:col-span-7 xl:col-span-7",
    };
    return spanClasses[tier];
  };

  const resolveLayoutAttributes = (note: Note) => {
    const characters = measureCharacters(note);
    const size = determineCardSize(characters);
    const spanTier = determineGridSpan(characters);
    const className = resolveGridClass(spanTier);
    return { size, className };
  };

  return (
    <>
      <section className="relative w-full transition-colors">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold uppercase text-[color:var(--color-text-primary)]">
            {title}
          </h2>
        </div>

        {notes.length === 0 ? (
          <p className="rounded-xl border border-[color:var(--color-card-border)] bg-[color:var(--color-card-bg)] p-6 text-center text-sm font-medium text-[color:var(--color-text-muted)]">
            {emptyMessage ?? "No notes to display yet."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 transition-all duration-500 ease-in-out sm:grid-cols-6 lg:grid-cols-12 xl:grid-cols-12 grid-flow-row-dense">
            {notes.map((note) => {
              const layout = resolveLayoutAttributes(note);

              return (
                <NoteCard
                  key={note.id}
                  note={note}
                  onClick={() => setSelectedNote(note)}
                  onReact={
                    onReactToNote
                      ? (reaction) => {
                          void onReactToNote(note, reaction);
                        }
                      : undefined
                  }
                  isReacting={Boolean(isReactionPending?.(note))}
                  className={layout.className}
                  size={layout.size}
                />
              );
            })}
          </div>
        )}
      </section>

      <ExpandedNoteModal
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
        onToggleFollow={async (authorId, shouldFollow) => {
          if (!selectedNote) {
            return;
          }
          await onFollowStatusChange?.(authorId, shouldFollow);
          setSelectedNote((current) =>
            current ? { ...current, isFollowedAuthor: shouldFollow } : current
          );
        }}
        followActionPending={followActionPending}
        onReact={
          onReactToNote && selectedNote
            ? async (reaction) => {
                await onReactToNote(selectedNote, reaction);
              }
            : undefined
        }
        reactionActionPending={
          selectedNote ? Boolean(isReactionPending?.(selectedNote)) : false
        }
        onSubmitComment={
          onSubmitComment && selectedNote
            ? async (payload) => {
                await onSubmitComment(selectedNote, payload);
              }
            : undefined
        }
        commentActionPending={
          selectedNote ? Boolean(commentActionPending?.(selectedNote)) : false
        }
        onToggleCommentsLock={
          onToggleCommentsLock && selectedNote
            ? async (locked) => {
                await onToggleCommentsLock(selectedNote, locked);
              }
            : undefined
        }
        viewerId={viewerId}
        viewerDisplayName={viewerDisplayName}
        commentsLockPending={
          selectedNote ? Boolean(commentLockActionPending?.(selectedNote)) : false
        }
        onEditComment={
          onEditComment && selectedNote
            ? async (commentId, updatePayload) => {
                await onEditComment(selectedNote, commentId, updatePayload.content);
              }
            : undefined
        }
        onDeleteComment={
          onDeleteComment && selectedNote
            ? async (commentId) => {
                await onDeleteComment(selectedNote, commentId);
              }
            : undefined
        }
        isCommentEditPending={
          selectedNote && isCommentEditPending
            ? (commentId) => isCommentEditPending(selectedNote, commentId)
            : undefined
        }
        isCommentDeletePending={
          selectedNote && isCommentDeletePending
            ? (commentId) => isCommentDeletePending(selectedNote, commentId)
            : undefined
        }
      />
    </>
  );
};

export default NoteSection;
