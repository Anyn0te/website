"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./BottomNav.module.css";

interface BottomNavProps {
  onOpenCreateModal: () => void;
}

const BottomNav = ({ onOpenCreateModal }: BottomNavProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

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
    <div className={styles.container} ref={navRef}>
      <nav className={navClassName} aria-label="Primary navigation">
        <ul className={itemsClassName}>
          <li className={styles.navItem}>
            <Link
              className={styles.navItemLink}
              href="/"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              className={styles.navItemLink}
              href="/dashboard"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
          </li>
          <li className={styles.navItem}>
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenCreateModal();
              }}
              className={`${styles.navItemLink} w-full text-left`}
              type="button"
            >
              Create Note
            </button>
          </li>
          <li className={styles.navItem}>
            <Link
              className={styles.navItemLink}
              href="/about"
              onClick={() => setIsOpen(false)}
            >
              About Us
            </Link>
          </li>
          <li className={styles.navItem}>
            <Link
              className={styles.navItemLink}
              href="/settings"
              onClick={() => setIsOpen(false)}
            >
              Settings
            </Link>
          </li>
        </ul>

        {!isOpen && (
          <i
            className={`bi bi-list ${styles.menuToggle}`}
            onClick={() => setIsOpen(true)}
            role="button"
            aria-label="Open menu"
          />
        )}
        {isOpen && (
          <i
            className={`bi bi-plus ${styles.menuToggle}`}
            onClick={() => setIsOpen(false)}
            role="button"
            aria-label="Close menu"
          />
        )}
      </nav>
    </div>
  );
};

export default BottomNav;
