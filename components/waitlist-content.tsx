"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Phone, User, MessageSquare, CheckCircle, Star, Zap, Shield, Users } from "lucide-react"

export function WaitlistContent() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    financialGoals: "",
    currentSituation: "",
    interests: [] as string[],
    moneyManagement: [] as string[],
    otherMoneyManagement: "",
    mustHave: "",
    hearAboutUs: "",
    additionalComments: "",
    newsletter: false,
    updates: false,
  })

  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError("")

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join waitlist')
      }

      // Success - show confirmation
      setIsSubmitted(true)
      
      // Reset form data for next submission
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        financialGoals: "",
        currentSituation: "",
        interests: [],
        moneyManagement: [],
        otherMoneyManagement: "",
        mustHave: "",
        hearAboutUs: "",
        additionalComments: "",
        newsletter: false,
        updates: false,
      })
    } catch (error) {
      console.error('Error submitting waitlist form:', error)
      setSubmitError(error instanceof Error ? error.message : 'An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInterestChange = (interest: string, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        interests: [...prev.interests, interest],
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        interests: prev.interests.filter((i) => i !== interest),
      }))
    }
  }

  const handleMoneyManagementChange = (method: string, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        moneyManagement: [...(prev.moneyManagement || []), method],
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        moneyManagement: (prev.moneyManagement || []).filter((m) => m !== method),
      }))
      // Clear the other text field if "other" is unchecked
      if (method === "other") {
        setFormData((prev) => ({ ...prev, otherMoneyManagement: "" }))
      }
    }
  }

  const benefits = [
    {
      icon: Star,
      title: "Early Access",
      description: "Be among the first to experience TrueFi when we launch",
    },
    {
      icon: Zap,
      title: "Exclusive Features",
      description: "Get access to premium features during our beta period",
    },
    {
      icon: Shield,
      title: "Priority Support",
      description: "Receive dedicated support as we perfect the platform",
    },
    {
      icon: Users,
      title: "Community Access",
      description: "Join our exclusive community of early adopters",
    },
  ]

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Welcome to the Waitlist!</CardTitle>
            <CardDescription>Thank you for joining TrueFi. We'll notify you as soon as we launch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              You're now part of an exclusive group of early adopters who will get first access to TrueFi when we
              launch.
            </p>
            <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-lg">
              <p className="text-sm text-cyan-700 dark:text-cyan-300">
                <strong>What's next?</strong> We'll send you updates on our progress and notify you when TrueFi is ready
                for you to try.
              </p>
            </div>
            <Button className="w-full bg-cyan-600 hover:bg-cyan-700" onClick={() => {
              setIsSubmitted(false)
              setSubmitError("")
            }}>
              Join Another Person
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="w-full py-20 px-4 bg-gradient-to-br from-green-50/30 via-cyan-50/40 to-blue-50/30 dark:from-green-900/10 dark:via-cyan-900/10 dark:to-blue-900/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 text-cyan-600 border-cyan-600">
              Join the Waitlist
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Be First to Experience{" "}
              <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-green-500 bg-clip-text text-transparent">
                The Future of Finance
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
              TrueFi is coming soon. Join our waitlist to get early access to the AI-powered financial assistant that
              will transform how you manage your money.
            </p>
          </div>
        </div>
      </section>

      {/* Waitlist Form Section */}
      <section className="w-full py-16 px-4 bg-white dark:bg-gray-800">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            {!isSubmitted ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">Join the Waitlist</CardTitle>
                  <CardDescription className="text-center">
                    Get notified when TrueFi launches and receive exclusive early access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name *</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="firstName"
                              required
                              placeholder="Enter your first name"
                              className="pl-10"
                              value={formData.firstName}
                              onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name *</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="lastName"
                              required
                              placeholder="Enter your last name"
                              className="pl-10"
                              value={formData.lastName}
                              onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            required
                            placeholder="Enter your email address"
                            className="pl-10"
                            value={formData.email}
                            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number (Optional)</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="Enter your phone number"
                            className="pl-10"
                            value={formData.phone}
                            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Optional Questions */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tell Us More (Optional)</h3>
                      <div className="space-y-2">
                        <Label htmlFor="financialGoals">What are your main financial goals?</Label>
                        <Select
                          value={formData.financialGoals}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, financialGoals: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select your primary financial goal" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="saving">Building savings</SelectItem>
                            <SelectItem value="debt">Paying off debt</SelectItem>
                            <SelectItem value="investing">Learning to invest</SelectItem>
                            <SelectItem value="budgeting">Better budgeting</SelectItem>
                            <SelectItem value="retirement">Retirement planning</SelectItem>
                            <SelectItem value="home">Buying a home</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>What best describes your current financial situation?</Label>
                        <RadioGroup
                          value={formData.currentSituation}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, currentSituation: value }))}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="beginner" id="beginner" />
                            <Label htmlFor="beginner">Just getting started with finances</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="intermediate" id="intermediate" />
                            <Label htmlFor="intermediate">Have some financial knowledge</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="advanced" id="advanced" />
                            <Label htmlFor="advanced">Experienced with financial planning</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="struggling" id="struggling" />
                            <Label htmlFor="struggling">Currently facing financial challenges</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label>What TrueFi features interest you most? (Select all that apply)</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            "AI Financial Advisor",
                            "Budget Planning",
                            "Investment Guidance",
                            "Debt Management",
                            "Goal Tracking",
                            "Expense Analysis",
                          ].map((interest) => (
                            <div key={interest} className="flex items-center space-x-2">
                              <Checkbox
                                id={interest}
                                checked={formData.interests.includes(interest)}
                                onCheckedChange={(checked) => handleInterestChange(interest, checked as boolean)}
                              />
                              <Label htmlFor={interest} className="text-sm">
                                {interest}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>How do you currently manage your money? (Select all that apply)</Label>
                        <div className="space-y-3">
                          {[
                            "I use a budgeting app (e.g., Mint, YNAB, etc.)",
                            "I track with spreadsheets",
                            "I mostly check my bank app",
                            "I rely on a financial advisor",
                            "I don't have a system, it's all in my head",
                          ].map((method) => (
                            <div key={method} className="flex items-center space-x-2">
                              <Checkbox
                                id={method}
                                checked={formData.moneyManagement?.includes(method) || false}
                                onCheckedChange={(checked) => handleMoneyManagementChange(method, checked as boolean)}
                              />
                              <Label htmlFor={method} className="text-sm">
                                {method}
                              </Label>
                            </div>
                          ))}
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="other-money"
                              checked={formData.moneyManagement?.includes("other") || false}
                              onCheckedChange={(checked) => handleMoneyManagementChange("other", checked as boolean)}
                            />
                            <Label htmlFor="other-money" className="text-sm">
                              Other:
                            </Label>
                            <Input
                              placeholder="Please specify..."
                              className="ml-2 flex-1"
                              value={formData.otherMoneyManagement || ""}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, otherMoneyManagement: e.target.value }))
                              }
                              disabled={!formData.moneyManagement?.includes("other")}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mustHave">What would make TrueFi feel like a must-have for you?</Label>
                        <Input
                          id="mustHave"
                          placeholder="Tell us what success with TrueFi would look like for you..."
                          className="min-h-[100px]"
                          value={formData.mustHave || ""}
                          onChange={(e) => setFormData((prev) => ({ ...prev, mustHave: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="hearAboutUs">How did you hear about TrueFi?</Label>
                        <Select
                          value={formData.hearAboutUs}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, hearAboutUs: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="social">Social Media</SelectItem>
                            <SelectItem value="search">Search Engine</SelectItem>
                            <SelectItem value="friend">Friend/Family</SelectItem>
                            <SelectItem value="blog">Blog/Article</SelectItem>
                            <SelectItem value="ad">Advertisement</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="additionalComments">Additional Comments</Label>
                        <div className="relative">
                          <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="additionalComments"
                            placeholder="Tell us anything else you'd like us to know..."
                            className="pl-10 min-h-[100px]"
                            value={formData.additionalComments}
                            onChange={(e) => setFormData((prev) => ({ ...prev, additionalComments: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Preferences */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Communication Preferences</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="newsletter"
                            checked={formData.newsletter}
                            onCheckedChange={(checked) =>
                              setFormData((prev) => ({ ...prev, newsletter: checked as boolean }))
                            }
                          />
                          <Label htmlFor="newsletter" className="text-sm">
                            Subscribe to our newsletter for financial tips and updates
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="updates"
                            checked={formData.updates}
                            onCheckedChange={(checked) =>
                              setFormData((prev) => ({ ...prev, updates: checked as boolean }))
                            }
                          />
                          <Label htmlFor="updates" className="text-sm">
                            Receive product updates and launch notifications
                          </Label>
                        </div>
                      </div>
                    </div>

                    {submitError && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full bg-cyan-600 hover:bg-cyan-700" 
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Joining..." : "Join the Waitlist"}
                    </Button>

                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      By joining our waitlist, you agree to our{" "}
                      <Button variant="link" className="p-0 h-auto text-xs text-cyan-600 hover:text-cyan-700">
                        Privacy Policy
                      </Button>{" "}
                      and{" "}
                      <Button variant="link" className="p-0 h-auto text-xs text-cyan-600 hover:text-cyan-700">
                        Terms of Service
                      </Button>
                    </p>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="text-center">
                <CardContent className="p-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">You're on the list!</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Thank you for joining our waitlist. We'll notify you as soon as TrueFi is ready.
                  </p>
                  <Button
                    onClick={() => setIsSubmitted(false)}
                    variant="outline"
                    className="text-cyan-600 border-cyan-600"
                  >
                    Join Another Email
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="w-full py-16 px-4 bg-gradient-to-br from-green-50/30 via-cyan-50/40 to-blue-50/30 dark:from-green-900/10 dark:via-cyan-900/10 dark:to-blue-900/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Why Join Our Waitlist?</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Be part of the exclusive group that gets first access to TrueFi and help shape the future of personal
              finance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/20 flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-6 h-6 text-cyan-600" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{benefit.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{benefit.description}</p>
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
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Financial Life?</h2>
            <p className="text-cyan-100 mb-8 max-w-2xl mx-auto">
              Don't miss out on early access to the most intuitive financial planning tool ever created.
            </p>
            <Button size="lg" variant="secondary">
              Join the Waitlist Now
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
