"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./NotificationBell.module.css";
import { Notification as AppNotification } from "@/modules/notifications/types";
import {
  ensurePushSubscription,
  removePushSubscription,
} from "@/modules/notifications/utils/registerPush";

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
  authToken?: string | null;
}

const formatMessage = (notification: AppNotification): string => {
  const actor = notification.actorName ?? "Someone";

  if (notification.type === "reaction") {
    const feelingLabel =
      notification.reaction === "love"
        ? "shared a warm feeling about"
        : notification.reaction === "dislike"
          ? "shared a concerned feeling about"
          : "shared a feeling about";
    return `${actor} ${feelingLabel} "${notification.noteTitle}"`;
  }

  if (notification.isPrivate) {
    return `${actor} sent a private thought on "${notification.noteTitle}"`;
  }

  return `${actor} shared a thought on "${notification.noteTitle}"`;
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
  authToken = null,
}: NotificationBellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [renderPanel, setRenderPanel] = useState(false);
  const [panelState, setPanelState] = useState<"closed" | "opening" | "open" | "closing">("closed");
  const [hasPushSubscription, setHasPushSubscription] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleOpen = useCallback(() => {
    setIsOpen((previous) => {
      const next = !previous;
      if (next) {
        if (unreadCount > 0) {
          void onMarkAllAsRead();
        }
        if (typeof queueMicrotask === "function") {
          queueMicrotask(() => {
            void onRefresh();
          });
        } else {
          void Promise.resolve().then(() => {
            void onRefresh();
          });
        }
      }
      return next;
    });
  }, [unreadCount, onMarkAllAsRead, onRefresh]);

  useEffect(() => {
    if (isOpen) {
      setRenderPanel(true);
      setPanelState("opening");
      const raf = window.requestAnimationFrame(() => {
        setPanelState("open");
      });
      return () => {
        window.cancelAnimationFrame(raf);
      };
    }

    if (renderPanel) {
      setPanelState("closing");
      const timeout = window.setTimeout(() => {
        setRenderPanel(false);
        setPanelState("closed");
      }, 200);
      return () => {
        window.clearTimeout(timeout);
      };
    }

    setPanelState("closed");
    return;
  }, [isOpen, renderPanel]);

  useEffect(() => {
    if (!nativeSupport || !nativeReady) {
      return;
    }

    if (nativePermission === "granted") {
      if (hasPushSubscription) {
        return;
      }
      void ensurePushSubscription(authToken)
        .then((success) => {
          if (success) {
            setHasPushSubscription(true);
          }
        })
        .catch((error) => {
          console.error("Failed to register push subscription:", error);
        });
      return;
    }

    if (nativePermission === "denied") {
      setHasPushSubscription(false);
      void removePushSubscription(authToken).catch((error) => {
        console.error("Failed to remove push subscription:", error);
      });
    } else {
      setHasPushSubscription(false);
    }
  }, [authToken, nativePermission, nativeReady, nativeSupport, hasPushSubscription]);

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
    "animate-scale-in",
  );
  const canShowNativeBanner = nativeSupport && nativeReady;
  return (
    <div className={containerClassName} ref={containerRef}>
      <button
        type="button"
        className={cx(styles.trigger, unreadCount > 0 && "animate-glow")}
        onClick={toggleOpen}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={isOpen}
      >
        <span className="bi bi-bell" aria-hidden="true" />
      </button>
      {unreadBadge && <span className={`${styles.badge} animate-scale-in`}>{unreadBadge}</span>}
      {renderPanel && (
        <div
          className={panelClassName}
          role="dialog"
          aria-label="Notifications"
          data-state={panelState}
        >
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
