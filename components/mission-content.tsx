import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Shield, Heart, Lightbulb, Star, Home } from "lucide-react"

export function MissionContent() {
  const problemSteps = [
    {
      number: "1",
      title: "The Problem",
      description:
        "Managing money feels like surviving, not thriving. You're juggling confusing apps, complex dashboards, and content full of jargon that assumes prior knowledge.",
      color: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    },
    {
      number: "2",
      title: "Our Purpose",
      description: "TrueFi was born to shift the narrative, from isolation to empowerment, from confusion to clarity.",
      color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    },
    {
      number: "3",
      title: "Our Belief",
      description:
        "Everyone deserves a clear view of their finances, tools that actually help, and guidance without judgment or pressure.",
      color: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    },
  ]

  const founders = [
    {
      name: "Devin Patel",
      description:
        "A product thinker shaped by the world of artificial intelligence, he believed the most transformative technology should never feel complex or demanding. Instead, it should work quietly in the background, anticipating your needs, simplifying your life, and delivering real value without ever getting in your way.",
    },
    {
      name: "Keane Palmer",
      description:
        "Keane spent years advising high-net-worth individuals in traditional wealth management, where he witnessed a surprising truth. Even financially literate clients often felt overwhelmed. The systems were clunky, the tools were inaccessible, and the advice was buried in layers of complexity. What was meant to empower people instead left them feeling confused, frustrated, and underserved.",
    },
  ]

  const visionPoints = [
    {
      icon: Heart,
      title: "A True Companion",
      description:
        "We're building something deeper than an app. We're creating a companion for your financial journey that walks with you through every decision.",
    },
    {
      icon: Shield,
      title: "Real Support",
      description:
        "Penny helps you navigate debt without shame, save for meaningful goals, understand your cash flow, and plan life events with confidence.",
    },
    {
      icon: Users,
      title: "Human-Centered",
      description:
        "No complex dashboards or one-size-fits-all advice. Just smart, human-centered technology that meets you where you are and helps you move forward.",
    },
  ]

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="w-full py-20 px-4 bg-gradient-to-br from-green-50/30 via-cyan-50/40 to-blue-50/30 dark:from-green-900/10 dark:via-cyan-900/10 dark:to-blue-900/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 text-cyan-600 border-cyan-600">
              Our Mission
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Financial Empowerment for{" "}
              <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-green-500 bg-clip-text text-transparent">
                Everyone
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto mb-8 leading-relaxed">
              We believe financial empowerment should be clear, intuitive, and within reach for everyone, not just the
              wealthy, well-educated, or financially fluent. Our mission is to eliminate confusion, replace shame with
              confidence, and offer guidance that feels more like talking to a trusted friend than using a tool, powered
              by thoughtful and human-centered AI.
            </p>
          </div>
        </div>
      </section>

      {/* Why We Exist Section */}
      <section className="w-full py-16 px-4 bg-white dark:bg-gray-800">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Why We Exist: Because financial clarity shouldn't be a privilege
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {problemSteps.map((step, index) => (
              <Card key={index} className={`${step.color} border-2`}>
                <CardHeader>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center font-bold text-lg">
                      {step.number}
                    </div>
                    <CardTitle className="text-xl">{step.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How We Got Here Section */}
      <section className="w-full py-16 px-4 bg-gradient-to-br from-green-50/30 via-cyan-50/40 to-blue-50/30 dark:from-green-900/10 dark:via-cyan-900/10 dark:to-blue-900/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              How We Got Here: Two backgrounds. One vision. One breakthrough
            </h2>
          </div>
          <div className="max-w-4xl mx-auto space-y-8">
            {founders.map((founder, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-2xl text-cyan-600 dark:text-cyan-400 text-center">
                    {founder.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg text-center">
                    {founder.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* North Star Section */}
      <section className="w-full py-16 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-700 dark:to-blue-700">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Star className="w-16 h-16 text-cyan-200 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-6">Our North Star</h2>
            <p className="text-2xl text-cyan-100 max-w-4xl mx-auto mb-8 font-medium">
              What if financial guidance felt as natural as texting a friend who truly gets you?
            </p>
            <p className="text-lg text-cyan-200 max-w-3xl mx-auto">
              And so, Penny was born, an AI-powered planner designed to help you make better decisions, in real time,
              with less stress.
            </p>
          </div>
        </div>
      </section>

      {/* Where We're Headed Section */}
      <section className="w-full py-16 px-4 bg-white dark:bg-gray-800">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Where We're Headed: TrueFi is more than a tool. It's your financial co-pilot
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {visionPoints.map((point, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-cyan-100 dark:bg-cyan-900 rounded-lg flex items-center justify-center mb-4">
                    <point.icon className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <CardTitle className="text-xl">{point.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{point.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Personal Note Section */}
      <section className="w-full py-16 px-4 bg-gradient-to-br from-green-50 to-cyan-50 dark:from-green-900/20 dark:to-cyan-900/20">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="max-w-4xl mx-auto">
              <Card className="border-2 border-cyan-200 dark:border-cyan-800">
                <CardHeader>
                  <div className="text-center">
                    <Lightbulb className="w-12 h-12 text-cyan-600 dark:text-cyan-400 mx-auto mb-4" />
                    <CardTitle className="text-2xl text-cyan-600 dark:text-cyan-400">
                      A Note From Us: We built TrueFi because we needed it, too.
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Personal Mission</h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      This isn't just a company to us. We've been there, stressing about bills, avoiding financial apps,
                      wondering if we're "doing it right."
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Better Approach</h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      We created TrueFi not to sell you products, but to give you peace of mind, real clarity, and a
                      little more confidence each day.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Welcome Home Section */}
      <section className="w-full py-16 px-4 bg-white dark:bg-gray-800">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Home className="w-16 h-16 text-cyan-600 dark:text-cyan-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Welcome Home</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
              The future of personal finance should feel supportive, not overwhelming. It should empower you, not
              exclude you. At TrueFi, we're building a place where clarity comes first and every financial step forward
              feels confident, simple, and truly yours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700">
                Start Your Journey
              </Button>
              <Button size="lg" variant="outline">
                Join Our Mission
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
