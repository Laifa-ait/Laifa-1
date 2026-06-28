import { describe, it, expect } from 'vitest';
import { sanitizeXSS } from '../utils/sanitization';

describe('sanitization utilities', () => {
  describe('sanitizeXSS', () => {
    it('removes script tags completely', () => {
      const input = '<script>alert("xss")</script>Hello';
      expect(sanitizeXSS(input)).toBe('Hello');
    });

    it('handles nested script tags', () => {
      const input = '<script><script>alert("xss")</script></script>World';
      expect(sanitizeXSS(input)).toBe('World');
    });

    it('removes event handlers', () => {
      const input = '<img src="test.jpg" onerror="alert(1)" onload=\'test()\' />';
      expect(sanitizeXSS(input)).toBe('<img src="test.jpg" />');
    });

    it('replaces javascript: uris', () => {
      const input = '<a href="javascript:alert(1)">Link</a>';
      expect(sanitizeXSS(input)).toBe('<a href="#">Link</a>');
    });

    it('removes dangerous tags', () => {
      const input = '<iframe></iframe><object></object><meta name="test">Text';
      expect(sanitizeXSS(input)).toBe('Text');
    });
    
    it('leaves safe text intact', () => {
      const input = 'This is a normal description.';
      expect(sanitizeXSS(input)).toBe(input);
    });
  });
});
