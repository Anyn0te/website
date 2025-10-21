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
  const displayAuthor = note.authorName ? `@${note.authorName}` : "Anonymous";
  const authorBadge = note.isOwnNote ? "You" : note.isFollowedAuthor ? "Following" : null;

  return (
    <div
      onClick={onClick}
      className="flex h-48 cursor-pointer flex-col justify-start rounded-2xl border border-[color:var(--color-card-border)] bg-[color:var(--color-card-bg)] p-5 shadow-[0_8px_20px_var(--color-glow)] transition-transform transition-shadow duration-200 hover:-translate-y-1 hover:bg-[color:var(--color-card-hover-bg)] hover:shadow-[0_12px_28px_var(--color-glow)]"
    >
      <div className="mb-2 flex items-center justify-between text-[color:var(--color-text-muted)]">
        <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-accent)]">
          {displayAuthor}
        </span>
        {authorBadge && (
          <span className="rounded-full bg-[color:var(--color-chip-bg)] px-2 py-0.5 text-[0.7rem] font-semibold text-[color:var(--color-chip-text)]">
            {authorBadge}
          </span>
        )}
      </div>
      <h3
        className="mb-2 overflow-hidden text-ellipsis whitespace-nowrap text-lg font-bold uppercase tracking-wider text-[color:var(--color-text-primary)]"
        dangerouslySetInnerHTML={{ __html: safeTitle }}
      />

      <div className="flex-grow">
        <p
          className="line-clamp-2 overflow-hidden text-sm text-[color:var(--color-text-body)]"
          dangerouslySetInnerHTML={{ __html: safeContent }}
        />
      </div>

      {(imageCount > 0 || audioCount > 0) && (
        <span className="mt-3 text-xs font-semibold text-[color:var(--color-text-accent)]">
          {imageCount > 0 && `🖼️ ${imageCount} Image${imageCount > 1 ? "s" : ""}`}
          {imageCount > 0 && audioCount > 0 && " / "}
          {audioCount > 0 && `🎶 ${audioCount} Audio${audioCount > 1 ? "s" : ""}`}
        </span>
      )}
    </div>
  );
};

export default NoteCard;
