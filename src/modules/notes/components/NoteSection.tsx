import { useState } from "react";
import { Note } from "../types";
import ExpandedNoteModal from "./ExpandedNoteModal";
import NoteCard from "./NoteCard";

interface NoteSectionProps {
  title: string;
  notes: Note[];
  emptyMessage?: string;
  onFollowStatusChange?: (targetUserId: string, shouldFollow: boolean) => Promise<void>;
  followActionPending?: boolean;
}

const INITIAL_VISIBLE_NOTES = 5;

const NoteSection = ({
  title,
  notes,
  emptyMessage,
  onFollowStatusChange,
  followActionPending = false,
}: NoteSectionProps) => {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_NOTES);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const visibleNotes = notes.slice(0, visibleCount);
  const canExpand = notes.length > INITIAL_VISIBLE_NOTES;
  const showAll = visibleCount >= notes.length;

  const handleExpandToggle = () => {
    setVisibleCount((current) =>
      current >= notes.length ? INITIAL_VISIBLE_NOTES : notes.length
    );
  };

  return (
    <>
      <section className="relative rounded-2xl border border-[color:var(--color-panel-border)] bg-[color:var(--color-panel-bg)] p-6 shadow-[0_8px_20px_var(--color-glow)] transition-colors">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold uppercase text-[color:var(--color-text-primary)]">
            {title}
          </h2>

          {canExpand && (
            <button
              onClick={handleExpandToggle}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-panel-border)] bg-[color:var(--color-button-muted-bg)] px-3 py-1.5 text-sm font-semibold text-[color:var(--color-text-accent)] shadow-sm transition-all hover:border-[color:var(--color-text-accent)] hover:bg-[color:var(--color-card-hover-bg)] hover:text-[color:var(--color-text-primary)]"
              aria-label={
                showAll
                  ? "Collapse section to initial view"
                  : "Expand section to show all notes"
              }
            >
              <span>{showAll ? "Show less" : "Show all"}</span>
              <i
                className={`bi ${showAll ? "bi-chevron-up" : "bi-chevron-down"}`}
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
      />
    </>
  );
};

export default NoteSection;
