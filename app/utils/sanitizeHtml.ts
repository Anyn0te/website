"use client";

import DOMPurify from 'dompurify';
import type { DOMPurifyI } from 'dompurify'; 

let purifyInstance: DOMPurifyI;

if (typeof window !== 'undefined') {
  purifyInstance = DOMPurify(window);
} else {
  purifyInstance = {
    sanitize: (s: string | Node) => (typeof s === 'string' ? s : ''),
  } as DOMPurifyI;
}


/**
 * Sanitizes an HTML string to prevent XSS attacks.
 * @param htmlString The raw user input string.
 * @returns A clean, safe HTML string.
 */
export const sanitizeHtml = (htmlString: string): string => {
  return purifyInstance.sanitize(htmlString, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
};