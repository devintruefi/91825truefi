'use client'

import React from 'react'
import { type Message } from '@/lib/types'
import { MessageBubble } from './MessageBubble'
import { UnifiedMarkdown } from './UnifiedMarkdown'
import { UiBlockRenderer } from './UiBlockRenderer'

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="space-y-6 p-4">
      {messages.map((message) => (
        <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {message.role === 'user' ? (
            <MessageBubble role="user">
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </MessageBubble>
          ) : message.role === 'assistant' ? (
            <div className="space-y-4">
              <MessageBubble role="assistant">
                <UnifiedMarkdown content={message.content} />
              </MessageBubble>
              {message.metadata?.ui_blocks && (
                <UiBlockRenderer blocks={message.metadata.ui_blocks} />
              )}
            </div>
          ) : (
            <MessageBubble role="system">
              <p className="text-sm">{message.content}</p>
            </MessageBubble>
          )}
        </div>
      ))}
    </div>
  )
}