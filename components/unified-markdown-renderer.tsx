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
  console.log('[UnifiedMarkdownRenderer] Input type:', typeof safe)
  console.log('[UnifiedMarkdownRenderer] Input preview:', safe.substring ? safe.substring(0, 100) : safe)

  if (safe && typeof safe === 'string' && safe.trim().startsWith('{')) {
    console.log('[UnifiedMarkdownRenderer] Attempting JSON parse...')
    try {
      const parsed = JSON.parse(safe)
      console.log('[UnifiedMarkdownRenderer] Parsed keys:', Object.keys(parsed))
      if (parsed?.answer_markdown) {
        safe = parsed.answer_markdown
        console.log('[UnifiedMarkdownRenderer] Extracted answer_markdown')
      }
    } catch (e) {
      console.log('[UnifiedMarkdownRenderer] JSON parse failed:', e)
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