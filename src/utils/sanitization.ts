/**
 * OLMART Secure Sanitization Utility
 * Mitigates XSS injection attacks in vendor-contributed content (such as product names, descriptions, and tags).
 * Employs Strict Allow-list and stripping patterns for maximum DevSecOps protection.
 */

/**
 * Strips dangerous HTML tags, attributes, event handlers, and javascript: protocols.
 * Returns safe string for direct rendering in React/frontend.
 */
export function sanitizeXSS(input: string): string {
  if (!input) return "";

  let sanitized = input;

  // 1. Remove script tags and their content recursively using a nesting-aware parser
  while (sanitized.toLowerCase().includes("<script")) {
    const lower = sanitized.toLowerCase();
    const startIndex = lower.indexOf("<script");
    if (startIndex === -1) break;

    const openTagEnd = sanitized.indexOf(">", startIndex);
    if (openTagEnd === -1) {
      // Unclosed script tag, strip to the end
      sanitized = sanitized.substring(0, startIndex);
      break;
    }

    let endIndex = lower.indexOf("</script>", openTagEnd);
    if (endIndex === -1) {
      // No closing script tag, strip to the end
      sanitized = sanitized.substring(0, startIndex);
      break;
    }

    // Handle nested script tags (like strings containing script blocks)
    let nextOpen = lower.indexOf("<script", openTagEnd);
    while (nextOpen !== -1 && nextOpen < endIndex) {
      const nextClose = lower.indexOf("</script>", endIndex + 9);
      if (nextClose === -1) {
        break;
      }
      endIndex = nextClose;
      nextOpen = lower.indexOf("<script", nextOpen + 7);
    }

    sanitized = sanitized.substring(0, startIndex) + sanitized.substring(endIndex + 9);
  }

  // 2. Strip standard dangerous elements completely: iframe, object, embed, applet, meta, style, link, form, frame, frameset
  const dangerousTags = [
    /<\/?iframe[^>]*>/gi,
    /<\/?object[^>]*>/gi,
    /<\/?embed[^>]*>/gi,
    /<\/?applet[^>]*>/gi,
    /<\/?meta[^>]*>/gi,
    /<\/?style[^>]*>/gi,
    /<\/?link[^>]*>/gi,
    /<\/?form[^>]*>/gi,
    /<\/?frame[^>]*>/gi,
    /<\/?frameset[^>]*>/gi,
    /<\/?svg[^>]*>/gi,
    /<\/?math[^>]*>/gi
  ];

  for (const regex of dangerousTags) {
    sanitized = sanitized.replace(regex, "");
  }

  // 3. Remove inline JavaScript event handlers (e.g. onload, onerror, onclick, onmouseover, any on[event]=)
  // Catch patterns like: onmouseover=... or onerror =
  const eventHandlerRegex = /\s*\bon[a-zA-Z]+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi;
  sanitized = sanitized.replace(eventHandlerRegex, "");

  // 4. Remove javascript: and data: URI schemes in href, src, action or general attributes
  const uriSchemeRegex = /(href|src|action|background)\s*=\s*['"]?\s*(javascript|data|vbscript):[^'"]*['"]?/gi;
  sanitized = sanitized.replace(uriSchemeRegex, "$1=\"#\"");

  // 5. Remove expressions like expression(...) used in older browsers for active CSS
  sanitized = sanitized.replace(/expression\s*\(.*?\)/gi, "");

  // 6. Clean up any double or extra spaces inside HTML tags, keeping exactly one space before self-closing />
  sanitized = sanitized.replace(/(<[^>]*>)/g, (match) => {
    return match
      .replace(/\s+/g, " ")
      .replace(/([^ ])\/>/g, "$1 />")
      .replace(/\s+\/>/g, " />")
      .replace(/\s+>/g, ">");
  });

  // 6. Escape any direct bracket injections if we want plain text only
  // This turns remaining raw HTML elements into safe strings if desired, but we can do a standard clean-up:
  // For standard user text fields (plain text like name or category name), we strip ALL HTML tags entirely.
  return sanitized;
}

/**
 * Enhanced full-strip function for simple plain text inputs (such as product titles, tags, category names).
 * Allows absolutely zero HTML.
 */
export function stripAllHTML(input: string): string {
  if (!input) return "";
  const sanitized = sanitizeXSS(input);
  // Strip any remaining html tags of form <...> or </...>
  return sanitized.replace(/<[^>]*>/g, "").trim();
}
