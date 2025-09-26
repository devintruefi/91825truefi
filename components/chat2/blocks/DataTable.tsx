'use client'

import React from 'react'
import { type DataTable as DataTableType } from '@/lib/types'

interface DataTableProps {
  block: DataTableType
}

export function DataTable({ block }: DataTableProps) {
  const { headers, rows, formatting } = block.data

  // Helper to determine if a value is numeric
  const isNumeric = (value: any): boolean => {
    if (typeof value === 'number') return true
    if (typeof value === 'string') {
      return /^[\$\-]?[\d,]+\.?\d*%?$/.test(value)
    }
    return false
  }

  // Helper to get alignment for a column
  const getAlignment = (colIndex: number, value: any): string => {
    if (formatting?.align && formatting.align[colIndex]) {
      return `text-${formatting.align[colIndex]}`
    }
    return isNumeric(value) ? 'text-right' : 'text-left'
  }

  return (
    <div className="my-4">
      {block.title && (
        <h4 className="text-base font-semibold mb-2">{block.title}</h4>
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {headers.map((header, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                    getAlignment(i, rows[0]?.[i] || header)
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-4 py-3 text-sm ${
                      getAlignment(cellIndex, cell)
                    } ${
                      formatting?.highlight_column === cellIndex
                        ? 'font-semibold'
                        : ''
                    } ${
                      isNumeric(cell) ? 'tabular-nums' : ''
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}