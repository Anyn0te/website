import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";
import {
  appendNoteToUser,
  getAggregatedNotesForUser,
  getOrCreateUser,
} from "@/modules/users/server/userRepository";
import { NoteMedia, NoteMediaType, NoteVisibility, StoredNote } from "@/modules/notes/types";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_WORD_COUNT = 1000;
const MEDIA_DIRECTORY = path.join(process.cwd(), "public", "media");

const getAllowedExtension = (mimeType: string): string | null => {
  if (mimeType.startsWith("image/jpeg") || mimeType.startsWith("image/jpg")) {
    return "jpeg";
  }

  if (mimeType.startsWith("image/png")) {
    return "png";
  }

  if (
    mimeType.startsWith("audio/mpeg") ||
    mimeType.startsWith("audio/mp3")
  ) {
    return "mp3";
  }

  if (mimeType.startsWith("audio/wav")) {
    return "wav";
  }

  if (mimeType.startsWith("audio/ogg")) {
    return "ogg";
  }

  return null;
};

const resolveMediaType = (mimeType: string): NoteMediaType | null => {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("audio/")) {
    return "audio";
  }

  return null;
};

const countWords = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "anonymous";

const extractTokenFromRequest = (request: NextRequest) => {
  const header = request.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return header.split(" ")[1] ?? null;
};

const isAuthError = (error: unknown) =>
  Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string" &&
      ((error as { code: string }).code.startsWith("auth/") ||
        (error as { code: string }).code === "permission-denied"),
  );

const saveMediaFiles = async (
  mediaFiles: File[],
  uploaderSlug: string
): Promise<NoteMedia[]> => {
  const storedMedia: NoteMedia[] = [];

  if (mediaFiles.length === 0) {
    return storedMedia;
  }

  await fs.mkdir(MEDIA_DIRECTORY, { recursive: true });

  for (const mediaFile of mediaFiles) {
    if (mediaFile.size > MAX_FILE_SIZE) {
      throw new Error("File size exceeds the 20MB limit.");
    }

    const mediaType = resolveMediaType(mediaFile.type);
    const extension = getAllowedExtension(mediaFile.type);

    if (!mediaType || !extension) {
      throw new Error(
        "Invalid media type. Only JPG, PNG, MP3, WAV, and OGG files are allowed."
      );
    }

    const fileBuffer = Buffer.from(await mediaFile.arrayBuffer());
    const timestamp = Date.now();
    const randomFragment = randomUUID().slice(0, 8);
    const baseName = slugify(uploaderSlug);
    const fileName = `${baseName}-${timestamp}-${randomFragment}.${extension}`;
    const relativePath = `/media/${fileName}`;

    await fs.writeFile(path.join(MEDIA_DIRECTORY, fileName), fileBuffer);
    storedMedia.push({ url: relativePath, type: mediaType });
  }

  return storedMedia;
};

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);
    const formData = await request.formData();
    const rawTitle = (formData.get("title") as string | null) ?? "";
    const content = (formData.get("content") as string | null) ?? "";
    const mediaFiles = formData.getAll("mediaFiles") as File[];

    let userId: string | null = null;
    if (token) {
      const decoded = await verifyIdToken(token);
      userId = decoded.uid;
    } else {
      userId = (formData.get("userId") as string | null)?.trim() ?? null;
      if (!userId) {
        userId = request.cookies.get("anynote_guest_id")?.value ?? null;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Missing user identifier." },
        { status: 400 },
      );
    }

    const user = await getOrCreateUser(userId);
    const wordCount = countWords(content);

    if (!content || wordCount === 0) {
      return NextResponse.json(
        { error: "Note content is required." },
        { status: 400 }
      );
    }

    if (wordCount > MAX_WORD_COUNT) {
      return NextResponse.json(
        { error: `Note content exceeds the ${MAX_WORD_COUNT} word limit.` },
        { status: 400 }
      );
    }

    const visibility: NoteVisibility =
      user.displayUsername && user.username ? "public" : "anonymous";
    const uploaderSlug = user.username ?? "anonymous";
    const storedMedia = await saveMediaFiles(mediaFiles, uploaderSlug);

    const timestamp = new Date().toISOString();
    const newNote: StoredNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: rawTitle.trim() || "Untitled Note",
      content,
      visibility,
      media: storedMedia,
      createdAt: timestamp,
      updatedAt: timestamp,
      reactions: {
        love: 0,
        dislike: 0,
      },
      reactionMap: {},
    };

    await appendNoteToUser(userId, newNote);
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/followed");

    return NextResponse.json(
      {
        message: "Note submitted successfully!",
        noteId: newNote.id,
        media: newNote.media,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API Submission Error:", error);
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Server failed to process note submission.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);
    const { searchParams } = new URL(request.url);
    let viewerId: string | null = null;

    if (token) {
      const decoded = await verifyIdToken(token);
      viewerId = decoded.uid;
    } else {
      viewerId = searchParams.get("guestId") ?? request.cookies.get("anynote_guest_id")?.value ?? null;
    }

    const notes = await getAggregatedNotesForUser(viewerId);
    return NextResponse.json({ notes }, { status: 200 });
  } catch (error) {
    console.error("API Read Error:", error);
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Unable to load notes." },
      { status: 500 }
    );
  }
}
