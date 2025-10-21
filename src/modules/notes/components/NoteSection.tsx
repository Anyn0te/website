import { useState } from "react";
import { Note } from "../types";
import ExpandedNoteModal from "./ExpandedNoteModal";
import NoteCard from "./NoteCard";

interface NoteSectionProps {
  title: string;
  notes: Note[];
}

const INITIAL_VISIBLE_NOTES = 5;

const NoteSection = ({ title, notes }: NoteSectionProps) => {
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
      <section className="relative rounded-2xl bg-white/50 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold uppercase text-[#333]">
            {title}
          </h2>

          {canExpand && (
            <button
              onClick={handleExpandToggle}
              className="inline-flex items-center gap-2 rounded-lg border border-[#4a2f88]/40 bg-white/90 px-3 py-1.5 text-sm font-semibold text-[#4a2f88] transition-colors hover:border-[#4a2f88] hover:text-[#333]"
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

        <div className="grid grid-cols-1 gap-4 transition-all duration-500 ease-in-out sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visibleNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onClick={() => setSelectedNote(note)}
            />
          ))}
        </div>
      </section>

      <ExpandedNoteModal note={selectedNote} onClose={() => setSelectedNote(null)} />
    </>
  );
};

export default NoteSection;
