import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";
import { applyReactionToNote } from "@/modules/users/server/userRepository";
import { NoteReactionType } from "@/modules/notes/types";

const extractTokenFromRequest = (request: NextRequest) => {
  const header = request.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return header.split(" ")[1] ?? null;
};

const parseReaction = (value: unknown): NoteReactionType | null => {
  if (value === "love" || value === "dislike") {
    return value;
  }
  return null;
};

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);
    const payload = (await request.json()) as {
      noteId?: string;
      authorId?: string;
      reaction?: NoteReactionType | "none" | null;
      userId?: string;
    };

    let reactorId: string | null = null;
    if (token) {
      const decoded = await verifyIdToken(token);
      reactorId = decoded.uid;
    } else {
      reactorId =
        payload.userId?.trim() ??
        request.cookies.get("anynote_guest_id")?.value ??
        null;
    }

    if (!reactorId) {
      return NextResponse.json(
        { error: "Missing user identifier." },
        { status: 401 },
      );
    }

    const noteId = payload.noteId?.trim();
    const authorId = payload.authorId?.trim();

    if (!noteId || !authorId) {
      return NextResponse.json(
        { error: "Invalid reaction request." },
        { status: 400 },
      );
    }

    const requestedReaction =
      payload.reaction === "none"
        ? null
        : parseReaction(payload.reaction ?? null);

    const updatedNote = await applyReactionToNote({
      authorId,
      noteId,
      reactorId,
      reaction: requestedReaction,
    });

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/followed");
    revalidatePath("/notes");
    revalidatePath("/minotes");

    return NextResponse.json(
      {
        reactions: updatedNote.reactions,
        viewerReaction: updatedNote.reactionMap[reactorId] ?? null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Reaction request error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update reactions.",
      },
      { status: 400 },
    );
  }
}
