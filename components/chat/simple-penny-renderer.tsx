"use client"

import React from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SimplePennyRendererProps {
  content: any
  metadata?: any
}

// Dead simple extraction - if it's JSON with answer_markdown, extract it. Otherwise display as-is.
function extractMarkdown(content: any): string {
  if (!content) return ''

  // If it's already a clean string without JSON, return it
  if (typeof content === 'string') {
    const trimmed = content.trim()

    // Check if it looks like it contains JSON with answer_markdown
    if (trimmed.includes('"answer_markdown"') || trimmed.includes('"answer\\_markdown"')) {
      // Find the JSON object in the string
      const startIdx = trimmed.indexOf('{')
      const endIdx = trimmed.lastIndexOf('}')

      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        try {
          // Extract just the JSON part
          const jsonStr = trimmed.substring(startIdx, endIdx + 1)
          // Remove backslash escapes that break JSON parsing
          const cleaned = jsonStr.replace(/\\/g, '')
          const parsed = JSON.parse(cleaned)

          if (parsed.answer_markdown) {
            console.log('[SimplePenny] Successfully extracted answer_markdown')
            return parsed.answer_markdown
          }
        } catch (e) {
          console.log('[SimplePenny] JSON parse failed, trying without cleaning')
          try {
            const jsonStr = trimmed.substring(startIdx, endIdx + 1)
            const parsed = JSON.parse(jsonStr)
            if (parsed.answer_markdown) {
              return parsed.answer_markdown
            }
          } catch (e2) {
            console.log('[SimplePenny] Both parse attempts failed')
          }
        }
      }
    }

    // If no JSON or extraction failed, return the original
    return content
  }

  // If it's an object with answer_markdown
  if (typeof content === 'object' && content.answer_markdown) {
    return content.answer_markdown
  }

  // Fallback
  return String(content)
}

export function SimplePennyRenderer({ content, metadata }: SimplePennyRendererProps) {
  const markdown = extractMarkdown(content)

  console.log('[SimplePenny] Extracted markdown preview:', markdown.substring(0, 100))

  return (
    <div className="space-y-4">
      <div className="prose prose-base dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={{
            // Simple, clean components
            p: ({ children }) => <p className="mb-4">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
            li: ({ children }) => <li className="mb-1">{children}</li>,
            h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>,
            h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
            code: ({ inline, children }) =>
              inline
                ? <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm">{children}</code>
                : <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto"><code>{children}</code></pre>,
            blockquote: ({ children }) =>
              <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4">{children}</blockquote>,
            table: ({ children }) =>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border border-gray-300">{children}</table>
              </div>,
            th: ({ children }) =>
              <th className="border border-gray-300 px-4 py-2 bg-gray-100 dark:bg-gray-800">{children}</th>,
            td: ({ children }) =>
              <td className="border border-gray-300 px-4 py-2">{children}</td>,
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>

      {/* Simple metadata display if needed */}
      {metadata?.computations && metadata.computations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Calculations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metadata.computations.slice(0, 3).map((comp: any, i: number) => (
                <div key={i} className="flex justify-between">
                  <span className="font-medium">{comp.name}:</span>
                  <span>{comp.result}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}