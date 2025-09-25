import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PennyResponseRenderer } from '../penny-response-renderer'

describe('PennyResponseRenderer', () => {
  describe('Markdown Formatting', () => {
    it('should render bullet lists with proper spacing', () => {
      const content = `
### Your spending breakdown:
- Amazon: $15,000 (2 transactions)
- Target: $4,200 (3 transactions)
- Walmart: $3,500 (5 transactions)
`
      render(<PennyResponseRenderer content={content} />)

      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(3)
      expect(screen.getByText(/Amazon: \$15,000 \(2 transactions\)/)).toBeInTheDocument()
    })

    it('should render dollar amounts correctly without breaking', () => {
      const content = 'You spent $69,375 across 15 transactions'
      render(<PennyResponseRenderer content={content} />)

      expect(screen.getByText(/\$69,375 across 15 transactions/)).toBeInTheDocument()
      // Should NOT contain broken patterns
      expect(screen.queryByText(/69,\s*375/)).not.toBeInTheDocument()
    })

    it('should handle tables in ui_blocks with numeric alignment', () => {
      const metadata = {
        ui_blocks: [{
          type: 'table',
          title: 'Top Merchants',
          data: {
            headers: ['Merchant', 'Transactions', 'Total', 'Average'],
            rows: [
              ['Amazon', '5', '$2,500.00', '$500.00'],
              ['Target', '3', '$1,200.00', '$400.00']
            ]
          }
        }]
      }

      render(<PennyResponseRenderer content="Here's your spending:" metadata={metadata} />)

      // Check that table headers exist
      expect(screen.getByText('Merchant')).toBeInTheDocument()
      expect(screen.getByText('Total')).toBeInTheDocument()

      // Check that numeric columns would have right alignment (class check)
      const totalHeader = screen.getByText('Total')
      expect(totalHeader.closest('th')).toHaveClass('text-right', 'tabular-nums')
    })

    it('should strip zero-width characters', () => {
      const content = 'Test\u200bContent\u200c'
      render(<PennyResponseRenderer content={content} />)

      // The scrub function should remove zero-width chars
      const element = screen.getByText(/TestContent/)
      expect(element).toBeInTheDocument()
    })

    it('should not show spaced thousands like "4, 000"', () => {
      const content = 'Total amount: $4,000.00'
      render(<PennyResponseRenderer content={content} />)

      expect(screen.getByText(/\$4,000\.00/)).toBeInTheDocument()
      expect(screen.queryByText(/4,\s+000/)).not.toBeInTheDocument()
    })

    it('should apply prose classes for proper typography', () => {
      const content = 'Test content'
      const { container } = render(<PennyResponseRenderer content={content} />)

      const proseDiv = container.querySelector('.prose')
      expect(proseDiv).toBeInTheDocument()
      expect(proseDiv).toHaveClass('prose-base', 'tabular-nums', 'leading-relaxed')
    })
  })

  describe('UI Blocks', () => {
    it('should render KPI cards with formatted values', () => {
      const metadata = {
        ui_blocks: [{
          type: 'kpi_card',
          title: 'Net Worth',
          data: {
            value: 50000,
            formatted_value: '$50,000.00',
            subtitle: 'Total assets minus liabilities'
          }
        }]
      }

      render(<PennyResponseRenderer content="" metadata={metadata} />)

      expect(screen.getByText('Net Worth')).toBeInTheDocument()
      expect(screen.getByText('$50,000.00')).toBeInTheDocument()
      expect(screen.getByText('Total assets minus liabilities')).toBeInTheDocument()
    })

    it('should render text blocks with markdown support', () => {
      const metadata = {
        ui_blocks: [{
          type: 'text',
          data: {
            content: '**Important:** Your spending is $1,500 over budget'
          }
        }]
      }

      render(<PennyResponseRenderer content="" metadata={metadata} />)

      // Should render the strong tag from markdown
      const strongElement = screen.getByText(/Important:/)
      expect(strongElement.tagName).toBe('STRONG')
    })

    it('should render alerts with appropriate severity', () => {
      const metadata = {
        ui_blocks: [{
          type: 'alert',
          title: 'Spending Alert',
          data: {
            severity: 'warning',
            message: 'You are approaching your budget limit',
            details: 'Only $200 remaining'
          }
        }]
      }

      render(<PennyResponseRenderer content="" metadata={metadata} />)

      expect(screen.getByText('Spending Alert')).toBeInTheDocument()
      expect(screen.getByText('You are approaching your budget limit')).toBeInTheDocument()
      expect(screen.getByText('Only $200 remaining')).toBeInTheDocument()
    })
  })
})