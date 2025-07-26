"use client"

import { useUser } from '@/contexts/user-context'
import { GlobalHeader } from "@/components/global-header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, BarChart3, User, MessageCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function WelcomePage() {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to signin
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      <GlobalHeader />
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-emerald-500 via-blue-500 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg animate-fade-in">
              Welcome back, {user.first_name}!
            </h1>
            <p className="text-2xl text-gray-700 dark:text-gray-200 font-medium animate-fade-in delay-100">
              Where would you like to begin today?
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 mt-12">
            {/* Dashboard Option */}
            <Card className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-0 shadow-xl rounded-3xl p-8 flex flex-col items-center hover:scale-105 transition-transform duration-300 animate-fade-in">
              <CardHeader className="flex flex-col items-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-emerald-400 flex items-center justify-center shadow-lg mb-2">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</CardTitle>
                <CardDescription className="text-base text-gray-600 dark:text-gray-300">
                  View your financial overview, accounts, and insights
                </CardDescription>
              </CardHeader>
              <CardContent className="w-full flex flex-col items-center mt-4">
                <Link href="/dashboard" className="w-full">
                  <Button size="lg" className="w-full text-lg py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 shadow-md">
                    Go to Dashboard
                    <ArrowRight className="ml-3 h-5 w-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Chat with Penny Option */}
            <Card className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-0 shadow-xl rounded-3xl p-8 flex flex-col items-center hover:scale-105 transition-transform duration-300 animate-fade-in delay-150">
              <CardHeader className="flex flex-col items-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-lg mb-2">
                  <MessageCircle className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">Chat with Penny</CardTitle>
                <CardDescription className="text-base text-gray-600 dark:text-gray-300">
                  Ask questions, get advice, and chat with your AI financial guide
                </CardDescription>
              </CardHeader>
              <CardContent className="w-full flex flex-col items-center mt-4">
                <Link href="/chat" className="w-full">
                  <Button size="lg" className="w-full text-lg py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-md">
                    Chat with Penny
                    <ArrowRight className="ml-3 h-5 w-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
} 