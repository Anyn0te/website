"use client";

import React from 'react';
import Image from 'next/image';
import { sanitizeHtml } from '../utils/sanitizeHtml'; 

interface Note {
    id: number;
    title: string;
    content: string;
    media: ('image' | 'audio' | null)[];
    mediaUrls ?: (string | null)[]; 
}

interface ExpandedNoteModalProps {
  note: Note | null;
  onClose: () => void;
}

const ExpandedNoteModal: React.FC<ExpandedNoteModalProps> = ({ note, onClose }) => {
  if (!note) return null;

  const safeTitle = sanitizeHtml(note.title);
  const safeContent = sanitizeHtml(note.content);

  const renderMedia = () => {
    if (!note.mediaUrls) return null;
    
    return note.mediaUrls.map((mediaUrl, index) => {
      if (!mediaUrl) return null;

      const mediaType = note.media[index];

      if (mediaType === 'image') {
        return (
          <Image 
            key={index}
            src={mediaUrl} 
            alt={note.title || "Anonymous Image"} 
            className="w-full object-contain rounded-lg max-h-96 mb-4"
            width={500}
            height={500}
          />
        );
      }
      
      if (mediaType === 'audio') {
        return (
          <audio 
            key={index}
            controls 
            src={mediaUrl} 
            className="w-full p-2 bg-[#afa7a7] rounded-xl mb-4"
          >
            Your browser does not support the audio element.
          </audio>
        );
      }
      
      return null; 
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center" 
    >
      
      <div
          className="absolute inset-0 w-full h-full bg-black/50 backdrop-blur-sm"
          onClick={onClose} 
      ></div>

      <div 
        className="relative bg-white/95 p-6 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-50 m-4" 
        onClick={(e) => e.stopPropagation()} 
      >

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-3xl text-[#4a2f88] hover:text-[#333] font-bold z-10"
          aria-label="Close Note"
        >
          &times;
        </button>

        <h2 
          className="text-3xl font-extrabold text-[#333] mb-4 p-3 border-b-2 border-[#4a2f88]/50"
          dangerouslySetInnerHTML={{ __html: safeTitle }}
        />

        {note.mediaUrls && note.mediaUrls.length > 0 && ( 
          <div className="mb-6">
            {renderMedia()}
          </div>
        )}

        <div className="bg-[#f0f0f0dc] p-4 rounded-xl shadow-inner whitespace-pre-wrap text-[#333]">
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