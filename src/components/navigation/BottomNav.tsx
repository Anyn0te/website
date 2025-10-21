"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

interface BottomNavProps {
  onOpenCreateModal: () => void;
}

const BottomNav = ({ onOpenCreateModal }: BottomNavProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const navItems = useMemo(
    () => [
      { label: "Home", href: "/", icon: "house-door" },
      { label: "Dashboard", href: "/dashboard", icon: "speedometer2" },
      {
        label: "Create Note",
        action: onOpenCreateModal,
        icon: "plus-circle",
        type: "action" as const,
      },
      { label: "About Us", href: "/about", icon: "info-circle" },
      { label: "Settings", href: "/settings", icon: "gear" },
    ],
    [onOpenCreateModal],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
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
    <div className={styles.container} ref={navRef} data-open={isOpen}>
      <nav className={navClassName} aria-label="Primary navigation">
        <ul className={itemsClassName} id="primary-navigation">
          {navItems.map((item) => {
            const isAction = item.type === "action";
            const isActive =
              !isAction &&
              (item.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(item.href));
            const navItemClassName = [
              styles.navItem,
              isActive ? styles.navItemActive : "",
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
        </ul>
      </nav>
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
  );
};

export default BottomNav;
