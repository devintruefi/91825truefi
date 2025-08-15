"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Menu, X, User, LogOut } from "lucide-react"
import { useUser } from "@/contexts/user-context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function GlobalHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, logout } = useUser()

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const handleLogout = () => {
    logout()
    closeMenu()
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 w-full bg-white/95 dark:bg-gray-950/95 backdrop-blur-2xl backdrop-saturate-200 border-b border-gray-200/30 dark:border-gray-800/30" style={{backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)'}}>
        <div className="w-full max-w-[980px] mx-auto px-4 sm:px-6">
          <div className="flex h-11 items-center justify-between" style={{height: '44px'}}>
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 hover:opacity-70 transition-opacity duration-200">
              <div className="relative w-10 h-10">
                <Image src="/images/fin-logo.png" alt="TrueFi.ai Logo" fill className="object-contain" />
              </div>
              <span className="text-[21px] font-semibold text-gray-900 dark:text-white" style={{letterSpacing: '-0.016em'}}>TrueFi.ai</span>
            </Link>

            {/* Desktop Navigation Links - Hidden on mobile */}
            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="/chat"
                className="text-[14px] text-gray-900 dark:text-gray-100 hover:opacity-70 transition-opacity duration-200" style={{fontWeight: 400, letterSpacing: '-0.016em'}}
              >
                Chat with Penny
              </Link>
              <Link
                href="/dashboard"
                className="text-[14px] text-gray-900 dark:text-gray-100 hover:opacity-70 transition-opacity duration-200" style={{fontWeight: 400, letterSpacing: '-0.016em'}}
              >
                My Dashboard
              </Link>
            </div>

            {/* Right side controls */}
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMenu}
                className="text-gray-600 dark:text-gray-400 hover:opacity-70 w-9 h-9 rounded-full flex items-center justify-center transition-opacity duration-200"
                aria-label="Toggle menu"
              >
                <Menu className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Apple-style Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[70] transition-opacity duration-500" 
          onClick={closeMenu} 
          style={{
            backdropFilter: 'blur(10px)', 
            WebkitBackdropFilter: 'blur(10px)',
            opacity: isMenuOpen ? 1 : 0
          }} 
        />
      )}

      {/* Apple-style Slide-out Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-[300px] max-w-[85vw] bg-gray-50/95 dark:bg-gray-950/95 z-[80] transform flex flex-col ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          backdropFilter: 'blur(50px) saturate(180%)',
          WebkitBackdropFilter: 'blur(50px) saturate(180%)',
          transition: 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.1)'
        }}
      >
        {/* Minimalist Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="relative w-7 h-7">
              <Image src="/images/fin-logo.png" alt="TrueFi.ai Logo" fill className="object-contain" />
            </div>
            <span className="text-[19px] font-semibold text-gray-900 dark:text-white" style={{letterSpacing: '-0.019em'}}>TrueFi.ai</span>
          </div>
          <button
            onClick={closeMenu}
            className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition-colors duration-200"
            aria-label="Close menu"
          >
            <X className="h-[18px] w-[18px] text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
          </button>
        </div>
        {/* User Section - Apple Style */}
        {user && (
          <div className="mx-5 mb-3 p-3 bg-white/50 dark:bg-gray-900/50 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{user.first_name?.[0]?.toUpperCase()}</span>
                </div>
                <span className="text-[15px] text-gray-900 dark:text-white" style={{fontWeight: 500, letterSpacing: '-0.016em'}}>{user.first_name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-500 transition-colors duration-200"
                aria-label="Sign out"
              >
                <LogOut className="h-[16px] w-[16px]" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}
        {/* Navigation Content - Apple Style */}
        <div className="flex-1 overflow-y-auto" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
          <div className="flex flex-col px-5 py-2">
            {/* Primary Navigation */}
            <div className="mb-6">
              <Link
                href="/"
                onClick={closeMenu}
                className="flex items-center px-3 py-2.5 text-[17px] text-gray-900 dark:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-lg transition-all duration-200" 
                style={{fontWeight: 400, letterSpacing: '-0.021em'}}
              >
                Home
              </Link>
              <Link
                href="/chat"
                onClick={closeMenu}
                className="flex items-center px-3 py-2.5 text-[17px] text-gray-900 dark:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-lg transition-all duration-200" 
                style={{fontWeight: 400, letterSpacing: '-0.021em'}}
              >
                Chat with Penny
              </Link>
              <Link
                href="/dashboard"
                onClick={closeMenu}
                className="flex items-center px-3 py-2.5 text-[17px] text-gray-900 dark:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-lg transition-all duration-200" 
                style={{fontWeight: 400, letterSpacing: '-0.021em'}}
              >
                Dashboard
              </Link>
              <Link
                href="/how-to-use"
                onClick={closeMenu}
                className="flex items-center px-3 py-2.5 text-[17px] text-gray-900 dark:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-lg transition-all duration-200" 
                style={{fontWeight: 400, letterSpacing: '-0.021em'}}
              >
                How It Works
              </Link>
              <Link
                href="/waitlist"
                onClick={closeMenu}
                className="flex items-center px-3 py-2.5 text-[17px] text-gray-900 dark:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-lg transition-all duration-200" 
                style={{fontWeight: 400, letterSpacing: '-0.021em'}}
              >
                Join Waitlist
              </Link>
            </div>
            {/* Secondary Navigation */}
            <div className="pt-3 border-t border-gray-200/20 dark:border-gray-800/20">
              <Link
                href="/auth"
                onClick={closeMenu}
                className="flex items-center px-3 py-2 text-[15px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all duration-200" 
                style={{fontWeight: 400, letterSpacing: '-0.014em'}}
              >
                Sign Up / Log In
              </Link>
              <Link
                href="/about"
                onClick={closeMenu}
                className="flex items-center px-3 py-2 text-[15px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all duration-200" 
                style={{fontWeight: 400, letterSpacing: '-0.014em'}}
              >
                About Us
              </Link>
              <Link
                href="/mission"
                onClick={closeMenu}
                className="flex items-center px-3 py-2 text-[15px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all duration-200" 
                style={{fontWeight: 400, letterSpacing: '-0.014em'}}
              >
                Our Mission
              </Link>
              <Link
                href="/settings"
                onClick={closeMenu}
                className="flex items-center px-3 py-2 text-[15px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all duration-200" 
                style={{fontWeight: 400, letterSpacing: '-0.014em'}}
              >
                Settings
              </Link>
            </div>
            {/* Footer Space */}
            <div className="h-6" />
          </div>
        </div>
      </div>
    </>
  )
}
