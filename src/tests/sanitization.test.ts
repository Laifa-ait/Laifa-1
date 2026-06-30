import { describe, it, expect } from 'vitest';
import { sanitizeXSS } from '../utils/sanitization';

describe('Sanitization Utils', () => {
  it('strips basic script tags', () => {
    const input = '<script>alert("xss")</script>Hello';
    expect(sanitizeXSS(input)).toBe('Hello');
  });

  it('strips inline event handlers', () => {
    const input = '<img src="valid.jpg" onerror="alert(1)" />';
    expect(sanitizeXSS(input)).toBe('<img src="valid.jpg" />');
  });

  it('strips dangerous URI schemes like javascript:', () => {
    const input = '<a href="javascript:alert(1)">Click me</a>';
    expect(sanitizeXSS(input)).toBe('<a href="#">Click me</a>');
  });

  it('handles nested script tags', () => {
    const input = '<script><script>alert("nested")</script></script>Safe content';
    expect(sanitizeXSS(input)).toBe('Safe content');
  });

  it('strips dangerous HTML elements completely', () => {
    const input = '<iframe>hidden</iframe><embed src="flash.swf" /><style></style>Hello';
    expect(sanitizeXSS(input)).toBe('hiddenHello');
  });

  it('returns original string if no malicious content', () => {
    const input = 'This is a normal description.';
    expect(sanitizeXSS(input)).toBe('This is a normal description.');
  });
});
