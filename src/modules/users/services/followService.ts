export const updateFollowStatus = async ({
  userId,
  token,
  targetUserId,
  action,
}: {
  userId: string;
  token?: string | null;
  targetUserId: string;
  action: "follow" | "unfollow";
}): Promise<string[]> => {
  const response = await fetch("/api/user/follow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      userId,
      targetUserId,
      action,
    }),
  });

  const payload = (await response.json()) as {
    following?: string[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to update follow status.");
  }

  return payload.following ?? [];
};
