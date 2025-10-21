export type NoteMediaType = "image" | "audio";

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
}
