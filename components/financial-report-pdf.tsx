"use client"

import React from 'react'
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image, Font } from '@react-pdf/renderer'

// Register fonts for better typography
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT0kLW-43aMEzIO6XUTLjad8.woff2' },
    { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyCAIT4kLW-43aMEzIO6XUTLjad8.woff2', fontWeight: 'bold' }
  ]
})

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#333333',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2px solid #10b981',
    paddingBottom: 20,
  },
  logo: {
    width: 120,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  date: {
    fontSize: 10,
    color: '#999999',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: '1px solid #e5e7eb',
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
    paddingVertical: 3,
  },
  alternateRow: {
    backgroundColor: '#f9fafb',
  },
  label: {
    flex: 1,
    fontSize: 10,
    color: '#666666',
  },
  value: {
    flex: 1,
    fontSize: 10,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  summaryBox: {
    backgroundColor: '#f0fdf4',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
    border: '1px solid #10b981',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#333333',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderBottom: '1px solid #e5e7eb',
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333333',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '0.5px solid #e5e7eb',
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
    color: '#666666',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1px solid #e5e7eb',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#999999',
    textAlign: 'center',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 15,
    right: 40,
    fontSize: 8,
    color: '#999999',
  },
  disclaimer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 5,
    border: '1px solid #f59e0b',
  },
  disclaimerText: {
    fontSize: 8,
    color: '#92400e',
  },
  netWorthHighlight: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: 12,
    borderRadius: 5,
    marginVertical: 10,
  },
  netWorthText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridItem: {
    flex: 1,
    marginHorizontal: 5,
  },
})

// Helper function to format currency
const formatCurrency = (amount: number | string | undefined | null) => {
  if (amount === undefined || amount === null) return '$0'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

// Helper function to format percentage
const formatPercent = (value: number | string | undefined) => {
  if (value === undefined || value === null) return '0%'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0%'
  return `${num.toFixed(1)}%`
}

// Helper function to format date
const formatDate = (date: string | Date | undefined) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

interface FinancialReportData {
  user: any
  accounts: any[]
  assets: any[]
  liabilities: any[]
  goals: any[]
  investments: any[]
  budgetCategories: any[]
  transactions?: any[]
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  totalBalance: number
  monthlyIncome?: number
  monthlyExpenses?: number
}

// PDF Document Component
const FinancialReportDocument: React.FC<{ data: FinancialReportData }> = ({ data }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>TrueFi</Text>
          <Text style={styles.subtitle}>Personal Financial Report</Text>
          <Text style={styles.date}>Generated on {currentDate}</Text>
          {data.user && (
            <Text style={styles.subtitle}>
              {data.user.first_name} {data.user.last_name}
            </Text>
          )}
        </View>

        {/* Executive Summary */}
        <View style={styles.summaryBox}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Net Worth</Text>
            <Text style={styles.summaryValue}>{formatCurrency(data.netWorth)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Assets</Text>
            <Text style={styles.summaryValue}>{formatCurrency(data.totalAssets)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Liabilities</Text>
            <Text style={styles.summaryValue}>{formatCurrency(data.totalLiabilities)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Liquid Assets</Text>
            <Text style={styles.summaryValue}>{formatCurrency(data.totalBalance)}</Text>
          </View>
        </View>

        {/* Accounts Section */}
        {data.accounts && data.accounts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Accounts</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Account Name</Text>
                <Text style={styles.tableHeaderCell}>Type</Text>
                <Text style={[styles.tableHeaderCell, { textAlign: 'right' }]}>Balance</Text>
              </View>
              {data.accounts.map((account, index) => (
                <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.alternateRow]}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{account.name || 'Account'}</Text>
                  <Text style={styles.tableCell}>{account.subtype || account.type || 'N/A'}</Text>
                  <Text style={[styles.tableCell, { textAlign: 'right', fontWeight: 'bold' }]}>
                    {formatCurrency(account.current_balance)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Assets Section */}
        {data.assets && data.assets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assets</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Asset Name</Text>
                <Text style={styles.tableHeaderCell}>Type</Text>
                <Text style={[styles.tableHeaderCell, { textAlign: 'right' }]}>Value</Text>
              </View>
              {data.assets.map((asset, index) => (
                <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.alternateRow]}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{asset.name}</Text>
                  <Text style={styles.tableCell}>{asset.asset_class || 'Other'}</Text>
                  <Text style={[styles.tableCell, { textAlign: 'right', fontWeight: 'bold' }]}>
                    {formatCurrency(asset.value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This report is confidential and for personal use only
          </Text>
        </View>
        <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} />
      </Page>

      {/* Page 2 - Liabilities and Goals */}
      <Page size="A4" style={styles.page}>
        {/* Liabilities Section */}
        {data.liabilities && data.liabilities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Liabilities</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Liability Name</Text>
                <Text style={styles.tableHeaderCell}>Type</Text>
                <Text style={styles.tableHeaderCell}>Interest Rate</Text>
                <Text style={[styles.tableHeaderCell, { textAlign: 'right' }]}>Balance</Text>
              </View>
              {data.liabilities.map((liability, index) => (
                <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.alternateRow]}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{liability.name}</Text>
                  <Text style={styles.tableCell}>{liability.liability_class || 'Other'}</Text>
                  <Text style={styles.tableCell}>{formatPercent(liability.interest_rate)}</Text>
                  <Text style={[styles.tableCell, { textAlign: 'right', fontWeight: 'bold' }]}>
                    {formatCurrency(liability.balance)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Financial Goals */}
        {data.goals && data.goals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financial Goals</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Goal</Text>
                <Text style={styles.tableHeaderCell}>Target Date</Text>
                <Text style={styles.tableHeaderCell}>Progress</Text>
                <Text style={[styles.tableHeaderCell, { textAlign: 'right' }]}>Target Amount</Text>
              </View>
              {data.goals.map((goal, index) => {
                const progress = goal.target_amount ? 
                  ((goal.current_amount || 0) / goal.target_amount * 100).toFixed(0) : 0
                return (
                  <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.alternateRow]}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{goal.name}</Text>
                    <Text style={styles.tableCell}>{formatDate(goal.target_date)}</Text>
                    <Text style={styles.tableCell}>{progress}%</Text>
                    <Text style={[styles.tableCell, { textAlign: 'right', fontWeight: 'bold' }]}>
                      {formatCurrency(goal.target_amount)}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Investments */}
        {data.investments && data.investments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Investment Portfolio</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Investment</Text>
                <Text style={styles.tableHeaderCell}>Type</Text>
                <Text style={styles.tableHeaderCell}>Quantity</Text>
                <Text style={[styles.tableHeaderCell, { textAlign: 'right' }]}>Current Value</Text>
              </View>
              {data.investments.map((investment, index) => {
                const currentValue = (investment.quantity || 0) * (investment.current_price || 0)
                return (
                  <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.alternateRow]}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>
                      {investment.name} {investment.symbol && `(${investment.symbol})`}
                    </Text>
                    <Text style={styles.tableCell}>{investment.type || 'N/A'}</Text>
                    <Text style={styles.tableCell}>{investment.quantity || 0}</Text>
                    <Text style={[styles.tableCell, { textAlign: 'right', fontWeight: 'bold' }]}>
                      {formatCurrency(currentValue)}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This report is confidential and for personal use only
          </Text>
        </View>
        <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} />
      </Page>

      {/* Page 3 - Budget and Analysis */}
      <Page size="A4" style={styles.page}>
        {/* Budget Categories */}
        {data.budgetCategories && data.budgetCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Budget</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Category</Text>
                <Text style={[styles.tableHeaderCell, { textAlign: 'right' }]}>Budget</Text>
                <Text style={[styles.tableHeaderCell, { textAlign: 'right' }]}>Spent</Text>
                <Text style={[styles.tableHeaderCell, { textAlign: 'right' }]}>Remaining</Text>
              </View>
              {data.budgetCategories.map((category, index) => {
                const spent = category.spent || 0
                const remaining = (category.amount || 0) - spent
                return (
                  <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.alternateRow]}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{category.name}</Text>
                    <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                      {formatCurrency(category.amount)}
                    </Text>
                    <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                      {formatCurrency(spent)}
                    </Text>
                    <Text style={[styles.tableCell, { 
                      textAlign: 'right', 
                      fontWeight: 'bold',
                      color: remaining >= 0 ? '#10b981' : '#ef4444'
                    }]}>
                      {formatCurrency(remaining)}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Financial Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Analysis</Text>
          
          <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
              <View style={[styles.summaryBox, { backgroundColor: '#f0f9ff', borderColor: '#3b82f6' }]}>
                <Text style={[styles.subsectionTitle, { textAlign: 'center' }]}>Debt-to-Income Ratio</Text>
                <Text style={[styles.summaryValue, { textAlign: 'center', color: '#3b82f6' }]}>
                  {data.monthlyIncome && data.totalLiabilities ? 
                    formatPercent((data.totalLiabilities / (data.monthlyIncome * 12)) * 100) : 'N/A'}
                </Text>
              </View>
            </View>
            
            <View style={styles.gridItem}>
              <View style={[styles.summaryBox, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
                <Text style={[styles.subsectionTitle, { textAlign: 'center' }]}>Savings Rate</Text>
                <Text style={[styles.summaryValue, { textAlign: 'center', color: '#f59e0b' }]}>
                  {data.monthlyIncome && data.monthlyExpenses ? 
                    formatPercent(((data.monthlyIncome - data.monthlyExpenses) / data.monthlyIncome) * 100) : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Emergency Fund Coverage</Text>
            <Text style={styles.value}>
              {data.monthlyExpenses && data.totalBalance ? 
                `${(data.totalBalance / data.monthlyExpenses).toFixed(1)} months` : 'N/A'}
            </Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Asset Allocation</Text>
            <Text style={styles.value}>
              {data.totalAssets > 0 ? 'Diversified' : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Disclaimer: This financial report is generated based on the information provided and is for 
            informational purposes only. It should not be considered as financial advice. Please consult 
            with a qualified financial advisor for personalized financial guidance.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated by TrueFi - Your Personal Finance Companion
          </Text>
        </View>
        <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} />
      </Page>
    </Document>
  )
}

// Export Button Component
interface FinancialReportPDFProps {
  data: FinancialReportData
  buttonClassName?: string
  buttonText?: React.ReactNode
}

export const FinancialReportPDF: React.FC<FinancialReportPDFProps> = ({ 
  data, 
  buttonClassName = "",
  buttonText = "Export Financial Report"
}) => {
  const fileName = `TrueFi_Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`

  return (
    <PDFDownloadLink
      document={<FinancialReportDocument data={data} />}
      fileName={fileName}
      className={buttonClassName}
      style={{ minWidth: '140px', display: 'inline-flex', justifyContent: 'center' }}
    >
      {({ blob, url, loading, error }) => buttonText}
    </PDFDownloadLink>
  )
}

export default FinancialReportPDF