"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Shield, NetworkIcon as Firewall, Lock, Eye } from "lucide-react"

export function SecuritySection() {
  return (
    <section className="py-16 sm:py-20 lg:py-32 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-8 sm:space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
              Aerospace-Grade Security Meets <span className="truefi-gradient-text">Financial Innovation</span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Your financial data deserves the highest level of protection. That's why we've built TrueFi with the same
              security standards used in aerospace and defense systems.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-6 sm:p-8 space-y-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto">
                  <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  Military-Grade Encryption
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                  Your data is protected with the same encryption standards used by defense contractors and government
                  agencies.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-6 sm:p-8 space-y-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto">
                  <Firewall className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">AI Threat Detection</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                  Advanced AI algorithms continuously monitor for suspicious activity and potential security threats.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-6 sm:p-8 space-y-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Zero-Trust Architecture</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                  Every access request is verified and authenticated, ensuring no unauthorized access to your financial
                  data.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-6 sm:p-8 space-y-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mx-auto">
                  <Eye className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Behavioral Monitoring</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                  Sophisticated monitoring systems track user behavior patterns to detect and prevent unauthorized
                  access.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
