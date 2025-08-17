"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiClient } from '@/lib/api-client'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  is_advisor: boolean
  created_at: string
}

interface UserContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  createUser: (userData: {
    email: string
    first_name: string
    last_name: string
    password: string
    is_advisor: boolean
  }) => Promise<void>
  switchToUser: (userId: string) => Promise<void>
  clearAllUserData: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check for existing user session on mount
  useEffect(() => {
    const checkUserSession = async () => {
      console.log('=== Starting user session check ===');
      try {
        // First, check if we're coming from an OAuth callback
        // OAuth login should always override the logged out state
        const urlParams = new URLSearchParams(window.location.search);
        const isOAuthCallback = urlParams.has('oauth_success') || window.location.pathname === '/dashboard';
        
        const hasLoggedOut = localStorage.getItem('user_logged_out') === 'true'
        if (hasLoggedOut && !isOAuthCallback) {
          console.log('User has logged out, skipping session check');
          setLoading(false)
          return
        } else if (hasLoggedOut && isOAuthCallback) {
          console.log('OAuth callback detected, clearing logged out state');
          localStorage.removeItem('user_logged_out');
        }

        // Check for cookies first (from OAuth callback)
        console.log('Checking for cookies...');
        console.log('All cookies:', document.cookie);
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          if (key) acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        console.log('Parsed cookies:', cookies);

        if (cookies.auth_token) {
          console.log('Found auth_token in cookies, storing in localStorage');
          // Store in localStorage for persistence
          localStorage.setItem('auth_token', cookies.auth_token);
        } else {
          console.log('No auth_token cookie found');
        }

        if (cookies.user_data) {
          try {
            const userData = JSON.parse(decodeURIComponent(cookies.user_data));
            console.log('Found user_data in cookies:', userData);
            // Store in localStorage
            localStorage.setItem('current_user_data', JSON.stringify(userData));
            localStorage.setItem('current_user_id', userData.id);
            // Clear the cookie after reading
            document.cookie = 'user_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          } catch (err) {
            console.error('Failed to parse user_data cookie:', err);
          }
        } else {
          console.log('No user_data cookie found');
        }

        // Check for OAuth token - this should take priority over everything else
        const authToken = localStorage.getItem('auth_token')
        if (authToken) {
          try {
            console.log('Found OAuth token, validating with backend...');
            // Try to validate token with backend
            const response = await fetch('http://localhost:8080/api/auth/validate', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              const userData = await response.json();
              console.log('OAuth token validated successfully, user data:', userData);
              setUser(userData);
              localStorage.setItem('current_user_id', userData.id);
              localStorage.setItem('current_user_data', JSON.stringify(userData));
              // Clear any demo user data since we have a real user
              localStorage.removeItem('demo_user_id');
              setLoading(false);
              return;
            } else {
              // Token is invalid, clear it
              console.log('OAuth token invalid, clearing');
              localStorage.removeItem('auth_token');
              localStorage.removeItem('current_user_data');
              localStorage.removeItem('current_user_id');
            }
          } catch (err) {
            console.log('Backend not available for token validation:', err);
            // If backend is not available, we should not fall back to demo user
            // Clear the token and continue to check other auth methods
            localStorage.removeItem('auth_token');
          }
        }

        // Check for existing user data (but not demo users)
        const currentUserData = localStorage.getItem('current_user_data')
        if (currentUserData) {
          try {
            const user = JSON.parse(currentUserData)
            
            // Check if user has invalid UUID format and clear it
            if (user.id && (user.id.startsWith('local-user-') || user.id === 'demo-user-id')) {
              console.log('Clearing invalid user session with old UUID format')
              localStorage.removeItem('current_user_data')
              localStorage.removeItem('current_user_id')
              localStorage.removeItem('demo_user_id')
              setUser(null)
              setLoading(false)
              return
            }
            
            // Only set user if it's not a demo user
            if (user.email !== 'demo@truefi.ai') {
              console.log('Setting existing user from localStorage:', user);
              setUser(user)
              setLoading(false)
              return
            } else {
              console.log('Clearing demo user data from localStorage');
              localStorage.removeItem('current_user_data')
              localStorage.removeItem('current_user_id')
            }
          } catch (err) {
            console.error('Failed to parse current user data:', err)
            localStorage.removeItem('current_user_data')
          }
        }

        // Only check for demo user if no OAuth token and no real user data
        const demoUserId = localStorage.getItem('demo_user_id')
        if (demoUserId && !authToken) {
          // Check if demo user ID is the old format and clear it
          if (demoUserId === 'demo-user-id') {
            console.log('Clearing old demo user session')
            localStorage.removeItem('demo_user_id')
            setUser(null)
            setLoading(false)
            return
          }
          
          console.log('Setting demo user as fallback');
          const demoUser = {
            id: '123e4567-e89b-12d3-a456-426614174000', // Fixed demo UUID
            email: 'demo@truefi.ai',
            first_name: 'Demo',
            last_name: 'User',
            is_advisor: false,
            created_at: new Date().toISOString()
          }
          setUser(demoUser)
          setLoading(false)
          return
        }

        // No user found, set to null
        setUser(null)
      } catch (err) {
        console.error('Failed to initialize user session:', err)
        setError('Failed to load user session')
        const hasLoggedOut = localStorage.getItem('user_logged_out') === 'true'
        if (!hasLoggedOut && 
            window.location.pathname !== '/auth/signin' && 
            window.location.pathname !== '/auth/signup' &&
            window.location.pathname !== '/') {
          window.location.href = '/auth/signin'
        }
      } finally {
        setLoading(false)
      }
    }

    checkUserSession()
  }, [])

  useEffect(() => {
    console.log('Redirect effect triggered:', { loading, user, pathname: window.location.pathname })
    if (!loading && user) {
      const hasLoggedOut = localStorage.getItem('user_logged_out') === 'true'
      console.log('Has logged out:', hasLoggedOut)
      if (!hasLoggedOut) {
        const isOnAuthPage = window.location.pathname.startsWith('/auth') || window.location.pathname === '/auth'
        console.log('Is on auth page:', isOnAuthPage)
        if (isOnAuthPage) {
          console.log('Redirecting to /chat for onboarding')
          // Check if user has completed onboarding
          const hasCompletedOnboarding = user.has_completed_onboarding || localStorage.getItem('onboarding_complete') === 'true'
          if (!hasCompletedOnboarding) {
            window.location.href = '/chat?onboarding=true'
          } else {
            window.location.href = '/dashboard'
          }
        }
      }
    }
  }, [user, loading])

  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    localStorage.removeItem('user_logged_out')
    try {
      // Special case for demo user
      if (email === 'demo@truefi.ai' && password === 'demo123') {
        const demoUser = {
          id: '123e4567-e89b-12d3-a456-426614174000', // Fixed demo UUID
          email: 'demo@truefi.ai',
          first_name: 'Demo',
          last_name: 'User',
          is_advisor: false,
          created_at: new Date().toISOString()
        }
        setUser(demoUser)
        localStorage.setItem('demo_user_id', demoUser.id)
        return
      }

      // Try to call backend API for real user authentication
      try {
        const response = await fetch('http://localhost:8080/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: password,
          }),
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('Login successful:', userData);
          setUser(userData);
          localStorage.setItem('current_user_id', userData.id);
          localStorage.setItem('current_user_data', JSON.stringify(userData));
          if (userData.token) {
            localStorage.setItem('auth_token', userData.token);
          }
          localStorage.removeItem('demo_user_id'); // Clear demo user data
          return;
        } else {
          const errorData = await response.json();
          throw new Error(`Login failed: ${errorData.detail || errorData.message || 'Invalid credentials'}`);
        }
      } catch (backendError) {
        console.log('Backend authentication not available, checking local users:', backendError);
        
        // Fallback: Check if user exists in localStorage
        const localUsers = JSON.parse(localStorage.getItem('local_users') || '[]');
        const user = localUsers.find((u: any) => u.email === email && u.password === password);
        
        if (user) {
          console.log('Local user found:', user);
          setUser({
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            is_advisor: user.is_advisor,
            created_at: user.created_at
          });
          localStorage.setItem('current_user_id', user.id);
          localStorage.setItem('current_user_data', JSON.stringify(user));
          localStorage.removeItem('demo_user_id');
          return;
        }
        
        throw new Error('Invalid email or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.setItem('user_logged_out', 'true')
    localStorage.removeItem('demo_user_id')
    localStorage.removeItem('plaid_user_id')
    localStorage.removeItem('current_user_id')
    localStorage.removeItem('current_user_data')
    window.location.href = '/'
  }

  const createUser = async (userData: {
    email: string
    first_name: string
    last_name: string
    password: string
    is_advisor: boolean
  }) => {
    setLoading(true)
    setError(null)
    localStorage.removeItem('user_logged_out')
    localStorage.removeItem('demo_user_id')
    try {
      // Try to call backend API first
      try {
        const response = await fetch('http://localhost:8080/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            password: userData.password,
            is_advisor: userData.is_advisor || false,
          }),
        });

        if (response.ok) {
          const newUser = await response.json();
          console.log('Created user via backend:', newUser);
          setUser(newUser);
          localStorage.setItem('current_user_id', newUser.id);
          localStorage.setItem('current_user_data', JSON.stringify(newUser));
          return;
        } else {
          const errorData = await response.json();
          throw new Error(`Failed to create user: ${errorData.detail || errorData.message || 'Registration failed'}`);
        }
      } catch (backendError) {
        console.log('Backend user creation not available, creating local user:', backendError);
        
        // Fallback: Create local user
        const localUsers = JSON.parse(localStorage.getItem('local_users') || '[]');
        
        // Check if user already exists
        const existingUser = localUsers.find((u: any) => u.email === userData.email);
        if (existingUser) {
          throw new Error('User with this email already exists');
        }
        
        // Create new local user
        const newUser = {
          id: crypto.randomUUID(),
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          password: userData.password, // Note: In production, this should be hashed
          is_advisor: userData.is_advisor || false,
          created_at: new Date().toISOString()
        };
        
        // Add to local users array
        localUsers.push(newUser);
        localStorage.setItem('local_users', JSON.stringify(localUsers));
        
        console.log('Created local user:', newUser);
        setUser({
          id: newUser.id,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          is_advisor: newUser.is_advisor,
          created_at: newUser.created_at
        });
        localStorage.setItem('current_user_id', newUser.id);
        localStorage.setItem('current_user_data', JSON.stringify(newUser));
      }
    } catch (err) {
      console.error('Create user error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  const switchToUser = async (userId: string) => {
    setLoading(true)
    setError(null)
    localStorage.removeItem('user_logged_out')
    try {
      // Try to call backend API first
      try {
        const response = await fetch(`http://localhost:8080/api/users/${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('Switched to user via backend:', userData);
          setUser(userData);
          localStorage.setItem('current_user_id', userData.id);
          localStorage.setItem('current_user_data', JSON.stringify(userData));
          localStorage.removeItem('demo_user_id');
          return;
        } else {
          const errorData = await response.json();
          throw new Error(`Failed to switch user: ${errorData.detail || errorData.message || 'User not found'}`);
        }
      } catch (backendError) {
        console.log('Backend user lookup not available, checking local users:', backendError);
        
        // Fallback: Check local users
        const localUsers = JSON.parse(localStorage.getItem('local_users') || '[]');
        const user = localUsers.find((u: any) => u.id === userId);
        
        if (user) {
          console.log('Found local user:', user);
          setUser({
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            is_advisor: user.is_advisor,
            created_at: user.created_at
          });
          localStorage.setItem('current_user_id', user.id);
          localStorage.setItem('current_user_data', JSON.stringify(user));
          localStorage.removeItem('demo_user_id');
          return;
        }
        
        throw new Error('User not found');
      }
    } catch (err) {
      console.error('Switch user error:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch user');
      throw err;
    } finally {
      setLoading(false)
    }
  }

  const clearAllUserData = () => {
    localStorage.removeItem('current_user_data')
    localStorage.removeItem('current_user_id')
    localStorage.removeItem('demo_user_id')
    localStorage.removeItem('local_users')
    localStorage.removeItem('auth_token')
    setUser(null)
    console.log('All user data cleared')
  }

  return (
    <UserContext.Provider value={{
      user,
      loading,
      error,
      login,
      logout,
      createUser,
      switchToUser,
      clearAllUserData
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}