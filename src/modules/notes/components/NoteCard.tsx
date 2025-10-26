import { MouseEvent } from "react";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { Note, NoteReactionType } from "../types";

export type NoteCardSize = "small" | "medium" | "large";

interface NoteCardProps {
  note: Note;
  onClick: () => void;
  onReact?: (reaction: NoteReactionType | null) => void;
  isReacting?: boolean;
  className?: string;
  size?: NoteCardSize;
  animationDelayMs?: number;
}

const sizeStyles = {
  small: {
    wrapper: "p-4 gap-3",
    title: "text-lg",
    content: "text-sm leading-relaxed line-clamp-4",
  },
  medium: {
    wrapper: "p-5 gap-4",
    title: "text-xl",
    content: "text-sm leading-relaxed line-clamp-6",
  },
  large: {
    wrapper: "p-6 gap-5",
    title: "text-2xl",
    content: "text-base leading-relaxed line-clamp-7",
  },
} as const;

const NoteCard = ({
  note,
  onClick,
  onReact,
  isReacting = false,
  className = "",
  size = "medium",
  animationDelayMs,
}: NoteCardProps) => {
  const safeTitle = sanitizeHtml(note.title);
  const safeContent = sanitizeHtml(note.content);
  const sizeTokens = sizeStyles[size];

  const imageCount = note.media.filter((media) => media.type === "image").length;
  const audioCount = note.media.filter((media) => media.type === "audio").length;
  const displayAuthor = note.authorName ? `@${note.authorName}` : "Anonymous";
  const authorBadge = note.isOwnNote ? "You" : note.isFollowedAuthor ? "Following" : null;
  const isLoved = note.viewerReaction === "love";
  const isDisliked = note.viewerReaction === "dislike";
  const commentCount = note.publicCommentCount;
  const commentsLocked = note.commentsLocked;

  const handleReactionClick = (event: MouseEvent<HTMLButtonElement>, reaction: NoteReactionType) => {
    event.stopPropagation();
    if (!onReact || isReacting) {
      return;
    }

    const nextReaction = note.viewerReaction === reaction ? null : reaction;
    onReact(nextReaction);
  };

  return (
    <div
      onClick={onClick}
      className={`group flex h-full w-full cursor-pointer flex-col justify-start rounded-3xl border border-[color:var(--color-card-border)] bg-[color:var(--color-card-bg)] shadow-[0_8px_20px_var(--color-glow)] transition-transform transition-shadow duration-200 hover:-translate-y-1 hover:bg-[color:var(--color-card-hover-bg)] hover:shadow-[0_12px_28px_var(--color-glow)] ${sizeTokens.wrapper} animate-fade-up ${className}`}
      style={
        animationDelayMs !== undefined
          ? { animationDelay: `${animationDelayMs}ms` }
          : undefined
      }
    >
      <div className="flex items-center justify-between text-[color:var(--color-text-muted)]">
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
        className={`overflow-hidden text-[color:var(--color-text-primary)] font-bold uppercase tracking-wide ${sizeTokens.title}`}
        dangerouslySetInnerHTML={{ __html: safeTitle }}
      />

      <div className="flex-grow">
        <p
          className={`overflow-hidden text-[color:var(--color-text-body)] ${sizeTokens.content}`}
          dangerouslySetInnerHTML={{ __html: safeContent }}
        />
      </div>

      {(imageCount > 0 || audioCount > 0) && (
        <span className="text-xs font-semibold text-[color:var(--color-text-accent)]">
          {imageCount > 0 && `🖼️ ${imageCount} Image${imageCount > 1 ? "s" : ""}`}
          {imageCount > 0 && audioCount > 0 && " / "}
          {audioCount > 0 && `🎶 ${audioCount} Audio${audioCount > 1 ? "s" : ""}`}
        </span>
      )}

      <div className="flex items-center justify-between text-xs font-semibold text-[color:var(--color-text-muted)]">
        <span
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-button-muted-bg)] px-3 py-1"
          aria-label={`Thoughts ${commentCount}`}
        >
          <span className="text-base" aria-hidden="true">
            💬
          </span>
          <span>{commentCount}</span>
        </span>
        {commentsLocked && (
          <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-text-accent)] px-3 py-1 text-[color:var(--color-text-accent)]">
            <span className="text-base" aria-hidden="true">
              🔒
            </span>
            <span>Locked</span>
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-[0.7rem] font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">
        <span>Feelings</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className={`flex flex-1 items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all ${
            isLoved
              ? "border-transparent bg-rose-500 text-white shadow-lg ring-2 ring-rose-300"
              : "border-[color:var(--color-panel-border)] bg-[color:var(--color-button-muted-bg)] text-[color:var(--color-text-primary)] hover:border-[color:var(--color-text-accent)] hover:text-[color:var(--color-text-accent)]"
          } ${isReacting ? "cursor-wait opacity-70" : ""}`}
          onClick={(event) => handleReactionClick(event, "love")}
          disabled={isReacting}
          aria-label={isLoved ? "Remove love reaction" : "React with love"}
          aria-pressed={isLoved}
        >
          <span aria-hidden="true">❤️</span>
          <span className={isLoved ? "font-bold" : ""}>{note.reactions.love}</span>
        </button>
        <button
          type="button"
          className={`flex flex-1 items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all ${
            isDisliked
              ? "border-transparent bg-slate-800 text-white shadow-lg ring-2 ring-slate-500/80"
              : "border-[color:var(--color-panel-border)] bg-[color:var(--color-button-muted-bg)] text-[color:var(--color-text-primary)] hover:border-[color:var(--color-text-accent)] hover:text-[color:var(--color-text-accent)]"
          } ${isReacting ? "cursor-wait opacity-70" : ""}`}
          onClick={(event) => handleReactionClick(event, "dislike")}
          disabled={isReacting}
          aria-label={isDisliked ? "Remove dislike reaction" : "React with dislike"}
          aria-pressed={isDisliked}
        >
          <span aria-hidden="true">👎</span>
          <span className={isDisliked ? "font-bold" : ""}>{note.reactions.dislike}</span>
        </button>
      </div>
    </div>
  );
};

export default NoteCard;
