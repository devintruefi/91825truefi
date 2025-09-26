/**
 * Remove zero-width characters and normalize spacing
 * This is idempotent - running it multiple times has no additional effect
 */
export function scrub(s: string): string {
  if (!s) return ''

  // Remove zero-width characters
  let cleaned = s
    .replace(/\u200b/g, '') // Zero-width space
    .replace(/\u200c/g, '') // Zero-width non-joiner
    .replace(/\u200d/g, '') // Zero-width joiner
    .replace(/\u2060/g, '') // Word joiner
    .replace(/\ufeff/g, '') // Zero-width no-break space (BOM)

  // Replace thin/narrow no-break spaces with regular spaces
  cleaned = cleaned
    .replace(/\u2009/g, ' ') // Thin space
    .replace(/\u202f/g, ' ') // Narrow no-break space
    .replace(/\u00a0/g, ' ') // Non-breaking space

  // Collapse multiple spaces (but preserve intentional formatting)
  cleaned = cleaned.replace(/  +/g, ' ')

  // Collapse excessive newlines
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n')

  return cleaned
}