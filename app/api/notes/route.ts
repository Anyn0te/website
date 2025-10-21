import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { readNotes, writeNotes } from "@/modules/notes/server/noteRepository";
import { Note, NoteMediaType } from "@/modules/notes/types";

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

const saveMediaFiles = async (mediaFiles: File[]) => {
  const storedMedia: Array<{ url: string; type: NoteMediaType }> = [];

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
    const fileName = `${randomUUID()}.${extension}`;
    const relativePath = `/media/${fileName}`;

    await fs.writeFile(path.join(MEDIA_DIRECTORY, fileName), fileBuffer);
    storedMedia.push({ url: relativePath, type: mediaType });
  }

  return storedMedia;
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const rawTitle = (formData.get("title") as string | null) ?? "";
    const content = (formData.get("content") as string | null) ?? "";
    const mediaFiles = formData.getAll("mediaFiles") as File[];

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

    const storedMedia = await saveMediaFiles(mediaFiles);
    const notes = await readNotes();

    const newNote: Note = {
      id: Date.now() + Math.random(),
      title: rawTitle.trim() || "Untitled Note",
      content,
      isFollowing: false,
      media: storedMedia.map((item) => ({
        type: item.type,
        url: item.url,
      })),
    };

    const updatedNotes = [newNote, ...notes];
    await writeNotes(updatedNotes);
    revalidatePath("/");

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

export async function GET() {
  try {
    const notes = await readNotes();
    return NextResponse.json({ notes }, { status: 200 });
  } catch (error) {
    console.error("API Read Error:", error);
    return NextResponse.json(
      { error: "Unable to load notes." },
      { status: 500 }
    );
  }
}
