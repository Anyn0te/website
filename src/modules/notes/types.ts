export type NoteMediaType = "image" | "audio";

export interface NoteMedia {
  type: NoteMediaType;
  url?: string | null;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  isFollowing: boolean;
  media: NoteMedia[];
}
