import { promises as fs } from "fs";
import path from "path";
import { Note, NoteMedia, NoteReactionType, NoteReactions, StoredNote } from "@/modules/notes/types";
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
    notes: Array.isArray(parsed.notes) ? parsed.notes.map(normalizeStoredNote) : fallback.notes,
    createdAt: parsed.createdAt ?? fallback.createdAt,
    updatedAt: parsed.updatedAt ?? fallback.updatedAt,
  };
};

const normalizeStoredNote = (note: StoredNote): StoredNote => {
  const normalizedReactionMap = normalizeReactionMap(
    (note as { reactionMap?: Record<string, NoteReactionType>; reactionsByUser?: Record<string, NoteReactionType> }).reactionMap ??
      (note as { reactionsByUser?: Record<string, NoteReactionType> }).reactionsByUser ??
      {},
  );

  const reactions = summarizeReactionMap(normalizedReactionMap);

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
    notes: user.notes.map(normalizeStoredNote),
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
  const updatedUser: UserRecord = {
    ...user,
    notes: [note, ...user.notes],
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
      });
    }
  }

  aggregated.sort((a, b) => {
    if (b.reactions.love !== a.reactions.love) {
      return b.reactions.love - a.reactions.love;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return aggregated;
};
