"use client";

import React, { useState } from 'react';
import NoteCard from './NoteCard';
import ExpandedNoteModal from './ExpandedNoteModal'; 
interface Note {
    id: number;
    title: string;
    content: string;
    media: 'image' | 'audio' | null;
    isFollowing?: boolean; 
}

interface NoteSectionProps {
  title: string;
  notes: Note[];
  expandToPage: string; 
}

const NoteSection: React.FC<NoteSectionProps> = ({ title, notes, expandToPage }) => {
  const initialCount = 5; 
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const visibleNotes = notes.slice(0, visibleCount);
  const canShowMore = visibleCount < notes.length;
  
  const handleExpand = () => {
    if (canShowMore) {
      setVisibleCount(notes.length); 
    } else {
      window.location.href = '/notes';
    }
  };

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
  }

  const handleCloseModal = () => {
    setSelectedNote(null);
  }

  const gridClasses = visibleNotes.length > initialCount 
    ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'; 
  
  return (
    <>
      <section className="relative p-6 bg-white/50 rounded-2xl shadow-xl">
        
        <h2 className="text-xl font-semibold text-[#333] mb-4 uppercase">{title}</h2>

        <div 
          className={`grid gap-4 transition-all duration-500 ease-in-out ${gridClasses}`}
        >
          {visibleNotes.map(note => (
            <NoteCard 
              key={note.id} 
              note={note} 
              onClick={() => handleNoteClick(note)} 
            />
          ))}
        </div>

        {notes.length > initialCount && (
          <button 
            onClick={handleExpand}
            className="absolute bottom-4 right-4 p-3 text-3xl text-[#4a2f88] hover:text-[#333] transition-colors rounded-full 
                       bg-white/75 backdrop-blur-sm shadow-lg flex items-center justify-center aspect-square" 
            aria-label={canShowMore ? "Expand section to show all notes" : `Go to ${title} page`}
          >
            {canShowMore ? '↓' : '→'}
          </button>
        )}
      </section>

      <ExpandedNoteModal 
        note={selectedNote} 
        onClose={handleCloseModal} 
      />
    </>
  );
};

export default NoteSection;