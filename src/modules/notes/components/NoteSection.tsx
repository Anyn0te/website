import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Note, NoteReactionType } from "../types";
import ExpandedNoteModal from "./ExpandedNoteModal";
import NoteCard from "./NoteCard";

interface NoteSectionProps {
  title: string;
  notes: Note[];
  emptyMessage?: string;
  onFollowStatusChange?: (targetUserId: string, shouldFollow: boolean) => Promise<void>;
  followActionPending?: boolean;
  viewAllPath?: string;
  onReactToNote?: (note: Note, reaction: NoteReactionType | null) => Promise<void> | void;
  isReactionPending?: (note: Note) => boolean;
}

const INITIAL_VISIBLE_NOTES = 5;

const NoteSection = ({
  title,
  notes,
  emptyMessage,
  onFollowStatusChange,
  followActionPending = false,
  viewAllPath,
  onReactToNote,
  isReactionPending,
}: NoteSectionProps) => {
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_NOTES);
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

  const visibleNotes = notes.slice(0, visibleCount);
  const canExpand = notes.length > INITIAL_VISIBLE_NOTES;
  const showAllLocally = visibleCount >= notes.length;

  let buttonLabel = "";
  let buttonIcon = "";
  let buttonAction: () => void;

  if (showAllLocally && viewAllPath) {
    buttonLabel = "Show all";
    buttonIcon = "bi-box-arrow-up-right";
    buttonAction = () => {
      router.push(viewAllPath);
    };
  } else if (showAllLocally) {
    buttonLabel = "Show less";
    buttonIcon = "bi-chevron-up";
    buttonAction = () => {
      setVisibleCount(INITIAL_VISIBLE_NOTES);
    };
  } else {
    buttonLabel = "Show all";
    buttonIcon = "bi-chevron-down";
    buttonAction = () => {
      setVisibleCount(notes.length);
    };
  }

  return (
    <>
      <section className="relative rounded-2xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-panel-bg)] p-6 shadow-[0_8px_20px_var(--color-glow)] transition-colors">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold uppercase text-[color:var(--color-text-primary)]">
            {title}
          </h2>

          {canExpand && (
            <button
              onClick={buttonAction}
              className={`inline-flex items-center gap-2 rounded-full border border-[color:var(--color-panel-border)] px-3 py-1.5 text-sm font-semibold shadow-sm transition-all ${
                showAllLocally && viewAllPath
                  ? "bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] border-transparent"
                  : "bg-[color:var(--color-button-muted-bg)] text-[color:var(--color-text-accent)] hover:border-[color:var(--color-text-accent)] hover:bg-[color:var(--color-card-hover-bg)] hover:text-[color:var(--color-text-primary)]"
              }`}
              aria-label={
                showAllLocally && viewAllPath
                  ? `Expand section to the dedicated ${buttonLabel} page`
                  : showAllLocally
                  ? "Collapse section to initial view"
                  : "Expand section to show all notes"
              }
            >
              <span>{buttonLabel}</span>
              <i
                className={`bi ${buttonIcon}`}
                aria-hidden="true"
              />
            </button>
          )}
        </div>

            {notes.length === 0 ? (
              <p className="rounded-xl border border-[color:var(--color-card-border)] bg-[color:var(--color-card-bg)] p-6 text-center text-sm font-medium text-[color:var(--color-text-muted)]">
                {emptyMessage ?? "No notes to display yet."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 transition-all duration-500 ease-in-out sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {visibleNotes.map((note) => (
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
                  />
                ))}
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
      />
    </>
  );
};

export default NoteSection;
