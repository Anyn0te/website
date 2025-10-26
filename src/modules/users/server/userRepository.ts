import { promises as fs } from "fs";
import path from "path";
import {
  Note,
  NoteComment,
  NoteMedia,
  NoteMediaType,
  NoteReactionType,
  NoteReactions,
  StoredNote,
  StoredNoteComment,
} from "@/modules/notes/types";
import { StoredNotification } from "@/modules/notifications/types";
import {
  PushSubscriptionRecord,
  ThemePreference,
  UserRecord,
  UserRole,
  UserSettingsPayload,
} from "../types";

const STORAGE_ROOT = path.join(process.cwd(), "storage");
const USERS_DIRECTORY = path.join(STORAGE_ROOT, "users");
const MAX_NOTIFICATIONS = 100;
const normalizeRole = (value: unknown): UserRole => {
  if (value === "admin" || value === "moderator" || value === "user") {
    return value;
  }
  return "anonymous";
};

const resolveAccessForUser = (user: UserRecord | null) => {
  const baseRole = normalizeRole(user?.role);
  const role =
    user && user.userId && user.userId.startsWith("guest-") ? "anonymous" : baseRole;
  const canModerateNotes = role === "admin" || role === "moderator";
  const canViewPrivateComments = canModerateNotes;
  return {
    role,
    canModerateNotes,
    canViewPrivateComments,
    isAdmin: role === "admin",
    isModerator: role === "moderator",
  };
};

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
  if (!normalizedParticipants.includes(comment.authorId)) {
    normalizedParticipants.push(comment.authorId);
  }
  if (!comment.isPrivate && !normalizedParticipants.includes(noteAuthorId)) {
    normalizedParticipants.push(noteAuthorId);
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

const normalizeStoredNotification = (
  notification: StoredNotification,
): StoredNotification => {
  const isReaction = notification.type === "reaction";
  const isComment = notification.type === "comment";

  const reactionValue = notification.reaction;
  const normalizedReaction: NoteReactionType | null =
    reactionValue === "love" || reactionValue === "dislike" ? reactionValue : null;

  return {
    id: notification.id,
    type: isReaction ? "reaction" : isComment ? "comment" : "comment",
    noteId: notification.noteId,
    noteTitle: notification.noteTitle ?? "",
    actorId: notification.actorId,
    actorName: notification.actorName ?? null,
    reaction: normalizedReaction,
    commentId: notification.commentId ?? null,
    isPrivate: Boolean(notification.isPrivate),
    createdAt: notification.createdAt ?? new Date().toISOString(),
    read: Boolean(notification.read),
  };
};

const createNotificationId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const resolveDisplayName = (user: UserRecord | null): string | null => {
  if (!user) {
    return null;
  }

  if (user.displayUsername && user.username) {
    return `@${user.username}`;
  }

  return null;
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
    notifications: [],
    pushSubscriptions: [],
    role: "anonymous",
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
    notifications: Array.isArray(parsed.notifications)
      ? parsed.notifications
          .map((notification) => normalizeStoredNotification(notification))
          .slice(0, MAX_NOTIFICATIONS)
      : fallback.notifications,
    pushSubscriptions: Array.isArray(
      (parsed as { pushSubscriptions?: unknown[] }).pushSubscriptions,
    )
      ? ((parsed as { pushSubscriptions: unknown[] }).pushSubscriptions)
          .map((subscription) => normalizePushSubscription(subscription))
          .filter((subscription): subscription is PushSubscriptionRecord => subscription !== null)
      : fallback.pushSubscriptions,
    role: normalizeRole((parsed as { role?: unknown }).role),
    createdAt: parsed.createdAt ?? fallback.createdAt,
    updatedAt: parsed.updatedAt ?? fallback.updatedAt,
  };
};

const normalizeMediaUrl = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  let normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized) || normalized.startsWith("data:")) {
    return normalized;
  }

  if (normalized.startsWith("/media/")) {
    return normalized;
  }

  if (normalized.startsWith("media/")) {
    return `/${normalized}`;
  }

  if (normalized.startsWith("/public/media/")) {
    return normalized.replace("/public", "");
  }

  if (normalized.startsWith("./")) {
    normalized = normalized.replace(/^\.+/, "");
  }

  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  return normalized;
};

const inferMediaTypeFromUrl = (url: string): NoteMediaType | null => {
  const lower = url.toLowerCase();

  if (/\.(jpe?g|png)$/i.test(lower)) {
    return "image";
  }

  if (/\.(mp3|wav|ogg|mpeg|mpga)$/i.test(lower)) {
    return "audio";
  }

  return null;
};

const normalizeMediaEntry = (candidate: unknown): NoteMedia | null => {
  if (!candidate) {
    return null;
  }

  if (typeof candidate === "string") {
    const url = normalizeMediaUrl(candidate);
    const type = url ? inferMediaTypeFromUrl(url) : null;
    if (!url || !type) {
      return null;
    }
    return { type, url };
  }

  if (typeof candidate !== "object") {
    return null;
  }

  const record = candidate as Record<string, unknown>;
  const rawType = typeof record.type === "string" ? record.type.toLowerCase() : null;
  const explicitType: NoteMediaType | null =
    rawType === "image" || rawType === "audio" ? (rawType as NoteMediaType) : null;

  const possibleUrlKeys = ["url", "mediaUrl", "path", "src", "href"];
  let url: string | null = null;
  for (const key of possibleUrlKeys) {
    const value = record[key];
    const normalized = normalizeMediaUrl(value);
    if (normalized) {
      url = normalized;
      break;
    }
  }

  if (!url && typeof record.file === "string") {
    url = normalizeMediaUrl(record.file);
  }

  if (!url && typeof record.filename === "string") {
    url = normalizeMediaUrl(record.filename);
  }

  if (!url) {
    return null;
  }

  const type = explicitType ?? inferMediaTypeFromUrl(url);
  if (!type) {
    return null;
  }

  return { type, url };
};

const normalizeMediaCollection = (media: unknown): NoteMedia[] => {
  const items: unknown[] = Array.isArray(media)
    ? media
    : media && typeof media === "object"
      ? [media]
      : [];

  const result: NoteMedia[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const normalized = normalizeMediaEntry(item);
    if (!normalized || !normalized.url) {
      continue;
    }

    const key = `${normalized.type}:${normalized.url}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
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

  const media = normalizeMediaCollection((note as { media?: unknown }).media);

  return {
    id: note.id,
    title: note.title ?? "",
    content: note.content ?? "",
    media,
    visibility: note.visibility === "public" ? "public" : "anonymous",
    createdAt: note.createdAt ?? new Date().toISOString(),
    updatedAt: note.updatedAt ?? note.createdAt ?? new Date().toISOString(),
    reactions,
    reactionMap: normalizedReactionMap,
    comments: normalizedComments,
    commentsLocked,
  };
};

const normalizePushSubscription = (subscription: unknown): PushSubscriptionRecord | null => {
  if (!subscription || typeof subscription !== "object") {
    return null;
  }

  const { endpoint, expirationTime, keys } = subscription as {
    endpoint?: unknown;
    expirationTime?: unknown;
    keys?: unknown;
  };

  if (typeof endpoint !== "string" || !endpoint) {
    return null;
  }

  if (!keys || typeof keys !== "object") {
    return null;
  }

  const { p256dh, auth } = keys as { p256dh?: unknown; auth?: unknown };

  if (typeof p256dh !== "string" || typeof auth !== "string") {
    return null;
  }

  return {
    endpoint,
    expirationTime:
      typeof expirationTime === "number"
        ? expirationTime
        : expirationTime === null
          ? null
          : null,
    keys: {
      p256dh,
      auth,
    },
  };
};

const dedupePushSubscriptions = (
  subscriptions: PushSubscriptionRecord[],
): PushSubscriptionRecord[] => {
  const map = new Map<string, PushSubscriptionRecord>();
  for (const subscription of subscriptions) {
    const normalized = normalizePushSubscription(subscription);
    if (!normalized) {
      continue;
    }
    map.set(normalized.endpoint, normalized);
  }
  return Array.from(map.values());
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
    notifications: user.notifications
      .map((notification) => normalizeStoredNotification(notification))
      .slice(0, MAX_NOTIFICATIONS),
    pushSubscriptions: dedupePushSubscriptions(user.pushSubscriptions ?? []),
    role: normalizeRole(user.role),
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
  const previousReaction = existingNote.reactionMap[reactorId] ?? null;
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

  if (
    reaction !== null &&
    reaction !== previousReaction &&
    reactorId !== authorId
  ) {
    const reactorRecord = await getOrCreateUser(reactorId);
    const actorDisplayName = resolveDisplayName(reactorRecord) ?? "Someone";
    const noteTitle = existingNote.title ?? "Untitled Note";

    await addNotificationToUser(authorId, {
      type: "reaction",
      noteId,
      noteTitle,
      actorId: reactorId,
      actorName: actorDisplayName,
      reaction,
    });
  }

  return updatedNote;
};

export const updateNoteForUser = async ({
  authorId,
  noteId,
  editorId,
  title,
  content,
}: {
  authorId: string;
  noteId: string;
  editorId: string;
  title?: string | null;
  content?: string | null;
}): Promise<StoredNote> => {
  const [author, editor] = await Promise.all([
    getOrCreateUser(authorId),
    getOrCreateUser(editorId),
  ]);

  const editorAccess = resolveAccessForUser(editor);
  const isAuthor = editor.userId === authorId;
  if (!isAuthor && !editorAccess.canModerateNotes) {
    throw new Error("You do not have permission to update this note.");
  }

  const noteIndex = author.notes.findIndex((candidate) => candidate.id === noteId);
  if (noteIndex === -1) {
    throw new Error("Note not found.");
  }

  const existingNote = author.notes[noteIndex];

  let nextTitle = existingNote.title;
  if (typeof title === "string") {
    const trimmed = title.trim();
    nextTitle = trimmed.length > 0 ? trimmed : "Untitled Note";
  }

  let nextContent = existingNote.content;
  if (content !== undefined) {
    const trimmed = (content ?? "").trim();
    if (!trimmed) {
      throw new Error("Note content is required.");
    }
    nextContent = trimmed;
  }

  const timestamp = new Date().toISOString();
  const updatedNote: StoredNote = {
    ...existingNote,
    title: nextTitle,
    content: nextContent,
    updatedAt: timestamp,
  };

  const updatedNotes = [...author.notes];
  updatedNotes[noteIndex] = updatedNote;

  const updatedAuthor: UserRecord = {
    ...author,
    notes: updatedNotes,
  };

  await saveUser(updatedAuthor);

  return normalizeStoredNote(updatedNote, authorId);
};

export const deleteNoteForUser = async ({
  authorId,
  noteId,
  actorId,
}: {
  authorId: string;
  noteId: string;
  actorId: string;
}): Promise<void> => {
  const [author, actor] = await Promise.all([
    getOrCreateUser(authorId),
    getOrCreateUser(actorId),
  ]);

  const actorAccess = resolveAccessForUser(actor);
  const isAuthor = actor.userId === authorId;
  if (!isAuthor && !actorAccess.canModerateNotes) {
    throw new Error("You do not have permission to delete this note.");
  }

  const existingNote = author.notes.find((candidate) => candidate.id === noteId);
  if (!existingNote) {
    throw new Error("Note not found.");
  }

  const remainingNotes = author.notes.filter((candidate) => candidate.id !== noteId);

  const updatedAuthor: UserRecord = {
    ...author,
    notes: remainingNotes,
  };

  await saveUser(updatedAuthor);
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
  participants.add(commenterId);

  if (isPrivate) {
    if (!participantUserId || typeof participantUserId !== "string" || !participantUserId.trim()) {
      throw new Error("Private thoughts need a recipient.");
    }
    const normalizedTargetId = participantUserId.trim();
    if (normalizedTargetId === commenterId) {
      throw new Error("Private thoughts must include another participant.");
    }
    participants.add(normalizedTargetId);
  } else {
    participants.add(authorId);
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

  const notificationTargets = new Map<string, { isPrivate: boolean; commentId: string | null }>();
  const actorRecord = commenterId ? await getOrCreateUser(commenterId) : null;
  const actorDisplayName = commenterName
    ? commenterName.startsWith("@")
      ? commenterName
      : `@${commenterName}`
    : resolveDisplayName(actorRecord) ?? "Someone";
  const noteTitle = existingNote.title ?? "Untitled Note";

  const recipients = new Set<string>();
  if (isPrivate) {
    for (const participantId of normalizedComment.participants) {
      if (participantId !== commenterId) {
        recipients.add(participantId);
      }
    }
  } else if (commenterId !== authorId) {
    recipients.add(authorId);
  }

  if (replyToCommentId) {
    const parentComment = existingNote.comments.find((comment) => comment.id === replyToCommentId);
    if (parentComment) {
      const parentAuthorId = parentComment.authorId;
      const canSeeReply =
        !isPrivate || normalizedComment.participants.includes(parentAuthorId);
      if (canSeeReply && parentAuthorId && parentAuthorId !== commenterId) {
        recipients.add(parentAuthorId);
      }
    }
  }

  for (const targetId of recipients) {
    notificationTargets.set(targetId, {
      isPrivate,
      commentId: normalizedComment.id,
    });
  }

  await Promise.all(
    Array.from(notificationTargets.entries()).map(([targetId, meta]) =>
      addNotificationToUser(targetId, {
        type: "comment",
        noteId,
        noteTitle,
        actorId: commenterId,
        actorName: actorDisplayName,
        commentId: meta.commentId,
        isPrivate: meta.isPrivate,
      }),
    ),
  );

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
  const editor = await getOrCreateUser(editorId);
  const editorAccess = resolveAccessForUser(editor);

  const canEdit =
    editorId === existingComment.authorId ||
    editorId === authorId ||
    (existingComment.isPrivate && existingComment.participants.includes(editorId)) ||
    editorAccess.canModerateNotes;

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
  const actor = await getOrCreateUser(actorId);
  const actorAccess = resolveAccessForUser(actor);
  const canDelete =
    actorId === existingComment.authorId ||
    actorId === authorId ||
    actorAccess.canModerateNotes;

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

const addNotificationToUser = async (
  userId: string,
  notification: Omit<StoredNotification, "id" | "createdAt" | "read"> & {
    id?: string;
    createdAt?: string;
    read?: boolean;
  },
) => {
  const user = await getOrCreateUser(userId);
  const notificationId = notification.id ?? createNotificationId();
  const payload: StoredNotification = normalizeStoredNotification({
    ...notification,
    id: notificationId,
    createdAt: notification.createdAt ?? new Date().toISOString(),
    read: notification.read ?? false,
  });

  const existingWithoutDuplicate = user.notifications.filter(
    (item) => item.id !== payload.id,
  );
  const updatedUser: UserRecord = {
    ...user,
    notifications: [payload, ...existingWithoutDuplicate].slice(0, MAX_NOTIFICATIONS),
  };

  await saveUser(updatedUser);

  void import("@/modules/notifications/server/pushService")
    .then(({ sendPushNotificationForUser }) =>
      sendPushNotificationForUser(userId, payload).catch((error) => {
        console.error("Push notification delivery failed:", error);
      }),
    )
    .catch((error) => {
      console.error("Push notification module load failed:", error);
    });
};

export const getPushSubscriptionsForUser = async (
  userId: string,
): Promise<PushSubscriptionRecord[]> => {
  const user = await getOrCreateUser(userId);
  return dedupePushSubscriptions(user.pushSubscriptions ?? []);
};

export const addPushSubscriptionForUser = async (
  userId: string,
  subscription: PushSubscriptionRecord,
): Promise<void> => {
  const user = await getOrCreateUser(userId);
  const normalized = normalizePushSubscription(subscription);
  if (!normalized) {
    throw new Error("Invalid push subscription payload.");
  }

  const existing = dedupePushSubscriptions([...user.pushSubscriptions, normalized]);

  const updatedUser: UserRecord = {
    ...user,
    pushSubscriptions: existing,
  };

  await saveUser(updatedUser);
};

export const removePushSubscriptionForUser = async (
  userId: string,
  endpoint: string,
): Promise<void> => {
  const user = await getOrCreateUser(userId);

  const filtered = user.pushSubscriptions.filter((subscription) => subscription.endpoint !== endpoint);
  if (filtered.length === user.pushSubscriptions.length) {
    return;
  }

  const updatedUser: UserRecord = {
    ...user,
    pushSubscriptions: filtered,
  };

  await saveUser(updatedUser);
};

export const getNotificationsForUser = async (
  userId: string,
): Promise<StoredNotification[]> => {
  const user = await getOrCreateUser(userId);
  return [...user.notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

export const markNotificationsAsRead = async (
  userId: string,
  notificationIds?: string[],
): Promise<StoredNotification[]> => {
  const user = await getOrCreateUser(userId);
  const idSet = notificationIds && notificationIds.length > 0 ? new Set(notificationIds) : null;

  const updatedNotifications = user.notifications.map((notification) => {
    if (idSet && !idSet.has(notification.id)) {
      return notification;
    }
    if (!idSet && notification.read) {
      return notification;
    }
    if (notification.read) {
      return notification;
    }
    return {
      ...notification,
      read: true,
    };
  });

  const updatedUser: UserRecord = {
    ...user,
    notifications: updatedNotifications,
  };

  await saveUser(updatedUser);
  return updatedNotifications;
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
  noteAuthorId: string,
  access: { canViewPrivateComments: boolean; canModerateNotes: boolean },
): NoteComment[] =>
  [...comments]
    .filter((comment) => {
      if (!comment.isPrivate) {
        return true;
      }
      if (access.canViewPrivateComments) {
        return true;
      }
      if (!viewerId) {
        return false;
      }
      return comment.participants.includes(viewerId);
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map<NoteComment>((comment) => {
      const participantVisible = viewerId
        ? comment.participants.includes(viewerId)
        : false;
      const isVisible =
        !comment.isPrivate || access.canViewPrivateComments || participantVisible;

      const isEditable = Boolean(
        viewerId &&
          (viewerId === comment.authorId ||
            viewerId === noteAuthorId ||
            (comment.isPrivate && participantVisible) ||
            access.canModerateNotes),
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
  const viewerAccess = resolveAccessForUser(viewer);

  const now = Date.now();
  const aggregated: Array<{
    note: Note;
    recencyTier: number;
    createdAtTime: number;
    publicCommentCount: number;
    loveReactions: number;
    dislikeReactions: number;
  }> = [];

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
      const comments = mapCommentsForViewer(
        note.comments,
        viewer?.userId ?? null,
        user.userId,
        viewerAccess,
      );

      const createdAtTime = new Date(note.createdAt ?? 0).getTime();
      const ageHours = Number.isFinite(createdAtTime)
        ? Math.max(0, (now - createdAtTime) / (1000 * 60 * 60))
        : Number.POSITIVE_INFINITY;
      const recencyTier =
        ageHours < 3 ? 3 :
        ageHours < 6 ? 2 :
        ageHours < 9 ? 1 :
        0;

      const notePayload: Note = {
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
        viewerCanModerate: viewerAccess.canModerateNotes,
        viewerRole: viewerAccess.role,
      };

      aggregated.push({
        note: notePayload,
        recencyTier,
        createdAtTime,
        publicCommentCount,
        loveReactions: reactions.love,
        dislikeReactions: reactions.dislike,
      });
    }
  }

  aggregated.sort((a, b) => {
    if (b.recencyTier !== a.recencyTier) {
      return b.recencyTier - a.recencyTier;
    }
    if (b.createdAtTime !== a.createdAtTime) {
      return b.createdAtTime - a.createdAtTime;
    }

    if (b.publicCommentCount !== a.publicCommentCount) {
      return b.publicCommentCount - a.publicCommentCount;
    }
    if (b.loveReactions !== a.loveReactions) {
      return b.loveReactions - a.loveReactions;
    }

    if (b.dislikeReactions !== a.dislikeReactions) {
      return b.dislikeReactions - a.dislikeReactions;
    }

    return (b.note.title ?? "").localeCompare(a.note.title ?? "");
  });

  return aggregated.map((entry) => entry.note);
};
