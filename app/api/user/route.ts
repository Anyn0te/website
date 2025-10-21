import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";
import {
  getOrCreateUser,
  updateUserSettings,
} from "@/modules/users/server/userRepository";
import { ThemePreference } from "@/modules/users/types";

const normalizeTheme = (value: unknown): ThemePreference => {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
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

const extractTokenFromRequest = (request: NextRequest) => {
  const header = request.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return header.split(" ")[1] ?? null;
};

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyIdToken(token);
    const user = await getOrCreateUser(decoded.uid);

    return NextResponse.json(
      {
        user: {
          userId: user.userId,
          username: user.username,
          displayUsername: Boolean(user.displayUsername && user.username),
          themePreference: user.themePreference,
          following: user.following,
          followers: user.followers,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("User profile GET error:", error);
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyIdToken(token);
    const payload = (await request.json()) as {
      username?: string | null;
      displayUsername?: boolean;
      themePreference?: ThemePreference;
    };

    const username = payload.username?.trim() ?? null;
    const displayUsername = Boolean(payload.displayUsername && username);
    const themePreference = normalizeTheme(payload.themePreference);

    const updatedUser = await updateUserSettings(decoded.uid, {
      username,
      displayUsername,
      themePreference,
    });

    return NextResponse.json(
      {
        user: {
          userId: updatedUser.userId,
          username: updatedUser.username,
          displayUsername: Boolean(
            updatedUser.displayUsername && updatedUser.username
          ),
          themePreference: updatedUser.themePreference,
          following: updatedUser.following,
          followers: updatedUser.followers,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update settings error:", error);
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update user settings.",
      },
      { status: 400 }
    );
  }
}
