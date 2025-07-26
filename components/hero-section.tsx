"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, MessageCircle, BarChart3, Shield, Sparkles } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative py-12 sm:py-16 lg:py-24 overflow-hidden">
      {/* Full-width background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-50/30 via-cyan-50/40 to-blue-50/30 dark:from-green-900/10 dark:via-cyan-900/10 dark:to-blue-900/10" />

      {/* Centered content container */}
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6 sm:space-y-8 max-w-4xl mx-auto">
            {/* Main headline */}
            <div className="space-y-4 sm:space-y-6">
              <h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-bold leading-normal pb-2"
                style={{ fontFamily: "Söhne, sans-serif" }}
              >
                <span className="inline-block">
                  <span className="text-emerald-500">Finally, Personal Finance is Easy</span>
                </span>
              </h1>

              <div className="px-4 sm:px-0">
                <p className="text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed font-bold">
                  <span className="typewriter-container">
                    <span className="typewriter-text">Guidance and Real Results Personalized to You</span>
                  </span>
                </p>
              </div>

              <style jsx>{`
                .typewriter-container {
                  display: inline-block;
                  position: relative;
                }
                
                .typewriter-text {
                  display: inline-block;
                  overflow: hidden;
                  white-space: nowrap;
                  width: 0;
                  animation: typewriter 4s steps(43, end) forwards;
                  background: linear-gradient(90deg, 
                    #10b981 0%,     /* Green start */
                    #059669 20%,    /* Darker green */
                    #0891b2 40%,    /* Cyan transition */
                    #2563eb 60%,    /* Blue */
                    #1e40af 80%,    /* Darker blue */
                    #1e3a8a 100%    /* Navy blue end */
                  );
                  background-size: 100% 100%;
                  background-clip: text;
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-position: 0% 0%;
                }
                
                @keyframes typewriter {
                  0% { 
                    width: 0;
                  }
                  100% { 
                    width: 100%;
                  }
                }
                
                @media (max-width: 768px) {
                  .typewriter-text {
                    animation: typewriter 3.5s steps(43, end) forwards;
                    font-size: 1.125rem;
                    line-height: 1.75rem;
                  }
                }
                
                @media (max-width: 480px) {
                  .typewriter-text {
                    animation: typewriter 3s steps(43, end) forwards;
                    font-size: 1rem;
                    line-height: 1.5rem;
                    white-space: normal;
                    width: auto;
                    animation: none;
                  }
                }
              `}</style>
            </div>

            {/* CTA button - centered and prominent */}
            <div className="flex justify-center px-4 sm:px-0">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white text-xl px-10 sm:px-12 py-6 sm:py-8 w-full sm:w-auto min-h-[60px] shadow-lg hover:shadow-xl transition-all duration-300 rounded-full"
              >
                <Link href="/get-started" className="flex items-center justify-center gap-3">
                  <Sparkles className="w-7 h-7" />
                  Get Started
                  <ArrowRight className="w-7 h-7" />
                </Link>
              </Button>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16 px-4 sm:px-0">
              <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-white/20 hover:shadow-lg transition-shadow">
                <CardContent className="p-4 sm:p-6 text-center space-y-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto">
                    <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <h3 className="font-bold text-base sm:text-lg">Intelligent Conversations</h3>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Chat naturally with Penny about your finances and get personalized advice in real-time.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-white/20 hover:shadow-lg transition-shadow">
                <CardContent className="p-4 sm:p-6 text-center space-y-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-base sm:text-lg">Complete Financial Picture</h3>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    See all your accounts, spending, and goals in one beautiful, easy to understand dashboard.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-white/20 hover:shadow-lg transition-shadow sm:col-span-2 md:col-span-1">
                <CardContent className="p-4 sm:p-6 text-center space-y-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                  </div>
                  <h3 className="font-bold text-base sm:text-lg">Aerospace-Grade Security</h3>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Your financial data is protected with the same security standards used in defense systems.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
