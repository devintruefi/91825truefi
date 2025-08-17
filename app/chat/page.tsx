"use client"

import { GlobalHeader } from "@/components/global-header"
import { AppleChatInterface } from "@/components/apple-chat-interface"

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <GlobalHeader />
      <AppleChatInterface />
    </div>
  )
}
