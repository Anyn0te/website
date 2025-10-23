import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";
import { setNoteCommentsLocked } from "@/modules/users/server/userRepository";

const extractTokenFromRequest = (request: NextRequest) => {
  const header = request.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return header.split(" ")[1] ?? null;
};

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);
    const payload = (await request.json()) as {
      noteId?: string;
      authorId?: string;
      locked?: boolean;
      userId?: string;
    };

    let actorId: string | null = null;
    if (token) {
      const decoded = await verifyIdToken(token);
      actorId = decoded.uid;
    } else {
      actorId =
        payload.userId?.trim() ??
        request.cookies.get("anynote_guest_id")?.value ??
        null;
    }

    if (!actorId) {
      return NextResponse.json(
        { error: "Missing user identifier." },
        { status: 401 },
      );
    }

    const noteId = payload.noteId?.trim();
    const authorId = payload.authorId?.trim();
    const locked = Boolean(payload.locked);

    if (!noteId || !authorId) {
      return NextResponse.json(
        { error: "Invalid lock request." },
        { status: 400 },
      );
    }

    if (actorId !== authorId) {
      return NextResponse.json(
        { error: "Only the note owner can update comment settings." },
        { status: 403 },
      );
    }

    await setNoteCommentsLocked({
      authorId,
      noteId,
      locked,
    });

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/followed");
    revalidatePath("/notes");
    revalidatePath("/minotes");

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Comment lock request error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update comment settings.",
      },
      { status: 400 },
    );
  }
}
