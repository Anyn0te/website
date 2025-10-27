import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";
import { setFollowingStatus } from "@/modules/users/server/userRepository";
import { revalidatePath } from "next/cache"; 

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
      userId?: string;
      targetUserId?: string;
      action?: "follow" | "unfollow";
    };
    let actingUserId: string | null = null;

    if (token) {
      const decoded = await verifyIdToken(token);
      actingUserId = decoded.uid;
    } else {
      actingUserId = payload.userId?.trim() ?? request.cookies.get("anynote_guest_id")?.value ?? null;
    }

    if (!actingUserId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const targetUserId = payload.targetUserId?.trim();
    const shouldFollow = payload.action !== "unfollow";

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Invalid follow request." },
        { status: 400 }
      );
    }

    const { follower } = await setFollowingStatus(
      actingUserId,
      targetUserId,
      shouldFollow
    );

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/followed");

    return NextResponse.json(
      {
        following: follower.following,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Follow request error:", error);
    const authError =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string" &&
      ((error as { code: string }).code.startsWith("auth/") ||
        (error as { code: string }).code === "permission-denied");

    if (authError) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update follow status.",
      },
      { status: 400 }
    );
  }
}