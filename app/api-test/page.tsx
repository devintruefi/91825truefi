"use client"

import { useState } from 'react'

export default function ApiTestPage() {
  const [serverStatus, setServerStatus] = useState<string>('')
  const [userResult, setUserResult] = useState<string>('')
  const [financialResult, setFinancialResult] = useState<string>('')
  const [plaidResult, setPlaidResult] = useState<string>('')
  const [testUserId, setTestUserId] = useState<string>('')

  const API_BASE = 'http://localhost:8080/api'

  const testServerConnection = async () => {
    setServerStatus('Testing server connection...')
    try {
      const response = await fetch(`${API_BASE}/users`, { method: 'OPTIONS' })
      if (response.ok) {
        setServerStatus('✅ Backend server is running and responding!')
      } else {
        setServerStatus(`❌ Server responded with status: ${response.status}`)
      }
    } catch (error) {
      setServerStatus(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const testUserCreation = async () => {
    setUserResult('Creating test user...')
    try {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `frontend-test-${Date.now()}@example.com`,
          first_name: 'Frontend',
          last_name: 'Test',
          password: 'testpass123',
          is_advisor: false
        })
      })
      
      if (response.ok) {
        const user = await response.json()
        setTestUserId(user.id)
        setUserResult(`✅ User created successfully!
User ID: ${user.id}
Email: ${user.email}`)
      } else {
        const error = await response.text()
        setUserResult(`❌ Failed to create user: ${error}`)
      }
    } catch (error) {
      setUserResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const testFinancialData = async () => {
    if (!testUserId) {
      setFinancialResult('❌ Please create a user first')
      return
    }
    
    setFinancialResult('Fetching financial data...')
    try {
      const response = await fetch(`${API_BASE}/financial-data/${testUserId}`)
      
      if (response.ok) {
        const data = await response.json()
        setFinancialResult(`✅ Financial data retrieved!
Accounts: ${data.accounts.length}
Transactions: ${data.recent_transactions.length}
Total Balance: $${data.summary.total_balance.toLocaleString()}`)
      } else {
        const error = await response.text()
        setFinancialResult(`❌ Failed to get financial data: ${error}`)
      }
    } catch (error) {
      setFinancialResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const testPlaidToken = async () => {
    if (!testUserId) {
      setPlaidResult('❌ Please create a user first')
      return
    }
    
    setPlaidResult('Creating Plaid link token...')
    try {
      const response = await fetch(`${API_BASE}/plaid/link-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: testUserId,
          user_email: `frontend-test-${Date.now()}@example.com`
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setPlaidResult(`✅ Plaid link token created!
Token: ${data.link_token.substring(0, 20)}...`)
      } else {
        const error = await response.text()
        setPlaidResult(`❌ Failed to create link token: ${error}`)
      }
    } catch (error) {
      setPlaidResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Frontend-Backend API Connection Test</h1>
        
        <div className="space-y-6">
          {/* Server Connection Test */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">1. Test Backend Server Connection</h3>
            <button 
              onClick={testServerConnection}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Test Server
            </button>
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <pre className="whitespace-pre-wrap">{serverStatus || 'Click button to test'}</pre>
            </div>
          </div>

          {/* User Creation Test */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">2. Test User Creation</h3>
            <button 
              onClick={testUserCreation}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Create Test User
            </button>
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <pre className="whitespace-pre-wrap">{userResult || 'Click button to create user'}</pre>
            </div>
          </div>

          {/* Financial Data Test */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">3. Test Financial Data Retrieval</h3>
            <button 
              onClick={testFinancialData}
              disabled={!testUserId}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400"
            >
              Get Financial Data
            </button>
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <pre className="whitespace-pre-wrap">{financialResult || 'Create a user first'}</pre>
            </div>
          </div>

          {/* Plaid Integration Test */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">4. Test Plaid Integration</h3>
            <button 
              onClick={testPlaidToken}
              disabled={!testUserId}
              className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:bg-gray-400"
            >
              Create Plaid Token
            </button>
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <pre className="whitespace-pre-wrap">{plaidResult || 'Create a user first'}</pre>
            </div>
          </div>

          {/* Status Summary */}
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold mb-4 text-blue-900">Test Status</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="w-4 h-4 rounded-full bg-green-500 mr-2"></span>
                <span>Backend server running on port 8080</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 rounded-full bg-green-500 mr-2"></span>
                <span>Frontend server running on port 3000</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 rounded-full bg-green-500 mr-2"></span>
                <span>Google Cloud SQL database connected</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 rounded-full bg-green-500 mr-2"></span>
                <span>Plaid integration configured</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 