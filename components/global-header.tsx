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
      {/* Demo Banner */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-cyan-50/80 dark:bg-cyan-900/10 border-b border-cyan-200 dark:border-cyan-800 min-h-[48px] py-2">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-center text-center">
          <p className="text-xs sm:text-sm text-cyan-700 dark:text-cyan-200 leading-tight">
            <strong>TrueFi.ai is Coming Soon!</strong>{" "}
            <span className="hidden sm:inline">
              In the meantime, explore the demo using a sample profile named Alex –{" "}
            </span>
            <span className="sm:hidden">Explore the demo – </span>
            <Link href="/chat" className="underline font-medium hover:text-cyan-600 transition-colors">
              Chat with Penny
            </Link>{" "}
            !
          </p>
        </div>
      </div>

      <nav className="fixed top-[48px] left-0 right-0 z-50 w-full border-b bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="relative w-10 h-10">
                <Image src="/images/fin-logo.png" alt="TrueFi.ai Logo" fill className="object-contain" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white text-2xl">TrueFi.ai</span>
            </Link>

            {/* Desktop Navigation Links - Hidden on mobile */}
            <div className="hidden md:flex items-center space-x-6">
              <Link
                href="/chat"
                className="text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Chat with Penny
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                My Dashboard
              </Link>
            </div>

            {/* Right side controls */}
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMenu}
                className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 w-10 h-10"
                aria-label="Toggle menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-[70] transition-opacity duration-300" onClick={closeMenu} />
      )}

      {/* Slide-out Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-900 shadow-2xl z-[80] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Menu Header - Fixed */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="relative w-8 h-8">
              <Image src="/images/fin-logo.png" alt="TrueFi.ai Logo" fill className="object-contain" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-xl">TrueFi.ai</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeMenu}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 w-10 h-10"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        {/* User name and sign out at the top if logged in */}
        {user && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <span className="text-base font-medium text-gray-900 dark:text-white">{user.first_name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 w-10 h-10"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        )}
        {/* Menu Content - Scrollable */}
        <div className="flex-1 overflow-y-auto max-h-[80vh]">
          <div className="flex flex-col p-6 space-y-2">
            {/* Main Navigation Links (always the same) */}
            <Link
              href="/"
              onClick={closeMenu}
              className="flex items-center px-4 py-4 text-lg font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors min-h-[48px] touch-manipulation"
            >
              Home
            </Link>
            <Link
              href="/chat"
              onClick={closeMenu}
              className="flex items-center px-4 py-4 text-lg font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors min-h-[48px] touch-manipulation"
            >
              Chat with Penny
            </Link>
            <Link
              href="/dashboard"
              onClick={closeMenu}
              className="flex items-center px-4 py-4 text-lg font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors min-h-[48px] touch-manipulation"
            >
              Dashboard
            </Link>
            <Link
              href="/how-to-use"
              onClick={closeMenu}
              className="flex items-center px-4 py-4 text-lg font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors min-h-[48px] touch-manipulation"
            >
              How It Works
            </Link>
            <Link
              href="/waitlist"
              onClick={closeMenu}
              className="flex items-center px-4 py-4 text-lg font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors min-h-[48px] touch-manipulation"
            >
              Join Waitlist
            </Link>
            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700 my-4" />
            <Link
              href="/auth"
              onClick={closeMenu}
              className="flex items-center px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors min-h-[48px] touch-manipulation"
            >
              Sign Up / Log In
            </Link>
            <Link
              href="/about"
              onClick={closeMenu}
              className="flex items-center px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors min-h-[48px] touch-manipulation"
            >
              About Us
            </Link>
            <Link
              href="/mission"
              onClick={closeMenu}
              className="flex items-center px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors min-h-[48px] touch-manipulation"
            >
              Our Mission
            </Link>
            <Link
              href="/settings"
              onClick={closeMenu}
              className="flex items-center px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors min-h-[48px] touch-manipulation"
            >
              Settings
            </Link>
            {/* Bottom padding for scroll comfort */}
            <div className="h-4" />
          </div>
        </div>
      </div>
    </>
  )
}
