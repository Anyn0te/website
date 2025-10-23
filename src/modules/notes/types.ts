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

export interface StoredNoteComment {
  id: string;
  authorId: string;
  authorName: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  isPrivate: boolean;
  participants: string[];
  replyToCommentId: string | null;
}

export interface NoteComment {
  id: string;
  authorId: string;
  authorName: string | null;
  content: string | null;
  createdAt: string;
  updatedAt: string;
  isPrivate: boolean;
  isVisibleToViewer: boolean;
  participants: string[];
  replyToCommentId: string | null;
  isEditableByViewer: boolean;
}

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
  comments: StoredNoteComment[];
  commentsLocked: boolean;
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
  comments: NoteComment[];
  publicCommentCount: number;
  commentsLocked: boolean;
}
