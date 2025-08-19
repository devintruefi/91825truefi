"use client"

import React, { useState, useRef, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUser } from '@/contexts/user-context'
import { useSearchParams } from 'next/navigation'
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { 
  ButtonSelection, 
  CheckboxGroup, 
  CardSelection, 
  SliderInput, 
  PieChartBuilder,
  QuickAdd
} from '@/components/chat/onboarding-components'
import { PlaidConnect } from '@/components/plaid-connect'
import { DashboardPreview } from '@/components/chat/dashboard-preview'
import { OnboardingProgress } from '@/components/chat/onboarding-progress'
import { AssetsInput } from '@/components/chat/assets-input'
import { LiabilitiesInput } from '@/components/chat/liabilities-input'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Mic, Paperclip, ThumbsUp, ThumbsDown, Copy, Download, Volume2, VolumeX, ChevronLeft, ChevronRight, Plus, MessageSquare, Clock, Trash2, ChevronUp, ChevronDown, Edit2, Check, X } from "lucide-react"
import { InlineMath, BlockMath } from "react-katex"
import "katex/dist/katex.min.css"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from 'next-themes'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface Message {
  id: string
  content: string
  sender: "user" | "penny"
  timestamp: Date
  feedback?: "positive" | "negative" | null
  component?: {
    type: 'buttons' | 'slider' | 'checkboxes' | 'cards' | 'plaid' | 'pieChart' | 'quickAdd'
    data: any
  }
}

interface ChatSession {
  id: string
  title: string
  timestamp: Date
  messageCount: number
  lastMessage: string
}

const quickSuggestions = [
  "📊 Show my budget analysis",
  "💼 Investment portfolio review", 
  "🎯 Savings goals progress",
  "💳 Recent spending insights",
  "💡 Financial recommendations",
  "📈 Market trends & insights"
]

// Enhanced markdown table renderer with theme-aware styling
function renderMarkdownTable(content: string, theme: string) {
  const lines = content.trim().split('\n')
  if (lines.length < 3) return null
  
  if (!lines[0].includes('|')) return null
  
  const headerLine = lines[0].trim()
  const headers = headerLine.split('|').map(h => h.trim()).filter(h => h)
  
  const separatorLine = lines[1].trim()
  if (!separatorLine.includes('-') && !separatorLine.includes(':')) return null
  
  const dataLines = lines.slice(2).filter(line => line.trim() && line.includes('|'))
  
  const rows = dataLines.map(line => {
    const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell)
    return cells
  })
  
  if (headers.length === 0 || rows.length === 0) return null
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`overflow-x-auto my-6 rounded-lg border ${theme === 'dark' ? 'border-gray-600' : 'border-black'} shadow-lg`}
    >
      <Table className="min-w-full">
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20">
            {headers.map((h, i) => (
              <TableHead key={i} className={`font-bold text-gray-900 dark:text-gray-100 px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-600' : 'border-black'}`}>
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              {row.map((cell, j) => (
                <TableCell key={j} className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  )
}

// Enhanced content preprocessing with emoji support and better formatting
function preprocessContent(content: string) {
  let out = content
    .replace(/```[a-zA-Z]*\n?|```/g, '')
    .replace(/<B>/gi, '<strong>').replace(/<\/B>/gi, '</strong>')
    .replace(/<I>/gi, '<em>').replace(/<\/I>/gi, '</em>')
    .replace(/<STRONG>/gi, '<strong>').replace(/<\/STRONG>/gi, '</strong>')
  
  // Add emoji support for common financial terms
  out = out.replace(/\b(budget|spending|expenses)\b/gi, '💰 $1')
  out = out.replace(/\b(invest|investment|portfolio)\b/gi, '📈 $1')
  out = out.replace(/\b(save|savings|goal)\b/gi, '🎯 $1')
  out = out.replace(/\b(credit|debit|card)\b/gi, '💳 $1')
  out = out.replace(/\b(income|salary|earnings)\b/gi, '💵 $1')
  
  return out
}

// Enhanced chart renderer with animations and better styling
function renderChartBlock(data: any, type: string, title: string, customColors?: string[], xLabel?: string, yLabel?: string) {
  if (!data || !Array.isArray(data) || data.length === 0) return null

  // Infer better axis labels if not provided
  const keys = Object.keys(data[0] || {})
  if (!xLabel && keys[0]) {
    let label = keys[0].replace(/_/g, ' ')
    if (["month", "date", "time"].includes(label.toLowerCase())) {
      label = label.charAt(0).toUpperCase() + label.slice(1)
    } else if (/year/i.test(label)) {
      label = "Year"
    } else {
      label = label.replace(/\b\w/g, l => l.toUpperCase())
    }
    xLabel = label
  }
  if (!yLabel && keys[1]) {
    let label = keys[1].replace(/_/g, ' ')
    if (/(dollar|amount|revenue|balance|income|expense|cost|price|value)/i.test(label)) {
      label = label.replace(/\b\w/g, l => l.toUpperCase()) + ' ($)'
    } else if (/(rate|percent|percentage)/i.test(label)) {
      label = label.replace(/\b\w/g, l => l.toUpperCase()) + ' (%)'
    } else {
      label = label.replace(/\b\w/g, l => l.toUpperCase())
    }
    yLabel = label
  }
  
  const chartData = data.map(item => ({
    x: item.x || item.name || item.category || item.month || item.period,
    ...Object.keys(item)
      .filter(k => k !== 'x' && k !== 'name' && k !== 'category' && k !== 'month' && k !== 'period')
      .reduce<Record<string, any>>((acc, k) => {
        acc[k] = item[k]
        return acc
      }, {})
  }))
  
  const defaultColors = ['#06b6d4', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899']
  const colors = customColors || defaultColors
  
  if (type === "line") {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="my-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg"
      >
        <div className="font-bold text-cyan-700 dark:text-cyan-300 mb-4 text-lg">{title}</div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="x" 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5, fill: '#6b7280', fontSize: 13 } : undefined}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 13 } : undefined}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            {Object.keys(chartData[0] || {}).filter(k => k !== "x").map((k, i) => (
              <Line 
                key={k} 
                type="monotone" 
                dataKey={k} 
                stroke={colors[i % colors.length]} 
                strokeWidth={3}
                dot={{ fill: colors[i % colors.length], strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8, stroke: colors[i % colors.length], strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    )
  }
  
  if (type === "bar") {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="my-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg"
      >
        <div className="font-bold text-cyan-700 dark:text-cyan-300 mb-4 text-lg">{title}</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="x" 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5, fill: '#6b7280', fontSize: 13 } : undefined}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 13 } : undefined}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            {Object.keys(chartData[0] || {}).filter(k => k !== "x").map((k, i) => (
              <Bar 
                key={k} 
                dataKey={k} 
                fill={colors[i % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    )
  }
  
  if (type === "pie") {
    const pieChartData = data.map(item => ({
      name: item.name || item.category || item.label || 'Unknown',
      value: item.value || item.amount || item.count || 0
    }))
    
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="my-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg"
      >
        <div className="font-bold text-cyan-700 dark:text-cyan-300 mb-4 text-lg">{title}</div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie 
              data={pieChartData} 
              dataKey="value" 
              nameKey="name" 
              cx="50%" 
              cy="50%" 
              outerRadius={100} 
              label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
            >
              {pieChartData.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </motion.div>
    )
  }
  
  return null
}

// Enhanced chart renderer with theme-aware color support
function renderChartBlockFromTag(tag: string, theme: string) {
  // Example tag: <chart type="line" title="Savings Growth Over Time" colors="['#0070f3','#10b981']">[{"x": "Jan", "y": 1000}, {"x": "Feb", "y": 1500}]</chart>
  const chartMatch = tag.match(/<chart([^>]*)>([\s\S]*?)<\/chart>/i)
  if (!chartMatch) return null
  const attrString = chartMatch[1]
  const dataString = chartMatch[2]
  const typeMatch = attrString.match(/type="([^"]+)"/)
  const titleMatch = attrString.match(/title="([^"]+)"/)
  const colorsMatch = attrString.match(/colors="([^"]+)"/)
  const type = typeMatch ? typeMatch[1] : 'line'
  const title = titleMatch ? titleMatch[1] : ''
  let colors: string[] = theme === 'dark' ? ['#10b981', '#0070f3', '#6b7280'] : ['#0070f3', '#10b981', '#6b7280']
  if (colorsMatch) {
    try {
      // Parse colors array from string
      colors = JSON.parse(colorsMatch[1].replace(/'/g, '"'))
    } catch {}
  }
  let data: any[] = []
  try {
    data = JSON.parse(dataString)
  } catch {}

  const xLabelMatch = attrString.match(/xLabel="([^"]+)"/);
  const yLabelMatch = attrString.match(/yLabel="([^"]+)"/);
  let xLabel = xLabelMatch ? xLabelMatch[1] : undefined;
  let yLabel = yLabelMatch ? yLabelMatch[1] : undefined;
  if (!xLabel || !yLabel) {
    const keys = data && data.length > 0 ? Object.keys(data[0]) : [];
    if (!xLabel && keys[0]) {
      let label = keys[0].replace(/_/g, ' ');
      if (["month", "date", "time"].includes(label.toLowerCase())) {
        label = label.charAt(0).toUpperCase() + label.slice(1);
      } else {
        label = label.replace(/\b\w/g, l => l.toUpperCase());
      }
      xLabel = label;
    }
    if (!yLabel && keys[1]) {
      let label = keys[1].replace(/_/g, ' ');
      if (/(dollar|amount|revenue|balance|income|expense|cost|price)/i.test(label)) {
        label = label.replace(/\b\w/g, l => l.toUpperCase()) + ' ($)';
      } else if (/(rate|percent|percentage)/i.test(label)) {
        label = label.replace(/\b\w/g, l => l.toUpperCase()) + ' (%)';
      } else {
        label = label.replace(/\b\w/g, l => l.toUpperCase());
      }
      yLabel = label;
    }
  }
  return renderChartBlock(data, type, title, colors, xLabel, yLabel);
}

// Enhanced message renderer with ReactMarkdown and custom components
function renderPennyMessage(content: string, theme: string) {
  // Ensure content is a string
  const contentStr = typeof content === 'string' ? content : String(content)

  // Parse <chart> tags first
  const chartTagRegex = /<chart[^>]*>[\s\S]*?<\/chart>/gi
  const chartTags = contentStr.match(chartTagRegex) || []

  let processedContent = contentStr
  const chartBlocks: React.ReactNode[] = []

  chartTags.forEach((tag, i) => {
    processedContent = processedContent.replace(tag, `[[CHART_BLOCK_${i}]]`)
    chartBlocks.push(renderChartBlockFromTag(tag, theme))
  })

  // Replace chart placeholders with unique HTML comments
  let finalContent = processedContent
  chartBlocks.forEach((block, i) => {
    // If a chart block is missing, insert a friendly fallback
    if (!block) {
      finalContent = finalContent.replace(`[[CHART_BLOCK_${i}]]`, `<!--CHART_BLOCK_${i}-->`)
    } else {
      finalContent = finalContent.replace(`[[CHART_BLOCK_${i}]]`, `<!--CHART_BLOCK_${i}-->`)
    }
  })

  // Split the content by chart block placeholders
  const parts = finalContent.split(/<!--CHART_BLOCK_(\d+)-->/g)

  // Render math with KaTeX using rehype-katex and remark-math
  return (
    <>
      {parts.map((part, idx) => {
        // If the part is a chart block index, render the corresponding chart
        if (/^\d+$/.test(part)) {
          const chartIdx = parseInt(part, 10)
          return (
            <div key={`chart-block-${chartIdx}`} className="chart-component">
              {chartBlocks[chartIdx] || (
                <div className="text-red-600 font-semibold">Sorry, I could not render this chart. Please try rephrasing your request or provide more details.</div>
              )}
            </div>
          )
        }
        // Otherwise, render the markdown content
        return (
          <ReactMarkdown
            key={`markdown-part-${idx}`}
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[[rehypeKatex, { output: 'html', strict: false }], rehypeRaw, rehypeSanitize]}
            components={{
              table: ({ node, ...props }) => (
                <table {...props} className="min-w-full border border-black dark:border-gray-600 rounded-lg overflow-hidden my-6 shadow-lg" />
              ),
              thead: (props) => <thead {...props} className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20" />,
              th: (props) => <th {...props} className="font-bold text-gray-900 dark:text-gray-100 px-4 py-3 border-b border-black dark:border-gray-600" />,
              tr: (props) => <tr {...props} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" />,
              td: (props) => <td {...props} className="px-4 py-3 border-b border-gray-200 dark:border-gray-700" />,
              ul: (props: React.HTMLAttributes<HTMLUListElement>) => {
                const { className = '', ...rest } = props;
                return <ul className={`list-disc pl-4 my-2 ${className}`} {...rest} />;
              },
              ol: (props: React.HTMLAttributes<HTMLOListElement>) => {
                const { className = '', ...rest } = props;
                return <ol className={`list-decimal pl-4 my-2 ${className}`} {...rest} />;
              },
              code: ({ node, className, children, ...props }) => {
                if (className?.includes('language-math')) {
                  let mathContent = '';
                  if (Array.isArray(children) && children[0]) {
                    mathContent = String(children[0]).replace(/\$\$/g, '');
                  } else if (children) {
                    mathContent = String(children).replace(/\$\$/g, '');
                  }
                  return <BlockMath math={mathContent} />;
                }
                return <code className={className} {...props}>{children}</code>;
              },
              p: (props) => <p {...props} className="my-4 leading-relaxed" />,
              h1: (props) => <h1 {...props} className="mt-8 mb-4 text-2xl font-bold" />,
              h2: (props) => <h2 {...props} className="mt-8 mb-4 text-xl font-bold" />,
              h3: (props) => <h3 {...props} className="mt-6 mb-3 text-lg font-semibold" />,
              h4: (props) => <h4 {...props} className="mt-6 mb-3 text-base font-semibold" />,
              h5: (props) => <h5 {...props} className="mt-4 mb-2 text-base font-semibold" />,
              h6: (props) => <h6 {...props} className="mt-4 mb-2 text-sm font-semibold" />,
              blockquote: (props) => <blockquote {...props} className="border-l-4 border-cyan-400 pl-4 italic my-6" />,
              hr: (props) => <hr {...props} className="my-8 border-gray-300 dark:border-gray-700" />,
            }}
          >
            {part}
          </ReactMarkdown>
        )
      })}
    </>
  )
}

// Enhanced inline text renderer
function renderInline(text: string): React.ReactNode {
  return <span dangerouslySetInnerHTML={{ __html: preprocessContent(text) }} />
}

// Use a counter for stable IDs instead of Date.now()
let messageIdCounter = 1000

function AppleChatInterfaceInner() {
  const { user } = useUser()
  const { theme } = useTheme()
  const searchParams = useSearchParams()
  const isOnboarding = searchParams.get('onboarding') === 'true'
  
  // Conditionally set initial messages based on authentication and onboarding
  const getInitialMessages = (): Message[] => {
    // Use a fixed timestamp to avoid hydration mismatch
    const fixedTimestamp = new Date('2024-01-01T12:00:00')
    
    if (user && isOnboarding) {
      // For onboarding users, show friendly welcome asking about their main goal
      return [{
        id: "1",
        content: `Hi ${user.first_name}! Welcome to TrueFi! 🌟\n\nI'm Penny, your AI financial assistant. I'm here to help you build a personalized financial plan that actually works for your life.\n\n🔒 **Your Privacy & Security:**\n• All your data is encrypted and secure\n• We never sell or share your personal information\n• You control what you share and when\n• Bank connections are read-only - I can't move your money\n\nLet's start building your financial future! What brought you to TrueFi today?`,
        sender: "penny",
        timestamp: fixedTimestamp,
        component: {
          type: 'buttons',
          data: {
            options: [
              { id: 'debt', label: 'Pay off debt', value: 'debt_payoff', icon: '🎯' },
              { id: 'emergency', label: 'Save for emergencies', value: 'emergency_fund', icon: '🛡️' },
              { id: 'home', label: 'Save for a home', value: 'home_purchase', icon: '🏠' },
              { id: 'retirement', label: 'Plan for retirement', value: 'retirement', icon: '🏖️' },
              { id: 'wealth', label: 'Build wealth & invest', value: 'investments', icon: '📈' },
              { id: 'other', label: 'Something else', value: 'other', icon: '💭' }
            ]
          }
        }
      }]
    } else if (user) {
      // For authenticated users, show a personalized welcome message
      return [{
        id: "1",
        content: `Hi ${user.first_name}! 👋 I'm Penny, your personalized financial advisor. I'm here to help you make smart financial decisions and achieve your goals. What would you like to discuss today? 💰✨`,
        sender: "penny",
        timestamp: fixedTimestamp,
      }]
    } else {
      // For unauthenticated users, show the Sample User demo message
      return [{
        id: "1",
        content: "Hi Sample User! 👋 I'm Penny, your personalized financial advisor. I'm here to help you make smart financial decisions and achieve your goals. What would you like to discuss today? 💰✨",
        sender: "penny",
        timestamp: fixedTimestamp,
      }]
    }
  }

  const [messages, setMessages] = useState<Message[]>(getInitialMessages())
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string>("")
  const [onboardingPhase, setOnboardingPhase] = useState<string>('welcome')
  const [onboardingProgress, setOnboardingProgress] = useState<Record<string, any>>({
    currentStep: isOnboarding ? 'MAIN_GOAL' : null,
    mode: 'standard', // quick, standard, or complete
    responses: {},
    completedSteps: [],
    dashboardReady: false
  })
  const [isOnboardingMode, setIsOnboardingMode] = useState(isOnboarding)
  
  // Add suggestions visibility state - initialize to true for SSR consistency
  const [suggestionsVisible, setSuggestionsVisible] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)
  
  // Load suggestions visibility preference after mount to avoid hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem('chat-suggestions-visible')
    if (saved !== null) {
      setSuggestionsVisible(JSON.parse(saved))
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" })
    }
  }, [messages])

  useEffect(() => {
    const chatContainer = document.getElementById('chat-scroll-container')
    if (chatContainer) {
      const scrollHeight = chatContainer.scrollHeight
      const clientHeight = chatContainer.clientHeight
      const maxScroll = scrollHeight - clientHeight
      
      if (chatContainer.scrollTop > maxScroll) {
        chatContainer.scrollTop = maxScroll
      }
    }
  }, [messages])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInputValue(transcript)
        setIsListening(false)
      }
      
      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }
    }
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px'
    }
  }, [inputValue])

  // --- Typewriter effect logic ---
  useEffect(() => {
    if (!isTyping || !streamingMessageId) return;
    // This effect is no longer needed as streaming is handled by setMessages
  }, [isTyping, streamingMessageId]);

  // --- Update streaming message with typewriter effect ---
  useEffect(() => {
    if (!isTyping || !streamingMessageId) return;
    // This effect is no longer needed as streaming is handled by setMessages
  }, [isTyping, streamingMessageId]);

  // Set initial onboarding mode from URL params - only run this when user first loads
  const [hasSetInitialOnboarding, setHasSetInitialOnboarding] = useState(false);
  
  useEffect(() => {
    if (user && !hasSetInitialOnboarding) {
      console.log('Setting initial onboarding mode from URL:', isOnboarding);
      setIsOnboardingMode(isOnboarding);
      if (isOnboarding && !onboardingProgress.currentStep) {
        console.log('Initializing onboarding progress with MAIN_GOAL step');
        setOnboardingProgress(prev => ({ ...prev, currentStep: 'MAIN_GOAL' }));
      }
      setHasSetInitialOnboarding(true);
    }
  }, [user, isOnboarding, hasSetInitialOnboarding]);

  // Update messages when user changes (login/logout)
  useEffect(() => {
    setMessages(getInitialMessages())
  }, [user]);

  // Load chat sessions for authenticated users
  useEffect(() => {
    if (user) {
      loadChatSessions()
    } else {
      setChatSessions([])
      setCurrentSessionId(null)
    }
  }, [user])

  // Load chat sessions from backend API
  const loadChatSessions = async () => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return
      
      const response = await fetch('/api/chat/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const sessions = await response.json()
        // Convert backend format to frontend format
        const formattedSessions = sessions.map((session: any) => ({
          id: session.id,
          title: session.title,
          timestamp: new Date(session.created_at),
          messageCount: session.message_count || 0,
          lastMessage: session.last_message || ''
        }))
        setChatSessions(formattedSessions)
      } else {
        // Fallback to localStorage if API fails
        const storedSessions = localStorage.getItem(`chat_sessions_${user.id}`)
        if (storedSessions) {
          const sessions = JSON.parse(storedSessions).map((session: any) => ({
            ...session,
            timestamp: new Date(session.timestamp)
          }))
          setChatSessions(sessions)
        }
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error)
      // Fallback to localStorage
      const storedSessions = localStorage.getItem(`chat_sessions_${user.id}`)
      if (storedSessions) {
        const sessions = JSON.parse(storedSessions).map((session: any) => ({
          ...session,
          timestamp: new Date(session.timestamp)
        }))
        setChatSessions(sessions)
      }
    }
  }

  // Save chat session to backend
  const saveChatSession = async (session: ChatSession) => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('auth_token')
      if (token) {
        // Save to backend
        const response = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title: session.title })
        })
        
        if (response.ok) {
          const savedSession = await response.json()
          const formattedSession = {
            id: savedSession.id,
            title: savedSession.title,
            timestamp: new Date(savedSession.created_at),
            messageCount: 0,
            lastMessage: ''
          }
          setChatSessions(prev => [...prev, formattedSession])
          return savedSession.id
        }
      }
      
      // Fallback to localStorage if backend fails
      const updatedSessions = [...chatSessions, session]
      setChatSessions(updatedSessions)
      localStorage.setItem(`chat_sessions_${user.id}`, JSON.stringify(updatedSessions))
      return session.id
    } catch (error) {
      console.error('Failed to save chat session:', error)
      // Fallback to localStorage
      const updatedSessions = [...chatSessions, session]
      setChatSessions(updatedSessions)
      localStorage.setItem(`chat_sessions_${user.id}`, JSON.stringify(updatedSessions))
      return session.id
    }
  }

  // Create new chat session
  const createNewChat = async () => {
    setMessages(getInitialMessages())
    setCurrentSessionId(null)
    setSessionId(null)
    setIsSidebarOpen(false)
    
    // Session will be created on first message
  }

  // Load chat session with actual messages from backend
  const loadChatSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId)
    setSessionId(sessionId)
    setIsSidebarOpen(false)
    
    if (!user) {
      setMessages(getInitialMessages())
      return
    }
    
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setMessages(getInitialMessages())
        return
      }
      
      // Load messages for this session
      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const messages = await response.json()
        if (messages && messages.length > 0) {
          // Convert backend messages to frontend format
          const formattedMessages = messages.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            sender: msg.message_type === 'user' ? 'user' : 'penny',
            timestamp: new Date(msg.created_at),
            feedback: null
          }))
          setMessages(formattedMessages)
        } else {
          // No messages in this session yet
          setMessages(getInitialMessages())
        }
      } else {
        const errorText = await response.text()
        console.error('Failed to load chat messages:', response.status, errorText)
        throw new Error('Failed to load chat messages')
      }
    } catch (error) {
      console.error('Failed to load chat session:', error)
      setMessages(getInitialMessages())
    }
  }

  // Start editing a session title
  const startEditingSession = (sessionId: string, currentTitle: string) => {
    setEditingSessionId(sessionId)
    setEditingTitle(currentTitle)
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingSessionId(null)
    setEditingTitle("")
  }

  // Save the edited title
  const saveSessionTitle = async (sessionId: string) => {
    if (!editingTitle.trim()) {
      cancelEditing()
      return
    }

    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: editingTitle.trim() })
      })

      if (response.ok) {
        // Update the local state
        setChatSessions(prev => prev.map(session => 
          session.id === sessionId 
            ? { ...session, title: editingTitle.trim() }
            : session
        ))
        cancelEditing()
      } else {
        console.error('Failed to update session title')
      }
    } catch (error) {
      console.error('Failed to update session title:', error)
    }
  }

  // Delete chat session from backend
  const deleteChatSession = async (sessionId: string) => {
    if (user) {
      try {
        const token = localStorage.getItem('auth_token')
        if (token) {
          await fetch(`/api/chat/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        }
      } catch (error) {
        console.error('Failed to delete chat session:', error)
      }
    }
    
    const updatedSessions = chatSessions.filter(session => session.id !== sessionId)
    setChatSessions(updatedSessions)
    
    if (currentSessionId === sessionId) {
      await createNewChat()
    }
    
    if (user) {
      localStorage.setItem(`chat_sessions_${user.id}`, JSON.stringify(updatedSessions))
    }
  }

  // Helper function to trigger Plaid auto-analysis
  const triggerAutoAnalysis = async (plaidData: any) => {
    if (!user) return
    
    const token = localStorage.getItem('auth_token')
    if (!token) return
    
    try {
      const response = await fetch('/api/onboarding/analyze-plaid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          publicToken: plaidData.publicToken,
          metadata: plaidData.metadata,
          accounts: plaidData.accounts
        })
      })
      
      if (response.ok) {
        const analysis = await response.json()
        // Store the detected data
        setOnboardingProgress(prev => ({
          ...prev,
          detectedIncome: analysis.monthlyIncome,
          detectedExpenses: analysis.expenses,
          detectedDebts: analysis.debts,
          accountsCount: analysis.accountsCount
        }))
      }
    } catch (error) {
      console.error('Failed to analyze Plaid data:', error)
    }
  }

  // Function to handle interactive component responses
  const handleComponentResponse = async (messageId: string, value: any, componentType: string) => {
    // ALWAYS ensure onboarding mode is active when handling component responses during onboarding
    if (onboardingProgress.currentStep && onboardingProgress.currentStep !== 'complete') {
      console.log('Component response during onboarding - ensuring onboarding mode is ON');
      setIsOnboardingMode(true);
    }
    
    // Import the comprehensive onboarding flow
    const { OnboardingManager } = await import('@/lib/onboarding/comprehensive-onboarding')
    const ONBOARDING_STEPS = {
      WELCOME: 'welcome',
      MAIN_GOAL: 'main_goal',
      LIFE_STAGE: 'life_stage',
      PLAID_CONNECTION: 'plaid_connection',
      AUTO_ANALYSIS: 'auto_analysis',
      INCOME_CONFIRMATION: 'income_confirmation',
      DETECTED_EXPENSES: 'detected_expenses',
      MANUAL_INCOME: 'manual_income',
      MANUAL_EXPENSES: 'manual_expenses',
      QUICK_ACCOUNTS: 'quick_accounts',
      RISK_TOLERANCE: 'risk_tolerance',
      GOALS_SELECTION: 'goals_selection',
      DASHBOARD_PREVIEW: 'dashboard_preview',
      COMPLETE: 'complete'
    }
    
    // Log every answer to user_onboarding_responses
    if (user && value !== 'skipped') {
      const token = localStorage.getItem('auth_token')
      if (token) {
        // Determine the question based on current step
        let question = onboardingProgress.currentStep || ONBOARDING_STEPS.MAIN_GOAL
        
        // Log to database
        await fetch('/api/onboarding/log-response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ question, answer: value })
        })
      }
    }
    
    // Update onboarding progress
    const updatedProgress = { ...onboardingProgress }
    const currentStep = onboardingProgress.currentStep || ONBOARDING_STEPS.MAIN_GOAL
    
    // Store the response based on component type and current step
    switch (componentType) {
      case 'buttons':
        // Store based on current step context
        if (currentStep === ONBOARDING_STEPS.MAIN_GOAL) {
          updatedProgress.mainGoal = value
        } else if (currentStep === ONBOARDING_STEPS.LIFE_STAGE) {
          updatedProgress.lifeStage = value
        } else if (currentStep === ONBOARDING_STEPS.INCOME_CONFIRMATION) {
          updatedProgress.incomeConfirmed = value === 'confirmed'
        } else {
          updatedProgress[`response_${currentStep}`] = value
        }
        break
        
      case 'cards':
        if (currentStep === ONBOARDING_STEPS.LIFE_STAGE) {
          updatedProgress.lifeStage = value
        } else {
          updatedProgress.selectedCard = value
        }
        break
        
      case 'slider':
        if (currentStep === ONBOARDING_STEPS.RISK_TOLERANCE) {
          updatedProgress.riskTolerance = value
        } else if (currentStep === ONBOARDING_STEPS.MANUAL_INCOME) {
          updatedProgress.monthlyIncome = value
        } else if (currentStep === ONBOARDING_STEPS.MANUAL_EXPENSES) {
          updatedProgress.monthlyExpenses = value
        }
        break
        
      case 'checkboxes':
        if (currentStep === ONBOARDING_STEPS.GOALS_SELECTION || currentStep === 'goals_selection') {
          updatedProgress.selectedGoals = value.selected || value
          // Save goals to database
          if (value.selected || value) {
            const goals = (value.selected || value).map((goalId: string) => {
              const goalInfo = component?.data?.options?.find((opt: any) => opt.id === goalId || opt.value === goalId)
              return {
                name: goalInfo?.label || goalId,
                description: goalInfo?.description || '',
                target_amount: 10000, // Default, will be calculated based on income later
                priority: goalInfo?.recommended ? 'high' : 'medium'
              }
            })
            
            try {
              const token = localStorage.getItem('auth_token')
              if (token) {
                fetch('/api/goals', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ goals })
                }).then(res => res.json())
                  .then(data => console.log('Goals saved:', data))
                  .catch(err => console.error('Error saving goals:', err))
              }
            } catch (error) {
              console.error('Error saving goals:', error)
            }
          }
        }
        break
        
      case 'plaid':
        if (value === 'skipped' || value === 'skip') {
          updatedProgress.plaidSkipped = true
        } else {
          updatedProgress.plaidConnection = value
          updatedProgress.hasConnectedAccounts = true
          // Trigger auto-analysis
          if (value.publicToken) {
            await triggerAutoAnalysis(value)
          }
        }
        break
        
      case 'pieChart':
        updatedProgress.expenseCategories = value
        break
        
      case 'quickAdd':
        updatedProgress.manualAccounts = value
        break
        
      case 'dashboardPreview':
        updatedProgress.dashboardViewed = true
        break
        
      case 'assetsInput':
        updatedProgress.manualAssets = value
        // Save assets to database
        if (value && Object.keys(value).length > 0) {
          try {
            const token = localStorage.getItem('auth_token')
            if (token) {
              fetch('/api/assets', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ assets: value })
              }).then(res => res.json())
                .then(data => console.log('Assets saved:', data))
                .catch(err => console.error('Error saving assets:', err))
            }
          } catch (error) {
            console.error('Error saving assets:', error)
          }
        }
        break
        
      case 'liabilitiesInput':
        updatedProgress.manualLiabilities = value
        // Save liabilities to database
        if (value && Object.keys(value).length > 0) {
          try {
            const token = localStorage.getItem('auth_token')
            if (token) {
              fetch('/api/liabilities', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ liabilities: value })
              }).then(res => res.json())
                .then(data => console.log('Liabilities saved:', data))
                .catch(err => console.error('Error saving liabilities:', err))
            }
          } catch (error) {
            console.error('Error saving liabilities:', error)
          }
        }
        break
    }
    
    // Determine next step using the comprehensive flow
    const nextStep = OnboardingManager.getNextStep(currentStep, value)
    if (nextStep) {
      // Mark current step as completed before moving to next
      const completedSteps = updatedProgress.completedSteps || []
      if (!completedSteps.includes(currentStep)) {
        completedSteps.push(currentStep)
      }
      updatedProgress.completedSteps = completedSteps
      updatedProgress.currentStep = nextStep
    }
    
    setOnboardingProgress(updatedProgress)
    
    // CRITICAL: Ensure onboarding mode stays active
    if (updatedProgress.currentStep && updatedProgress.currentStep !== 'complete') {
      console.log('Keeping onboarding mode ACTIVE after updating progress');
      setIsOnboardingMode(true);
    }
    
    // Send the response as a user message with natural language
    let userDisplayMessage = ''
    
    // Convert component responses to natural language
    if (componentType === 'buttons') {
      const buttonLabels: Record<string, string> = {
        // Main goals
        'debt_payoff': 'Pay off debt',
        'emergency_fund': 'Save for emergencies',
        'home_purchase': 'Save for a home',
        'retirement': 'Plan for retirement',
        'travel': 'Save for travel',
        'investments': 'Build wealth',
        'other': 'Something else',
        // Life stages
        'student': 'Student',
        'working_professional': 'Working Professional',
        'married_partnered': 'Married/Partnered',
        'parent': 'Parent',
        'retired': 'Retired',
        // Income confirmation
        'confirmed': 'Yes, that\'s right',
        'adjust': 'Let me adjust it',
        // Generic
        'skipped': 'Skip this for now'
      }
      userDisplayMessage = buttonLabels[value] || value
    } else if (componentType === 'cards') {
      // For card selections (life stage)
      const cardLabels: Record<string, string> = {
        'student': 'Student',
        'working_professional': 'Working Professional',
        'married_partnered': 'Married/Partnered',
        'parent': 'Parent',
        'retired': 'Retired'
      }
      userDisplayMessage = cardLabels[value] || value
    } else if (componentType === 'slider') {
      // Better formatting for different slider types
      if (currentStep === 'RISK_TOLERANCE') {
        const riskLevel = value <= 3 ? 'Conservative' : value <= 7 ? 'Moderate' : 'Aggressive';
        userDisplayMessage = `${riskLevel} (${value}/10)`
      } else if (currentStep === 'MANUAL_INCOME') {
        userDisplayMessage = `$${value.toLocaleString()}/month income`
      } else if (currentStep === 'MANUAL_EXPENSES') {
        userDisplayMessage = `$${value.toLocaleString()}/month expenses`
      } else {
        userDisplayMessage = `${value}`
      }
    } else if (componentType === 'plaid') {
      userDisplayMessage = value === 'skipped' || value === 'skip' ? 'I\'ll connect my accounts later' : 'Connected my bank accounts'
    } else if (componentType === 'checkboxes') {
      // Format selected goals nicely
      if (value.selected && value.selected.length > 0) {
        const goalLabels: Record<string, string> = {
          'emergency_fund': 'Emergency Fund',
          'debt_payoff': 'Pay Off Debt',
          'home_purchase': 'Buy a Home',
          'retirement': 'Retirement',
          'investments': 'Build Wealth',
          'travel': 'Travel Fund',
          'education': 'Education',
          'business': 'Start Business'
        }
        const formattedGoals = value.selected.map((g: string) => goalLabels[g] || g)
        userDisplayMessage = formattedGoals.join(', ')
      } else {
        userDisplayMessage = 'No goals selected'
      }
    } else if (componentType === 'quickAdd') {
      if (value === 'skipped' || value === 'skip') {
        userDisplayMessage = 'Skip manual account entry'
      } else if (typeof value === 'object') {
        // Show summary of accounts added
        const total = Object.values(value).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0)
        userDisplayMessage = `Added accounts (Total: $${total.toLocaleString()})`
      } else {
        userDisplayMessage = 'Added account information'
      }
    } else if (componentType === 'pieChart') {
      userDisplayMessage = 'Updated budget allocation'
    } else if (componentType === 'dashboardPreview') {
      userDisplayMessage = 'Viewed dashboard preview'
    } else {
      userDisplayMessage = typeof value === 'object' ? 'Made selection' : value
    }
    
    const userResponseMessage: Message = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: userDisplayMessage,
      sender: "user",
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userResponseMessage])
    
    // Ensure we're in onboarding mode if user has selected a main goal
    if (user && !isOnboardingMode && onboardingProgress.currentStep && onboardingProgress.currentStep !== 'complete') {
      console.log('Re-enabling onboarding mode - user is in progress');
      setIsOnboardingMode(true)
    }
    
    // Trigger Penny's next response
    const responseMessage = typeof value === 'object' ? JSON.stringify(value) : value
    console.log('=== SENDING COMPONENT RESPONSE ===');
    console.log('Component type:', componentType);
    console.log('Value:', value);
    console.log('Response message:', responseMessage);
    console.log('Current isOnboardingMode before send:', isOnboardingMode);
    console.log('Updated progress before send:', updatedProgress);
    
    // Force onboarding mode for the next request
    await handleSendMessage(`[Component Response: ${componentType}] ${responseMessage}`, true, updatedProgress)
  }

  // Function to render interactive components
  const renderInteractiveComponent = (component: any, messageId: string) => {
    const handleComplete = (value: any) => {
      handleComponentResponse(messageId, value, component.type)
    }
    
    const handleSkip = () => {
      handleComponentResponse(messageId, 'skipped', component.type)
    }
    
    switch (component.type) {
      case 'buttons':
        return (
          <ButtonSelection 
            data={component.data}
            onComplete={handleComplete}
            onSkip={handleSkip}
          />
        )
      case 'slider':
        return (
          <SliderInput
            data={component.data}
            onComplete={handleComplete}
            onSkip={handleSkip}
          />
        )
      case 'checkboxes':
        return (
          <CheckboxGroup
            data={component.data}
            onComplete={handleComplete}
            onSkip={handleSkip}
          />
        )
      case 'cards':
        return (
          <CardSelection
            data={component.data}
            onComplete={handleComplete}
            onSkip={handleSkip}
          />
        )
      case 'plaid':
        return (
          <div className="space-y-4">
            {/* Title and benefits */}
            {component.data && (
              <div className="space-y-3">
                {component.data.title && (
                  <h3 className="text-lg font-semibold text-center">
                    {component.data.title}
                  </h3>
                )}
                {component.data.subtitle && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    {component.data.subtitle}
                  </p>
                )}
                {component.data.benefits && (
                  <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
                    <div className="space-y-2">
                      {component.data.benefits.map((benefit: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}
            
            <PlaidConnect 
              onSuccess={(publicToken: string, metadata: any) => {
                handleComplete({ publicToken, metadata })
              }}
              onError={() => {
                handleSkip()
              }}
            />
            <Button variant="ghost" className="w-full" onClick={handleSkip}>
              I'll connect my accounts later
            </Button>
          </div>
        )
      case 'pieChart':
        return (
          <PieChartBuilder
            data={component.data}
            onComplete={handleComplete}
            onSkip={handleSkip}
          />
        )
      case 'quickAdd':
        return (
          <QuickAdd
            data={component.data}
            onComplete={handleComplete}
            onSkip={handleSkip}
          />
        )
      case 'dashboardPreview':
        return (
          <DashboardPreview
            data={component.data}
            onContinue={() => handleComplete('continue')}
            onViewDashboard={() => {
              handleComplete('view-dashboard')
              setTimeout(() => {
                window.location.href = '/dashboard'
              }, 1000)
            }}
          />
        )
      case 'assetsInput':
        return (
          <AssetsInput
            onSubmit={(assets) => handleComplete(assets)}
            onSkip={handleSkip}
          />
        )
      case 'liabilitiesInput':
        return (
          <LiabilitiesInput
            onSubmit={(liabilities) => handleComplete(liabilities)}
            onSkip={handleSkip}
          />
        )
      default:
        return null
    }
  }

  // Function to save onboarding data to database
  const saveOnboardingData = async (showPreview = false) => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return
      
      console.log('Saving onboarding data:', onboardingProgress)
      
      // Save comprehensive progress to all database tables
      const response = await fetch('/api/onboarding/save-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          progress: onboardingProgress,
          phase: showPreview ? 'preview' : onboardingPhase
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Onboarding data saved successfully', data)
        
        // If showing preview or complete, also generate dashboard
        if (data.dashboardReady) {
          const dashboardResponse = await fetch('/api/onboarding/generate-dashboard', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              userId: user.id,
              onboardingData: onboardingProgress
            })
          })
          
          if (dashboardResponse.ok) {
            console.log('Dashboard generated successfully')
          }
        }
        
        return data.dashboardReady
      }
    } catch (error) {
      console.error('Failed to save onboarding data:', error)
    }
    
    return false
  }

  const handleSendMessage = async (customMessage?: string, isAutomated?: boolean, forceProgress?: any) => {
    const userMessage = customMessage || inputValue.trim()
    if (!userMessage || isLoading) return
    
    // During onboarding, if it's not an automated component response, show a helpful message
    if (isOnboardingMode && !isAutomated && !customMessage?.includes('[Component Response:')) {
      // Add a gentle reminder message
      const reminderMessage: Message = {
        id: `penny_reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: "I see you're eager to share more! Let me guide you through these questions first - just click the options above to continue. Once we're done with the setup, we can chat about anything you'd like! 😊",
        sender: "penny",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, reminderMessage])
      setInputValue("")
      return // Don't send the message to the API
    }
    
    if (!isAutomated) {
      setInputValue("")
    }
    setIsLoading(true)
    setIsTyping(true)
    
    // Don't add the component response message to the chat - we already added a nice formatted one
    if (!userMessage.includes('[Component Response:')) {
      const newUserMessage: Message = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: userMessage,
        sender: "user",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, newUserMessage])
    }
    
    // Create streaming message with empty content
    const streamingId = `penny_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const streamingMessage: Message = {
      id: streamingId,
      content: "",
      sender: "penny",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, streamingMessage])
    setStreamingMessageId(streamingId)

    // Create chat session on first message for authenticated users
    let activeSessionId = currentSessionId || sessionId
    if (user && !activeSessionId) {
      try {
        const token = localStorage.getItem('auth_token')
        if (token) {
          const response = await fetch('/api/chat/sessions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              title: userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage 
            })
          })
          
          if (response.ok) {
            const newSession = await response.json()
            activeSessionId = newSession.id
            setCurrentSessionId(activeSessionId)
            setSessionId(activeSessionId)
            
            // Add to sessions list
            const formattedSession = {
              id: newSession.id,
              title: newSession.title,
              timestamp: new Date(newSession.created_at),
              messageCount: 1,
              lastMessage: userMessage
            }
            setChatSessions(prev => [...prev, formattedSession])
          }
        }
      } catch (error) {
        console.error('Failed to create chat session:', error)
      }
    } else if (user && activeSessionId) {
      // Update existing session in list
      setChatSessions(prev => prev.map(session => 
        session.id === activeSessionId 
          ? { ...session, lastMessage: userMessage, messageCount: session.messageCount + 1 }
          : session
      ))
    }
    
    // Save user message to backend if authenticated
    if (user && activeSessionId) {
      try {
        const token = localStorage.getItem('auth_token')
        if (token) {
          await fetch(`/api/chat/sessions/${activeSessionId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              session_id: activeSessionId,
              message_type: 'user',
              content: userMessage
            })
          })
        }
      } catch (error) {
        console.error('Failed to save user message:', error)
      }
    }
    
    try {
      // Limit conversation history to prevent context length errors
      // For onboarding, only keep last 10 messages; for regular chat, keep last 20
      const maxMessages = isOnboardingMode ? 10 : 20;
      const recentMessages = messages.slice(-maxMessages);
      const conversationHistory = recentMessages.map(msg => ({ 
        sender: msg.sender, 
        content: msg.content ? msg.content.substring(0, 500) : '' // Also limit content length
      }))
      
      // Prepare headers based on authentication
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'Accept': 'text/plain'
      }
      
      // Add authorization header if user is authenticated
      if (user) {
        const token = localStorage.getItem('auth_token')
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
      }
      
      // Add onboarding context if in onboarding mode
      const requestBody: any = { 
        message: userMessage, 
        conversationHistory,
        sessionId: activeSessionId || sessionId
      }
      
      // Use forced progress if provided (from component responses), otherwise use current state
      const progressToSend = forceProgress || onboardingProgress;
      const shouldBeOnboarding = isOnboardingMode || (progressToSend.currentStep && progressToSend.currentStep !== 'complete');
      
      if (shouldBeOnboarding) {
        requestBody.isOnboarding = true
        requestBody.onboardingPhase = onboardingPhase
        requestBody.onboardingProgress = progressToSend
        console.log('=== SENDING ONBOARDING REQUEST ===');
        console.log('isOnboardingMode:', isOnboardingMode);
        console.log('shouldBeOnboarding:', shouldBeOnboarding);
        console.log('onboardingProgress being sent:', progressToSend);
      } else {
        console.log('=== NOT SENDING AS ONBOARDING ===');
        console.log('isOnboardingMode:', isOnboardingMode);
        console.log('progressToSend:', progressToSend);
      }
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      
      let aiResponseContent = ""
      
      // Check if response supports streaming
      if (response.headers.get('content-type')?.includes('text/plain')) {
        // Handle streaming response (for unauthenticated users)
        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')
        let accumulatedContent = ""
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          accumulatedContent += chunk;
        }
        aiResponseContent = accumulatedContent
        // When done, update the streaming message with the full content
        setMessages(prev => prev.map(msg =>
              msg.id === streamingId 
                ? { ...msg, content: accumulatedContent }
                : msg
        ));
      } else {
        // Handle JSON response (for authenticated users)
        const data = await response.json()
        if (data.error) throw new Error(data.error)
        
        // Update session ID if provided
        if (data.session_id) {
          setSessionId(data.session_id)
          if (!activeSessionId) activeSessionId = data.session_id
        }
        
        // Handle onboarding-specific responses
        if (data.onboardingUpdate) {
          console.log('=== ONBOARDING UPDATE RECEIVED ===');
          console.log('data.onboardingUpdate:', data.onboardingUpdate);
          console.log('Current isOnboardingMode:', isOnboardingMode);
          
          setOnboardingPhase(data.onboardingUpdate.phase || onboardingPhase)
          setOnboardingProgress(data.onboardingUpdate.progress || onboardingProgress)
          
          // Keep onboarding mode active unless explicitly complete
          if (!data.onboardingUpdate.complete && !isOnboardingMode) {
            console.log('Keeping onboarding mode active');
            setIsOnboardingMode(true)
          }
          
          // Check if onboarding is complete
          if (data.onboardingUpdate.complete) {
            setIsOnboardingMode(false)
            localStorage.setItem('onboarding_complete', 'true')
            // Save all collected data to database
            await saveOnboardingData()
            // Redirect to dashboard after completion
            setTimeout(() => {
              window.location.href = '/dashboard'
            }, 3000)
          }
        }
        
        aiResponseContent = data.message || data.response
        
        // Add component to the message if present
        let messageComponent = undefined
        if (data.component) {
          console.log('=== COMPONENT RECEIVED ===');
          console.log('data.component:', data.component);
          messageComponent = data.component
        } else {
          console.log('=== NO COMPONENT IN RESPONSE ===');
          console.log('data keys:', Object.keys(data));
        }
        
        // Update the streaming message with full content and component
        setMessages((prev) => 
          prev.map(msg => 
            msg.id === streamingId 
              ? { ...msg, content: aiResponseContent, component: messageComponent }
              : msg
          )
        )
      }
      
      // Save AI response to backend if authenticated
      if (user && activeSessionId && aiResponseContent) {
        try {
          const token = localStorage.getItem('auth_token')
          if (token) {
            await fetch(`/api/chat/sessions/${activeSessionId}/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                session_id: activeSessionId,
                message_type: 'assistant',
                content: aiResponseContent
              })
            })
          }
        } catch (error) {
          console.error('Failed to save AI response:', error)
        }
      }
    } catch (error) {
      console.error('Error getting AI response:', error)
      // Update the streaming message with error
      setMessages((prev) => 
        prev.map(msg => 
          msg.id === streamingId 
            ? { ...msg, content: `I'm sorry, I'm having trouble connecting right now. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again in a moment, or feel free to ask me about your budget, investments, or any other financial topics! 💡` }
            : msg
        )
      )
    } finally {
      setIsTyping(false)
      setIsLoading(false)
      setStreamingMessageId(null)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleQuickSuggestion = (suggestion: string) => {
    setInputValue(suggestion)
    inputRef.current?.focus()
  }

  // Add toggle function for suggestions visibility
  const toggleSuggestions = () => {
    setSuggestionsVisible(prev => {
      const newValue = !prev;
      // Save preference to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('chat-suggestions-visible', JSON.stringify(newValue));
      }
      return newValue;
    });
  };

  const handleVoiceInput = () => {
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop()
        setIsListening(false)
      } else {
        recognitionRef.current.start()
        setIsListening(true)
      }
    }
  }

  const handleEndSession = async () => {
    if (!user || !sessionId) return
    
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          endSession: true,
          sessionId: sessionId
        }),
      })
      
      if (response.ok) {
        const analysis = await response.json()
        console.log('Session analysis:', analysis)
        
        // Add a summary message to the chat
        const summaryMessage: Message = {
          id: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: `📊 **Session Summary**\n\n${analysis.summary}\n\n**Key Insights:**\n${analysis.insights?.map((insight: any) => `• ${insight.title}: ${insight.description}`).join('\n') || 'No insights generated.'}`,
          sender: "penny",
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, summaryMessage])
      }
    } catch (error) {
      console.error('Error ending session:', error)
    }
  }

  const handleFeedback = (messageId: string, feedback: "positive" | "negative") => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, feedback } : msg
    ))
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const handleDownloadChat = () => {
    const chatText = messages.map(msg => 
      `${msg.sender === 'user' ? 'You' : 'Penny'}: ${msg.content}`
    ).join('\n\n')
    
    const blob = new Blob([chatText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'penny-chat.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Add these mobile-specific enhancements:
  const [chartHeight, setChartHeight] = useState(300);
  const [messageMaxWidth, setMessageMaxWidth] = useState('70%');

  // 2. Mobile keyboard handling
  useEffect(() => {
    const handleResize = () => {
      // Adjust layout when mobile keyboard appears
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      // Set mobile-specific values
      setChartHeight(window.innerWidth < 640 ? 200 : 300);
      setMessageMaxWidth(window.innerWidth < 640 ? '90%' : '70%');
    };
    
    handleResize(); // Initial call
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      {/* Chat History Sidebar - Only show for authenticated users */}
      {user && (
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-shrink-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-r border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="flex flex-col h-full">
                {/* Sidebar Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Chat History</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSidebarOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>

                {/* New Chat Button */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={createNewChat}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Chat
                  </Button>
                </div>

                {/* Chat Sessions List */}
                <div className="flex-1 overflow-y-auto">
                  {chatSessions.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No chat history yet</p>
                      <p className="text-xs mt-1">Start a conversation to see it here</p>
                    </div>
                  ) : (
                    <div className="p-2">
                      {chatSessions.map((session) => (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`group relative mb-2 rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                            currentSessionId === session.id
                              ? 'bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-700'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                          onClick={() => loadChatSession(session.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              {editingSessionId === session.id ? (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Input
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        saveSessionTitle(session.id)
                                      } else if (e.key === 'Escape') {
                                        cancelEditing()
                                      }
                                    }}
                                    className="h-6 text-sm"
                                    autoFocus
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => saveSessionTitle(session.id)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Check className="w-3 h-3 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={cancelEditing}
                                    className="h-6 w-6 p-0"
                                  >
                                    <X className="w-3 h-3 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 group">
                                  <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate flex-1">
                                    {session.title}
                                  </h3>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      startEditingSession(session.id, session.title)
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                {session.lastMessage || 'No messages yet'}
                              </p>
                              <div className="flex items-center mt-2 text-xs text-gray-400 dark:text-gray-500">
                                <Clock className="w-3 h-3 mr-1" />
                                {session.timestamp.toLocaleDateString()}
                                <span className="mx-2">•</span>
                                {session.messageCount} messages
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteChatSession(session.id)
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
      {/* Enhanced Chat Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0"
      >
        <div className="w-20 flex items-center">
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center justify-center flex-1">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src="/images/fin-logo.png" alt="Penny" className="object-contain" />
              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-bold">P</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white text-lg">Penny</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your Personal Financial Advisor</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 w-20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadChat}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Enhanced Chat Messages */}
      <div className="flex-1 overflow-y-auto pb-40" id="chat-scroll-container" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <div className="max-w-[1600px] mx-auto px-4 py-6">
          <AnimatePresence>
            <div className="space-y-6">
              {messages.map((message, index) => (
                <React.Fragment key={message.id}>
                  {/* Show thinking bubble right before the streaming message */}
                  {isTyping && streamingMessageId && message.id === streamingMessageId && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex justify-start`}
                    >
                      <div className="flex items-start space-x-3 max-w-[85%] sm:max-w-[70%]">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarImage src="/images/fin-logo.png" alt="Penny" className="object-contain" />
                          <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-bold">P</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl px-6 py-4 text-sm lg:text-base shadow-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-600 dark:text-gray-300">Penny is thinking</span>
                              <div className="flex space-x-1">
                                <motion.div 
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                                  className="w-2 h-2 bg-cyan-500 rounded-full"
                                />
                                <motion.div 
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                                  className="w-2 h-2 bg-cyan-500 rounded-full"
                                />
                                <motion.div 
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                                  className="w-2 h-2 bg-cyan-500 rounded-full"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.sender === "user" ? (
                    <div className="max-w-[85%] sm:max-w-[70%] w-full px-2 sm:px-0">
                      <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className="bg-blue-100 dark:bg-blue-900 text-gray-900 dark:text-gray-200 rounded-2xl px-6 py-4 text-sm lg:text-base shadow-lg"
                      >
                        <div className="prose prose-base dark:prose-invert max-w-none text-gray-900 dark:text-white">
                          {message.content}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 opacity-80">
                          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString('en-US', { hour: "2-digit", minute: "2-digit" }) : ''}
                        </p>
                      </motion.div>
                    </div>
                  ) : (
                    message.content ? (
                    <div className="flex items-start space-x-3 max-w-[85%] sm:max-w-[70%] w-full px-2 sm:px-0">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage src="/images/fin-logo.png" alt="Penny" className="object-contain" />
                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-bold">P</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <motion.div 
                          whileHover={{ scale: 1.01 }}
                          className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl px-6 py-4 text-sm lg:text-base shadow-lg border border-gray-200 dark:border-gray-700"
                        >
                          {/* Show onboarding progress if in onboarding mode */}
                          {isOnboardingMode && onboardingProgress.currentStep && (
                            <div className="mb-4">
                              <OnboardingProgress
                                currentStep={onboardingProgress.currentStep}
                                completedSteps={onboardingProgress.completedSteps || []}
                              />
                            </div>
                          )}
                              {message.id === streamingMessageId && isTyping
        ? renderPennyMessage(message.content || '', theme)
        : renderPennyMessage(message.content || '', theme)
      }
                              
                          {/* Render interactive component if present */}
                          {message.component && (
                            <div className="mt-4">
                              {renderInteractiveComponent(message.component, message.id)}
                            </div>
                          )}
                              
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {message.timestamp ? new Date(message.timestamp).toLocaleTimeString('en-US', { hour: "2-digit", minute: "2-digit" }) : ''}
                            </p>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyMessage(message.content || '')}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                  onClick={() => handleFeedback(message.id || '', "positive")}
                                className={`h-6 w-6 p-0 ${message.feedback === "positive" ? "text-green-500" : "text-gray-400 hover:text-green-500"}`}
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                  onClick={() => handleFeedback(message.id || '', "negative")}
                                className={`h-6 w-6 p-0 ${message.feedback === "negative" ? "text-red-500" : "text-gray-400 hover:text-red-500"}`}
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                    ) : null
                  )}
                </motion.div>
                </React.Fragment>
              ))}
            </div>
          </AnimatePresence>
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Fixed Input Area */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 p-2 sm:p-4"
      >
        <div className="max-w-[1600px] mx-auto">
          {/* Enhanced Quick Suggestions with Toggle - Hide during onboarding */}
          <AnimatePresence mode="wait">
            {!isOnboardingMode && suggestionsVisible ? (
              <motion.div
                key="expanded"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                {/* Suggestions Toggle Button */}
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                      Quick Suggestions
                    </span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSuggestions}
                    className="h-8 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    <motion.div
                      animate={{ rotate: suggestionsVisible ? 0 : 180 }}
                      transition={{ duration: 0.2 }}
                    >
                      {suggestionsVisible ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </motion.div>
                  </Button>
                </div>

                {/* Quick Suggestions Buttons */}
                <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-4">
                  {quickSuggestions.slice(0, 4).map((suggestion, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleQuickSuggestion(suggestion)}
                      className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 text-gray-700 dark:text-gray-300 rounded-full hover:from-cyan-100 hover:to-blue-100 dark:hover:from-cyan-800/30 dark:hover:to-blue-800/30 transition-all duration-200 border border-cyan-200 dark:border-cyan-700"
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                  {/* Show remaining suggestions on desktop only */}
                  {quickSuggestions.slice(4).map((suggestion, index) => (
                    <motion.button
                      key={index + 4}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (index + 4) * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleQuickSuggestion(suggestion)}
                      className="hidden sm:block px-4 py-2 text-sm bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 text-gray-700 dark:text-gray-300 rounded-full hover:from-cyan-100 hover:to-blue-100 dark:hover:from-cyan-800/30 dark:hover:to-blue-800/30 transition-all duration-200 border border-cyan-200 dark:border-cyan-700"
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                  
                  {/* End Session button for authenticated users */}
                  {user && sessionId && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleEndSession}
                      className="px-4 py-2 text-sm bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 text-orange-700 dark:text-orange-300 rounded-full hover:from-orange-100 hover:to-red-100 dark:hover:from-orange-800/30 dark:hover:to-red-800/30 transition-all duration-200 border border-orange-200 dark:border-orange-700"
                    >
                      📊 End Session & Analyze
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ) : !isOnboardingMode ? (
              // Minimal show suggestions button when hidden - not shown during onboarding
              <motion.div
                key="collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex justify-center mb-1"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSuggestions}
                  className="h-6 px-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                  <ChevronUp className="w-3 h-3" />
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
          
          {/* Onboarding Guidance */}
          {isOnboardingMode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
            >
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                ✨ Building Your Financial Profile
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Please answer using the buttons above to create your personalized experience
              </p>
            </motion.div>
          )}
          
          {/* Enhanced Input Field */}
          <div className="flex items-end space-x-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isOnboardingMode ? "Please use the buttons above to continue the setup... 👆" : "Ask Penny anything about your finances... 💬"}
                className={`pr-20 text-sm sm:text-base py-2 sm:py-4 rounded-xl border-2 focus:border-cyan-500 focus:ring-cyan-500/20 transition-all duration-200 resize-none min-h-[50px] sm:min-h-[60px] max-h-[200px] overflow-y-auto whitespace-pre-wrap ${isOnboardingMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading || isOnboardingMode}
                rows={1}
                style={{
                  minHeight: '50px',
                  maxHeight: '200px',
                  lineHeight: '1.5'
                }}
              />
              <div className="absolute right-2 sm:right-3 bottom-2 sm:bottom-3 flex items-center space-x-1 sm:space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => inputRef.current?.focus()}
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <Paperclip className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleVoiceInput}
                  className={`h-6 w-6 sm:h-8 sm:w-8 p-0 ${isListening ? 'text-red-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                  <Mic className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </div>
            </div>
            
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading || isOnboardingMode}
              className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-full transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Send className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>
          </div>
        </div>
      </motion.div>
      </div>
    </div>
  )
}

// Export wrapper component with Suspense boundary
export function AppleChatInterface() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading chat...</div>
      </div>
    }>
      <AppleChatInterfaceInner />
    </Suspense>
  )
}