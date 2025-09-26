'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system'
  children: React.ReactNode
  className?: string
}

export function MessageBubble({ role, children, className }: MessageBubbleProps) {
  const isUser = role === 'user'
  const isSystem = role === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex w-full',
      isUser ? 'justify-end' : 'justify-start',
      className
    )}>
      <div className={cn(
        'max-w-[80%] rounded-2xl px-4 py-3',
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted'
      )}>
        {children}
      </div>
    </div>
  )
}