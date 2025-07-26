"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, Mic, Paperclip, MoreVertical } from "lucide-react"
import Image from "next/image"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeKatex from 'rehype-katex'
import { BlockMath } from "react-katex"
import "katex/dist/katex.min.css"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts"

interface Message {
  id: string
  content: string
  sender: "user" | "penny"
  timestamp: Date
  type?: "text" | "suggestion" | "chart"
}

const initialMessages: Message[] = [
  {
    id: "1",
    content:
      "Hi Alex! I'm Penny, your AI financial advisor. I've been analyzing your financial profile and I'm here to help you make smarter money decisions. What would you like to discuss today?",
    sender: "penny",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: "2",
    content:
      "I noticed you've been spending quite a bit on dining out lately. Would you like me to help you create a budget plan that still allows for some fun while boosting your savings?",
    sender: "penny",
    timestamp: new Date(Date.now() - 4 * 60 * 1000),
    type: "suggestion",
  },
]

const quickSuggestions = [
  "Help me create a budget",
  "Review my spending habits",
  "Investment advice for beginners",
  "How to improve my credit score",
  "Emergency fund planning",
  "Retirement savings strategy",
]

// Helper to render chart blocks
function renderChartBlockFromTag(tag: string) {
  const chartMatch = tag.match(/<chart([^>]*)>([\s\S]*?)<\/chart>/i)
  if (!chartMatch) return null
  const attrString = chartMatch[1]
  const dataString = chartMatch[2]
  const typeMatch = attrString.match(/type="([^"]+)"/)
  const titleMatch = attrString.match(/title="([^"]+)"/)
  const colorsMatch = attrString.match(/colors="([^"]+)"/)
  const type = typeMatch ? typeMatch[1] : 'line'
  const title = titleMatch ? titleMatch[1] : ''
  let colors: string[] = ['#0070f3', '#10b981', '#6b7280']
  if (colorsMatch) {
    try {
      colors = JSON.parse(colorsMatch[1].replace(/'/g, '"'))
    } catch {}
  }
  let data: any[] = []
  try {
    data = JSON.parse(dataString)
  } catch {}
  // ... (render chart as in AppleChatInterface, or use a simple version)
  // For brevity, you can copy the chart rendering logic from AppleChatInterface
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    // Simulate Penny's response
    setTimeout(() => {
      const responses = [
        "That's a great question! Based on your financial profile, I'd recommend focusing on building your emergency fund first. You currently have about 2 months of expenses saved, and ideally, you'd want 3-6 months.",
        "I can see you're interested in investing! Given your risk tolerance and timeline, I'd suggest starting with a diversified index fund. Would you like me to explain the different options available to you?",
        "Looking at your spending patterns, I notice you could save about $200 per month by making some small adjustments. Would you like me to show you where these opportunities are?",
        "Your credit score has improved by 15 points since last month - great job! Here are a few more strategies to continue building your credit history.",
        "Based on your income and expenses, you're in a good position to start investing. Let me walk you through some beginner-friendly options that align with your goals.",
      ]

      const pennyMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responses[Math.floor(Math.random() * responses.length)],
        sender: "penny",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, pennyMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleQuickSuggestion = (suggestion: string) => {
    handleSendMessage(suggestion)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto px-1 sm:px-4">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="relative w-8 h-8 sm:w-10 sm:h-10">
            <Image src="/images/fin-logo.png" alt="TrueFi.ai Logo" fill className="object-contain" />
          </div>
          <div>
            <h2 className="font-semibold text-sm sm:text-base">Penny</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Your AI Financial Advisor</p>
          </div>
          <Badge variant="secondary" className="text-xs">
            Online
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-10 sm:h-10">
          <MoreVertical className="w-3 h-3 sm:w-4 sm:h-4" />
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
            {message.sender === "user" ? (
              // User message without avatar
              <div className="max-w-[85%] sm:max-w-[80%]">
                <div className="space-y-1 flex flex-col items-end">
                  <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2">
                    <p className="text-sm">{message.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
                </div>
              </div>
            ) : (
              // Penny message with avatar and markdown/math/table support
              <div className="flex space-x-1 sm:space-x-2 max-w-[85%] sm:max-w-[80%]">
                <Avatar className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0">
                  <AvatarImage src="/images/fin-logo.png" alt="Penny" className="object-contain" />
                  <AvatarFallback>P</AvatarFallback>
                </Avatar>
                <div className="space-y-1 flex flex-col items-start">
                  <div
                    className={`rounded-lg px-3 py-2 ${
                      message.type === "suggestion"
                        ? "bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800"
                        : "bg-muted"
                    }`}
                  >
                    {/* Process chart blocks within the content */}
                    {message.content.split(/<chart[\s\S]*?<\/chart>/gi).map((part, index) => {
                      const chartBlocks: any[] = []
                      let finalContent = part
                      const chartTagRegex = /<chart[\s\S]*?<\/chart>/gi
                      finalContent = finalContent.replace(chartTagRegex, (tag) => {
                        chartBlocks.push(renderChartBlockFromTag(tag))
                        return `<!--CHART_BLOCK_${chartBlocks.length - 1}-->`
                      })
                      const parts = finalContent.split(/<!--CHART_BLOCK_(\d+)-->/g)

                      return (
                    <ReactMarkdown
                          key={`markdown-part-${index}`}
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
                      }}
                    >
                          {parts.map((part, partIndex) => {
                            if (/^\d+$/.test(part)) {
                              const chartIdx = parseInt(part, 10)
                              return (
                                <div key={`chart-block-${chartIdx}`} className="chart-component">
                                  {chartBlocks[chartIdx] || (
                                    <div className="text-red-600 font-semibold">Sorry, I could not render this chart.</div>
                                  )}
                                </div>
                              )
                            }
                            return <ReactMarkdown key={`markdown-part-${partIndex}`} remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { output: 'html', strict: false }], rehypeRaw, rehypeSanitize]} components={{
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
                            }}>{part}</ReactMarkdown>
                          })}
                    </ReactMarkdown>
                      )
                    })}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex space-x-1 sm:space-x-2 max-w-[85%] sm:max-w-[80%]">
              <Avatar className="w-6 h-6 sm:w-8 sm:h-8">
                <AvatarImage src="/images/fin-logo.png" alt="Penny" className="object-contain" />
                <AvatarFallback>P</AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      <div className="p-2 sm:p-4 border-t bg-background/95">
        <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
          {quickSuggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleQuickSuggestion(suggestion)}
              className="text-xs px-2 py-1 sm:px-3 sm:py-2"
            >
              {suggestion}
            </Button>
          ))}
        </div>

        {/* Input Area */}
        <div className="flex space-x-1 sm:space-x-2">
          <Button variant="outline" size="icon" className="flex-shrink-0 bg-transparent w-8 h-8 sm:w-10 sm:h-10">
            <Paperclip className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask Penny about your finances..."
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(inputValue)
                }
              }}
              className="pr-16 sm:pr-20 text-sm"
            />
            <div className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 flex space-x-1">
              <Button variant="ghost" size="icon" className="w-6 h-6 sm:w-8 sm:h-8">
                <Mic className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
              <Button
                size="icon"
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim()}
                className="w-6 h-6 sm:w-8 sm:h-8"
              >
                <Send className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
