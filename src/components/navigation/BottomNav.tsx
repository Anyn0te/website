"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";
import { NotificationBell } from "@/modules/notifications/components/NotificationBell";
import { useNotifications } from "@/modules/notifications/hooks/useNotifications";
import { Notification as AppNotification } from "@/modules/notifications/types";

interface BottomNavProps {
  onOpenCreateModal: () => void;
  viewerId?: string | null;
  token?: string | null;
}

const describeNotification = (notification: AppNotification): string => {
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

const BottomNav = ({ onOpenCreateModal, viewerId = null, token = null }: BottomNavProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false); 
  const navRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLLIElement>(null); 
  const mobileControlsRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pathname = usePathname();
  const supportsNativeNotifications = useMemo(
    () => typeof window !== "undefined" && "Notification" in window,
    [],
  );
  const [nativePermission, setNativePermission] =
    useState<NotificationPermission>("default");
  const [permissionReady, setPermissionReady] = useState(false);

  useEffect(() => {
    if (!supportsNativeNotifications) {
      setPermissionReady(true);
      return;
    }

    setNativePermission(window.Notification.permission);
    setPermissionReady(true);
  }, [supportsNativeNotifications]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const evaluateModalState = () => {
      setIsModalOpen(document.body.classList.contains("modal-open"));
    };

    evaluateModalState();

    const observer = new MutationObserver(evaluateModalState);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
    };
  }, []);

  const dispatchNativeNotifications = useCallback(
    (incoming: AppNotification[]) => {
      if (!supportsNativeNotifications) {
        return;
      }

      if (!permissionReady) {
        return;
      }

      if (nativePermission !== "granted") {
        return;
      }

      const isDocumentHidden =
        typeof document !== "undefined"
          ? document.visibilityState === "hidden"
          : false;

      if (!isDocumentHidden) {
        return;
      }

      incoming.forEach((notification) => {
        const title = notification.actorName ?? "Anyn0te";
        const body = describeNotification(notification);
        try {
          new window.Notification(title, {
            body,
            tag: notification.id,
            data: { notificationId: notification.id },
          });
        } catch (nativeError) {
          console.error("Failed to dispatch browser notification", nativeError);
        }
      });
    },
    [supportsNativeNotifications, nativePermission, permissionReady],
  );

  const {
    notifications,
    unreadCount,
    isLoading: notificationsLoading,
    markAllAsRead,
    refresh,
  } = useNotifications(viewerId, token, {
    pollIntervalMs: 15000,
    onNewNotifications: dispatchNativeNotifications,
  });

  const handleRequestNativePermission = useCallback(async () => {
    if (!supportsNativeNotifications) {
      return;
    }

    try {
      const result = await window.Notification.requestPermission();
      setNativePermission(result);
      if (result === "granted") {
        await refresh();
      }
    } catch (permissionError) {
      console.error("Unable to request browser notification permission", permissionError);
    }
  }, [supportsNativeNotifications, refresh]);

  const navItems = useMemo(
    () => [
      { label: "Dashboard", href: "/dashboard", icon: "speedometer2" },
      { label: "Followed", href: "/followed", icon: "people" },
      {
        label: "Create Note",
        action: onOpenCreateModal,
        icon: "plus-circle",
        type: "action" as const,
      },
      { label: "All Notes", href: "/notes", icon: "book", hideOnDesktop: true },
      { label: "My Notes", href: "/minotes", icon: "person", hideOnDesktop: true },
      { label: "About Us", href: "/about", icon: "info-circle", hideOnDesktop: true}, 
      { label: "Settings", href: "/settings", icon: "gear" },
    ],
    [onOpenCreateModal],
  );

  const moreItems = useMemo(
    () => [
      { label: "All Notes", href: "/notes", icon: "book" },
      { label: "My Notes", href: "/minotes", icon: "person" },
      { label: "About Us", href: "/about", icon: "info-circle" }, 
    ],
    [],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        navRef.current &&
        !navRef.current.contains(event.target as Node) &&
        mobileControlsRef.current &&
        !mobileControlsRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };

    if (isOpen || isMoreOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, isMoreOpen]);

  useEffect(() => {
    setIsOpen(false);
    setIsMoreOpen(false); 
  }, [pathname]);

  const navClassName = [
    styles.nav,
    isOpen ? styles.navOpen : "",
    "shadow-lg",
  ]
    .join(" ")
    .trim();

  const itemsClassName = [styles.items, isOpen ? styles.itemsOpen : ""]
    .join(" ")
    .trim();

  return (
    <>
      <div
        className={styles.container}
        ref={navRef}
        data-open={isOpen}
        data-modal-open={isModalOpen}
      >
        <nav className={navClassName} aria-label="Primary navigation">
          <ul className={itemsClassName} id="primary-navigation">
          {navItems.map((item) => {
            const isAction = item.type === "action";
            const isActive =
              !isAction &&
              (pathname === item.href ||
                pathname?.startsWith(`${item.href}/`) ||
                (item.href === "/dashboard" && pathname === "/"));
            const shouldHideOnDesktop = item.hideOnDesktop;
            const navItemClassName = [
              styles.navItem,
              isActive ? styles.navItemActive : "",
              shouldHideOnDesktop ? styles.navItemMobileOnly : '', 
            ]
              .join(" ")
              .trim();

            return (
              <li key={item.label} className={navItemClassName}>
                {isAction ? (
                  <button
                    type="button"
                    className={styles.navButton}
                    onClick={() => {
                      setIsOpen(false);
                      item.action();
                    }}
                  >
                    <span
                      className={`bi bi-${item.icon}`}
                      aria-hidden="true"
                    />
                    <span className={styles.navLabel}>{item.label}</span>
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={styles.navLink}
                    onClick={() => setIsOpen(false)}
                  >
                    <span
                      className={`bi bi-${item.icon}`}
                      aria-hidden="true"
                    />
                    <span className={styles.navLabel}>{item.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
          
          <li className={`${styles.navItem} ${styles.navItemDesktopMore}`} ref={moreRef}>
            <button
              type="button"
              className={styles.navLink}
              onClick={() => setIsMoreOpen((prev) => !prev)}
              aria-expanded={isMoreOpen}
              aria-controls="more-navigation-menu"
            >
                <span className="bi bi-three-dots" aria-hidden="true" />
                <span className={styles.navLabel}>More</span>
                <span className={`bi bi-chevron-down ${styles.moreIcon}`} aria-hidden="true" />
            </button>
            {isMoreOpen && (
                <ul id="more-navigation-menu" className={styles.moreDropdown}>
                    {moreItems.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            pathname?.startsWith(`${item.href}/`);
                        
                        const dropDownItemClassName = [
                            styles.moreDropdownItem,
                            isActive ? styles.navItemActive : "",
                        ].join(" ").trim();
                        
                        return (
                            <li key={item.label} className={dropDownItemClassName}>
                                <Link
                                    href={item.href}
                                    className={styles.navLink}
                                    onClick={() => setIsMoreOpen(false)}
                                >
                                    <span
                                        className={`bi bi-${item.icon}`}
                                        aria-hidden="true"
                                    />
                                    <span className={styles.navLabel}>{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
          </li>
        </ul>
        </nav>
        <div className={styles.desktopBell}>
            {supportsNativeNotifications && permissionReady && nativePermission === "default" && (
              <button
                type="button"
                className={styles.notificationPrompt}
                onClick={() => void handleRequestNativePermission()}
              >
                <span className="bi bi-bell-fill" aria-hidden="true" />
                Enable alerts
              </button>
            )}
            {supportsNativeNotifications && permissionReady && nativePermission === "denied" && (
              <span className={styles.notificationPrompt} role="status">
                <span className="bi bi-shield-lock" aria-hidden="true" />
                Notifications blocked
              </span>
            )}
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              isLoading={notificationsLoading}
              onMarkAllAsRead={markAllAsRead}
              onRefresh={refresh}
              nativeSupport={supportsNativeNotifications}
              nativeReady={permissionReady}
              nativePermission={nativePermission}
              onRequestNativePermission={handleRequestNativePermission}
              anchor="desktop"
            />
        </div>
      </div>

      <div
        className={styles.mobileControls}
        data-open={isOpen}
        data-modal-open={isModalOpen}
        ref={mobileControlsRef}
      >
        <NotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          isLoading={notificationsLoading}
          onMarkAllAsRead={markAllAsRead}
          onRefresh={refresh}
          nativeSupport={supportsNativeNotifications}
          nativeReady={permissionReady}
          nativePermission={nativePermission}
          onRequestNativePermission={handleRequestNativePermission}
          anchor="mobile"
        />
        <button
          aria-controls="primary-navigation"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          className={styles.menuToggle}
          onClick={() => setIsOpen((prev) => !prev)}
          type="button"
        >
          <span
            aria-hidden="true"
            className={`bi ${isOpen ? "bi-x-lg" : "bi-list"}`}
          />
        </button>
      </div>
    </>
  );
};

export default BottomNav;
