/**
 * HTML Sanitization Utility
 * Sanitizes HTML content to prevent XSS attacks when storing rich text fields.
 */

import sanitizeHtml from "sanitize-html";

/**
 * Allowed HTML tags for rich text content (matching TipTap editor output)
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "u", "s",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "a", "img",
    "blockquote", "pre", "code",
    "table", "thead", "tbody", "tr", "th", "td",
    "hr", "span", "div", "sub", "sup",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    "*": ["class"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
  },
};

/**
 * Sanitize HTML content to prevent stored XSS.
 * Allows safe rich text tags while stripping dangerous elements like scripts.
 */
export function sanitizeRichText(html: string | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}
