import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { Note } from "../types";

interface NoteCardProps {
  note: Note;
  onClick: () => void;
}

const NoteCard = ({ note, onClick }: NoteCardProps) => {
  const safeTitle = sanitizeHtml(note.title);
  const safeContent = sanitizeHtml(note.content);

  const imageCount = note.media.filter((media) => media.type === "image").length;
  const audioCount = note.media.filter((media) => media.type === "audio").length;

  return (
    <div
      onClick={onClick}
      className="flex h-40 cursor-pointer flex-col justify-start rounded-xl bg-[#f0f0f09f] p-4 shadow-lg transition-all hover:bg-[#f0f0f0dc]"
    >
      <h3
        className="mb-2 overflow-hidden text-ellipsis whitespace-nowrap text-lg font-bold uppercase tracking-wider text-[#333]"
        dangerouslySetInnerHTML={{ __html: safeTitle }}
      />

      <div className="flex-grow">
        <p
          className="line-clamp-2 overflow-hidden text-sm text-[#535353]"
          dangerouslySetInnerHTML={{ __html: safeContent }}
        />
      </div>

      {(imageCount > 0 || audioCount > 0) && (
        <span className="mt-2 text-xs font-semibold text-[#4a2f88]">
          {imageCount > 0 && `🖼️ ${imageCount} Image${imageCount > 1 ? "s" : ""}`}
          {imageCount > 0 && audioCount > 0 && " / "}
          {audioCount > 0 && `🎶 ${audioCount} Audio${audioCount > 1 ? "s" : ""}`}
        </span>
      )}
    </div>
  );
};

export default NoteCard;
