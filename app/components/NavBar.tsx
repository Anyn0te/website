"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface NavBarProps {
  onOpenCreateModal: () => void;
}

export default function NavBar({ onOpenCreateModal }: NavBarProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const toggleNav = () => {
    setIsNavOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsNavOpen(false);
      }
    };

    if (isNavOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNavOpen]);

  const navContainerClass = isNavOpen ? 'navi navi-open z-40' : 'navi navi-closed z-40';
  
  const iconClass = isNavOpen ? 'bi-plus' : 'bi-list';

  const handleLinkClick = () => {
    if (isNavOpen) {
      setIsNavOpen(false);
    }
  };

  const handleCreateNoteClick = () => {
    onOpenCreateModal();
    setIsNavOpen(false);
  };

  return (
    <div className={navContainerClass} ref={navRef}>
      <nav id="nev">
        <ul className="items">
          <li className="nav-item">
            <Link href="/" onClick={handleLinkClick}>
              Home
            </Link>
          </li>
          <li className="nav-item">
            <Link href="/dashboard" onClick={handleLinkClick}>
              Dashboard
            </Link>
          </li>
          <li className="nav-item">
            <button onClick={handleCreateNoteClick} className="w-full text-left">
              Create Note
            </button>
          </li>
          <li className="nav-item">
            <Link href="/about" onClick={handleLinkClick}>
              About Us
            </Link>
          </li>
          <li className="nav-item">
            <Link href="/settings" onClick={handleLinkClick}>
              Settings
            </Link>
          </li>
        </ul>
        
        {!isNavOpen && (
          <i 
            id="ham" 
            className={`bi ${iconClass}`} 
            onClick={toggleNav} 
            role="button"
            aria-label={isNavOpen ? "Close menu" : "Open menu"}
          />
        )}
      </nav>
    </div>
  );
}