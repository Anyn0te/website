import { NoteReactionType } from "@/modules/notes/types";

export type NotificationType = "reaction" | "comment";

export interface StoredNotification {
  id: string;
  type: NotificationType;
  noteId: string;
  noteTitle: string;
  actorId: string;
  actorName: string | null;
  reaction?: NoteReactionType | null;
  commentId?: string | null;
  isPrivate?: boolean;
  createdAt: string;
  read: boolean;
}

export type Notification = StoredNotification;
