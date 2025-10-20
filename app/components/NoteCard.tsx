import React from 'react';
import { sanitizeHtml } from '../utils/sanitizeHtml';

interface NoteCardProps {
  note: {
    id: number;
    title: string;
    content: string;
    media: 'image' | 'audio' | null;
  };
  onClick: () => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onClick }) => {
  const safeTitle = sanitizeHtml(note.title);
  const safeContent = sanitizeHtml(note.content);

  return (
    <div 
      onClick={onClick}
      className="bg-[#f0f0f09f] p-4 rounded-xl shadow-lg hover:bg-[#f0f0f0dc] transition-all cursor-pointer h-40 flex flex-col justify-start"
    >
      <h3 
        className="text-lg font-bold text-[#333] mb-2 uppercase tracking-wider overflow-hidden whitespace-nowrap text-ellipsis"
        dangerouslySetInnerHTML={{ __html: safeTitle }}
      />
      
      <div className="flex-grow">
        <p 
          className="text-sm text-[#535353] line-clamp-2 overflow-hidden"
          dangerouslySetInnerHTML={{ __html: safeContent }}
        />
      </div>

      {note.media && (
        <span className="text-xs mt-2 text-[#4a2f88] font-semibold">
          ({note.media === 'image' ? '🖼️ Image attached' : '🎶 Audio attached'})
        </span>
      )}
    </div>
  );
};

export default NoteCard;