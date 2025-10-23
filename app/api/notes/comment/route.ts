import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";
import {
  addCommentToNote,
  deleteCommentFromNote,
  updateCommentOnNote,
} from "@/modules/users/server/userRepository";

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
      content?: string;
      isPrivate?: boolean;
      participantUserId?: string | null;
      replyToCommentId?: string | null;
      commenterName?: string | null;
      userId?: string;
    };

    let commenterId: string | null = null;
    if (token) {
      const decoded = await verifyIdToken(token);
      commenterId = decoded.uid;
    } else {
      commenterId =
        payload.userId?.trim() ??
        request.cookies.get("anynote_guest_id")?.value ??
        null;
    }

    if (!commenterId) {
      return NextResponse.json(
        { error: "Missing user identifier." },
        { status: 401 },
      );
    }

    const noteId = payload.noteId?.trim();
    const authorId = payload.authorId?.trim();
    const content = payload.content ?? "";

    if (!noteId || !authorId) {
      return NextResponse.json(
        { error: "Invalid comment request." },
        { status: 400 },
      );
    }

    await addCommentToNote({
      authorId,
      noteId,
      commenterId,
      commenterName: payload.commenterName ?? null,
      content,
      isPrivate: Boolean(payload.isPrivate),
      participantUserId: payload.participantUserId ?? null,
      replyToCommentId: payload.replyToCommentId ?? null,
    });

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/followed");
    revalidatePath("/notes");
    revalidatePath("/minotes");

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Comment request error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit comment.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);
    const payload = (await request.json()) as {
      noteId?: string;
      authorId?: string;
      commentId?: string;
      content?: string;
      userId?: string;
    };

    let editorId: string | null = null;
    if (token) {
      const decoded = await verifyIdToken(token);
      editorId = decoded.uid;
    } else {
      editorId =
        payload.userId?.trim() ??
        request.cookies.get("anynote_guest_id")?.value ??
        null;
    }

    if (!editorId) {
      return NextResponse.json(
        { error: "Missing user identifier." },
        { status: 401 },
      );
    }

    const noteId = payload.noteId?.trim();
    const authorId = payload.authorId?.trim();
    const commentId = payload.commentId?.trim();
    const content = payload.content ?? "";

    if (!noteId || !authorId || !commentId) {
      return NextResponse.json(
        { error: "Invalid comment update request." },
        { status: 400 },
      );
    }

    await updateCommentOnNote({
      authorId,
      noteId,
      commentId,
      editorId,
      content,
    });

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/followed");
    revalidatePath("/notes");
    revalidatePath("/minotes");

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Comment update error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update comment.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);
    const payload = (await request.json()) as {
      noteId?: string;
      authorId?: string;
      commentId?: string;
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
    const commentId = payload.commentId?.trim();

    if (!noteId || !authorId || !commentId) {
      return NextResponse.json(
        { error: "Invalid comment delete request." },
        { status: 400 },
      );
    }

    await deleteCommentFromNote({
      authorId,
      noteId,
      commentId,
      actorId,
    });

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/followed");
    revalidatePath("/notes");
    revalidatePath("/minotes");

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Comment delete error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete comment.",
      },
      { status: 400 },
    );
  }
}
