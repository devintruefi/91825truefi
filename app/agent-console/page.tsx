"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { 
  Play, 
  Square, 
  RefreshCw, 
  Trash2, 
  Database, 
  Brain, 
  Zap, 
  Clock, 
  User, 
  MessageSquare,
  Activity,
  Code,
  BarChart3,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Terminal,
  Wifi,
  WifiOff
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface AgentLog {
  id: string
  agent_name: string
  user_id: string
  input_data: any
  output_data: any
  sql_queries: string[]
  api_calls: any[]
  error_message?: string
  execution_time_ms: number
  timestamp: number
}

interface AgentConfig {
  status: string
  health: string
  version: string
  total_executions: number
  agent_type: string
}

export default function AgentConsole() {
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [config, setConfig] = useState<AgentConfig | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AgentLog | null>(null)
  const [filter, setFilter] = useState<'all' | 'supervisor' | 'sql' | 'errors'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Check backend connectivity
  const checkBackendStatus = async () => {
    try {
      const response = await fetch('http://localhost:8080/health', { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      if (response.ok) {
        setBackendStatus('connected')
        setError(null)
      } else {
        setBackendStatus('disconnected')
        setError('Backend responded with error status')
      }
    } catch (err) {
      setBackendStatus('disconnected')
      setError('Cannot connect to backend at http://localhost:8080')
    }
  }

  // Fetch agent configuration
  const fetchAgentConfig = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/agents/status', {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
        setError(null)
      } else {
        setError(`Failed to fetch agent status: ${response.status}`)
      }
    } catch (error) {
      setError(`Failed to fetch agent status: ${error}`)
    }
  }

  // Fetch agent logs
  const fetchAgentLogs = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('http://localhost:8080/api/agents/logs', {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
        setLastRefresh(new Date())
        setError(null)
      } else {
        setError(`Failed to fetch agent logs: ${response.status}`)
      }
    } catch (error) {
      setError(`Failed to fetch agent logs: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Clear agent logs
  const clearLogs = async () => {
    try {
      setError(null)
      
      const response = await fetch('http://localhost:8080/api/agents/logs/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        setLogs([])
        setSelectedLog(null)
        setError(null)
      } else {
        setError(`Failed to clear logs: ${response.status}`)
      }
    } catch (error) {
      setError(`Failed to clear logs: ${error}`)
    }
  }

  // Start live monitoring
  const startLiveMonitoring = () => {
    setIsLive(true)
    fetchAgentLogs()
    
    // Poll every 3 seconds
    intervalRef.current = setInterval(() => {
      fetchAgentLogs()
    }, 3000)
  }

  // Stop live monitoring
  const stopLiveMonitoring = () => {
    setIsLive(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // Filter logs based on current filter and search
  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'supervisor' && log.agent_name.includes('Supervisor')) ||
                         (filter === 'sql' && log.agent_name.includes('SQL')) ||
                         (filter === 'errors' && log.error_message)
    
    const matchesSearch = !searchTerm || 
                         log.input_data?.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.agent_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  // Get status color for agent health
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-green-500'
      case 'degraded': return 'bg-yellow-500'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  // Get status icon for agent health
  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'degraded': return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString()
  }

  // Format execution time
  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  // Initialize on mount
  useEffect(() => {
    checkBackendStatus()
    fetchAgentConfig()
    fetchAgentLogs()
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Terminal className="w-8 h-8 text-blue-600" />
              Agent Console
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Hidden testing interface for TrueFi Agentic Framework monitoring
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <div className="flex items-center gap-2">
                <span>Backend:</span>
                <div className="flex items-center gap-1">
                  {backendStatus === 'connected' ? (
                    <Wifi className="w-4 h-4 text-green-600" />
                  ) : backendStatus === 'disconnected' ? (
                    <WifiOff className="w-4 h-4 text-red-600" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-blue-600 rounded-full animate-spin" />
                  )}
                  <span className={`capitalize ${
                    backendStatus === 'connected' ? 'text-green-600' : 
                    backendStatus === 'disconnected' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {backendStatus}
                  </span>
                </div>
              </div>
              
              {lastRefresh && (
                <div className="flex items-center gap-2">
                  <span>Last refresh:</span>
                  <span className="text-gray-500">{lastRefresh.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant={isLive ? "destructive" : "default"}
              onClick={isLive ? stopLiveMonitoring : startLiveMonitoring}
              className="flex items-center gap-2"
              disabled={backendStatus !== 'connected'}
            >
              {isLive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isLive ? 'Stop Live' : 'Start Live'}
            </Button>
            
            <Button
              variant="outline"
              onClick={fetchAgentLogs}
              disabled={isLoading || backendStatus !== 'connected'}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button
              variant="outline"
              onClick={clearLogs}
              disabled={backendStatus !== 'connected'}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Clear Logs
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Error:</span>
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agent Status Cards */}
        {config && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getHealthColor(config.health)}`} />
                  <span className="text-2xl font-bold capitalize">{config.status}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Executions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{config.total_executions}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Agent Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{config.agent_type}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Version
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{config.version}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Logs Panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Agent Execution Logs
                  <Badge variant="outline" className="ml-2">
                    {filteredLogs.length} logs
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Real-time monitoring of agent activities and decisions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex items-center gap-4 mb-4">
                  <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
                    <TabsList>
                      <TabsTrigger value="all">All ({logs.length})</TabsTrigger>
                      <TabsTrigger value="supervisor">
                        Supervisor ({logs.filter(l => l.agent_name.includes('Supervisor')).length})
                      </TabsTrigger>
                      <TabsTrigger value="sql">
                        SQL ({logs.filter(l => l.agent_name.includes('SQL')).length})
                      </TabsTrigger>
                      <TabsTrigger value="errors">
                        Errors ({logs.filter(l => l.error_message).length})
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  <Input
                    type="text"
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs"
                  />
                </div>

                {/* Logs List */}
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {filteredLogs.length === 0 ? (
                      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No logs found</p>
                        <p className="text-sm">Try refreshing or check if agents are running</p>
                      </div>
                    ) : (
                      <AnimatePresence>
                        {filteredLogs.map((log) => (
                          <motion.div
                            key={log.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                              selectedLog?.id === log.id 
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                : 'border-gray-200 dark:border-gray-700'
                            }`}
                            onClick={() => setSelectedLog(log)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {log.agent_name}
                                </Badge>
                                {log.error_message && (
                                  <Badge variant="destructive" className="text-xs">
                                    Error
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                {formatTimestamp(log.timestamp)}
                              </div>
                            </div>
                            
                            <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                              {log.input_data?.message || 'No input message'}
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                {formatExecutionTime(log.execution_time_ms)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Database className="w-3 h-3" />
                                {log.sql_queries?.length || 0} SQL queries
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {log.sql_queries?.length || 0} API calls
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Execution Details
                </CardTitle>
                <CardDescription>
                  Detailed view of selected agent execution
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedLog ? (
                  <div className="space-y-4">
                    {/* Basic Info */}
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Agent Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Agent:</span>
                          <Badge variant="outline">{selectedLog.agent_name}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">User ID:</span>
                          <span className="font-mono text-xs">{selectedLog.user_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Execution Time:</span>
                          <span className="font-mono text-xs">{formatExecutionTime(selectedLog.execution_time_ms)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Timestamp:</span>
                          <span className="font-mono text-xs">{formatTimestamp(selectedLog.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Input Data */}
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Input Data
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                        <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {JSON.stringify(selectedLog.input_data, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* SQL Queries */}
                    {selectedLog.sql_queries && selectedLog.sql_queries.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            SQL Queries ({selectedLog.sql_queries.length})
                          </h4>
                          <div className="space-y-2">
                            {selectedLog.sql_queries.map((query, index) => (
                              <div key={index} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-700">
                                <div className="text-xs text-blue-600 dark:text-blue-400 mb-1 font-medium">
                                  Query {index + 1}
                                </div>
                                <pre className="text-xs text-blue-800 dark:text-blue-200 whitespace-pre-wrap font-mono">
                                  {query}
                                </pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* API Calls */}
                    {selectedLog.api_calls && selectedLog.api_calls.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            API Calls ({selectedLog.api_calls.length})
                          </h4>
                          <div className="space-y-2">
                            {selectedLog.api_calls.map((call, index) => (
                              <div key={index} className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md border border-green-200 dark:border-green-700">
                                <div className="text-xs text-green-600 dark:text-green-400 mb-1 font-medium">
                                  API Call {index + 1}
                                </div>
                                <pre className="text-xs text-green-800 dark:text-green-200 whitespace-pre-wrap">
                                  {JSON.stringify(call, null, 2)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Error Information */}
                    {selectedLog.error_message && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold text-sm text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Error Details
                          </h4>
                          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-700">
                            <pre className="text-xs text-red-800 dark:text-red-200 whitespace-pre-wrap">
                              {selectedLog.error_message}
                            </pre>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Output Data */}
                    <Separator />
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Output Data
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                        <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {JSON.stringify(selectedLog.output_data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a log entry to view detailed execution information</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Agent Console - Development Testing Interface</p>
          <p className="mt-1">Access via: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/agent-console</code></p>
        </div>
      </div>
    </div>
  )
} 