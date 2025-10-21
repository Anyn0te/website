"use client";

import Image from "next/image";
import { useEffect } from "react";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { Note } from "../types";

interface ExpandedNoteModalProps {
  note: Note | null;
  onClose: () => void;
}

const ExpandedNoteModal = ({ note, onClose }: ExpandedNoteModalProps) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 h-full w-full bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative z-50 m-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white/95 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-3xl font-bold text-[#4a2f88] transition-colors hover:text-[#333]"
          aria-label="Close Note"
        >
          &times;
        </button>

        <h2
          className="mb-4 border-b-2 border-[#4a2f88]/50 p-3 text-3xl font-extrabold text-[#333]"
          dangerouslySetInnerHTML={{ __html: safeTitle }}
        />

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
                    className="w-full rounded-xl bg-[#afa7a7] p-2"
                  >
                    Your browser does not support the audio element.
                  </audio>
                );
              }

              return null;
            })}
          </div>
        )}

        <div className="rounded-xl bg-[#f0f0f0dc] p-4 text-[#333] shadow-inner">
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
