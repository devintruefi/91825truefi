'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MessageList } from './MessageList'
import { type Message } from '@/lib/types'
import { extractRichResponse } from '@/lib/transformers'
import { useUser } from '@/contexts/user-context'

export function ChatShell() {
  const { user } = useUser()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hi ${user?.first_name || 'there'}! I'm Penny, your AI financial advisor. How can I help you today?`,
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    // Add user message and create placeholder for assistant
    const assistantId = `assistant-${Date.now()}`
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Get auth token if user is logged in
      const token = user ? localStorage.getItem('auth_token') : null

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          message: input.trim(),
          sessionId: localStorage.getItem('chat_session_id'),
        }),
      })

      const contentType = response.headers.get('content-type')

      if (contentType?.includes('application/json')) {
        // JSON response - parse and extract
        const data = await response.json()
        console.log('[ChatShell] JSON response:', data)

        const { markdown, metadata } = extractRichResponse(data)

        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantId
              ? { ...msg, content: markdown, metadata }
              : msg
          )
        )
      } else {
        // Assume text/plain streaming
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            accumulated += chunk

            // Update message with accumulated content (raw for now)
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantId
                  ? { ...msg, content: accumulated }
                  : msg
              )
            )
          }

          // After streaming completes, try to parse as JSON
          console.log('[ChatShell] Stream complete, attempting to parse:', accumulated.substring(0, 200))

          const { markdown, metadata } = extractRichResponse(accumulated)

          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantId
                ? { ...msg, content: markdown, metadata }
                : msg
            )
          )
        }
      }
    } catch (error) {
      console.error('[ChatShell] Error:', error)

      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantId
            ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Chat with Penny</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {user ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                <span>Anonymous</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-[48px] max-h-[200px] resize-none"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-[48px] w-[48px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}