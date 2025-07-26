"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Menu, X, ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function EnhancedNavbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Demo Banner */}
      <div className="bg-cyan-100 dark:bg-cyan-900/20 border-b border-cyan-200 dark:border-cyan-800">
        <div className="container mx-auto px-4 py-2 text-center">
          <p className="text-sm text-cyan-800 dark:text-cyan-200">
            <strong>TrueFi.ai is Coming Soon!</strong> In the meantime, explore the demo using a sample profile named
            Alex –{" "}
            <Link href="/chat" className="underline font-medium hover:text-cyan-600 transition-colors">
              Chat with Penny
            </Link>{" "}
            !
          </p>
        </div>
      </div>

      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="relative w-10 h-10">
                <Image src="/images/website-logo.png" alt="TrueFi.ai Logo" fill className="object-contain" />
              </div>
              <span className="font-semibold text-xl">TrueFi.ai</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <Link
                href="/chat"
                className="text-sm font-medium hover:text-primary transition-colors touch-target flex items-center justify-center"
              >
                Chat with Penny
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-medium hover:text-primary transition-colors touch-target flex items-center justify-center"
              >
                My Dashboard
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-sm font-medium touch-target flex items-center gap-1">
                    Menu
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>Sign Up / Log In</DropdownMenuItem>
                  <DropdownMenuItem>About Us</DropdownMenuItem>
                  <DropdownMenuItem>How to Use TrueFi</DropdownMenuItem>
                  <DropdownMenuItem>Our Mission</DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="w-full">
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <ThemeToggle />
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden flex items-center space-x-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className="touch-target"
                aria-label="Toggle menu"
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <div className="md:hidden border-t py-4 mobile-padding">
              <div className="flex flex-col space-y-4">
                <Link
                  href="/chat"
                  className="text-sm font-medium hover:text-primary transition-colors touch-target py-2"
                  onClick={() => setIsOpen(false)}
                >
                  Chat with Penny
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium hover:text-primary transition-colors touch-target py-2"
                  onClick={() => setIsOpen(false)}
                >
                  My Dashboard
                </Link>
                <Link
                  href="/settings"
                  className="text-sm font-medium hover:text-primary transition-colors touch-target py-2"
                  onClick={() => setIsOpen(false)}
                >
                  Settings
                </Link>
                <div className="text-sm font-medium text-muted-foreground py-2">Sign Up / Log In</div>
                <div className="text-sm font-medium text-muted-foreground py-2">About Us</div>
                <div className="text-sm font-medium text-muted-foreground py-2">How to Use TrueFi</div>
                <div className="text-sm font-medium text-muted-foreground py-2">Our Mission</div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  )
}
