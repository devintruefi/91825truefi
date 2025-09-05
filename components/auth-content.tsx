"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { useUser } from "@/contexts/user-context"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Third-party auth handler functions (placeholders)

export function AuthContent() {
  const { login, createUser, loading, error, user } = useUser()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [activeTab, setActiveTab] = useState("login")
  const [localError, setLocalError] = useState("")
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [transferComplete, setTransferComplete] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)
  const [transferError, setTransferError] = useState("")

  // Login form state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  // Registration form state
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [isAdvisor, setIsAdvisor] = useState(false)

  // Check if user completed onboarding
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('onboarding') === 'complete') {
      setOnboardingComplete(true);
      // Auto-switch to register tab for onboarding completers
      setActiveTab("register");
    }
  }, []);

  // Handle OAuth callback with token
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const provider = urlParams.get('provider');
    
    if (token && provider) {
      console.log('OAuth callback received with token:', { provider, token });
      
      // Clear any existing demo user data
      localStorage.removeItem('demo_user_id');
      localStorage.removeItem('current_user_data');
      localStorage.removeItem('current_user_id');
      
      // Store the token in localStorage for the user context
      localStorage.setItem('auth_token', token);
      
      // Clear the URL parameters to avoid showing them
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('token');
      newUrl.searchParams.delete('provider');
      window.history.replaceState({}, '', newUrl.toString());
      
      // Redirect to dashboard - the user context should pick up the token
      // Dashboard will handle guided onboarding for new users
      window.location.href = '/dashboard';
    }
  }, []);

  const transferOnboardingAnswers = async () => {
    try {
      setIsTransferring(true);
      setTransferError("");
      
      const tempAnswers = localStorage.getItem('temp_onboarding_answers');
      const tempUserId = localStorage.getItem('temp_onboarding_user_id');
      
      if (tempAnswers && tempUserId && user) {
        // Transfer answers to new user account
        const response = await fetch("/api/onboarding/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tempUserId,
            newUserId: user.id,
            answers: JSON.parse(tempAnswers)
          }),
        });
        
        if (response.ok) {
          // Clean up temporary data
          localStorage.removeItem('temp_onboarding_answers');
          localStorage.removeItem('temp_onboarding_user_id');
          console.log('Onboarding data transferred successfully');
          setTransferComplete(true);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to transfer onboarding data');
        }
      } else {
        throw new Error('No onboarding data found to transfer');
      }
    } catch (error) {
      console.error("Failed to transfer onboarding answers:", error);
      setTransferError(error instanceof Error ? error.message : "Failed to transfer your financial profile. Please contact support.");
    } finally {
      setIsTransferring(false);
    }
  };

  // Transfer onboarding data when user is created
  useEffect(() => {
    if (user && onboardingComplete && !transferComplete && !isTransferring) {
      transferOnboardingAnswers();
    }
  }, [user, onboardingComplete, transferComplete, isTransferring]);

  // Refresh page after transfer is complete to ensure user context is updated
  useEffect(() => {
    if (transferComplete) {
      setTimeout(() => {
        // Clear any temporary data from localStorage
        localStorage.removeItem('temp_onboarding_user_id');
        localStorage.removeItem('temp_onboarding_answers');
        
        // Clear the current user data to force a fresh context reload
        // This ensures the user context picks up the new user ID from the database
        localStorage.removeItem('current_user_data');
        localStorage.removeItem('current_user_id');
        
        // Force a page reload to ensure the user context gets completely refreshed
        // with the new user ID from the database
        window.location.reload();
      }, 2000);
    }
  }, [transferComplete]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError("")
    try {
      await login(loginEmail, loginPassword)
    } catch (err) {
      console.error("Login failed:", err)
      setLocalError("Invalid email or password. Please try again.")
    }
  }

  const handleGoogleAuth = async () => {
    try {
      // Call the OAuth init endpoint
      const response = await fetch('/api/auth/oauth/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          provider: 'google',
          redirect_uri: `${window.location.origin}/api/auth/callback/google`
        }),
      });

      if (response.ok) {
        const { auth_url } = await response.json();
        // Redirect to Google OAuth
        window.location.href = auth_url;
      } else {
        throw new Error('Failed to initialize Google OAuth');
      }
    } catch (error) {
      console.error('Google OAuth error:', error);
      setLocalError('Failed to start Google authentication. Please try again.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError("")

    // Validate passwords match
    if (registerPassword !== confirmPassword) {
      setLocalError("Passwords do not match")
      return
    }

    // Validate password strength
    if (registerPassword.length < 8) {
      setLocalError("Password must be at least 8 characters long")
      return
    }

    // Validate terms acceptance
    if (!isAdvisor) {
      setLocalError("You must agree to the Terms and Conditions")
      return
    }

    try {
      await createUser({
        email: registerEmail,
        first_name: firstName,
        last_name: lastName,
        password: registerPassword,
        is_advisor: false // Always set to false for regular users
      })
      // Wait a moment for the user context to update, then redirect to onboarding
      // The user context will handle the redirect automatically in its useEffect
    } catch (err) {
      console.error("Registration failed:", err)
      setLocalError("Registration failed. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-screen-xl mx-auto flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome to TrueFi</h1>
            <p className="text-gray-600 dark:text-gray-400">Your AI-powered financial companion</p>
          </div>

          {(localError || error) && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{localError || error}</AlertDescription>
            </Alert>
          )}

          {onboardingComplete && (
            <Alert className="mb-4 border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Great! We've saved your financial profile. Create an account to continue with your personalized experience.
              </AlertDescription>
            </Alert>
          )}

          {isTransferring && (
            <Alert className="mb-4 border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Transferring your financial profile to your new account...
              </AlertDescription>
            </Alert>
          )}

          {transferError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{transferError}</AlertDescription>
            </Alert>
          )}

          {transferComplete && (
            <Alert className="mb-4 border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Perfect! Your financial profile has been transferred to your new account. Redirecting you to your personalized dashboard...
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Sign In</CardTitle>
                  <CardDescription>Choose your preferred sign-in method</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Third-party Authentication Buttons */}
                  <div className="space-y-3">
                    {/* Google Sign In */}
                    <Button
                      onClick={handleGoogleAuth}
                      variant="outline"
                      className="w-full h-12 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                      aria-label="Sign in with Google"
                    >
                      <div className="flex items-center justify-center space-x-3">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                      </div>
                    </Button>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">or</span>
                    </div>
                  </div>

                  {/* Email/Password Form */}
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input 
                          id="login-email" 
                          type="email" 
                          placeholder="Enter your email" 
                          className="pl-10"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="pl-10 pr-10"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember" />
                      <Label htmlFor="remember" className="text-sm">
                        Remember me
                      </Label>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-cyan-600 hover:bg-cyan-700"
                      disabled={loading}
                    >
                      {loading ? "Signing In..." : "Sign In"}
                    </Button>
                    <div className="text-center">
                      <Button variant="link" className="text-sm text-cyan-600 hover:text-cyan-700">
                        Forgot your password?
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>Choose your preferred registration method</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Third-party Authentication Buttons */}
                  <div className="space-y-3">
                    {/* Google Sign Up */}
                    <Button
                      onClick={handleGoogleAuth}
                      variant="outline"
                      className="w-full h-12 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                      aria-label="Sign up with Google"
                    >
                      <div className="flex items-center justify-center space-x-3">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                      </div>
                    </Button>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">or</span>
                    </div>
                  </div>

                  {/* Registration Form */}
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first-name">First Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input 
                            id="first-name" 
                            type="text" 
                            placeholder="First name" 
                            className="pl-10"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-name">Last Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input 
                            id="last-name" 
                            type="text" 
                            placeholder="Last name" 
                            className="pl-10"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input 
                          id="register-email" 
                          type="email" 
                          placeholder="Enter your email" 
                          className="pl-10"
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="register-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          className="pl-10 pr-10"
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          className="pl-10 pr-10"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
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
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="terms" 
                        checked={isAdvisor}
                        onCheckedChange={(checked) => setIsAdvisor(checked as boolean)}
                        required
                      />
                      <Label htmlFor="terms" className="text-sm">
                        I agree to the{" "}
                        <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:text-cyan-700 underline">
                          Terms and Conditions
                        </a>
                        {" "}and{" "}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:text-cyan-700 underline">
                          Privacy Policy
                        </a>
                      </Label>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-cyan-600 hover:bg-cyan-700"
                      disabled={loading || isTransferring}
                    >
                      {loading ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
