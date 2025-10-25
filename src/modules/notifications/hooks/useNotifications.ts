"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Notification } from "@/modules/notifications/types";

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAllAsRead: () => Promise<void>;
  markAsRead: (ids: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

interface UseNotificationsOptions {
  pollIntervalMs?: number;
  onNewNotifications?: (items: Notification[]) => void;
}

const buildHeaders = (token?: string | null) => {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
};

const fetchNotifications = async (
  _key: string,
  viewerId: string,
  tokenKey: string | null | undefined,
): Promise<Notification[]> => {
  const token = tokenKey && tokenKey.length > 0 ? tokenKey : null;

  const response = await fetch("/api/notifications", {
    method: "GET",
    headers: buildHeaders(token),
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    notifications?: Notification[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to load notifications.");
  }

  return Array.isArray(payload.notifications) ? payload.notifications : [];
};

export const useNotifications = (
  viewerId: string | null,
  token?: string | null,
  options?: UseNotificationsOptions,
): UseNotificationsResult => {
  const { pollIntervalMs = 15000, onNewNotifications } = options ?? {};
  const [mutationError, setMutationError] = useState<string | null>(null);
  const previousIdsRef = useRef<Set<string>>(new Set());
  const hasFetchedOnceRef = useRef(false);

  const shouldFetch = Boolean(viewerId);
  const swrKey = useMemo(
    () => (shouldFetch ? ["notifications", viewerId!, token ?? ""] : null),
    [shouldFetch, viewerId, token],
  );

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<Notification[]>(
    swrKey,
    fetchNotifications,
    {
      refreshInterval: 0,
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: pollIntervalMs,
    },
  );

  const notifications = useMemo(() => data ?? [], [data]);

  useEffect(() => {
    previousIdsRef.current = new Set();
    hasFetchedOnceRef.current = false;
  }, [viewerId]);

  useEffect(() => {
    if (!notifications || notifications.length === 0) {
      return;
    }

    const previousIds = previousIdsRef.current;
    let newlyDiscovered: Notification[] = [];

    if (hasFetchedOnceRef.current) {
      newlyDiscovered = notifications.filter(
        (notification) => !previousIds.has(notification.id),
      );
    }

    previousIdsRef.current = new Set(notifications.map((item) => item.id));

    if (
      hasFetchedOnceRef.current &&
      newlyDiscovered.length > 0 &&
      typeof onNewNotifications === "function"
    ) {
      onNewNotifications(newlyDiscovered);
    }

    hasFetchedOnceRef.current = true;
  }, [notifications, onNewNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!viewerId) {
      return;
    }

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: buildHeaders(token),
        body: JSON.stringify({}),
      });

      mutate(
        (current) =>
          current?.map((notification) => ({
            ...notification,
            read: true,
          })) ?? [],
        { revalidate: false },
      );
      setMutationError(null);
    } catch (updateError) {
      setMutationError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update notifications.",
      );
    }
  }, [viewerId, token, mutate]);

  const markAsRead = useCallback(
    async (ids: string[]) => {
      if (!viewerId || ids.length === 0) {
        return;
      }

      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: buildHeaders(token),
          body: JSON.stringify({ notificationIds: ids }),
        });

        mutate(
          (current) =>
            current?.map((notification) =>
              ids.includes(notification.id)
                ? { ...notification, read: true }
                : notification,
            ) ?? [],
          { revalidate: false },
        );
        setMutationError(null);
      } catch (updateError) {
        setMutationError(
          updateError instanceof Error
            ? updateError.message
            : "Unable to update notifications.",
        );
      }
    },
    [viewerId, token, mutate],
  );

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const normalizedError =
    error instanceof Error
      ? error.message
      : error
        ? "Unable to load notifications."
        : mutationError;

  return {
    notifications,
    unreadCount,
    isLoading: (isLoading || isValidating) && !data,
    error: normalizedError,
    markAllAsRead,
    markAsRead,
    refresh,
  };
};
