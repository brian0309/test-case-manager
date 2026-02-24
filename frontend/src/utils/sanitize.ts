/**
 * HTML Sanitization Utilities
 * Provides consistent XSS protection across the application
 */

import DOMPurify from 'dompurify';

/**
 * Allowed HTML tags for rich text content (from TipTap editor output)
 */
const ALLOWED_TAGS = [
    'p', 'br', 'strong', 'em', 'u', 's',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'img',
    'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'hr', 'span', 'div', 'sub', 'sup',
];

/**
 * Allowed HTML attributes for rich text content
 */
const ALLOWED_ATTR = [
    'href', 'target', 'rel',
    'src', 'alt', 'width', 'height',
    'class',
    'colspan', 'rowspan',
];

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows safe rich text tags while stripping dangerous elements like scripts.
 */
export function sanitizeHtml(html: string | undefined): string {
    if (!html) return '';
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        ALLOW_DATA_ATTR: false,
    });
}

/**
 * Strip all HTML tags and return plain text.
 * Safer alternative to innerHTML-based stripping.
 */
export function stripHtml(html: string | undefined): string {
    if (!html) return '';
    // Use DOMPurify to first sanitize, then extract text
    const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
    return clean;
}

/**
 * Strip HTML tags while preserving visible line breaks.
 * Converts common block/line break tags to \n, then removes remaining tags.
 */
export function stripHtmlPreserveLineBreaks(html: string | undefined): string {
    if (!html) return '';

    const sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['br', 'p', 'div', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr'],
        ALLOWED_ATTR: [],
    });

    const withLineBreaks = sanitized
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<hr\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n');

    const text = DOMPurify.sanitize(withLineBreaks, { ALLOWED_TAGS: [] });
    return text.replace(/\n{3,}/g, '\n\n');
}

/**
 * Escape special HTML characters in a string to prevent injection
 * when building HTML from template literals.
 */
export function escapeHtml(text: string | undefined): string {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
