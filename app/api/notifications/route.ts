import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";
import {
  getNotificationsForUser,
  markNotificationsAsRead,
} from "@/modules/users/server/userRepository";

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

export async function GET(request: NextRequest) {
  try {
    const viewerId = await resolveViewerId(request);

    if (!viewerId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const notifications = await getNotificationsForUser(viewerId);
    return NextResponse.json({ notifications }, { status: 200 });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json(
      { error: "Unable to load notifications." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const viewerId = await resolveViewerId(request);

    if (!viewerId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = (await request.json()) as {
      notificationIds?: string[];
    };

    await markNotificationsAsRead(viewerId, payload.notificationIds);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Notifications update error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update notifications.",
      },
      { status: 400 },
    );
  }
}
