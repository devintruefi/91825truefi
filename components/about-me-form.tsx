"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUser } from "@/contexts/user-context"
import { Save, CheckCircle, AlertCircle, User, MapPin, Heart, DollarSign, Shield, Globe } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface AboutMeData {
  // Required fields (for completion rule)
  country_code?: string
  region_code?: string
  state?: string
  marital_status?: string
  dependents?: number
  risk_tolerance?: number
  investment_horizon?: string
  emergency_months?: number
  engagement_frequency?: string
  filing_status?: string
  tax_state?: string
  
  // Optional Identity & Locale
  city?: string
  postal_code?: string
  currency?: string
  language?: string
  timezone?: string
  first_name?: string
  last_name?: string
  
  // Optional Core preferences (existing users fields)
  default_checking_buffer?: number
  auto_allocation_enabled?: boolean
  allocation_refresh_frequency?: string
  
  // Optional Risk capacity quick check (JSONB under financial_goals.riskCapacity)
  job_stability?: string
  income_sources?: number
  liquid_cushion?: string
  
  // Optional Investing values (JSONB under financial_goals.investing_values)
  esg_investing?: boolean
  crypto_investing?: boolean
  real_estate_investing?: boolean
  domestic_only_investing?: boolean
  
  // Optional Budgeting & cash-flow signals (JSONB under financial_goals)
  pay_schedule?: string
  paycheck_day?: number
  budget_framework?: string
  target_savings_percent?: number
  auto_budget_enabled?: boolean
  
  // Optional Debt & housing profile (JSONB under financial_goals)
  housing_status?: string
  monthly_housing_payment?: number
  debt_strategy?: string
  extra_payment_target?: number
  student_loan_status?: string
  prepay_mortgage?: boolean
  
  // Optional Investing preferences (JSONB under financial_goals)
  investing_style?: string
  account_priority?: string[]
  dividend_reinvest?: boolean
  rebalance_frequency?: string
  rebalance_threshold?: number
  
  // Optional Retirement (JSONB under financial_goals)
  retirement?: {
    has_401k: boolean
    target_rate_percent: number
  }
  
  // Optional Upcoming expenses (JSONB under financial_goals)
  upcoming_expenses?: Array<{
    name: string
    amount: number
    due_month: string
  }>
  
  // Optional Advice & notifications
  advice_style?: string
  notifications_enabled?: boolean
  notification_channels?: {
    email?: boolean
    push?: boolean
    sms?: boolean
  }
}

const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }, { code: "DC", name: "Washington DC" }
]

export function AboutMeForm({ onComplete }: { onComplete?: () => void }) {
  const { user } = useUser()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<AboutMeData>({
    country_code: "US",
    currency: "USD",
    language: "en",
    dependents: 0,
    risk_tolerance: 5,
    emergency_months: 3,
    notifications_enabled: true,
    // Default values for optional fields
    auto_allocation_enabled: true,
    allocation_refresh_frequency: "monthly",
    default_checking_buffer: 500,
    income_sources: 1,
    pay_schedule: "monthly",
    paycheck_day: 1,
    budget_framework: "50-30-20",
    savings_split: {
      emergency: 25,
      retirement: 50,
      debt_extra: 15,
      other: 10
    },
    housing_status: "rent",
    has_high_interest_debt: false,
    debt_profile: {
      total_unsecured: 0,
      apr_highest: 0
    },
    retirement: {
      has_401k: false,
      target_rate_percent: 10
    },
    upcoming_expenses: [],
    advice_style: "detailed",
    notification_channels: {
      email: true,
      push: true,
      sms: false
    }
  })
  const [isComplete, setIsComplete] = useState(false)

  // Load existing data
  useEffect(() => {
    if (user?.id) {
      fetchAboutMeData()
    }
  }, [user])

  // Check if required fields are complete
  useEffect(() => {
    const requiredFieldsComplete = Boolean(
      data.country_code &&
      data.region_code &&
      data.state &&
      data.marital_status &&
      data.dependents !== undefined &&
      data.risk_tolerance !== undefined &&
      data.investment_horizon &&
      data.emergency_months !== undefined &&
      data.engagement_frequency &&
      data.filing_status &&
      (data.country_code !== "US" || data.tax_state)
    )
    setIsComplete(requiredFieldsComplete)
  }, [data])

  const fetchAboutMeData = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/profile/about-me`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const profileData = await response.json()
        setData(profileData)
      }
    } catch (error) {
      console.error('Error fetching profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveAboutMeData = async () => {
    if (!user?.id) {
      console.error('Cannot save: No user ID found')
      toast({
        title: "Error",
        description: "User not authenticated. Please log in again.",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    const authToken = localStorage.getItem('auth_token')
    console.log('Saving About Me data:', {
      userId: user.id,
      hasAuthToken: !!authToken,
      dataToSave: data
    })

    try {
      const response = await fetch(`/api/profile/about-me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(data)
      })
      
      let result
      try {
        result = await response.json()
      } catch (jsonError) {
        console.error('Failed to parse response:', jsonError)
        result = { error: 'Invalid response from server' }
      }
      
      if (response.ok) {
        console.log('Save successful:', result)
        toast({
          title: "Profile saved",
          description: result.aboutMeComplete ? "Your profile is complete!" : "Profile updated successfully.",
        })

        if (result.aboutMeComplete && onComplete) {
          onComplete()
        }
      } else {
        console.error('Save failed - Response:', {
          status: response.status,
          statusText: response.statusText,
          result: result
        })
        throw new Error(result?.details || result?.error || 'Failed to save profile')
      }
    } catch (error: any) {
      console.error('Error saving profile:', {
        error: error,
        message: error?.message,
        stack: error?.stack
      })
      toast({
        title: "Error",
        description: error?.message || "Failed to save profile. Please try again.",
        variant: "destructive",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof AboutMeData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <div className="text-center">Loading profile...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">About Me</h2>
        <Badge variant={isComplete ? "default" : "secondary"} className="px-3 py-1">
          {isComplete ? (
            <>
              <CheckCircle className="h-4 w-4 mr-1" />
              Complete
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 mr-1" />
              Incomplete
            </>
          )}
        </Badge>
      </div>

      <Tabs defaultValue="identity" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="identity">
            <User className="h-4 w-4 mr-1" />
            Identity
          </TabsTrigger>
          <TabsTrigger value="taxes">
            <Shield className="h-4 w-4 mr-1" />
            Taxes
          </TabsTrigger>
          <TabsTrigger value="risk">
            <DollarSign className="h-4 w-4 mr-1" />
            Risk & Goals
          </TabsTrigger>
          <TabsTrigger value="budgeting">
            <Heart className="h-4 w-4 mr-1" />
            Budgeting
          </TabsTrigger>
          <TabsTrigger value="debt">
            <AlertCircle className="h-4 w-4 mr-1" />
            Debt & Housing
          </TabsTrigger>
          <TabsTrigger value="investing">
            <Globe className="h-4 w-4 mr-1" />
            Investing
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <MapPin className="h-4 w-4 mr-1" />
            Preferences
          </TabsTrigger>
        </TabsList>

        {/* Identity & Locale Tab */}
        <TabsContent value="identity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Identity & Location</CardTitle>
              <CardDescription>Basic information for personalized recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name (Optional)</Label>
                  <Input
                    id="first_name"
                    value={data.first_name || ''}
                    onChange={(e) => updateField('first_name', e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name (Optional)</Label>
                  <Input
                    id="last_name"
                    value={data.last_name || ''}
                    onChange={(e) => updateField('last_name', e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Select value={data.country_code} onValueChange={(value) => updateField('country_code', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State/Province *</Label>
                  <Select value={data.state} onValueChange={(value) => {
                    updateField('state', value)
                    updateField('region_code', value)
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(state => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City (Optional)</Label>
                  <Input
                    id="city"
                    value={data.city || ''}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="Enter city"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postal_code">ZIP/Postal Code (Optional)</Label>
                  <Input
                    id="postal_code"
                    value={data.postal_code || ''}
                    onChange={(e) => updateField('postal_code', e.target.value)}
                    placeholder="Enter ZIP code"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency (Optional)</Label>
                  <Select value={data.currency} onValueChange={(value) => updateField('currency', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language (Optional)</Label>
                  <Select value={data.language} onValueChange={(value) => updateField('language', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="zh">Chinese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone (Optional)</Label>
                  <Select value={data.timezone} onValueChange={(value) => updateField('timezone', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-detected" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Taxes Tab */}
        <TabsContent value="taxes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Information</CardTitle>
              <CardDescription>Required for accurate tax planning and advice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marital_status">Marital/Partnership Status *</Label>
                  <Select value={data.marital_status} onValueChange={(value) => updateField('marital_status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="domestic_partnership">Domestic Partnership</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dependents">Number of Dependents *</Label>
                  <Input
                    id="dependents"
                    type="number"
                    min="0"
                    max="20"
                    value={data.dependents || 0}
                    onChange={(e) => updateField('dependents', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filing_status">Tax Filing Status *</Label>
                  <Select value={data.filing_status} onValueChange={(value) => updateField('filing_status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select filing status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married_filing_jointly">Married Filing Jointly</SelectItem>
                      <SelectItem value="married_filing_separately">Married Filing Separately</SelectItem>
                      <SelectItem value="head_of_household">Head of Household</SelectItem>
                      <SelectItem value="qualifying_widow">Qualifying Widow(er)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {data.country_code === "US" && (
                  <div className="space-y-2">
                    <Label htmlFor="tax_state">Tax State *</Label>
                    <Select value={data.tax_state} onValueChange={(value) => updateField('tax_state', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tax state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map(state => (
                          <SelectItem key={state.code} value={state.code}>
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk & Goals Tab */}
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Profile</CardTitle>
              <CardDescription>Helps personalize investment and savings recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="risk_tolerance">Risk Tolerance * (1-10)</Label>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">Conservative</span>
                  <Slider
                    id="risk_tolerance"
                    min={1}
                    max={10}
                    step={1}
                    value={[data.risk_tolerance || 5]}
                    onValueChange={(value) => updateField('risk_tolerance', value[0])}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500">Aggressive</span>
                  <Badge variant="outline">{data.risk_tolerance || 5}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="investment_horizon">Investment Horizon *</Label>
                  <Select value={data.investment_horizon} onValueChange={(value) => updateField('investment_horizon', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select horizon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (1-3 years)</SelectItem>
                      <SelectItem value="medium">Medium (3-10 years)</SelectItem>
                      <SelectItem value="long">Long (10+ years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_months">Emergency Fund Target (months) *</Label>
                  <Input
                    id="emergency_months"
                    type="number"
                    min="0"
                    max="12"
                    value={data.emergency_months || 3}
                    onChange={(e) => updateField('emergency_months', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="engagement_frequency">Check-in Frequency *</Label>
                  <Select value={data.engagement_frequency} onValueChange={(value) => updateField('engagement_frequency', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Optional risk capacity check */}
              <Card className="bg-gray-50 dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-sm">Risk Capacity Quick Check (Optional)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="job_stability">Job Stability</Label>
                    <Select value={data.job_stability} onValueChange={(value) => updateField('job_stability', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stability" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="very_stable">Very Stable</SelectItem>
                        <SelectItem value="stable">Stable</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="unstable">Unstable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="income_sources">Number of Income Sources</Label>
                    <Input
                      id="income_sources"
                      type="number"
                      min="1"
                      max="10"
                      value={data.income_sources || 1}
                      onChange={(e) => updateField('income_sources', parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="liquid_cushion">Liquid Cash Cushion</Label>
                    <Select value={data.liquid_cushion} onValueChange={(value) => updateField('liquid_cushion', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select cushion" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="minimal">Minimal (&lt;1 month)</SelectItem>
                        <SelectItem value="adequate">Adequate (1-3 months)</SelectItem>
                        <SelectItem value="comfortable">Comfortable (3-6 months)</SelectItem>
                        <SelectItem value="substantial">Substantial (6+ months)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budgeting Section */}
        <TabsContent value="budgeting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budgeting & Cash Flow</CardTitle>
              <CardDescription>Configure how you get paid and manage your budget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pay_schedule">Pay Schedule</Label>
                  <Select value={data.pay_schedule} onValueChange={(value) => updateField('pay_schedule', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pay schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-weekly (every 2 weeks)</SelectItem>
                      <SelectItem value="semi-monthly">Semi-monthly (twice a month)</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">How often you receive your primary income</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paycheck_day">Payday(s)</Label>
                  <Input
                    id="paycheck_day"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="e.g., 1, 15"
                    value={data.paycheck_day || ''}
                    onChange={(e) => updateField('paycheck_day', parseInt(e.target.value) || undefined)}
                  />
                  <p className="text-xs text-muted-foreground">Day(s) of month you get paid (1-31)</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget_framework">Budget Framework</Label>
                <Select value={data.budget_framework} onValueChange={(value) => updateField('budget_framework', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select framework" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50-30-20">50/30/20 Rule (Needs/Wants/Savings)</SelectItem>
                    <SelectItem value="zero-based">Zero-based (every dollar assigned)</SelectItem>
                    <SelectItem value="envelope">Envelope Method (category limits)</SelectItem>
                    <SelectItem value="pay-yourself-first">Pay Yourself First (savings priority)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Your preferred budgeting approach</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_savings_percent">Target Savings Rate (%)</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    id="target_savings_percent"
                    min={0}
                    max={50}
                    step={1}
                    value={[data.target_savings_percent || 20]}
                    onValueChange={(value) => updateField('target_savings_percent', value[0])}
                    className="flex-1"
                  />
                  <span className="w-12 text-right font-medium">{data.target_savings_percent || 20}%</span>
                </div>
                <p className="text-xs text-muted-foreground">Percentage of income to save each month</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_checking_buffer">Checking Account Buffer ($)</Label>
                <Input
                  id="default_checking_buffer"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g., 1000"
                  value={data.default_checking_buffer || ''}
                  onChange={(e) => updateField('default_checking_buffer', parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">Minimum balance to keep in checking after bills</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto_budget_enabled">Auto-Budget Suggestions</Label>
                  <p className="text-xs text-muted-foreground">Let Penny suggest budget adjustments based on spending</p>
                </div>
                <Switch
                  id="auto_budget_enabled"
                  checked={data.auto_budget_enabled || false}
                  onCheckedChange={(checked) => updateField('auto_budget_enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Debt & Housing Section */}
        <TabsContent value="debt" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Debt & Housing</CardTitle>
              <CardDescription>Your housing situation and debt repayment strategy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="housing_status">Housing Status</Label>
                <Select value={data.housing_status} onValueChange={(value) => updateField('housing_status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select housing status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent">Renting</SelectItem>
                    <SelectItem value="own_mortgage">Own with mortgage</SelectItem>
                    <SelectItem value="own_no_mortgage">Own without mortgage</SelectItem>
                    <SelectItem value="living_with_family">Living with family/friends</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthly_housing_payment">Monthly Housing Payment ($)</Label>
                <Input
                  id="monthly_housing_payment"
                  type="number"
                  min="0"
                  step="50"
                  placeholder="e.g., 1500"
                  value={data.monthly_housing_payment || ''}
                  onChange={(e) => updateField('monthly_housing_payment', parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">Rent or mortgage payment amount</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="debt_strategy">Debt Payoff Strategy</Label>
                <Select value={data.debt_strategy} onValueChange={(value) => updateField('debt_strategy', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="snowball">Snowball (smallest balance first)</SelectItem>
                    <SelectItem value="avalanche">Avalanche (highest interest first)</SelectItem>
                    <SelectItem value="hybrid">Hybrid (mix of both)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">How to prioritize multiple debts</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="extra_payment_target">Extra Debt Payment Target ($/month)</Label>
                <Input
                  id="extra_payment_target"
                  type="number"
                  min="0"
                  step="25"
                  placeholder="e.g., 200"
                  value={data.extra_payment_target || ''}
                  onChange={(e) => updateField('extra_payment_target', parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">Amount beyond minimums to pay toward debt</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student_loan_status">Student Loan Status</Label>
                <Select value={data.student_loan_status} onValueChange={(value) => updateField('student_loan_status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No student loans</SelectItem>
                    <SelectItem value="in_repayment">In repayment</SelectItem>
                    <SelectItem value="deferment">In deferment</SelectItem>
                    <SelectItem value="forgiveness_pursuit">Pursuing forgiveness</SelectItem>
                    <SelectItem value="income_driven">Income-driven repayment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="prepay_mortgage">Prepay Mortgage</Label>
                  <p className="text-xs text-muted-foreground">Make extra principal payments on mortgage</p>
                </div>
                <Switch
                  id="prepay_mortgage"
                  checked={data.prepay_mortgage || false}
                  onCheckedChange={(checked) => updateField('prepay_mortgage', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Investing Section */}
        <TabsContent value="investing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Investing Preferences</CardTitle>
              <CardDescription>Your investment style and account priorities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="investing_style">Investing Style</Label>
                <Select value={data.investing_style} onValueChange={(value) => updateField('investing_style', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passive">Passive (index funds, ETFs)</SelectItem>
                    <SelectItem value="core_satellite">Core-Satellite (passive core + active picks)</SelectItem>
                    <SelectItem value="active">Active (individual stocks, timing)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Your approach to portfolio management</p>
              </div>

              <div className="space-y-2">
                <Label>Account Funding Priority</Label>
                <p className="text-xs text-muted-foreground mb-2">Drag to reorder your investment account priority</p>
                <div className="space-y-2">
                  {['HSA', '401(k)/403(b)', 'IRA/Roth IRA', 'Taxable Brokerage'].map((account, index) => (
                    <div key={account} className="flex items-center space-x-2 p-2 bg-muted rounded-md">
                      <span className="text-sm font-medium">{index + 1}.</span>
                      <span className="text-sm flex-1">{account}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dividend_reinvest">Dividend Reinvestment (DRIP)</Label>
                  <p className="text-xs text-muted-foreground">Automatically reinvest dividends</p>
                </div>
                <Switch
                  id="dividend_reinvest"
                  checked={data.dividend_reinvest || true}
                  onCheckedChange={(checked) => updateField('dividend_reinvest', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rebalance_frequency">Rebalance Frequency</Label>
                <Select value={data.rebalance_frequency} onValueChange={(value) => updateField('rebalance_frequency', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semiannual">Semi-annually</SelectItem>
                    <SelectItem value="annual">Annually</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">How often to review and rebalance portfolio</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rebalance_threshold">Rebalance Threshold (%)</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    id="rebalance_threshold"
                    min={1}
                    max={20}
                    step={1}
                    value={[data.rebalance_threshold || 5]}
                    onValueChange={(value) => updateField('rebalance_threshold', value[0])}
                    className="flex-1"
                  />
                  <span className="w-12 text-right font-medium">{data.rebalance_threshold || 5}%</span>
                </div>
                <p className="text-xs text-muted-foreground">Trigger rebalance when allocation drifts by this amount</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto_allocation">Auto-Allocation</Label>
                  <p className="text-xs text-muted-foreground">Let Penny suggest portfolio allocations</p>
                </div>
                <Switch
                  id="auto_allocation"
                  checked={data.auto_allocation_enabled || false}
                  onCheckedChange={(checked) => updateField('auto_allocation_enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferences & Values</CardTitle>
              <CardDescription>Customize your experience and investment approach</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={data.currency} onValueChange={(value) => updateField('currency', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={data.language} onValueChange={(value) => updateField('language', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="zh">Chinese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={data.timezone} onValueChange={(value) => updateField('timezone', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-detected" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Investing Values (Optional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="esg">ESG/Sustainable Investing</Label>
                    <Switch
                      id="esg"
                      checked={data.esg_investing || false}
                      onCheckedChange={(checked) => updateField('esg_investing', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="crypto">Cryptocurrency</Label>
                    <Switch
                      id="crypto"
                      checked={data.crypto_investing || false}
                      onCheckedChange={(checked) => updateField('crypto_investing', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="real_estate">Real Estate</Label>
                    <Switch
                      id="real_estate"
                      checked={data.real_estate_investing || false}
                      onCheckedChange={(checked) => updateField('real_estate_investing', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="domestic">Domestic Only</Label>
                    <Switch
                      id="domestic"
                      checked={data.domestic_only_investing || false}
                      onCheckedChange={(checked) => updateField('domestic_only_investing', checked)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Label htmlFor="notifications">Enable Notifications</Label>
                <Switch
                  id="notifications"
                  checked={data.notifications_enabled || false}
                  onCheckedChange={(checked) => updateField('notifications_enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save button */}
      <div className="flex justify-end space-x-4">
        <Button
          id="onb-about-save-btn"
          onClick={saveAboutMeData}
          disabled={saving}
          className={isComplete ? "bg-green-600 hover:bg-green-700" : ""}
        >
          {saving ? (
            <>Saving...</>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {isComplete ? "Save & Complete" : "Save Progress"}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}