import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";
import { sendPushNotificationForUser } from "@/modules/notifications/server/pushService";
import { StoredNotification } from "@/modules/notifications/types";

const extractToken = (request: NextRequest) => {
  const header = request.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return header.split(" ")[1] ?? null;
};

const resolveViewerId = async (request: NextRequest) => {
  const token = extractToken(request);
  if (token) {
    const decoded = await verifyIdToken(token);
    return decoded.uid;
  }

  return request.cookies.get("anynote_guest_id")?.value ?? null;
};

export async function POST(request: NextRequest) {
  try {
    const viewerId = await resolveViewerId(request);
    if (!viewerId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const notification: StoredNotification = {
      id: `test-${Date.now()}`,
      type: "comment",
      noteId: "test-note",
      noteTitle: "Test notification",
      actorId: "anynote-system",
      actorName: "Anyn0te",
      reaction: null,
      commentId: null,
      isPrivate: false,
      createdAt: new Date().toISOString(),
      read: false,
    };

    await sendPushNotificationForUser(viewerId, notification);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Push test error:", error);
    return NextResponse.json(
      { error: "Unable to send test notification." },
      { status: 500 },
    );
  }
}
