"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./NotificationBell.module.css";
import { Notification as AppNotification } from "@/modules/notifications/types";

type AnchorVariant = "mobile" | "desktop";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

interface NotificationBellProps {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  onMarkAllAsRead: () => Promise<void>;
  onRefresh: () => Promise<void>;
  anchor?: AnchorVariant;
  nativeSupport?: boolean;
  nativeReady?: boolean;
  nativePermission?: NotificationPermission;
  onRequestNativePermission?: () => Promise<void>;
}

const formatMessage = (notification: AppNotification): string => {
  const actor = notification.actorName ?? "Someone";

  if (notification.type === "reaction") {
    const reactionLabel =
      notification.reaction === "love"
        ? "loved"
        : notification.reaction === "dislike"
          ? "disliked"
          : "reacted to";
    return `${actor} ${reactionLabel} "${notification.noteTitle}"`;
  }

  if (notification.isPrivate) {
    return `${actor} sent a private thought on "${notification.noteTitle}"`;
  }

  return `${actor} commented on "${notification.noteTitle}"`;
};

const formatTimestamp = (isoString: string): string => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const NotificationBell = ({
  notifications,
  unreadCount,
  isLoading,
  onMarkAllAsRead,
  onRefresh,
  nativeSupport = false,
  nativeReady = true,
  nativePermission = "default",
  onRequestNativePermission,
  anchor = "desktop",
}: NotificationBellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleOpen = useCallback(() => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (!nextOpen) {
      return;
    }

    if (unreadCount > 0) {
      void onMarkAllAsRead();
    }

    if (typeof queueMicrotask === "function") {
      queueMicrotask(() => {
        void onRefresh();
      });
    } else {
      void onRefresh();
    }
  }, [isOpen, unreadCount, onMarkAllAsRead, onRefresh]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const unreadBadge = useMemo(() => {
    if (unreadCount <= 0) {
      return null;
    }
    return unreadCount > 9 ? "9+" : unreadCount.toString();
  }, [unreadCount]);

  const containerClassName = cx(
    styles.container,
    anchor === "desktop" && styles.anchorDesktop,
    anchor === "mobile" && styles.anchorMobile,
  );

  const panelClassName = cx(
    styles.panel,
    anchor === "desktop" && styles.panelDesktop,
  );
  const canShowNativeBanner = nativeSupport && nativeReady;

  return (
    <div className={containerClassName} ref={containerRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={toggleOpen}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={isOpen}
      >
        <span className="bi bi-bell" aria-hidden="true" />
      </button>
      {unreadBadge && <span className={styles.badge}>{unreadBadge}</span>}
      {isOpen && (
        <div className={panelClassName} role="dialog" aria-label="Notifications">
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Notifications</span>
            <button
              type="button"
              className={styles.panelAction}
              onClick={() => void onRefresh()}
            >
              Refresh
            </button>
          </div>
          <div className={styles.panelBody}>
            {canShowNativeBanner && nativePermission !== "granted" && (
              <div className={styles.permissionBanner}>
                <span className={styles.permissionText}>
                  {nativePermission === "denied"
                    ? "Browser notifications are blocked. Open your site settings to allow them."
                    : "Enable desktop notifications to receive real-time updates."}
                </span>
                {nativePermission !== "denied" &&
                  onRequestNativePermission && (
                  <button
                    type="button"
                    className={styles.permissionButton}
                    onClick={() => void onRequestNativePermission()}
                  >
                    Allow
                  </button>
                )}
              </div>
            )}
            {isLoading ? (
              <p className={styles.emptyState}>Loading notifications…</p>
            ) : notifications.length === 0 ? (
              <p className={styles.emptyState}>You&apos;re all caught up.</p>
            ) : (
              notifications.slice(0, 6).map((notification) => (
                <div
                  key={notification.id}
                  className={cx(
                    styles.notificationItem,
                    !notification.read && styles.notificationItemUnread,
                  )}
                >
                  <span className={styles.notificationMessage}>
                    {formatMessage(notification)}
                  </span>
                  <span className={styles.notificationMeta}>
                    {formatTimestamp(notification.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
