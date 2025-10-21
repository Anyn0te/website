"use client";

import DOMPurify from "dompurify";

type PurifyInstance = ReturnType<typeof DOMPurify>;

let purifyInstance: PurifyInstance;

if (typeof window !== "undefined") {
  purifyInstance = DOMPurify(window);
} else {
  purifyInstance = {
    sanitize: (input: string | Node) =>
      typeof input === "string" ? input : "",
  } as PurifyInstance;
}

export const sanitizeHtml = (value: string): string => {
  return purifyInstance.sanitize(value, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br"],
    ALLOWED_ATTR: [],
  });
};
