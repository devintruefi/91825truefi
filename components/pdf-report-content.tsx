"use client"

import React from 'react'
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

// Register fonts
try {
  if (typeof window !== 'undefined') {
    Font.register({
      family: 'Helvetica',
      fonts: [
        { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT0kLW-43aMEzIO6XUTLjad8.woff2' },
        { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyCAIT4kLW-43aMEzIO6XUTLjad8.woff2', fontWeight: 'bold' }
      ]
    })
  }
} catch (error) {
  console.log('Font registration skipped')
}

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
    color: '#333333',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: '1px solid #e5e5e5',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: '40%',
    fontSize: 10,
    color: '#666666',
  },
  value: {
    width: '60%',
    fontSize: 10,
    color: '#333333',
    fontWeight: 'bold',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderBottom: '1px solid #e5e5e5',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1px solid #f0f0f0',
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#333333',
  },
  summaryBox: {
    backgroundColor: '#f0fdf4',
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 10,
    color: '#333333',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999999',
  },
  chart: {
    marginTop: 10,
    marginBottom: 10,
  },
  chartBar: {
    flexDirection: 'row',
    marginBottom: 5,
    alignItems: 'center',
  },
  chartLabel: {
    width: 100,
    fontSize: 9,
    color: '#666666',
  },
  chartBarFill: {
    height: 15,
    backgroundColor: '#10b981',
    marginLeft: 10,
  },
  chartValue: {
    fontSize: 9,
    color: '#333333',
    marginLeft: 5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  gridItem: {
    flex: 1,
    marginHorizontal: 5,
  },
})

// Helper functions
const formatCurrency = (amount: number | string | undefined | null) => {
  if (amount === undefined || amount === null) return '$0'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

const formatPercent = (num: number | undefined) => {
  if (!num) return '0%'
  return `${num.toFixed(1)}%`
}

const formatDate = (date: Date | string | undefined) => {
  if (!date) return new Date().toLocaleDateString()
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Financial Report Document Component
export const FinancialReportDocument = ({ data }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>TrueFi Financial Report</Text>
        <Text style={styles.subtitle}>Comprehensive Financial Analysis</Text>
        <Text style={styles.date}>Generated on {formatDate(new Date())}</Text>
      </View>

      {/* Executive Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Net Worth:</Text>
          <Text style={styles.value}>{formatCurrency(data?.netWorth)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Monthly Income:</Text>
          <Text style={styles.value}>{formatCurrency(data?.monthlyIncome)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Monthly Expenses:</Text>
          <Text style={styles.value}>{formatCurrency(data?.monthlyExpenses)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Savings Rate:</Text>
          <Text style={styles.value}>{formatPercent(data?.savingsRate)}</Text>
        </View>
      </View>

      {/* Account Balances */}
      {data?.accounts && data.accounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Balances</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCellHeader}>Account</Text>
              <Text style={styles.tableCellHeader}>Type</Text>
              <Text style={styles.tableCellHeader}>Balance</Text>
            </View>
            {data.accounts.map((account: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{account.name}</Text>
                <Text style={styles.tableCell}>{account.type}</Text>
                <Text style={styles.tableCell}>{formatCurrency(account.balance)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Budget Breakdown */}
      {data?.budgetData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Budget</Text>
          <View style={styles.chart}>
            {Object.entries(data.budgetData).map(([category, amount]: [string, any]) => (
              <View key={category} style={styles.chartBar}>
                <Text style={styles.chartLabel}>{category}</Text>
                <View style={[styles.chartBarFill, { width: `${(amount / data.monthlyIncome) * 100}%` }]} />
                <Text style={styles.chartValue}>{formatCurrency(amount)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Financial Goals */}
      {data?.goals && data.goals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Goals</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCellHeader}>Goal</Text>
              <Text style={styles.tableCellHeader}>Target</Text>
              <Text style={styles.tableCellHeader}>Progress</Text>
            </View>
            {data.goals.map((goal: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{goal.name}</Text>
                <Text style={styles.tableCell}>{formatCurrency(goal.target)}</Text>
                <Text style={styles.tableCell}>{formatPercent(goal.progress)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Recommendations */}
      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Key Recommendations</Text>
        <Text style={styles.summaryText}>• Increase emergency fund to cover 6 months of expenses</Text>
        <Text style={styles.summaryText}>• Consider increasing 401(k) contribution by 2%</Text>
        <Text style={styles.summaryText}>• Review and optimize monthly subscriptions</Text>
        <Text style={styles.summaryText}>• Explore tax-advantaged investment options</Text>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        This report is confidential and intended solely for the use of the addressee. 
        Generated by TrueFi - Your AI Financial Assistant
      </Text>
    </Page>
  </Document>
)

// Export button component
const PDFReportContent = ({ data, buttonText = "Export Financial Report" }: any) => {
  const fileName = `TrueFi_Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`
  
  return (
    <PDFDownloadLink
      document={<FinancialReportDocument data={data} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading}>
          <FileText className="h-4 w-4 mr-2" />
          {loading ? 'Generating PDF...' : buttonText}
        </Button>
      )}
    </PDFDownloadLink>
  )
}

export default PDFReportContent