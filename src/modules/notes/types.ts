export type NoteMediaType = "image" | "audio";
export type NoteReactionType = "love" | "dislike";

export interface NoteReactions {
  love: number;
  dislike: number;
}

export interface NoteMedia {
  type: NoteMediaType;
  url?: string | null;
}

export type NoteVisibility = "anonymous" | "public";

export interface StoredNote {
  id: string;
  title: string;
  content: string;
  media: NoteMedia[];
  visibility: NoteVisibility;
  createdAt: string;
  updatedAt: string;
  reactions: NoteReactions;
  reactionMap: Record<string, NoteReactionType>;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  media: NoteMedia[];
  visibility: NoteVisibility;
  createdAt: string;
  authorId: string;
  authorName: string | null;
  isFollowedAuthor: boolean;
  isOwnNote: boolean;
  reactions: NoteReactions;
  viewerReaction: NoteReactionType | null;
}
