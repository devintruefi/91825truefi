"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { MessageCircle, BarChart3, Settings, Home, Info, UserPlus, BookOpen, Users, Target } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

const items = [
  { title: "Home", url: "/", icon: Home },
  { title: "Chat with Penny", url: "/chat", icon: MessageCircle },
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "How It Works", url: "/how-to-use", icon: BookOpen },
  { title: "Join Waitlist", url: "/waitlist", icon: UserPlus },
  { title: "Sign Up / Log In", url: "/auth", icon: Users },
  { title: "About Us", url: "/about", icon: Info },
  { title: "Our Mission", url: "/mission", icon: Target },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" className="transition-all duration-300">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <div className="relative w-8 h-8 flex-shrink-0">
            <Image src="/images/truefi-logo.webp" alt="TrueFi.ai Logo" fill className="object-contain" />
          </div>
          <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">TrueFi.ai</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="touch-target transition-colors duration-200">
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
