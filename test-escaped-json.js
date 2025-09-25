// Test escaped JSON parsing
const escapedJson = `{
"answer_markdown": "### Direct Answer to Your Question Yes."
}`;

console.log("Input string:");
console.log(escapedJson);
console.log("\nParsing attempt:");

try {
  const parsed = JSON.parse(escapedJson);
  console.log("Successfully parsed!");
  console.log("answer_markdown field:", parsed.answer_markdown);
} catch (e) {
  console.log("Failed to parse:", e.message);
}

// Test the actual coerceToMarkdown function
function coerceToMarkdown(maybe) {
  if (!maybe) return ''
  if (typeof maybe === 'string') {
    if (maybe.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(maybe)
        if (parsed?.answer_markdown) return String(parsed.answer_markdown)
      } catch {}
    }
    return maybe
  }
  if (typeof maybe === 'object') {
    if (typeof maybe.answer_markdown === 'string') return maybe.answer_markdown
    if (typeof maybe.markdown === 'string') return maybe.markdown
    if (typeof maybe.message === 'string') return maybe.message
  }
  return ''
}

console.log("\ncoerceToMarkdown result:");
console.log(coerceToMarkdown(escapedJson));