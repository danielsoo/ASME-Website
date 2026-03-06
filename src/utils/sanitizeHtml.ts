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
