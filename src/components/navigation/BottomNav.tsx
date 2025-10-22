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
  const [isMoreOpen, setIsMoreOpen] = useState(false); 
  const navRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLLIElement>(null); 
  const pathname = usePathname();

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
      { label: "Settings", href: "/settings", icon: "gear" },
    ],
    [onOpenCreateModal],
  );

  const moreItems = useMemo(
    () => [
      { label: "All Notes", href: "/notes", icon: "book" },
      { label: "My Notes", href: "/minotes", icon: "person" },
    ],
    [],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
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
    <div className={styles.container} ref={navRef} data-open={isOpen}>
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