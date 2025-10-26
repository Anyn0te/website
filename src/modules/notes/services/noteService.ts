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

export interface AddCommentPayload {
  noteId: string;
  authorId: string;
  content: string;
  isPrivate: boolean;
  participantUserId?: string | null;
  replyToCommentId?: string | null;
  token?: string | null;
  userId: string;
  commenterName: string | null;
}

export const addCommentToNote = async ({
  noteId,
  authorId,
  content,
  isPrivate,
  participantUserId,
  replyToCommentId,
  token,
  userId,
  commenterName,
}: AddCommentPayload): Promise<void> => {
  const response = await fetch("/api/notes/comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      noteId,
      authorId,
      content,
      isPrivate,
      participantUserId: participantUserId ?? null,
      replyToCommentId: replyToCommentId ?? null,
      commenterName,
      userId,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Unable to submit comment.");
  }
};

export interface UpdateCommentPayload {
  noteId: string;
  authorId: string;
  commentId: string;
  content: string;
  token?: string | null;
  userId: string;
}

export const updateCommentOnNote = async ({
  noteId,
  authorId,
  commentId,
  content,
  token,
  userId,
}: UpdateCommentPayload): Promise<void> => {
  const response = await fetch("/api/notes/comment", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      noteId,
      authorId,
      commentId,
      content,
      userId,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Unable to update comment.");
  }
};

export interface DeleteCommentPayload {
  noteId: string;
  authorId: string;
  commentId: string;
  token?: string | null;
  userId: string;
}

export const deleteCommentFromNote = async ({
  noteId,
  authorId,
  commentId,
  token,
  userId,
}: DeleteCommentPayload): Promise<void> => {
  const response = await fetch("/api/notes/comment", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      noteId,
      authorId,
      commentId,
      userId,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Unable to delete comment.");
  }
};

export interface SetCommentsLockedPayload {
  noteId: string;
  authorId: string;
  locked: boolean;
  token?: string | null;
  userId: string;
}

export const setCommentsLocked = async ({
  noteId,
  authorId,
  locked,
  token,
  userId,
}: SetCommentsLockedPayload): Promise<void> => {
  const response = await fetch("/api/notes/comment/lock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      noteId,
      authorId,
      locked,
      userId,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Unable to update comment settings.");
  }
};

export interface UpdateNotePayload {
  noteId: string;
  authorId: string;
  title: string;
  content: string;
  token?: string | null;
  userId: string;
}

export const updateNoteContent = async ({
  noteId,
  authorId,
  title,
  content,
  token,
  userId,
}: UpdateNotePayload): Promise<void> => {
  const response = await fetch("/api/notes", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      noteId,
      authorId,
      title,
      content,
      userId,
    }),
  });

  const payload = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to update note.");
  }
};

export interface DeleteNotePayload {
  noteId: string;
  authorId: string;
  token?: string | null;
  userId: string;
}

export const deleteNote = async ({
  noteId,
  authorId,
  token,
  userId,
}: DeleteNotePayload): Promise<void> => {
  const response = await fetch("/api/notes", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      noteId,
      authorId,
      userId,
    }),
  });

  const payload = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to delete note.");
  }
};
