import { NoteReactionType, NoteReactions } from "../types";

export interface CreateNotePayload {
  title: string;
  content: string;
  mediaFiles: File[];
  token?: string | null;
  userId: string;
}

export const createNote = async ({
  title,
  content,
  mediaFiles,
  token,
  userId,
}: CreateNotePayload): Promise<void> => {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("content", content);
  formData.append("userId", userId);

  for (const file of mediaFiles) {
    formData.append("mediaFiles", file);
  }

  const response = await fetch("/api/notes", {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Unable to create note.");
  }
};

export interface ReactToNotePayload {
  noteId: string;
  authorId: string;
  reaction: NoteReactionType | null;
  token?: string | null;
  userId: string;
}

export interface ReactToNoteResult {
  reactions: NoteReactions;
  viewerReaction: NoteReactionType | null;
}

export const reactToNote = async ({
  noteId,
  authorId,
  reaction,
  token,
  userId,
}: ReactToNotePayload): Promise<ReactToNoteResult> => {
  const response = await fetch("/api/notes/react", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      noteId,
      authorId,
      reaction: reaction ?? "none",
      userId,
    }),
  });

  const payload = (await response.json()) as ReactToNoteResult & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to update reaction.");
  }

  return {
    reactions: payload.reactions,
    viewerReaction: payload.viewerReaction ?? null,
  };
};
