"use client"

import React from 'react'
import ReactMarkdown from 'react-markdown'
import { MARKDOWN_REMARK, MARKDOWN_REHYPE, MARKDOWN_COMPONENTS } from './markdown/config'
import { scrubMarkdown } from '@/lib/scrubMarkdown'
import 'katex/dist/katex.min.css'

interface UnifiedMarkdownRendererProps {
  content: string
  className?: string
}

export default function UnifiedMarkdownRenderer({ content, className = '' }: UnifiedMarkdownRendererProps) {
  // Belt-and-suspenders guard against JSON objects
  let safe = content ?? ''

  // Check if the string contains a JSON object with answer_markdown
  // Handle cases where there's text before the JSON (like "## Financial Snapshot\n\n{...")
  // Also handle escaped underscores in the JSON keys
  if (safe && typeof safe === 'string') {
    const jsonMatch = safe.match(/\{[\s\S]*"answer\\_?markdown"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        // Remove backslash escapes before parsing
        const unescaped = jsonMatch[0].replace(/\\/g, '')
        const parsed = JSON.parse(unescaped)
        if (parsed?.answer_markdown) {
          safe = parsed.answer_markdown
        }
      } catch {
        // If unescaping didn't work, try original
        try {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed?.answer_markdown) {
            safe = parsed.answer_markdown
          }
        } catch {}
      }
    }
  }

  // Apply scrub to clean zero-width chars
  safe = scrubMarkdown(safe)

  return (
    <div className={`prose prose-base dark:prose-invert max-w-none markdown-content tabular-nums leading-relaxed break-words ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={MARKDOWN_REMARK}
        rehypePlugins={MARKDOWN_REHYPE}
        components={MARKDOWN_COMPONENTS}
      >
        {safe}
      </ReactMarkdown>
    </div>
  )
}