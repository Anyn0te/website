import { promises as fs } from "fs";
import path from "path";
import {
  Note,
  NoteComment,
  NoteMedia,
  NoteReactionType,
  NoteReactions,
  StoredNote,
  StoredNoteComment,
} from "@/modules/notes/types";
import {
  ThemePreference,
  UserRecord,
  UserSettingsPayload,
} from "../types";

const STORAGE_ROOT = path.join(process.cwd(), "storage");
const USERS_DIRECTORY = path.join(STORAGE_ROOT, "users");

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);

const isReactionType = (value: unknown): value is NoteReactionType =>
  value === "love" || value === "dislike";

const normalizeReactionMap = (
  reactionMap: unknown,
): Record<string, NoteReactionType> => {
  if (!reactionMap || typeof reactionMap !== "object") {
    return {};
  }

  const normalized: Record<string, NoteReactionType> = {};
  for (const [userId, reaction] of Object.entries(
    reactionMap as Record<string, unknown>,
  )) {
    if (typeof userId === "string" && isReactionType(reaction)) {
      normalized[userId] = reaction;
    }
  }

  return normalized;
};

const summarizeReactionMap = (
  reactionMap: Record<string, NoteReactionType>,
): NoteReactions => {
  const summary: NoteReactions = {
    love: 0,
    dislike: 0,
  };

  for (const reaction of Object.values(reactionMap)) {
    if (reaction === "love") {
      summary.love += 1;
    } else if (reaction === "dislike") {
      summary.dislike += 1;
    }
  }

  return summary;
};

const normalizeParticipants = (participants: unknown): string[] => {
  if (!Array.isArray(participants)) {
    return [];
  }

  const normalized = new Set<string>();
  for (const value of participants) {
    if (typeof value === "string" && value.trim()) {
      normalized.add(value.trim());
    }
  }

  return Array.from(normalized);
};

const normalizeStoredComment = (
  comment: StoredNoteComment,
  noteAuthorId: string,
): StoredNoteComment => {
  const normalizedParticipants = normalizeParticipants(comment.participants);
  if (!normalizedParticipants.includes(noteAuthorId)) {
    normalizedParticipants.push(noteAuthorId);
  }
  if (!normalizedParticipants.includes(comment.authorId)) {
    normalizedParticipants.push(comment.authorId);
  }

  return {
    id: comment.id,
    authorId: comment.authorId,
    authorName: comment.authorName ?? null,
    content: comment.content ?? "",
    createdAt: comment.createdAt ?? new Date().toISOString(),
    updatedAt: comment.updatedAt ?? comment.createdAt ?? new Date().toISOString(),
    isPrivate: Boolean(comment.isPrivate),
    participants: normalizedParticipants,
    replyToCommentId: comment.replyToCommentId ?? null,
  };
};

const getFilenameForUser = (user: { userId: string; username: string | null }) => {
  if (user.username) {
    const slug = slugify(user.username);
    if (slug) {
      return `${slug}.json`;
    }
  }

  return `${user.userId}.json`;
};

const userFilePath = (fileName: string) => path.join(USERS_DIRECTORY, fileName);

const ensureUsersDirectory = async () => {
  await fs.mkdir(USERS_DIRECTORY, { recursive: true });
};

const createDefaultUser = (userId: string): UserRecord => {
  const timestamp = new Date().toISOString();
  return {
    userId,
    username: null,
    displayUsername: false,
    themePreference: "system",
    followers: [],
    following: [],
    notes: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const findUserFilePath = async (userId: string): Promise<string | null> => {
  await ensureUsersDirectory();
  const entries = await fs.readdir(USERS_DIRECTORY, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    const absolutePath = userFilePath(entry.name);
    try {
      const contents = await fs.readFile(absolutePath, "utf-8");
      const parsed = JSON.parse(contents) as Partial<UserRecord>;
      if (parsed.userId === userId) {
        return absolutePath;
      }
    } catch {
      // ignore malformed records
    }
  }

  return null;
};

const parseUserFile = (contents: string, userId: string): UserRecord => {
  const parsed = JSON.parse(contents) as Partial<UserRecord>;
  const fallback = createDefaultUser(userId);

  return {
    ...fallback,
    ...parsed,
    userId: parsed.userId ?? fallback.userId,
    username: parsed.username ?? fallback.username,
    displayUsername: parsed.displayUsername ?? fallback.displayUsername,
    themePreference: (parsed.themePreference as ThemePreference | undefined) ?? fallback.themePreference,
    followers: Array.isArray(parsed.followers) ? parsed.followers : fallback.followers,
    following: Array.isArray(parsed.following) ? parsed.following : fallback.following,
    notes: Array.isArray(parsed.notes)
      ? parsed.notes.map((note) => normalizeStoredNote(note, userId))
      : fallback.notes,
    createdAt: parsed.createdAt ?? fallback.createdAt,
    updatedAt: parsed.updatedAt ?? fallback.updatedAt,
  };
};

const normalizeStoredNote = (note: StoredNote, ownerId: string): StoredNote => {
  const normalizedReactionMap = normalizeReactionMap(
    (note as { reactionMap?: Record<string, NoteReactionType>; reactionsByUser?: Record<string, NoteReactionType> }).reactionMap ??
      (note as { reactionsByUser?: Record<string, NoteReactionType> }).reactionsByUser ??
      {},
  );

  const reactions = summarizeReactionMap(normalizedReactionMap);
  const normalizedComments = Array.isArray(
    (note as { comments?: StoredNoteComment[] }).comments,
  )
    ? ((note as { comments: StoredNoteComment[] }).comments).map((comment) =>
        normalizeStoredComment(comment, ownerId),
      )
    : [];

  const commentsLocked =
    typeof (note as { commentsLocked?: unknown }).commentsLocked === "boolean"
      ? Boolean((note as { commentsLocked?: boolean }).commentsLocked)
      : false;

  return {
    id: note.id,
    title: note.title ?? "",
    content: note.content ?? "",
    media: Array.isArray(note.media)
      ? note.media.map<NoteMedia>((mediaItem) => ({
          type: mediaItem.type,
          url: mediaItem.url ?? null,
        }))
      : [],
    visibility: note.visibility === "public" ? "public" : "anonymous",
    createdAt: note.createdAt ?? new Date().toISOString(),
    updatedAt: note.updatedAt ?? note.createdAt ?? new Date().toISOString(),
    reactions,
    reactionMap: normalizedReactionMap,
    comments: normalizedComments,
    commentsLocked,
  };
};

export const getOrCreateUser = async (userId: string): Promise<UserRecord> => {
  await ensureUsersDirectory();

  const existingPath = await findUserFilePath(userId);

  if (existingPath) {
    const contents = await fs.readFile(existingPath, "utf-8");
    return parseUserFile(contents, userId);
  }

  const defaultUser = createDefaultUser(userId);
  await saveUser(defaultUser);
  return defaultUser;
};

export const saveUser = async (user: UserRecord): Promise<void> => {
  await ensureUsersDirectory();
  const payload: UserRecord = {
    ...user,
    followers: [...new Set(user.followers)],
    following: [...new Set(user.following)],
    notes: user.notes.map((note) => normalizeStoredNote(note, user.userId)),
    updatedAt: new Date().toISOString(),
  };

  const serialized = JSON.stringify(payload, null, 2);

  const existingPath = await findUserFilePath(user.userId);
  const targetFileName = getFilenameForUser(user);
  const targetPath = userFilePath(targetFileName);

  if (existingPath && existingPath !== targetPath) {
    await fs.rename(existingPath, targetPath).catch(async (renameError) => {
      if (
        renameError &&
        typeof renameError === "object" &&
        "code" in renameError &&
        (renameError as { code: string }).code === "ENOENT"
      ) {
        return;
      }
      throw renameError;
    });
  }

  await fs.writeFile(targetPath, serialized, "utf-8");
};

const readAllUsers = async (): Promise<UserRecord[]> => {
  await ensureUsersDirectory();
  try {
    const entries = await fs.readdir(USERS_DIRECTORY, { withFileTypes: true });
    const userFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));

    const users = await Promise.all(
      userFiles.map(async (file) => {
        const absolutePath = userFilePath(file.name);
        try {
          const contents = await fs.readFile(absolutePath, "utf-8");
          const parsed = JSON.parse(contents) as Partial<UserRecord>;
          if (!parsed.userId) {
            throw new Error("Invalid user record");
          }
          return parseUserFile(contents, parsed.userId);
        } catch {
          return createDefaultUser(file.name.replace(/\.json$/i, ""));
        }
      })
    );

    return users;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }
};

export const isUsernameTaken = async (
  username: string,
  excludeUserId?: string
): Promise<boolean> => {
  const normalized = username.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const users = await readAllUsers();
  return users.some(
    (user) =>
      user.userId !== excludeUserId &&
      user.username?.trim().toLowerCase() === normalized
  );
};

export const updateUserSettings = async (
  userId: string,
  { username, displayUsername, themePreference }: UserSettingsPayload
): Promise<UserRecord> => {
  const user = await getOrCreateUser(userId);
  const trimmedUsername = username?.trim() ?? null;

  if (trimmedUsername) {
    const taken = await isUsernameTaken(trimmedUsername, userId);
    if (taken) {
      throw new Error("This username is already taken.");
    }
  }

  const updatedUser: UserRecord = {
    ...user,
    username: trimmedUsername || null,
    displayUsername: trimmedUsername ? displayUsername : false,
    themePreference,
    updatedAt: new Date().toISOString(),
  };

  await saveUser(updatedUser);
  return updatedUser;
};

export const appendNoteToUser = async (userId: string, note: StoredNote) => {
  const user = await getOrCreateUser(userId);
  const normalizedNote = normalizeStoredNote(note, userId);
  const updatedUser: UserRecord = {
    ...user,
    notes: [normalizedNote, ...user.notes],
  };

  await saveUser(updatedUser);
};

export const applyReactionToNote = async ({
  authorId,
  noteId,
  reactorId,
  reaction,
}: {
  authorId: string;
  noteId: string;
  reactorId: string;
  reaction: NoteReactionType | null;
}): Promise<StoredNote> => {
  const author = await getOrCreateUser(authorId);
  const noteIndex = author.notes.findIndex((candidate) => candidate.id === noteId);

  if (noteIndex === -1) {
    throw new Error("Note not found.");
  }

  const existingNote = author.notes[noteIndex];
  const reactionMap = {
    ...existingNote.reactionMap,
  };

  if (reaction === null) {
    delete reactionMap[reactorId];
  } else {
    reactionMap[reactorId] = reaction;
  }

  const reactions = summarizeReactionMap(reactionMap);

  const updatedNote: StoredNote = {
    ...existingNote,
    reactionMap,
    reactions,
    updatedAt: new Date().toISOString(),
  };

  const updatedNotes = [...author.notes];
  updatedNotes[noteIndex] = updatedNote;

  const updatedAuthor: UserRecord = {
    ...author,
    notes: updatedNotes,
  };

  await saveUser(updatedAuthor);

  return updatedNote;
};

export const addCommentToNote = async ({
  authorId,
  noteId,
  commenterId,
  commenterName,
  content,
  isPrivate,
  participantUserId,
  replyToCommentId,
}: {
  authorId: string;
  noteId: string;
  commenterId: string;
  commenterName: string | null;
  content: string;
  isPrivate: boolean;
  participantUserId?: string | null;
  replyToCommentId?: string | null;
}): Promise<StoredNoteComment> => {
  const author = await getOrCreateUser(authorId);
  const noteIndex = author.notes.findIndex((candidate) => candidate.id === noteId);

  if (noteIndex === -1) {
    throw new Error("Note not found.");
  }

  const existingNote = author.notes[noteIndex];
  if (existingNote.commentsLocked) {
    throw new Error("Comments are locked for this note.");
  }

  const normalizedContent = content.trim();
  if (!normalizedContent) {
    throw new Error("Comment content is required.");
  }

  const participants = new Set<string>();
  participants.add(authorId);
  participants.add(commenterId);

  if (isPrivate) {
    if (!participantUserId || typeof participantUserId !== "string") {
      throw new Error("Private comments require a participant user id.");
    }
    if (commenterId !== authorId && participantUserId !== authorId) {
      throw new Error("Private inbox messages must involve the note owner.");
    }
    participants.add(participantUserId);
  }

  const timestamp = new Date().toISOString();
  const newComment: StoredNoteComment = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    authorId: commenterId,
    authorName: commenterName ?? null,
    content: normalizedContent,
    createdAt: timestamp,
    updatedAt: timestamp,
    isPrivate,
    participants: Array.from(participants),
    replyToCommentId: replyToCommentId ?? null,
  };

  const normalizedComment = normalizeStoredComment(newComment, authorId);

  const updatedComments = [...existingNote.comments, normalizedComment].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const updatedNote: StoredNote = {
    ...existingNote,
    comments: updatedComments,
    updatedAt: timestamp,
  };

  const updatedNotes = [...author.notes];
  updatedNotes[noteIndex] = updatedNote;

  const updatedAuthor: UserRecord = {
    ...author,
    notes: updatedNotes,
  };

  await saveUser(updatedAuthor);

  return normalizedComment;
};

export const setNoteCommentsLocked = async ({
  authorId,
  noteId,
  locked,
}: {
  authorId: string;
  noteId: string;
  locked: boolean;
}): Promise<StoredNote> => {
  const author = await getOrCreateUser(authorId);
  const noteIndex = author.notes.findIndex((candidate) => candidate.id === noteId);

  if (noteIndex === -1) {
    throw new Error("Note not found.");
  }

  const existingNote = author.notes[noteIndex];
  const updatedNote: StoredNote = {
    ...existingNote,
    commentsLocked: locked,
    updatedAt: new Date().toISOString(),
  };

  const updatedNotes = [...author.notes];
  updatedNotes[noteIndex] = updatedNote;

  const updatedAuthor: UserRecord = {
    ...author,
    notes: updatedNotes,
  };

  await saveUser(updatedAuthor);

  return updatedNote;
};

export const updateCommentOnNote = async ({
  authorId,
  noteId,
  commentId,
  editorId,
  content,
}: {
  authorId: string;
  noteId: string;
  commentId: string;
  editorId: string;
  content: string;
}): Promise<StoredNoteComment> => {
  const author = await getOrCreateUser(authorId);
  const noteIndex = author.notes.findIndex((candidate) => candidate.id === noteId);

  if (noteIndex === -1) {
    throw new Error("Note not found.");
  }

  const existingNote = author.notes[noteIndex];
  const commentIndex = existingNote.comments.findIndex((comment) => comment.id === commentId);

  if (commentIndex === -1) {
    throw new Error("Comment not found.");
  }

  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error("Updated comment cannot be empty.");
  }

  const existingComment = existingNote.comments[commentIndex];

  const canEdit =
    editorId === existingComment.authorId ||
    editorId === authorId ||
    (existingComment.isPrivate && existingComment.participants.includes(editorId));

  if (!canEdit) {
    throw new Error("You do not have permission to update this comment.");
  }

  const timestamp = new Date().toISOString();
  const updatedComment: StoredNoteComment = {
    ...existingComment,
    content: trimmedContent,
    updatedAt: timestamp,
  };

  const updatedComments = [...existingNote.comments];
  updatedComments[commentIndex] = updatedComment;

  const updatedNote: StoredNote = {
    ...existingNote,
    comments: updatedComments,
    updatedAt: timestamp,
  };

  const updatedNotes = [...author.notes];
  updatedNotes[noteIndex] = updatedNote;

  const updatedAuthor: UserRecord = {
    ...author,
    notes: updatedNotes,
  };

  await saveUser(updatedAuthor);

  return updatedComment;
};

export const deleteCommentFromNote = async ({
  authorId,
  noteId,
  commentId,
  actorId,
}: {
  authorId: string;
  noteId: string;
  commentId: string;
  actorId: string;
}): Promise<void> => {
  const author = await getOrCreateUser(authorId);
  const noteIndex = author.notes.findIndex((candidate) => candidate.id === noteId);

  if (noteIndex === -1) {
    throw new Error("Note not found.");
  }

  const existingNote = author.notes[noteIndex];
  const commentIndex = existingNote.comments.findIndex((comment) => comment.id === commentId);

  if (commentIndex === -1) {
    throw new Error("Comment not found.");
  }

  const existingComment = existingNote.comments[commentIndex];
  const canDelete = actorId === existingComment.authorId || actorId === authorId;

  if (!canDelete) {
    throw new Error("You do not have permission to delete this comment.");
  }

  const updatedComments = existingNote.comments.filter((comment) => comment.id !== commentId);
  const updatedNote: StoredNote = {
    ...existingNote,
    comments: updatedComments,
    updatedAt: new Date().toISOString(),
  };

  const updatedNotes = [...author.notes];
  updatedNotes[noteIndex] = updatedNote;

  const updatedAuthor: UserRecord = {
    ...author,
    notes: updatedNotes,
  };

  await saveUser(updatedAuthor);
};

export const setFollowingStatus = async (
  userId: string,
  targetUserId: string,
  shouldFollow: boolean
) => {
  if (userId === targetUserId) {
    throw new Error("You cannot follow yourself.");
  }

  const follower = await getOrCreateUser(userId);
  const target = await getOrCreateUser(targetUserId);

  const followingSet = new Set(follower.following);
  const followerSet = new Set(target.followers);

  if (shouldFollow) {
    followingSet.add(targetUserId);
    followerSet.add(userId);
  } else {
    followingSet.delete(targetUserId);
    followerSet.delete(userId);
  }

  const updatedFollower: UserRecord = {
    ...follower,
    following: Array.from(followingSet),
  };
  const updatedTarget: UserRecord = {
    ...target,
    followers: Array.from(followerSet),
  };

  await Promise.all([saveUser(updatedFollower), saveUser(updatedTarget)]);

  return {
    follower: updatedFollower,
    target: updatedTarget,
  };
};

const sortNotesByDateDesc = (notes: StoredNote[]) =>
  [...notes].sort(
    (a, b) =>
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
  );

const mapCommentsForViewer = (
  comments: StoredNoteComment[],
  viewerId: string | null,
): NoteComment[] =>
  [...comments]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map<NoteComment>((comment) => {
      const isVisible =
        !comment.isPrivate ||
        (viewerId ? comment.participants.includes(viewerId) : false);

      const isEditable = Boolean(
        viewerId &&
          (viewerId === comment.authorId || (comment.isPrivate && comment.participants.includes(viewerId))),
      );

      return {
        id: comment.id,
        authorId: comment.authorId,
        authorName: comment.authorName ?? null,
        content: isVisible ? comment.content : null,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        isPrivate: comment.isPrivate,
        isVisibleToViewer: isVisible,
        participants: comment.participants,
        replyToCommentId: comment.replyToCommentId ?? null,
        isEditableByViewer: isEditable,
      };
    });

export const getAggregatedNotesForUser = async (
  userId?: string | null,
): Promise<Note[]> => {
  const users = await readAllUsers();
  let viewer = userId ? users.find((user) => user.userId === userId) ?? null : null;

  if (!viewer && userId) {
    viewer = await getOrCreateUser(userId);
  }

  const viewerFollowing = new Set(viewer?.following ?? []);

  const aggregated: Note[] = [];

  for (const user of users) {
    const authorName = user.username;
    const isViewer = viewer ? user.userId === viewer.userId : false;
    const authorNotes = sortNotesByDateDesc(user.notes);

    for (const note of authorNotes) {
      const reactions = summarizeReactionMap(note.reactionMap);
      const viewerReaction =
        viewer?.userId ? note.reactionMap[viewer.userId] ?? null : null;
      const publicCommentCount = note.comments.filter((comment) => !comment.isPrivate)
        .length;
      const comments = mapCommentsForViewer(note.comments, viewer?.userId ?? null);

      aggregated.push({
        id: note.id,
        title: note.title,
        content: note.content,
        media: note.media,
        visibility: note.visibility,
        createdAt: note.createdAt,
        authorId: user.userId,
        authorName: note.visibility === "public" ? authorName : null,
        isFollowedAuthor: viewerFollowing.has(user.userId),
        isOwnNote: isViewer,
        reactions,
        viewerReaction,
        comments,
        publicCommentCount,
        commentsLocked: note.commentsLocked ?? false,
      });
    }
  }

  aggregated.sort((a, b) => {
    if (b.publicCommentCount !== a.publicCommentCount) {
      return b.publicCommentCount - a.publicCommentCount;
    }
    if (b.reactions.love !== a.reactions.love) {
      return b.reactions.love - a.reactions.love;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return aggregated;
};
