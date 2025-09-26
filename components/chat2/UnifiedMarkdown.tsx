'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { scrub } from '@/lib/scrub'

interface UnifiedMarkdownProps {
  content: string
  className?: string
}

export function UnifiedMarkdown({ content, className = '' }: UnifiedMarkdownProps) {
  // Scrub the content to remove zero-width chars and normalize spacing
  const safe = scrub(content || '')

  return (
    <div className={`prose prose-base dark:prose-invert max-w-none markdown-content tabular-nums leading-relaxed break-words ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          // Custom component overrides for consistent styling
          p: ({ children }) => <p className="my-3">{children}</p>,
          ul: ({ children }) => <ul className="my-3 list-disc pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal pl-6">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          h1: ({ children }) => <h1 className="mt-6 mb-3 text-2xl font-bold">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-5 mb-3 text-xl font-bold">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-4 mb-2 text-lg font-semibold">{children}</h3>,
          code: ({ children, ...props }) => {
            // Check if it's inline code
            const isInline = !('className' in props && typeof props.className === 'string' && props.className.includes('language-'))

            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                  {children}
                </code>
              )
            }

            // Block code
            return (
              <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto">
                <code className="text-sm font-mono">{children}</code>
              </pre>
            )
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-4">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-gray-300 dark:border-gray-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50 dark:bg-gray-800">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
              {children}
            </td>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-blue-600 dark:text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {safe}
      </ReactMarkdown>
    </div>
  )
}