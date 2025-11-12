import { UserRole } from "@/modules/users/types";

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

export interface MediaEdit {
  zoom?: number;
  panX?: number;
  panY?: number;
  startTime?: number;
  endTime?: number;
  orientation?: "landscape" | "portrait"; 
}

export interface NoteCustomization {
  cardBackground?: string | null;
  cardColor?: string | null;
  textColor?: string | null;
  font?: string | null;
  mediaWidth?: string | null;
  mediaEdits?: Record<string, MediaEdit>;
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
  customization: NoteCustomization | null;
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
  viewerCanModerate: boolean;
  viewerRole: UserRole;
  customization: NoteCustomization | null;
}