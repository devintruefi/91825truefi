export const scrubMarkdown = (s: string): string =>
  (s ?? '')
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, '')   // zero-widths
    .replace(/\u2009|\u202f/g, ' ')                // thin/narrow spaces