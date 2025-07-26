"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  Target,
  TrendingUp,
  PieChart,
  Calendar,
  Bell,
  ArrowRight,
  Smartphone,
  Globe,
  Lock,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export function FeaturesSection() {
  return (
    <section className="py-16 sm:py-20 lg:py-32 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center space-y-6 mb-16">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
              Everything You Need to Master Your Finances
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              From intelligent budgeting to goal tracking, TrueFi.ai provides all the tools you need to take control of
              your financial future.
            </p>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* Smart Budgeting */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border-green-200 dark:border-green-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <PieChart className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">Smart Budgeting</h3>
              <p className="text-gray-600 dark:text-gray-300">
                AI-powered budgets that adapt to your spending patterns and automatically adjust to help you stay on
                track.
              </p>
            </CardContent>
          </Card>

          {/* Goal Tracking */}
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">Goal Tracking</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Set and track financial goals with intelligent recommendations on how to reach them faster.
              </p>
            </CardContent>
          </Card>

          {/* Investment Insights */}
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">Investment Insights</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Get personalized investment recommendations based on your risk tolerance and financial goals.
              </p>
            </CardContent>
          </Card>

          {/* Expense Analytics */}
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">Expense Analytics</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Deep insights into your spending patterns with actionable recommendations for optimization.
              </p>
            </CardContent>
          </Card>

          {/* Bill Management */}
          <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/10 dark:to-cyan-900/10 border-teal-200 dark:border-teal-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">Bill Management</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Never miss a payment with intelligent bill tracking and automated reminders.
              </p>
            </CardContent>
          </Card>

          {/* Smart Alerts */}
          <Card className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/10 dark:to-rose-900/10 border-pink-200 dark:border-pink-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">Smart Alerts</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Proactive notifications about unusual spending, upcoming bills, and optimization opportunities.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Platform showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-16">
          {/* Left side - Dashboard mockup */}
          <div className="relative">
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <Image
                src="/images/goal-tracking-dashboard.png"
                alt="TrueFi Dashboard showing goal tracking and financial insights"
                width={600}
                height={400}
                className="w-full h-auto"
              />
            </div>
            {/* Floating elements */}
            <div className="absolute -top-4 -left-4 w-20 h-20 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full opacity-20 blur-xl"></div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full opacity-10 blur-2xl"></div>
          </div>

          {/* Right side - Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                Beautiful Dashboard, Powerful Insights
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                See all your financial data in one place with our intuitive dashboard. Track progress toward your goals,
                monitor spending patterns, and get actionable insights to improve your financial health.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-900 dark:text-white font-medium">Real-time financial overview</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-900 dark:text-white font-medium">Visual goal progress tracking</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-gray-900 dark:text-white font-medium">Predictive spending analysis</span>
              </div>
            </div>

            <Button asChild size="lg" className="bg-cyan-600 hover:bg-cyan-700">
              <Link href="/dashboard" className="flex items-center gap-2">
                View Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Platform features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="text-center bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto">
                <Smartphone className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Mobile First</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Optimized for mobile with native apps for iOS and Android, plus a responsive web experience.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto">
                <Globe className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Bank Integration</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Connect with 10,000+ banks and financial institutions for automatic transaction syncing.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Bank-Level Security</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                256-bit encryption, multi-factor authentication, and SOC 2 compliance for maximum security.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
