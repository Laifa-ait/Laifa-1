import { describe, expect, it } from "vitest";
import { sanitizeXSS, stripAllHTML } from "../utils/sanitization";

describe("OLMART DevSecOps - XSS Sanitization & Stripping", () => {
  it("should completely remove standard script tags and inner script content", () => {
    const maliciousInput = "Hello <script>alert('XSS Attack!')</script>World";
    const result = sanitizeXSS(maliciousInput);
    expect(result).toBe("Hello World");
  });

  it("should remove recursive or nested script tags", () => {
    const maliciousInput = "Hello <script>const x = '<script>alert(1)</script>';</script>World";
    const result = sanitizeXSS(maliciousInput);
    expect(result).toBe("Hello World");
  });

  it("should completely strip iframe, object, and embed elements to block frame-jacking", () => {
    const badIframe = '<div>Info <iframe src="https://evil.example.com"></iframe> content</div>';
    const badObject = '<object data="test.swf"></object>';
    expect(sanitizeXSS(badIframe)).toBe("<div>Info  content</div>");
    expect(sanitizeXSS(badObject)).toBe("");
  });

  it("should strip DOM inline event handlers (onload, onerror, onclick, etc.) from styling/markup", () => {
    const badImg = '<img src="valid.png" onerror="alert(document.cookie)" onload = "doEvil()"/>';
    const cleanedImg = sanitizeXSS(badImg);
    expect(cleanedImg).not.toContain("onerror");
    expect(cleanedImg).not.toContain("onload");
    expect(cleanedImg).toBe('<img src="valid.png" />');
  });

  it("should rewrite javascript: and data: URLs inside links or components", () => {
    const badLink = '<a href="javascript:alert(1)">Click Me</a>';
    const badImageSrc = '<img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==" />';
    
    expect(sanitizeXSS(badLink)).toBe('<a href="#">Click Me</a>');
    expect(sanitizeXSS(badImageSrc)).toBe('<img src="#" />');
  });

  it("should preserve harmless text and non-dangerous attributes", () => {
    const goodInput = '<div class="p-4 bg-white text-zinc-950 font-sans">Bienvenue sur OLMART Algérie</div>';
    const result = sanitizeXSS(goodInput);
    expect(result).toBe(goodInput);
  });

  it("should completely strip all HTML elements when calling stripAllHTML", () => {
    const boldInput = "<strong>Téléphone Portable Samsung S24</strong>";
    const result = stripAllHTML(boldInput);
    expect(result).toBe("Téléphone Portable Samsung S24");

    const complexHTMLInput = "<p>Visitez l'Algérie, plus de details <a href='/explore'>ici</a>.</p>";
    expect(stripAllHTML(complexHTMLInput)).toBe("Visitez l'Algérie, plus de details ici.");
  });

  it("should handle empty strings and abnormal structures gracefully", () => {
    expect(sanitizeXSS("")).toBe("");
    expect(stripAllHTML("")).toBe("");
  });
});
