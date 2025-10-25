"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

export const useNotifications = (
  viewerId: string | null,
  token?: string | null,
  options?: UseNotificationsOptions,
): UseNotificationsResult => {
  const { pollIntervalMs = 15000, onNewNotifications } = options ?? {};
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousIdsRef = useRef<Set<string>>(new Set());
  const hasFetchedOnceRef = useRef(false);

  const fetchNotifications = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!viewerId) {
        setNotifications([]);
        previousIdsRef.current = new Set();
        hasFetchedOnceRef.current = false;
        return;
      }

      if (!silent) {
        startTransition(() => {
          setIsLoading(true);
        });
      }
      setError(null);

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

        const normalized = Array.isArray(payload.notifications)
          ? payload.notifications
          : [];
        let newlyDiscovered: Notification[] = [];

        if (hasFetchedOnceRef.current) {
          const previousIds = previousIdsRef.current;
          newlyDiscovered = normalized.filter(
            (notification) => !previousIds.has(notification.id),
          );
        }

        setNotifications(normalized);
        previousIdsRef.current = new Set(
          normalized.map((notification) => notification.id),
        );

        if (
          hasFetchedOnceRef.current &&
          newlyDiscovered.length > 0 &&
          typeof onNewNotifications === "function"
        ) {
          onNewNotifications(newlyDiscovered);
        }

        hasFetchedOnceRef.current = true;
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load notifications.",
        );
      } finally {
        if (!silent) {
          startTransition(() => {
            setIsLoading(false);
          });
        }
      }
    },
    [viewerId, token, onNewNotifications],
  );

  useEffect(() => {
    previousIdsRef.current = new Set();
    hasFetchedOnceRef.current = false;
  }, [viewerId]);

  useEffect(() => {
    if (!viewerId) {
      setNotifications([]);
      return;
    }

    let isMounted = true;
    const load = async () => {
      if (!isMounted) {
        return;
      }
      await fetchNotifications();
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [viewerId, fetchNotifications]);

  useEffect(() => {
    if (!viewerId) {
      return;
    }

    if (!pollIntervalMs || pollIntervalMs <= 0) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchNotifications({ silent: true });
    }, pollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [viewerId, pollIntervalMs, fetchNotifications]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchNotifications({ silent: true });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifications]);

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

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          read: true,
        })),
      );
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

  const refresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAllAsRead,
    markAsRead,
    refresh,
  };
};
