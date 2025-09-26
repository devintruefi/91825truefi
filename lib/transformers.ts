import { AgentResponseSchema, type AgentResponse } from './types'

/**
 * Extract markdown and metadata from any backend response shape
 * This handles ALL the weird formats we've seen
 */
export function extractRichResponse(input: unknown): {
  markdown: string
  metadata?: AgentResponse
} {
  // Handle null/undefined
  if (!input) {
    return { markdown: '' }
  }

  // Handle string inputs
  if (typeof input === 'string') {
    const trimmed = input.trim()

    // Check if it's a JSON string
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed)
        // Recurse with the parsed object
        return extractRichResponse(parsed)
      } catch (e) {
        // Not valid JSON, might have escaped characters
        // Try removing backslashes and parsing again
        if (trimmed.includes('answer_markdown') || trimmed.includes('answer\\_markdown')) {
          try {
            // Remove all backslashes (handles escaped underscores)
            const unescaped = trimmed.replace(/\\/g, '')
            const parsed = JSON.parse(unescaped)
            return extractRichResponse(parsed)
          } catch {
            // Still failed, treat as plain markdown
          }
        }
      }
    }

    // Plain markdown string
    return { markdown: trimmed }
  }

  // Handle object inputs
  if (typeof input === 'object' && input !== null) {
    // Check if it has answer_markdown field
    if ('answer_markdown' in input && typeof (input as any).answer_markdown === 'string') {
      // Try to validate with zod
      try {
        const validated = AgentResponseSchema.parse(input)
        return {
          markdown: validated.answer_markdown,
          metadata: validated
        }
      } catch {
        // Validation failed, but we can still extract the markdown
        return {
          markdown: (input as any).answer_markdown,
          metadata: input as any
        }
      }
    }

    // Check common fallback fields
    if ('content' in input && typeof (input as any).content === 'string') {
      return extractRichResponse((input as any).content)
    }
    if ('message' in input && typeof (input as any).message === 'string') {
      return extractRichResponse((input as any).message)
    }
    if ('response' in input && typeof (input as any).response === 'string') {
      return extractRichResponse((input as any).response)
    }

    // Check for nested rich_content
    if ('rich_content' in input && typeof (input as any).rich_content === 'object') {
      return extractRichResponse((input as any).rich_content)
    }

    // Check if the entire object might be the response with a different structure
    // Like when the response comes with the markdown at root level but metadata in other fields
    if ('ui_blocks' in input || 'computations' in input || 'assumptions' in input) {
      // Look for any string field that might be the content
      const possibleContentFields = ['answer_markdown', 'markdown', 'content', 'message', 'text']
      for (const field of possibleContentFields) {
        if (field in input && typeof (input as any)[field] === 'string') {
          return {
            markdown: (input as any)[field],
            metadata: input as any
          }
        }
      }
    }
  }

  // Last resort - stringify whatever we got
  return { markdown: String(input) }
}