import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, Lightbulb, Users, Target, Zap, CheckCircle, Waves } from "lucide-react"
import Image from "next/image"

export function AboutUsContent() {
  const founders = [
    {
      name: "Devin Patel",
      role: "Co-Founder",
      bio: "Brought deep experience from the world of AI and product design. He spent years creating intelligent systems that work quietly in the background, making everyday life better without adding unnecessary complexity.",
      expertise: "AI & Product Design",
      image: "/images/devin-patel.png",
    },
    {
      name: "Keane Palmer",
      role: "Co-Founder",
      bio: "Comes from the world of traditional wealth management, where he advised clients at Raymond James. He worked closely with individuals who had both resources and financial education, yet still felt overwhelmed by outdated tools.",
      expertise: "Wealth Management",
      image: "/images/keane-palmer.png",
    },
  ]

  const beliefs = [
    {
      icon: Heart,
      title: "Financial wellness is a fundamental right",
      description: "Not a luxury reserved for the few",
    },
    {
      icon: Zap,
      title: "Great technology works in the background",
      description: "To make your life simpler",
    },
    {
      icon: Users,
      title: "Meaningful advice should be available to everyone",
      description: "Not just a privileged few",
    },
    {
      icon: Lightbulb,
      title: "Financial clarity should be intuitive",
      description: "Not intimidating",
    },
    {
      icon: Target,
      title: "Financial progress should feel empowering",
      description: "Personal, and private",
    },
    {
      icon: Waves,
      title: "Confidence grows from clarity",
      description: "When you understand your money, peace of mind follows",
    },
  ]

  const differentiators = [
    {
      title: "Conversational Interface",
      description:
        "You don't need to read blogs, build complex spreadsheets, or figure out confusing dashboards. You simply start a conversation with Penny, our AI assistant.",
    },
    {
      title: "True Intelligence",
      description:
        "Penny doesn't just show you balances or categorize spending. She helps you understand decisions, explains trade-offs, and simplifies complexity.",
    },
    {
      title: "Human Language",
      description:
        "All interactions happen in language you actually understand. It's not about teaching you finance. It's about translating finance into something that fits your life.",
    },
  ]

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="w-full py-20 px-4 bg-gradient-to-br from-green-50/30 via-cyan-50/40 to-blue-50/30 dark:from-green-900/10 dark:via-cyan-900/10 dark:to-blue-900/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 text-cyan-600 border-cyan-600">
              About TrueFi
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              One Problem. Two Founders. <br />
              <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-green-500 bg-clip-text text-transparent">
                A mission to make money feel human again
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto mb-8">
              We're not just building financial technology. We're creating a more personal, intelligent, and inclusive
              way to engage with your money. Our journey started with shared frustration, evolved into a shared mission,
              and today it drives every decision we make.
            </p>
          </div>
        </div>
      </section>

      {/* The Problem Section - Journey Style */}
      <section className="w-full py-16 px-4 bg-white dark:bg-gray-800">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              The Problem That Sparked Everything
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto rounded-full"></div>
          </div>

          {/* Journey Timeline */}
          <div className="relative">
            {/* Vertical line for all screen sizes */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-cyan-200 via-blue-300 to-green-200 dark:from-cyan-800 dark:via-blue-700 dark:to-green-800 rounded-full"></div>

            {/* Journey Steps */}
            <div className="space-y-8 lg:space-y-12">
              {/* Step 1 - The Question */}
              <div className="relative flex flex-col lg:flex-row items-center">
                <div className="lg:w-1/2 lg:pr-12">
                  <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 p-6 rounded-2xl shadow-lg border border-cyan-100 dark:border-cyan-800">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mr-4">
                        <span className="text-white font-bold text-lg">1</span>
                      </div>
                      <h3 className="text-xl font-bold text-cyan-600 dark:text-cyan-400">The Question</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      Why does managing money still feel so hard, even for people who care, who try, and who have access
                      to resources? We found ourselves asking this repeatedly as we navigated our own financial
                      journeys.
                    </p>
                  </div>
                </div>
                {/* Timeline dot */}
                <div className="absolute left-1/2 transform -translate-x-1/2 w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full border-4 border-white dark:border-gray-800 shadow-lg"></div>
                <div className="lg:w-1/2"></div>
              </div>

              {/* Step 2 - The Struggle */}
              <div className="relative flex flex-col lg:flex-row-reverse items-center">
                <div className="lg:w-1/2 lg:pl-12">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl shadow-lg border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-4">
                        <span className="text-white font-bold text-lg">2</span>
                      </div>
                      <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">The Struggle</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      As MBA students at UCLA Anderson, we were managing student loans, high rent, rising tuition, side
                      gigs, and the complex task of planning our financial futures. The irony was clear. We were
                      immersed in business theory, yet struggling to apply those lessons to our own lives.
                    </p>
                  </div>
                </div>
                {/* Timeline dot */}
                <div className="absolute left-1/2 transform -translate-x-1/2 w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full border-4 border-white dark:border-gray-800 shadow-lg"></div>
                <div className="lg:w-1/2"></div>
              </div>

              {/* Step 3 - The Investigation */}
              <div className="relative flex flex-col lg:flex-row items-center">
                <div className="lg:w-1/2 lg:pr-12">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-2xl shadow-lg border border-indigo-100 dark:border-indigo-800">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
                        <span className="text-white font-bold text-lg">3</span>
                      </div>
                      <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">The Investigation</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      Spreadsheets felt tedious. Budgeting apps were either overly simplistic or too complex. Financial
                      advice was hard to access, buried in jargon or hidden behind expensive fees. None captured the
                      full picture of modern financial life.
                    </p>
                  </div>
                </div>
                {/* Timeline dot */}
                <div className="absolute left-1/2 transform -translate-x-1/2 w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full border-4 border-white dark:border-gray-800 shadow-lg"></div>
                <div className="lg:w-1/2"></div>
              </div>

              {/* Step 4 - The Realization */}
              <div className="relative flex flex-col lg:flex-row-reverse items-center">
                <div className="lg:w-1/2 lg:pl-12">
                  <div className="bg-gradient-to-br from-purple-50 to-green-50 dark:from-purple-900/20 dark:to-green-900/20 p-6 rounded-2xl shadow-lg border border-purple-100 dark:border-purple-800">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-green-600 rounded-full flex items-center justify-center mr-4">
                        <span className="text-white font-bold text-lg">4</span>
                      </div>
                      <h3 className="text-xl font-bold text-purple-600 dark:text-purple-400">The Realization</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      We weren't alone. Financial confusion was widespread. Nearly everyone we talked to shared similar
                      frustrations about managing their money. The stress and emotional burden of financial uncertainty
                      were affecting individuals across different backgrounds.
                    </p>
                  </div>
                </div>
                {/* Timeline dot */}
                <div className="absolute left-1/2 transform -translate-x-1/2 w-6 h-6 bg-gradient-to-r from-purple-500 to-green-600 rounded-full border-4 border-white dark:border-gray-800 shadow-lg"></div>
                <div className="lg:w-1/2"></div>
              </div>
            </div>
          </div>

          {/* The Opportunity - Highlighted Conclusion */}
          <div className="mt-12 text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-green-500/10 rounded-3xl transform rotate-1"></div>
              <div className="relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 p-12 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-600">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lightbulb className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-4">The Opportunity</h3>
                <p className="text-lg text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
                  We saw a clear need for something different. People didn't need just another financial tool. They
                  needed a new kind of solution that combined smart technology with real human understanding. Something
                  designed to meet individuals where they are, no matter their starting point or level of financial
                  knowledge, and help them move forward with clarity and confidence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founders Section */}
      <section className="w-full py-16 px-4 bg-gradient-to-br from-green-50/30 via-cyan-50/40 to-blue-50/30 dark:from-green-900/10 dark:via-cyan-900/10 dark:to-blue-900/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              From Shared Frustration to Shared Purpose
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              We realized we were both facing opposite sides of the same flawed experience. Technology was too
              complicated. Advice was too exclusive. And the system as a whole wasn't designed for the way people
              actually live.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {founders.map((founder, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="mx-auto mb-4">
                    <Image
                      src={founder.image || "/placeholder.svg"}
                      alt={founder.name}
                      width={150}
                      height={200}
                      className="rounded-lg mx-auto object-cover"
                    />
                  </div>
                  <CardDescription className="text-cyan-600 dark:text-cyan-400 font-medium text-lg">
                    {founder.role}
                  </CardDescription>
                  <Badge variant="outline" className="mt-2">
                    {founder.expertise}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 text-left leading-relaxed">{founder.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Journey Section */}
      <section className="w-full py-16 px-4 bg-white dark:bg-gray-800">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              From a School Project to a Scalable Vision
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Academic Beginnings</h3>
              <p className="text-gray-600 dark:text-gray-300">
                TrueFi began as a capstone project in UCLA Anderson's entrepreneurship program, but it quickly became
                much more than an academic exercise.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">In-Depth Research</h3>
              <p className="text-gray-600 dark:text-gray-300">
                We conducted more than 150 interviews with consumers, financial advisors, and fintech professionals.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Key Insight</h3>
              <p className="text-gray-600 dark:text-gray-300">
                People knew they needed help managing their money, but didn't know where to start. They wanted clarity,
                not lectures or manuals.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Critical Pivot</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Initially built for financial advisors, we quickly realized the need was broader. We pivoted from a B2B
                product into a consumer-first platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We're Building Section */}
      <section className="w-full py-16 px-4 bg-gradient-to-br from-green-50/30 via-cyan-50/40 to-blue-50/30 dark:from-green-900/10 dark:via-cyan-900/10 dark:to-blue-900/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              What We're Building and Why It's Different
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Whether you're exploring student loan strategies, deciding between renting and buying, planning to grow
              your family, changing careers, or just wondering where your money goes each month, TrueFi is there to help
              you move forward with confidence.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {differentiators.map((item, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <CardTitle className="text-xl text-cyan-600">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* LA Roots Section */}
      <section className="w-full py-16 px-4 bg-white dark:bg-gray-800">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Built in Los Angeles, Made for Everyone
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2 text-cyan-600">LA Roots</h3>
              <p className="text-gray-600 dark:text-gray-300">
                TrueFi.ai is proudly based in Los Angeles, a city full of people making things happen in creative,
                ambitious, and often unconventional ways.
              </p>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2 text-cyan-600">Humble Beginnings</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Our journey started in a shared apartment in Westwood, continued through startup accelerators, and café
                brainstorms in Santa Monica.
              </p>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2 text-cyan-600">Community Driven</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Countless user interviews across the city have shaped our understanding of diverse financial needs.
              </p>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2 text-cyan-600">Shared Values</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Los Angeles reflects our values: diversity, resilience, and a deep belief that innovation should serve
                people, not the other way around.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Believe Section */}
      <section className="w-full py-16 px-4 bg-gradient-to-br from-green-50/30 via-cyan-50/40 to-blue-50/30 dark:from-green-900/10 dark:via-cyan-900/10 dark:to-blue-900/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">What We Believe</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {beliefs.map((belief, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-cyan-100 dark:bg-cyan-900 rounded-lg flex items-center justify-center mb-4">
                    <belief.icon className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <CardTitle className="text-lg">{belief.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">{belief.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-16 px-4 bg-cyan-600 dark:bg-cyan-700">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Financial Future?</h2>
            <p className="text-cyan-100 mb-8 max-w-2xl mx-auto">
              Join thousands of users who have already started their journey to financial wellness with TrueFi.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary">
                Get Started Today
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-cyan-600 bg-transparent"
              >
                Chat with Penny
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
