import { describe, it, expect } from 'vitest';
import { sanitizeHtml, stripHtml, escapeHtml } from '../utils/sanitize';

describe('sanitizeHtml', () => {
    it('returns empty string for undefined input', () => {
        expect(sanitizeHtml(undefined)).toBe('');
    });

    it('returns empty string for empty string input', () => {
        expect(sanitizeHtml('')).toBe('');
    });

    it('preserves safe HTML tags', () => {
        const input = '<p>Hello <strong>world</strong></p>';
        expect(sanitizeHtml(input)).toBe('<p>Hello <strong>world</strong></p>');
    });

    it('preserves ordered and unordered lists', () => {
        const input = '<ol><li>Step 1</li><li>Step 2</li></ol>';
        expect(sanitizeHtml(input)).toBe('<ol><li>Step 1</li><li>Step 2</li></ol>');
    });

    it('preserves links with safe attributes', () => {
        const input = '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>';
        expect(sanitizeHtml(input)).toBe('<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>');
    });

    it('strips script tags (XSS attack)', () => {
        const input = '<p>Hello</p><script>alert("XSS")</script>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('alert');
        expect(result).toContain('<p>Hello</p>');
    });

    it('strips onerror event handlers (XSS attack)', () => {
        const input = '<img src="x" onerror="alert(\'XSS\')">';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('alert');
    });

    it('strips onload event handlers (XSS attack)', () => {
        const input = '<body onload="alert(\'XSS\')">content</body>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('onload');
        expect(result).not.toContain('alert');
    });

    it('strips javascript: protocol in links (XSS attack)', () => {
        const input = '<a href="javascript:alert(\'XSS\')">Click me</a>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('javascript:');
    });

    it('strips iframe tags', () => {
        const input = '<iframe src="https://evil.com"></iframe>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('<iframe');
    });

    it('strips data attributes', () => {
        const input = '<div data-evil="payload">content</div>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('data-evil');
    });

    it('strips style attributes to prevent CSS-based attacks', () => {
        const input = '<p style="background:url(javascript:alert(1))">text</p>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('style');
    });

    it('handles complex XSS payloads with encoded characters', () => {
        const input = '<img src=x onerror=&#x61;&#x6C;&#x65;&#x72;&#x74;(1)>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('onerror');
    });

    it('preserves em and strong formatting', () => {
        const input = '<li><strong>Action</strong> - <em>Expected Result</em></li>';
        expect(sanitizeHtml(input)).toBe('<li><strong>Action</strong> - <em>Expected Result</em></li>');
    });
});

describe('stripHtml', () => {
    it('returns empty string for undefined input', () => {
        expect(stripHtml(undefined)).toBe('');
    });

    it('returns empty string for empty string input', () => {
        expect(stripHtml('')).toBe('');
    });

    it('strips all HTML tags and returns plain text', () => {
        const input = '<p>Hello <strong>world</strong></p>';
        expect(stripHtml(input)).toBe('Hello world');
    });

    it('strips script tags without executing them', () => {
        const input = '<script>alert("XSS")</script>Safe text';
        const result = stripHtml(input);
        expect(result).not.toContain('<script>');
        expect(result).toContain('Safe text');
    });

    it('handles ordered list content', () => {
        const input = '<ol><li>Step 1</li><li>Step 2</li></ol>';
        const result = stripHtml(input);
        expect(result).toContain('Step 1');
        expect(result).toContain('Step 2');
    });
});

describe('escapeHtml', () => {
    it('returns empty string for undefined input', () => {
        expect(escapeHtml(undefined)).toBe('');
    });

    it('returns empty string for empty string input', () => {
        expect(escapeHtml('')).toBe('');
    });

    it('escapes angle brackets', () => {
        expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
            '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
        );
    });

    it('escapes ampersands', () => {
        expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('escapes quotes', () => {
        expect(escapeHtml('He said "hello"')).toBe('He said &quot;hello&quot;');
    });

    it('escapes single quotes', () => {
        expect(escapeHtml("It's working")).toBe('It&#039;s working');
    });

    it('leaves safe text unchanged', () => {
        expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
    });

    it('escapes complex XSS payloads', () => {
        const input = '<img src=x onerror=alert("XSS")>';
        const result = escapeHtml(input);
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
        expect(result).toContain('&lt;');
        expect(result).toContain('&gt;');
    });
});
