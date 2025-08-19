"use client"

import React from 'react'
import dynamic from 'next/dynamic'

// Dynamically import the entire PDF functionality to avoid SSR issues
const PDFReportContent = dynamic(
  () => import('./pdf-report-content'),
  { 
    ssr: false,
    loading: () => <div className="p-4">Loading PDF generator...</div>
  }
)

// Props interface
interface FinancialReportPDFProps {
  data: {
    netWorth?: number
    monthlyIncome?: number
    monthlyExpenses?: number
    savingsRate?: number
    accounts?: any[]
    budgetData?: Record<string, number>
    goals?: any[]
  }
  buttonText?: React.ReactNode
}

// Main export component
export const FinancialReportPDF: React.FC<FinancialReportPDFProps> = ({ 
  data,
  buttonText = "Export Financial Report"
}) => {
  return <PDFReportContent data={data} buttonText={buttonText} />
}

export default FinancialReportPDF