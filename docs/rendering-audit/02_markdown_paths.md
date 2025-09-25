# Markdown Paths - All ReactMarkdown Entry Points

**Date**: 2025-09-25
**Branch**: fix-dockerfile
**Commit**: 3cb52b172c1d9e0e33995ecfe1e5ec05e2f019f6
**Author**: Claude Code (automated audit)

## ReactMarkdown Component Usage

### Summary Table

| Component | Path | Plugins | Wrapper Classes | Scrub Function |
|-----------|------|---------|-----------------|----------------|
| PennyResponseRenderer | `components/chat/penny-response-renderer.tsx` | remarkGfm, remarkBreaks | `.prose .markdown-content .tabular-nums` | Yes |
| AppleChatInterface | `components/apple-chat-interface.tsx` | remarkGfm, remarkBreaks, remarkMath | `.prose .markdown-content .tabular-nums .break-words` | Yes |
| ChatInterface | `components/chat-interface.tsx` | remarkGfm, remarkMath | None | No |

## Detailed Analysis

### 1. PennyResponseRenderer

**Location**: `components/chat/penny-response-renderer.tsx`

**Lines 78-97**:
```tsx
const scrub = (text: string) => {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')  // Remove zero-width characters
    .replace(/\u00AD/g, '')                 // Remove soft hyphens
}

<div className="prose prose-base dark:prose-invert max-w-none markdown-content tabular-nums break-words leading-relaxed">
  <ReactMarkdown
    remarkPlugins={[remarkGfm, remarkBreaks]}
    components={{
      p: (props) => <p {...props} className="my-3" />,
      ul: (props) => <ul {...props} className="my-3 list-disc pl-6" />,
      ol: (props) => <ol {...props} className="my-3 list-decimal pl-6" />,
      li: (props) => <li {...props} className="[&>*]:align-baseline" />,
      h1: (props) => <h1 {...props} className="mt-6 mb-3 text-2xl font-bold" />,
      h2: (props) => <h2 {...props} className="mt-5 mb-3 text-xl font-bold" />,
      h3: (props) => <h3 {...props} className="mt-4 mb-2 text-lg font-semibold" />
    }}
  >
    {scrub(part)}
  </ReactMarkdown>
</div>
```

**Features**:
- Pre-processing with `scrub()` function
- Custom component overrides for typography
- Full prose styling with Tailwind Typography
- `remarkBreaks` for single newline handling

### 2. AppleChatInterface

**Location**: `components/apple-chat-interface.tsx`

**Lines 30-33 (Scrub function)**:
```tsx
// Scrub zero-width characters and normalize spaces
const scrub = (s: string) =>
  s.replace(/[\u200B-\u200D\uFEFF\u2060]/g, '')     // zero-widths
   .replace(/\u2009|\u202f/g, ' ');                 // thin/narrow spaces
```

**Lines 441-487 (Markdown rendering)**:
```tsx
<div key={`markdown-part-${idx}`}
     className="prose prose-base dark:prose-invert max-w-none markdown-content tabular-nums break-words leading-relaxed">
  <ReactMarkdown
    remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
    rehypePlugins={[[rehypeKatex, { output: 'html', strict: false }], rehypeRaw, rehypeSanitize]}
    components={{
      table: ({ node, ...props }) => (
        <table {...props} className="min-w-full border border-black dark:border-gray-600 rounded-lg overflow-hidden my-6 shadow-lg" />
      ),
      thead: (props) => <thead {...props} className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20" />,
      th: (props) => <th {...props} className="font-bold text-gray-900 dark:text-gray-100 px-4 py-3 border-b border-black dark:border-gray-600" />,
      tr: (props) => <tr {...props} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" />,
      td: (props) => <td {...props} className="px-4 py-3 border-b border-gray-200 dark:border-gray-700" />,
      ul: (props: React.HTMLAttributes<HTMLUListElement>) => {
        const { className = '', ...rest } = props;
        return <ul className={`list-disc pl-4 my-2 ${className}`} {...rest} />;
      },
      ol: (props: React.HTMLAttributes<HTMLOListElement>) => {
        const { className = '', ...rest } = props;
        return <ol className={`list-decimal pl-4 my-2 ${className}`} {...rest} />;
      },
      code: ({ node, className, children, ...props }) => {
        if (className?.includes('language-math')) {
          let mathContent = '';
          if (Array.isArray(children) && children[0]) {
            mathContent = String(children[0]).replace(/\$\$/g, '');
          } else if (children) {
            mathContent = String(children).replace(/\$\$/g, '');
          }
          return <BlockMath math={mathContent} />;
        }
        return <code className={className} {...props}>{children}</code>;
      },
      p: (props) => <p {...props} className="my-4 leading-relaxed" />,
      h1: (props) => <h1 {...props} className="mt-8 mb-4 text-2xl font-bold" />,
      h2: (props) => <h2 {...props} className="mt-8 mb-4 text-xl font-bold" />,
      h3: (props) => <h3 {...props} className="mt-6 mb-3 text-lg font-semibold" />
    }}
  >
    {safe}
  </ReactMarkdown>
</div>
```

**Features**:
- Math support with KaTeX
- Extensive table styling
- Raw HTML and sanitization support
- More comprehensive component overrides

### 3. ChatInterface (Legacy)

**Location**: `components/chat-interface.tsx`

**Lines 197-278**:
```tsx
<ReactMarkdown
  key={`markdown-part-${index}`}
  remarkPlugins={[remarkGfm, remarkMath]}
  rehypePlugins={[[rehypeKatex, { output: 'html', strict: false }], rehypeRaw, rehypeSanitize]}
  components={{
    table: ({ node, ...props }) => (
      <table {...props} className="min-w-full border border-black dark:border-gray-600 rounded-lg overflow-hidden my-6 shadow-lg" />
    ),
    // ... similar component overrides
  }}
>
  {part}
</ReactMarkdown>
```

**Features**:
- NO wrapper div with prose classes
- NO scrub function
- Math support but NO remarkBreaks
- Direct rendering of content

## Plugin Comparison Matrix

| Plugin | PennyResponseRenderer | AppleChatInterface | ChatInterface |
|--------|----------------------|-------------------|---------------|
| remarkGfm | ✅ | ✅ | ✅ |
| remarkBreaks | ✅ | ✅ | ❌ |
| remarkMath | ❌ | ✅ | ✅ |
| rehypeKatex | ❌ | ✅ | ✅ |
| rehypeRaw | ❌ | ✅ | ✅ |
| rehypeSanitize | ❌ | ✅ | ✅ |

## CSS Class Application

### PennyResponseRenderer Classes:
```
prose prose-base dark:prose-invert max-w-none markdown-content tabular-nums break-words leading-relaxed
```

### AppleChatInterface Classes:
```
prose prose-base dark:prose-invert max-w-none markdown-content tabular-nums break-words leading-relaxed
```

### ChatInterface Classes:
```
(No wrapper classes - components styled individually)
```

## Component Override Differences

### Typography Spacing:

| Element | PennyResponseRenderer | AppleChatInterface | ChatInterface |
|---------|----------------------|-------------------|---------------|
| `<p>` | `my-3` | `my-4 leading-relaxed` | `my-4 leading-relaxed` |
| `<h1>` | `mt-6 mb-3 text-2xl` | `mt-8 mb-4 text-2xl` | `mt-8 mb-4 text-2xl` |
| `<h2>` | `mt-5 mb-3 text-xl` | `mt-8 mb-4 text-xl` | `mt-8 mb-4 text-xl` |
| `<h3>` | `mt-4 mb-2 text-lg` | `mt-6 mb-3 text-lg` | `mt-6 mb-3 text-lg` |
| `<ul>` | `my-3 list-disc pl-6` | `list-disc pl-4 my-2` | `list-disc pl-4 my-2` |

## Pre-Processing Functions

### Scrub Functions Comparison:

**PennyResponseRenderer**:
- Removes: `\u200B-\u200D`, `\uFEFF` (zero-width)
- Removes: `\u00AD` (soft hyphens)

**AppleChatInterface**:
- Removes: `\u200B-\u200D`, `\uFEFF`, `\u2060` (zero-width)
- Replaces with space: `\u2009`, `\u202f` (thin/narrow spaces)

**ChatInterface**:
- No pre-processing

## Key Inconsistencies

1. **Plugin Mismatch**: PennyResponseRenderer lacks math support that others have
2. **Wrapper Classes**: ChatInterface has no prose wrapper, affecting typography
3. **Component Spacing**: Different margin/padding values across renderers
4. **Scrub Functions**: Different character handling between components
5. **List Indentation**: `pl-6` vs `pl-4` for lists
6. **Line Height**: Some use `leading-relaxed` on paragraphs, others don't

## Import Analysis

### Package Versions (from package.json):
```json
"react-markdown": "^9.0.1",
"remark-gfm": "^4.0.0",
"remark-breaks": "^4.0.0",
"remark-math": "^6.0.0",
"rehype-katex": "^7.0.1",
"rehype-raw": "^7.0.0",
"rehype-sanitize": "^6.0.0"
```

All components import from the same packages, but configure them differently.