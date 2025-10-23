"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const buildHeaders = (token?: string | null) => {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
};

export const useNotifications = (
  viewerId: string | null,
  token?: string | null,
): UseNotificationsResult => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!viewerId) {
      setNotifications([]);
      return;
    }

    try {
      const response = await fetch("/api/notifications", {
        method: "GET",
        headers: buildHeaders(token),
      });

      const payload = (await response.json()) as {
        notifications?: Notification[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load notifications.");
      }

      setNotifications(
        Array.isArray(payload.notifications) ? payload.notifications : [],
      );
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load notifications.",
      );
    }
  }, [viewerId, token]);

  useEffect(() => {
    if (!viewerId) {
      setNotifications([]);
      return;
    }

    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      await fetchNotifications();
      if (isMounted) {
        setIsLoading(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [viewerId, fetchNotifications]);

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

      setNotifications((prev) => prev.map((notification) => ({
        ...notification,
        read: true,
      })));
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update notifications.",
      );
    }
  }, [viewerId, token]);

  const markAsRead = useCallback(async (ids: string[]) => {
    if (!viewerId || ids.length === 0) {
      return;
    }

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: buildHeaders(token),
        body: JSON.stringify({ notificationIds: ids }),
      });

      setNotifications((prev) =>
        prev.map((notification) =>
          ids.includes(notification.id)
            ? { ...notification, read: true }
            : notification,
        ),
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update notifications.",
      );
    }
  }, [viewerId, token]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAllAsRead,
    markAsRead,
    refresh: fetchNotifications,
  };
};
