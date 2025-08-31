"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { User, Bell, Shield, Eye, EyeOff, Trash2, Download, Loader2 } from "lucide-react"

// Phone number formatting function
const formatPhoneNumber = (value: string) => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '')
  
  // Format based on length
  if (digits.length <= 3) {
    return digits
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  } else if (digits.length <= 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  } else {
    // Handle country code (1 for US)
    return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`
  }
}

export function SettingsContent() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const { toast } = useToast()
  
  // Form states
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    incomeRange: '50k-75k',
    maritalStatus: '',
    dependents: 0,
    primaryGoals: '',
    riskTolerance: 'moderate',
    investmentHorizon: 'medium'
  })
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    weeklyFinancialSummary: true,
    goalMilestones: true,
    budgetAlerts: true,
    marketUpdates: false,
    productUpdates: false,
    dailyReminders: true,
    pennyMessages: true,
    urgentAlerts: true,
    smsSecurityAlerts: true,
    smsPaymentReminders: false
  })
  
  
  const [privacySettings, setPrivacySettings] = useState({
    dataAnalytics: true,
    personalizedRecommendations: true,
    marketingCommunications: false
  })
  
  const [securitySettings, setSecuritySettings] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false
  })
  
  // Fetch settings on mount
  useEffect(() => {
    fetchSettings()
  }, [])
  
  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        toast({
          title: "Not authenticated",
          description: "Please login to view settings",
          variant: "destructive"
        })
        setLoading(false)
        return
      }
      
      const response = await fetch('/api/user/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          toast({
            title: "Session expired",
            description: "Please login again to continue",
            variant: "destructive"
          })
          localStorage.removeItem('auth_token')
          setLoading(false)
          return
        }
        
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to fetch settings')
      }
      
      const data = await response.json()
      
      // Update profile data with safe access
      if (data.profile) {
        setProfileData({
          firstName: data.profile.firstName || '',
          lastName: data.profile.lastName || '',
          email: data.profile.email || '',
          phone: data.profile.phone || '',
          street: data.profile.street || '',
          city: data.profile.city || '',
          state: data.profile.state || '',
          postalCode: data.profile.postalCode || '',
          incomeRange: data.profile.incomeRange || '50k-75k',
          maritalStatus: data.profile.maritalStatus || '',
          dependents: data.profile.dependents || 0,
          primaryGoals: data.profile.primaryGoals || '',
          riskTolerance: data.preferences?.riskTolerance || 'moderate',
          investmentHorizon: data.preferences?.investmentHorizon || 'medium'
        })
      }
      
      // Update notification settings with safe access
      if (data.notifications) {
        setNotificationSettings({
          emailNotifications: data.notifications.emailNotifications ?? true,
          pushNotifications: data.notifications.pushNotifications ?? true,
          weeklyFinancialSummary: data.notifications.weeklyFinancialSummary ?? true,
          goalMilestones: data.notifications.goalMilestones ?? true,
          budgetAlerts: data.notifications.budgetAlerts ?? true,
          marketUpdates: data.notifications.marketUpdates ?? false,
          productUpdates: data.notifications.productUpdates ?? false,
          dailyReminders: data.notifications.dailyReminders ?? true,
          pennyMessages: data.notifications.pennyMessages ?? true,
          urgentAlerts: data.notifications.urgentAlerts ?? true,
          smsSecurityAlerts: data.notifications.smsSecurityAlerts ?? true,
          smsPaymentReminders: data.notifications.smsPaymentReminders ?? false
        })
      }
      
      // Update privacy settings with safe access
      if (data.privacy) {
        setPrivacySettings({
          dataAnalytics: data.privacy.dataAnalytics ?? true,
          personalizedRecommendations: data.privacy.personalizedRecommendations ?? true,
          marketingCommunications: data.privacy.marketingCommunications ?? false
        })
      }
      
      // Update security settings with safe access
      if (data.security) {
        setSecuritySettings(prev => ({
          ...prev,
          twoFactorEnabled: data.security.twoFactorEnabled ?? false
        }))
      }
      
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast({
        title: "Error",
        description: "Failed to load settings. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }
  
  const saveSettings = async (section: string, data: any) => {
    setSaving(section)
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        toast({
          title: "Not authenticated",
          description: "Please login to save settings",
          variant: "destructive"
        })
        return
      }
      
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ section, data })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save settings')
      }
      
      toast({
        title: "Success",
        description: "Settings saved successfully"
      })
      
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSaving(null)
    }
  }
  
  const handleSaveProfile = () => {
    saveSettings('profile', profileData)
  }
  
  const handleSaveNotifications = () => {
    saveSettings('notifications', notificationSettings)
  }
  
  
  const handleSavePassword = () => {
    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      })
      return
    }
    
    if (!securitySettings.currentPassword || !securitySettings.newPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive"
      })
      return
    }
    
    saveSettings('security', {
      currentPassword: securitySettings.currentPassword,
      newPassword: securitySettings.newPassword
    })
    
    // Clear password fields after save
    setSecuritySettings(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }))
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-8 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your account preferences and settings</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details and financial profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={profileData.firstName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={profileData.lastName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={profileData.phone}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value)
                      if (formatted.length <= 18) { // Limit to prevent overflow
                        setProfileData(prev => ({ ...prev, phone: formatted }))
                      }
                    }}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Address</h3>
                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input 
                      id="street" 
                      value={profileData.street}
                      onChange={(e) => setProfileData(prev => ({ ...prev, street: e.target.value }))}
                      placeholder="123 Main St"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input 
                        id="city" 
                        value={profileData.city}
                        onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="New York"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input 
                        id="state" 
                        value={profileData.state}
                        onChange={(e) => setProfileData(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="NY"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input 
                        id="postalCode" 
                        value={profileData.postalCode}
                        onChange={(e) => setProfileData(prev => ({ ...prev, postalCode: e.target.value }))}
                        placeholder="10001"
                      />
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Financial Profile</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="income">Annual Income</Label>
                      <Select 
                        value={profileData.incomeRange}
                        onValueChange={(value) => setProfileData(prev => ({ ...prev, incomeRange: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="under-25k">Under $25,000</SelectItem>
                          <SelectItem value="25k-50k">$25,000 - $50,000</SelectItem>
                          <SelectItem value="50k-75k">$50,000 - $75,000</SelectItem>
                          <SelectItem value="75k-100k">$75,000 - $100,000</SelectItem>
                          <SelectItem value="100k-150k">$100,000 - $150,000</SelectItem>
                          <SelectItem value="over-150k">Over $150,000</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="riskTolerance">Risk Tolerance</Label>
                      <Select 
                        value={profileData.riskTolerance}
                        onValueChange={(value) => setProfileData(prev => ({ ...prev, riskTolerance: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="conservative">Conservative</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="aggressive">Aggressive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maritalStatus">Marital Status</Label>
                      <Select 
                        value={profileData.maritalStatus || ''}
                        onValueChange={(value) => setProfileData(prev => ({ ...prev, maritalStatus: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="married">Married</SelectItem>
                          <SelectItem value="divorced">Divorced</SelectItem>
                          <SelectItem value="widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dependents">Number of Dependents</Label>
                      <Input 
                        id="dependents" 
                        type="number" 
                        min="0"
                        value={profileData.dependents}
                        onChange={(e) => setProfileData(prev => ({ ...prev, dependents: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goals">Primary Financial Goals</Label>
                    <Textarea
                      id="goals"
                      placeholder="Describe your main financial objectives..."
                      value={profileData.primaryGoals}
                      onChange={(e) => setProfileData(prev => ({ ...prev, primaryGoals: e.target.value }))}
                    />
                  </div>
                </div>
                <Button 
                  className="bg-cyan-600 hover:bg-cyan-700"
                  onClick={handleSaveProfile}
                  disabled={saving === 'profile'}
                >
                  {saving === 'profile' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>Choose what email notifications you'd like to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Financial Summary</Label>
                    <p className="text-sm text-gray-500">Get a weekly overview of your financial progress</p>
                  </div>
                  <Switch 
                    checked={notificationSettings.weeklyFinancialSummary}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, weeklyFinancialSummary: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Goal Milestones</Label>
                    <p className="text-sm text-gray-500">Notifications when you reach financial goals</p>
                  </div>
                  <Switch 
                    checked={notificationSettings.goalMilestones}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, goalMilestones: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Budget Alerts</Label>
                    <p className="text-sm text-gray-500">Alerts when you're approaching budget limits</p>
                  </div>
                  <Switch 
                    checked={notificationSettings.budgetAlerts}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, budgetAlerts: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Market Updates</Label>
                    <p className="text-sm text-gray-500">Important market news and investment updates</p>
                  </div>
                  <Switch 
                    checked={notificationSettings.marketUpdates}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, marketUpdates: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Product Updates</Label>
                    <p className="text-sm text-gray-500">New features and product announcements</p>
                  </div>
                  <Switch 
                    checked={notificationSettings.productUpdates}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, productUpdates: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Push Notifications</CardTitle>
                <CardDescription>Manage mobile and browser notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Daily Reminders</Label>
                    <p className="text-sm text-gray-500">Daily prompts to check your financial progress</p>
                  </div>
                  <Switch 
                    checked={notificationSettings.dailyReminders}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, dailyReminders: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Penny Messages</Label>
                    <p className="text-sm text-gray-500">Notifications for new messages from Penny</p>
                  </div>
                  <Switch 
                    checked={notificationSettings.pennyMessages}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, pennyMessages: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Urgent Alerts</Label>
                    <p className="text-sm text-gray-500">Critical financial alerts and security notifications</p>
                  </div>
                  <Switch 
                    checked={notificationSettings.urgentAlerts}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, urgentAlerts: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SMS Notifications</CardTitle>
                <CardDescription>Text message notifications for important updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Security Alerts</Label>
                    <p className="text-sm text-gray-500">SMS alerts for account security events</p>
                  </div>
                  <Switch 
                    checked={notificationSettings.smsSecurityAlerts}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, smsSecurityAlerts: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Payment Reminders</Label>
                    <p className="text-sm text-gray-500">Reminders for upcoming bill payments</p>
                  </div>
                  <Switch 
                    checked={notificationSettings.smsPaymentReminders}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, smsPaymentReminders: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-end">
              <Button 
                className="bg-cyan-600 hover:bg-cyan-700"
                onClick={handleSaveNotifications}
                disabled={saving === 'notifications'}
              >
                {saving === 'notifications' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Notification Settings'
                )}
              </Button>
            </div>
          </TabsContent>


          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your account security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Change Password</h3>
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input 
                        id="currentPassword" 
                        type={showCurrentPassword ? "text" : "password"} 
                        className="pr-10"
                        value={securitySettings.currentPassword}
                        onChange={(e) => setSecuritySettings(prev => ({ ...prev, currentPassword: e.target.value }))}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input 
                        id="newPassword" 
                        type={showNewPassword ? "text" : "password"} 
                        className="pr-10"
                        value={securitySettings.newPassword}
                        onChange={(e) => setSecuritySettings(prev => ({ ...prev, newPassword: e.target.value }))}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input 
                        id="confirmPassword" 
                        type={showConfirmPassword ? "text" : "password"} 
                        className="pr-10"
                        value={securitySettings.confirmPassword}
                        onChange={(e) => setSecuritySettings(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button 
                    className="bg-cyan-600 hover:bg-cyan-700"
                    onClick={handleSavePassword}
                    disabled={saving === 'security'}
                  >
                    {saving === 'security' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </div>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable 2FA</Label>
                      <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {securitySettings.twoFactorEnabled ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500 border-gray-500">
                          Disabled
                        </Badge>
                      )}
                      <Switch 
                        checked={securitySettings.twoFactorEnabled}
                        onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, twoFactorEnabled: checked }))}
                      />
                    </div>
                  </div>
                  <Button variant="outline">Manage 2FA Settings</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Privacy</CardTitle>
                <CardDescription>Control your data and privacy settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Data Analytics</Label>
                    <p className="text-sm text-gray-500">Help improve TrueFi by sharing anonymous usage data</p>
                  </div>
                  <Switch 
                    checked={privacySettings.dataAnalytics}
                    onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, dataAnalytics: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Personalized Recommendations</Label>
                    <p className="text-sm text-gray-500">Use your data to provide personalized financial advice</p>
                  </div>
                  <Switch 
                    checked={privacySettings.personalizedRecommendations}
                    onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, personalizedRecommendations: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Marketing Communications</Label>
                    <p className="text-sm text-gray-500">Receive promotional emails and offers</p>
                  </div>
                  <Switch 
                    checked={privacySettings.marketingCommunications}
                    onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, marketingCommunications: checked }))}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Button variant="outline" className="w-full bg-transparent">
                    <Download className="w-4 h-4 mr-2" />
                    Download My Data
                  </Button>
                  <p className="text-sm text-gray-500">Download a copy of all your data stored with TrueFi</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                <CardDescription>Irreversible and destructive actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Delete Account</h3>
                  <p className="text-sm text-gray-500">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account and remove all your
                          data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                          Yes, delete my account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
