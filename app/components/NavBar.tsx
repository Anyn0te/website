"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function NavBar() {
  const [isNavOpen, setIsNavOpen] = useState(false);

  const toggleNav = () => {
    setIsNavOpen((prev) => !prev);
  };

  const navContainerClass = isNavOpen ? 'navi navi-open z-40' : 'navi navi-closed z-40';
  
  const iconClass = isNavOpen ? 'bi-x' : 'bi-list';

  const handleLinkClick = () => {
    if (isNavOpen) {
      setIsNavOpen(false);
    }
  };

  return (
    <div className={navContainerClass}>
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
            <Link href="/post" onClick={handleLinkClick}>
              Create Note
            </Link>
          </li>
          <li className="nav-item">
            <Link href="/about" onClick={handleLinkClick}>
              About
            </Link>
          </li>
        </ul>
        
        <i 
          id="ham" 
          className={`bi ${iconClass}`} 
          onClick={toggleNav} 
          role="button"
          aria-label={isNavOpen ? "Close menu" : "Open menu"}
        />
      </nav>
    </div>
  );
}