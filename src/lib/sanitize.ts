/**
 * HTML Sanitization Utility
 * Prevents XSS attacks from user-generated HTML content.
 *
 * SECURITY: All user-supplied HTML must pass through sanitizeHtml() before
 * being used with dangerouslySetInnerHTML or innerHTML assignments.
 *
 * Uses an allowlist-based approach: only known-safe tags and attributes
 * are preserved, everything else is stripped.
 */

// Allowed HTML tags for rich text content (styling only, no scripts/forms)
const ALLOWED_TAGS = new Set([
  'b', 'i', 'u', 'em', 'strong', 'span', 'p', 'br', 'div',
  'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'sub', 'sup', 'strike', 's', 'del',
])

// Allowed HTML attributes (styling only)
const ALLOWED_ATTRS = new Set([
  'style', 'color', 'size', 'face', 'class',
])

// Dangerous patterns in style attributes
const DANGEROUS_STYLE_PATTERNS = /expression\s*\(|javascript:|url\s*\(|@import|behavior\s*:|binding\s*:|moz-binding/i

/**
 * Sanitize an individual style attribute value.
 * Removes CSS expressions, javascript: URLs, and other attack vectors.
 */
function sanitizeStyleValue(style: string): string {
  if (DANGEROUS_STYLE_PATTERNS.test(style)) {
    return ''
  }
  return style
}

/**
 * Sanitize HTML attributes on a tag, keeping only allowed ones.
 */
function sanitizeAttributes(attrString: string): string {
  if (!attrString.trim()) return ''

  const result: string[] = []
  // Match attribute="value", attribute='value', or attribute=value
  const attrRegex = /\s+([a-zA-Z][a-zA-Z0-9-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
  let match

  while ((match = attrRegex.exec(attrString)) !== null) {
    const attrName = match[1].toLowerCase()
    const attrValue = match[2] ?? match[3] ?? match[4] ?? ''

    if (!ALLOWED_ATTRS.has(attrName)) continue

    // Extra validation for event handlers that might sneak through
    if (attrName.startsWith('on')) continue

    // Sanitize style attribute values
    if (attrName === 'style') {
      const cleanStyle = sanitizeStyleValue(attrValue)
      if (cleanStyle) {
        result.push(` ${attrName}="${cleanStyle}"`)
      }
      continue
    }

    // Escape attribute value
    const escaped = attrValue
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    result.push(` ${attrName}="${escaped}"`)
  }

  return result.join('')
}

/**
 * Sanitize HTML string to prevent XSS attacks.
 * Only allows safe formatting tags and style attributes.
 * Strips all script tags, event handlers, and dangerous content.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ''

  let clean = dirty

  // 1. Remove script tags and their content entirely
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // 2. Remove style tags and their content (could contain CSS attacks)
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  // 3. Remove all event handler attributes (onclick, onerror, etc.)
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')

  // 4. Remove javascript: protocol anywhere in attributes
  clean = clean.replace(/javascript\s*:/gi, '')

  // 5. Remove data: protocol in attributes (can carry encoded scripts)
  clean = clean.replace(/data\s*:\s*text\/html/gi, '')

  // 6. Process each HTML tag - keep allowed, strip disallowed
  clean = clean.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^>]*)?)\s*\/?>/g, (fullMatch, tagName, attrs) => {
    const lowerTag = tagName.toLowerCase()

    if (!ALLOWED_TAGS.has(lowerTag)) {
      // Strip the tag but keep inner text content
      return ''
    }

    // Self-closing tag
    if (fullMatch.startsWith('</')) {
      return `</${lowerTag}>`
    }

    const cleanAttrs = sanitizeAttributes(attrs || '')
    const selfClosing = lowerTag === 'br' ? ' /' : ''
    return `<${lowerTag}${cleanAttrs}${selfClosing}>`
  })

  return clean
}

/**
 * Escape a string for safe use in a RegExp constructor.
 * Prevents ReDoS and regex injection attacks.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
