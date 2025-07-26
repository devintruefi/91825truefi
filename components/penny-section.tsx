"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Target, TrendingUp, Shield, Send, MessageCircle } from "lucide-react"

export function PennySection() {
  return (
    <section className="py-16 sm:py-20 lg:py-32 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left side - Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/20 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-cyan-600" />
                </div>
                <span className="text-cyan-600 font-semibold text-sm uppercase tracking-wide">AI Assistant</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                Meet Penny, Your Financial Assistant
              </h2>

              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                Penny is more than just a chatbot. She's your personal financial advisor, trained on thousands of
                financial conversations and deeply integrated with your data to provide personalized guidance.
              </p>
            </div>

            {/* Feature grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-6 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">Natural Conversations</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Chat with Penny just like you would with a human financial advisor. No complex forms or rigid
                    interfaces.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-6 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">Personalized Insights</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Get advice tailored to your specific financial situation, goals, and spending patterns.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-6 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">Real-Time Analysis</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Penny analyzes your spending in real-time and proactively suggests optimizations.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-6 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-orange-600" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">Privacy First</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Your conversations with Penny are private and secure, with enterprise-grade encryption.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right side - Chat Interface Mockup */}
          <div className="relative">
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Chat header */}
              <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center p-1">
                    <img src="/images/fin-logo-new.png" alt="Fin Logo" className="w-8 h-8 object-contain" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Penny</h3>
                    <p className="text-cyan-100 text-sm">Your Financial Assistant</p>
                  </div>
                </div>
              </div>

              {/* Chat messages */}
              <div className="p-6 space-y-4 h-80 overflow-y-auto">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="bg-blue-100 dark:bg-blue-900 text-black dark:text-white rounded-2xl rounded-br-md px-4 py-3 max-w-xs">
                    <p className="text-sm">Hi Penny! I'd love to see what insights you have about my spending.</p>
                    <p className="text-xs text-black/70 dark:text-white/70 mt-1">02:33 PM</p>
                  </div>
                </div>

                {/* Penny's response */}
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3 max-w-sm">
                    <p className="text-sm text-gray-900 dark:text-white">
                      Great! I noticed you've been spending about $450/month on dining out. That's 23% higher than
                      similar users in your income bracket. I can help you create a dining budget that still lets you
                      enjoy meals out while saving an extra $150/month. Would you like me to show you some strategies?
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">02:34 PM</p>
                  </div>
                </div>

                {/* User response */}
                <div className="flex justify-end">
                  <div className="bg-blue-100 dark:bg-blue-900 text-black dark:text-white rounded-2xl rounded-br-md px-4 py-3 max-w-xs">
                    <p className="text-sm">Yes, that sounds perfect! Show me the strategies.</p>
                    <p className="text-xs text-black/70 dark:text-white/70 mt-1">02:35 PM</p>
                  </div>
                </div>
              </div>

              {/* Chat input */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Type your message...</p>
                  </div>
                  <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center">
                    <Send className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-r from-green-400 to-cyan-500 rounded-full opacity-20 blur-xl"></div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-10 blur-2xl"></div>
          </div>
        </div>
      </div>
    </section>
  )
}
