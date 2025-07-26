import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand Section */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-3">
              <Image src="/images/fin-logo.png" alt="TrueFi Logo" width={40} height={40} className="object-contain" />
              <span className="text-lg sm:text-xl font-bold">TrueFi.ai</span>
            </div>
            <p className="text-gray-300 text-sm sm:text-base">
              Democratizing financial wellness through AI-powered guidance. Making quality financial advice accessible
              to everyone.
            </p>
            <div className="flex space-x-4">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white h-8 w-8 sm:h-10 sm:w-10">
                <Facebook className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white h-8 w-8 sm:h-10 sm:w-10">
                <Twitter className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white h-8 w-8 sm:h-10 sm:w-10">
                <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white h-8 w-8 sm:h-10 sm:w-10">
                <Linkedin className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">Quick Links</h3>
            <div className="space-y-2">
              <Link
                href="/chat"
                className="block text-gray-300 hover:text-white transition-colors text-sm sm:text-base"
              >
                Chat with Penny
              </Link>
              <Link
                href="/dashboard"
                className="block text-gray-300 hover:text-white transition-colors text-sm sm:text-base"
              >
                My Dashboard
              </Link>
              <Link
                href="/about"
                className="block text-gray-300 hover:text-white transition-colors text-sm sm:text-base"
              >
                About Us
              </Link>
              <Link
                href="/how-to-use"
                className="block text-gray-300 hover:text-white transition-colors text-sm sm:text-base"
              >
                How to Use TrueFi
              </Link>
              <Link
                href="/mission"
                className="block text-gray-300 hover:text-white transition-colors text-sm sm:text-base"
              >
                Our Mission
              </Link>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">Support</h3>
            <div className="space-y-2">
              <Link
                href="/auth"
                className="block text-gray-300 hover:text-white transition-colors text-sm sm:text-base"
              >
                Log In / Sign Up
              </Link>
              <Link
                href="/settings"
                className="block text-gray-300 hover:text-white transition-colors text-sm sm:text-base"
              >
                Settings
              </Link>
              <Link
                href="/waitlist"
                className="block text-gray-300 hover:text-white transition-colors text-sm sm:text-base"
              >
                Join Waitlist
              </Link>
              <Link href="#" className="block text-gray-300 hover:text-white transition-colors text-sm sm:text-base">
                Help Center
              </Link>
              <Link href="#" className="block text-gray-300 hover:text-white transition-colors text-sm sm:text-base">
                Contact Support
              </Link>
            </div>
          </div>

          {/* Newsletter */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <h3 className="text-base sm:text-lg font-semibold">Stay Updated</h3>
            <p className="text-gray-300 text-sm sm:text-base">
              Get the latest financial tips and TrueFi updates delivered to your inbox.
            </p>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Enter your email"
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 text-sm sm:text-base"
              />
              <Button className="w-full bg-cyan-600 hover:bg-cyan-700 min-h-[44px]">Subscribe</Button>
            </div>
          </div>
        </div>

        <Separator className="my-6 sm:my-8 bg-gray-800" />

        {/* Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">
          <div className="flex items-center space-x-2 text-gray-300 justify-center sm:justify-start">
            <Mail className="w-4 h-4" />
            <span className="text-sm sm:text-base">hello@truefi.ai</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-300 justify-center sm:justify-start">
            <Phone className="w-4 h-4" />
            <span className="text-sm sm:text-base">1-800-TRUEFI-1</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-300 justify-center sm:justify-start">
            <MapPin className="w-4 h-4" />
            <span className="text-sm sm:text-base">Los Angeles, CA</span>
          </div>
        </div>

        <Separator className="my-6 sm:my-8 bg-gray-800" />

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="text-gray-400 text-xs sm:text-sm text-center sm:text-left">
            © 2024 TrueFi.ai. All rights reserved.
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6 text-xs sm:text-sm">
            <Link href="#" className="text-gray-400 hover:text-white transition-colors text-center">
              Privacy Policy
            </Link>
            <Link href="#" className="text-gray-400 hover:text-white transition-colors text-center">
              Terms of Service
            </Link>
            <Link href="#" className="text-gray-400 hover:text-white transition-colors text-center">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
