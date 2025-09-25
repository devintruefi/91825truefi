import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import UnifiedMarkdownRenderer from '../unified-markdown-renderer'
import { scrubMarkdown } from '@/lib/scrubMarkdown'

describe('UnifiedMarkdownRenderer', () => {
  test('renders basic markdown content', () => {
    const content = '# Hello World\n\nThis is a paragraph.'
    const { container } = render(<UnifiedMarkdownRenderer content={content} />)

    expect(screen.getByText('Hello World')).toBeInTheDocument()
    expect(screen.getByText('This is a paragraph.')).toBeInTheDocument()
  })

  test('applies correct wrapper classes', () => {
    const content = 'Test content'
    const { container } = render(<UnifiedMarkdownRenderer content={content} />)
    const wrapper = container.firstChild as HTMLElement

    expect(wrapper).toHaveClass('prose')
    expect(wrapper).toHaveClass('markdown-content')
    expect(wrapper).toHaveClass('tabular-nums')
    expect(wrapper).toHaveClass('break-words')
  })

  test('renders lists correctly', () => {
    const content = '- Item 1\n- Item 2\n\n1. First\n2. Second'
    const { container } = render(<UnifiedMarkdownRenderer content={content} />)

    const ul = container.querySelector('ul')
    const ol = container.querySelector('ol')

    expect(ul).toHaveClass('list-disc')
    expect(ul).toHaveClass('pl-6')
    expect(ol).toHaveClass('list-decimal')
    expect(ol).toHaveClass('pl-6')
  })

  test('renders tables with correct styling', () => {
    const content = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |'
    const { container } = render(<UnifiedMarkdownRenderer content={content} />)

    const table = container.querySelector('table')
    expect(table).toHaveClass('min-w-full')
    expect(table).toHaveClass('border')
  })

  test('handles empty content gracefully', () => {
    const { container } = render(<UnifiedMarkdownRenderer content="" />)
    expect(container.firstChild).toBeInTheDocument()
  })

  test('handles null/undefined content', () => {
    const { container } = render(<UnifiedMarkdownRenderer content={null as any} />)
    expect(container.firstChild).toBeInTheDocument()
  })
})

describe('scrubMarkdown', () => {
  test('removes zero-width characters', () => {
    const input = 'Hello\u200bWorld\u200c!\u200d'
    const expected = 'HelloWorld!'
    expect(scrubMarkdown(input)).toBe(expected)
  })

  test('normalizes thin spaces', () => {
    const input = 'Thin\u2009space\u202fhere'
    const expected = 'Thin space here'
    expect(scrubMarkdown(input)).toBe(expected)
  })

  test('handles empty string', () => {
    expect(scrubMarkdown('')).toBe('')
  })

  test('handles null/undefined', () => {
    expect(scrubMarkdown(null as any)).toBe('')
    expect(scrubMarkdown(undefined as any)).toBe('')
  })

  test('preserves normal text', () => {
    const input = 'Normal text with $1,234.56 and 100%'
    expect(scrubMarkdown(input)).toBe(input)
  })
})