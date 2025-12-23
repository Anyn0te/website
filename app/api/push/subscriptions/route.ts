import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";
import {
  addPushSubscriptionForUser,
  removePushSubscriptionForUser,
} from "@/modules/notifications/server/pushRepository";
import { PushSubscriptionRecord } from "@/modules/users/types";

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

const normalizePayload = (payload: unknown): PushSubscriptionRecord | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const { endpoint, expirationTime, keys } = payload as {
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

export async function POST(request: NextRequest) {
  try {
    const viewerId = await resolveViewerId(request);
    if (!viewerId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { subscription } = (await request.json()) as {
      subscription?: unknown;
    };

    const normalized = normalizePayload(subscription);
    if (!normalized) {
      return NextResponse.json(
        { error: "Invalid subscription payload." },
        { status: 400 },
      );
    }

    await addPushSubscriptionForUser(viewerId, normalized);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Push subscription register error:", error);
    return NextResponse.json(
      { error: "Unable to register push subscription." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const viewerId = await resolveViewerId(request);
    if (!viewerId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { endpoint } = (await request.json()) as { endpoint?: unknown };
    if (typeof endpoint !== "string" || !endpoint) {
      return NextResponse.json(
        { error: "Invalid endpoint." },
        { status: 400 },
      );
    }

    await removePushSubscriptionForUser(viewerId, endpoint);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Push subscription removal error:", error);
    return NextResponse.json(
      { error: "Unable to remove push subscription." },
      { status: 500 },
    );
  }
}
