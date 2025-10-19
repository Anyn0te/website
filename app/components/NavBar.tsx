// anyn0te/temp-web/temp-web-2df439fafe818edce8840d500e112e41d81d33e9/app/components/NavBar.tsx
"use client";

import { useState } from 'react';
import Link from 'next/link';

/**
 * A fully responsive navigation bar with a mobile-first "floating ball" design.
 * Styles are provided in app/globals.css.
 */
export default function NavBar() {
  // 1. State Management
  const [isNavOpen, setIsNavOpen] = useState(false);

  // 1. Toggle Function
  const toggleNav = () => {
    setIsNavOpen((prev) => !prev);
  };

  // 1. Dynamic Classes: The main wrapper receives the state class
  const navContainerClass = isNavOpen ? 'navi navi-open' : 'navi navi-closed';
  
  // 1. Dynamic Icon: The toggle icon dynamically switches its class (bi-list when closed, bi-x when open)
  const iconClass = isNavOpen ? 'bi-x' : 'bi-list';

  // Helper function to close the nav on link click
  const handleLinkClick = () => {
    // Also, adjust hrefs to be root-relative paths, typical for Next.js
    if (isNavOpen) {
      setIsNavOpen(false);
    }
  };

  return (
    <div className={navContainerClass}>
      <nav id="nev">
        <ul className="items">
          {/* All elements inside <ul> are now valid <li> items */}
          <li className="nav-item">
            <Link href="/index" onClick={handleLinkClick}>
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
        
        {/* CRITICAL CHANGE: The icon is moved OUTSIDE the <ul> but remains inside <nav> */}
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