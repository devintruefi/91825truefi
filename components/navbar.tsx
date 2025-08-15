"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Menu, X } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-white/95 dark:bg-gray-950/95 backdrop-blur-2xl backdrop-saturate-200 border-b border-gray-200/30 dark:border-gray-800/30" style={{backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)'}}>
        <div className="max-w-[980px] mx-auto px-4">
          <div className="flex items-center justify-between" style={{height: '44px'}}>
            <Link href="/" className="flex items-center space-x-2 hover:opacity-70 transition-opacity duration-200">
              <div className="relative w-10 h-10">
                <Image src="/images/truefi-logo.png" alt="TrueFi.ai Logo" fill className="object-contain" />
              </div>
              <span className="text-[21px] font-semibold text-gray-900 dark:text-white" style={{letterSpacing: '-0.016em'}}>TrueFi.ai</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="/chat"
                className="text-[14px] text-gray-900 dark:text-gray-100 hover:opacity-70 transition-opacity duration-200 flex items-center justify-center" style={{fontWeight: 400, letterSpacing: '-0.016em'}}
              >
                Chat with Penny
              </Link>
              <Link
                href="/dashboard"
                className="text-[14px] text-gray-900 dark:text-gray-100 hover:opacity-70 transition-opacity duration-200 flex items-center justify-center" style={{fontWeight: 400, letterSpacing: '-0.016em'}}
              >
                My Dashboard
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-[14px] text-gray-900 dark:text-gray-100 hover:opacity-70 transition-opacity duration-200" style={{fontWeight: 400, letterSpacing: '-0.016em'}}>
                    Platform
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-950 border border-gray-200/30 dark:border-gray-800/30 shadow-xl rounded-lg" style={{backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)'}}>
                  <DropdownMenuItem asChild>
                    <Link href="/chat" className="w-full">
                      Chat with Penny
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="w-full">
                      My Finances Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>Sign Up / Log In</DropdownMenuItem>
                  <DropdownMenuItem>About Us</DropdownMenuItem>
                  <DropdownMenuItem>Our Mission</DropdownMenuItem>
                  <DropdownMenuItem>How to Use TrueFi</DropdownMenuItem>
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
                {isOpen ? <X className="h-[18px] w-[18px]" strokeWidth={1.5} /> : <Menu className="h-[18px] w-[18px]" strokeWidth={1.5} />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <div className="md:hidden border-t border-gray-200/30 dark:border-gray-800/30 py-4 px-4 bg-white dark:bg-gray-950">
              <div className="flex flex-col space-y-4">
                <Link
                  href="/chat"
                  className="text-[14px] text-gray-900 dark:text-gray-100 hover:opacity-70 transition-opacity duration-200 py-2" style={{fontWeight: 400, letterSpacing: '-0.016em'}}
                  onClick={() => setIsOpen(false)}
                >
                  Chat with Penny
                </Link>
                <Link
                  href="/dashboard"
                  className="text-[14px] text-gray-900 dark:text-gray-100 hover:opacity-70 transition-opacity duration-200 py-2" style={{fontWeight: 400, letterSpacing: '-0.016em'}}
                  onClick={() => setIsOpen(false)}
                >
                  My Dashboard
                </Link>
                <Link
                  href="#"
                  className="text-[14px] text-gray-900 dark:text-gray-100 hover:opacity-70 transition-opacity duration-200 py-2" style={{fontWeight: 400, letterSpacing: '-0.016em'}}
                  onClick={() => setIsOpen(false)}
                >
                  Settings
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  )
}
