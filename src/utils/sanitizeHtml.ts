import DOMPurify from 'dompurify';

/**
 * Sanitize HTML for safe use with dangerouslySetInnerHTML.
 * Allows common formatting tags and links.
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'span', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
  });
}

/** Returns true if the string looks like HTML (contains tags). */
export function isHtmlString(s: string): boolean {
  return typeof s === 'string' && /<[a-z][\s\S]*>/i.test(s);
}

function plainTextFromSanitizedHtml(sanitized: string): string {
  if (!sanitized.trim()) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return decodeEntitiesAndStripTagsFallback(sanitized);
  }
  try {
    const doc = new DOMParser().parseFromString(sanitized, 'text/html');
    const text = doc.body.textContent ?? '';
    return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    return decodeEntitiesAndStripTagsFallback(sanitized);
  }
}

function decodeEntitiesAndStripTagsFallback(s: string): string {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/&#xa0;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Rich editor output → plain string for admin lists, modals, and labels.
 * Strips tags and decodes entities (`&nbsp;`, etc.); sanitizes first.
 */
export function richTextToPlainText(s: string | undefined | null): string {
  if (s == null || typeof s !== 'string') return '';
  return plainTextFromSanitizedHtml(sanitizeHtml(s));
}
