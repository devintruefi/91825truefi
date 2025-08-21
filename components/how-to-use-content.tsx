import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  MessageCircle,
  BarChart3,
  Target,
  Settings,
  Shield,
  Lock,
  Eye,
  Brain,
  Rocket,
  Bot,
  Flag,
  PieChart,
  Calendar,
  Lightbulb,
  Zap,
  AlertTriangle,
} from "lucide-react"

export function HowToUseContent() {
  const pennyFeatures = [
    {
      title: "Talk Naturally",
      description: "Ask Penny financial questions in plain language.",
      icon: MessageCircle,
    },
    {
      title: "Personalized Insights",
      description: "Penny uses your financial data to give tailored advice.",
      icon: Brain,
    },
    {
      title: "Simple Explanations",
      description: "Complex topics are explained in easy terms.",
      icon: Lightbulb,
    },
  ]

  const gettingStartedSteps = [
    {
      number: "1",
      title: "Create Your Account",
      description: "Sign up with email and password.",
      icon: Settings,
    },
    {
      number: "2",
      title: "Connect Your Finances",
      description: "Use secure Plaid integration.",
      icon: Shield,
    },
    {
      number: "3",
      title: "Let TrueFi Analyze",
      description: "Categorizes transactions and builds your financial picture.",
      icon: BarChart3,
    },
  ]

  const securityFeatures = [
    "2FA, behavioral monitoring, and secure APIs",
    "AI-powered anomaly detection",
    "Segmented network zones",
    "Biometric behavior tracking",
    "Autonomous threat response",
  ]

  const dashboardFeatures = [
    {
      title: "Net Worth View",
      description: "See assets, debts, and trends",
      icon: PieChart,
    },
    {
      title: "Cash Flow View",
      description: "Track income and expenses",
      icon: BarChart3,
    },
    {
      title: "Spending Breakdown",
      description: "Visual category insights",
      icon: Target,
    },
    {
      title: "Goals & Scenarios",
      description: "Test financial plans",
      icon: Flag,
    },
  ]

  const monthlyReviewSteps = [
    "Check dashboard and savings rate",
    "Compare cash flow",
    "Analyze spending categories",
    'Ask Penny: "How did I do this month?"',
  ]

  const everydayDecisions = [
    {
      title: "Travel",
      description: "Can I afford a trip? Penny shows your budget.",
    },
    {
      title: "Career",
      description: "Compare job offers and benefits.",
    },
    {
      title: "Credit vs. Investing",
      description: "Penny helps you weigh options.",
    },
  ]

  const biggerGoals = [
    {
      title: "Home",
      description: "Down payment and mortgage planning",
      icon: "🏠",
    },
    {
      title: "Education",
      description: "College and continuing ed",
      icon: "🎓",
    },
    {
      title: "Debt",
      description: "Payoff strategies",
      icon: "💳",
    },
    {
      title: "Retirement",
      description: "Secure long-term future",
      icon: "🏖️",
    },
  ]

  const lifeChanges = [
    {
      title: "Income Loss",
      description: "How long will savings last?",
    },
    {
      title: "Emergencies",
      description: "What account to pull from?",
    },
    {
      title: "Relocation",
      description: "Budget shift preview",
    },
    {
      title: "Family Changes",
      description: "Understand the impact",
    },
  ]

  const keyTakeaways = [
    "Chat with Penny like a real person",
    "Review dashboard weekly",
    "Use scenario planning before decisions",
    "Keep financial accounts connected",
  ]

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="w-full py-16 sm:py-20 lg:py-24 px-4 bg-gradient-to-br from-green-50/30 via-cyan-50/40 to-blue-50/30 dark:from-green-900/10 dark:via-cyan-900/10 dark:to-blue-900/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Badge variant="outline" className="text-cyan-600 border-cyan-600 text-base px-4 py-2">
                How to Use TrueFi
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Your Personal Financial Guide,{" "}
              <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-green-500 bg-clip-text text-transparent">
                Powered by AI
              </span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto mb-8 leading-relaxed">
              Welcome to TrueFi.ai, where managing your money becomes simple, clear, and even enjoyable. Get
              personalized guidance, real-time insights, and the tools you need for confident financial planning.
            </p>
            <Link href="/auth">
              <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-3 text-lg">
                Get Started Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Introduction Section */}
      <section className="w-full py-12 sm:py-16 px-4 bg-white dark:bg-gray-800">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-8">
              <Rocket className="w-8 h-8 text-cyan-600 mr-4" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Introduction</h2>
            </div>
            <Card className="p-6 sm:p-8">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Welcome to TrueFi.ai!
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-base sm:text-lg leading-relaxed">
                TrueFi is your personal financial planning assistant powered by AI. Whether you're budgeting, repaying
                loans, or planning for the future, TrueFi is here to help simplify your money management. In this guide,
                you'll learn:
              </p>
              <div className="space-y-3">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">How to use Penny, your AI assistant</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">How to connect your financial accounts</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    How to use your dashboard for better decision-making
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Meet Penny Section */}
      <section className="w-full py-12 sm:py-16 px-4 bg-gradient-to-br from-green-50/30 via-cyan-50/40 to-blue-50/30 dark:from-green-900/10 dark:via-cyan-900/10 dark:to-blue-900/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <Bot className="w-8 h-8 text-cyan-600 mr-4" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                Meet Penny, Your AI Financial Assistant
              </h2>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {pennyFeatures.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow p-6">
                <CardHeader>
                  <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl font-bold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 text-base">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Getting Started Section */}
      <section className="w-full py-12 sm:py-16 px-4 bg-white dark:bg-gray-800">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-12">
            <Flag className="w-8 h-8 text-cyan-600 mr-4" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Getting Started and Connecting Your Accounts
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12">
            {gettingStartedSteps.map((step, index) => (
              <Card key={index} className="text-center p-6">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900 dark:to-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{step.number}</span>
                  </div>
                  <CardTitle className="text-lg sm:text-xl font-bold">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Security Notes */}
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 p-6 sm:p-8">
            <div className="flex items-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
              <h3 className="text-xl font-bold text-green-800 dark:text-green-400">Security Notes</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-700 dark:text-green-300">End-to-end encryption</span>
              </div>
              <div className="flex items-center">
                <Lock className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-700 dark:text-green-300">Disconnect anytime</span>
              </div>
              <div className="flex items-center">
                <Eye className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-700 dark:text-green-300">You stay in full control</span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Dual-Layer Security Section */}
      <section className="w-full py-12 sm:py-16 px-4 bg-gradient-to-br from-green-50/30 via-cyan-50/40 to-blue-50/30 dark:from-green-900/10 dark:via-cyan-900/10 dark:to-blue-900/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-8">
              <Shield className="w-8 h-8 text-cyan-600 mr-4" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                Dual-Layer Security
              </h2>
            </div>
            <Card className="p-6 sm:p-8 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
              <p className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
                TrueFi's security is built on <span className="text-cyan-600">aerospace-grade protection</span>.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {securityFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-cyan-600 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
              <blockquote className="text-center text-lg sm:text-xl italic text-gray-700 dark:text-gray-300 border-l-4 border-cyan-600 pl-6">
                TrueFi is more than an app. It's your partner for smarter, simpler money decisions.
              </blockquote>
            </Card>
          </div>
        </div>
      </section>

      {/* Dashboard Section */}
      <section className="w-full py-12 sm:py-16 px-4 bg-white dark:bg-gray-800">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-12">
            <BarChart3 className="w-8 h-8 text-cyan-600 mr-4" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Understanding the TrueFi Dashboard
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {dashboardFeatures.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow p-6">
                <CardHeader>
                  <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <CardTitle className="text-lg font-bold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Monthly Review Section */}
      <section className="w-full py-12 sm:py-16 px-4 bg-gradient-to-br from-green-50/30 via-cyan-50/40 to-blue-50/30 dark:from-green-900/10 dark:via-cyan-900/10 dark:to-blue-900/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-8">
              <Calendar className="w-8 h-8 text-cyan-600 mr-4" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                Monthly Financial Review
              </h2>
            </div>
            <Card className="p-6 sm:p-8">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Monthly Checklist</h3>
                  <div className="space-y-3">
                    {monthlyReviewSteps.map((step, index) => (
                      <div key={index} className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <CheckCircle className="w-6 h-6 text-cyan-600 mr-3" />
                    <h4 className="text-lg font-bold text-cyan-800 dark:text-cyan-400">Pro Tip</h4>
                  </div>
                  <p className="text-cyan-700 dark:text-cyan-300">
                    Build the habit of a monthly check-in to stay on track
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Everyday Decisions Section */}
      <section className="w-full py-12 sm:py-16 px-4 bg-white dark:bg-gray-800">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-12">
            <Lightbulb className="w-8 h-8 text-cyan-600 mr-4" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Making Smart Everyday Decisions
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {everydayDecisions.map((decision, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl font-bold text-cyan-600">{decision.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">{decision.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bigger Goals Section */}
      <section className="w-full py-12 sm:py-16 px-4 bg-gradient-to-br from-green-50/30 via-cyan-50/40 to-blue-50/30 dark:from-green-900/10 dark:via-cyan-900/10 dark:to-blue-900/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-12">
            <Target className="w-8 h-8 text-cyan-600 mr-4" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Planning for Bigger Goals
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {biggerGoals.map((goal, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="text-4xl mb-4">{goal.icon}</div>
                  <CardTitle className="text-lg font-bold">{goal.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">{goal.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Life Changes Section */}
      <section className="w-full py-12 sm:py-16 px-4 bg-white dark:bg-gray-800">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-8">
              <Zap className="w-8 h-8 text-cyan-600 mr-4" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                Handling Unexpected Life Changes
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              {lifeChanges.map((change, index) => (
                <Card key={index} className="p-6">
                  <CardHeader>
                    <div className="flex items-center">
                      <AlertTriangle className="w-6 h-6 text-orange-500 mr-3" />
                      <CardTitle className="text-lg font-bold">{change.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300">{change.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-6 sm:p-8 text-center">
              <p className="text-lg text-blue-800 dark:text-blue-300">
                Penny supports you with real-time scenarios for life's curveballs.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Key Takeaways Section */}
      <section className="w-full py-12 sm:py-16 px-4 bg-gradient-to-br from-green-50/30 via-cyan-50/40 to-blue-50/30 dark:from-green-900/10 dark:via-cyan-900/10 dark:to-blue-900/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-8">
              <CheckCircle className="w-8 h-8 text-cyan-600 mr-4" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                What to Remember & Do Next
              </h2>
            </div>
            <Card className="p-6 sm:p-8">
              <div className="grid sm:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  {keyTakeaways.map((takeaway, index) => (
                    <div key={index} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{takeaway}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg p-6 flex items-center justify-center">
                  <div className="text-center">
                    <Bot className="w-16 h-16 text-cyan-600 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">Ready to get started?</p>
                  </div>
                </div>
              </div>
              <blockquote className="text-center text-lg sm:text-xl italic text-gray-700 dark:text-gray-300 border-l-4 border-cyan-600 pl-6">
                TrueFi is more than an app. It's your partner for smarter, simpler money decisions.
              </blockquote>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-12 sm:py-16 px-4 bg-cyan-600 dark:bg-cyan-700">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Financial Life?
            </h2>
            <p className="text-cyan-100 mb-8 max-w-2xl mx-auto text-lg">
              Join thousands of users who have already discovered the power of AI-driven financial guidance with TrueFi.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth">
                <Button size="lg" variant="secondary" className="px-8 py-3 text-lg">
                  Start Chatting with Penny
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-cyan-600 px-8 py-3 text-lg bg-transparent"
                >
                  View Dashboard Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
