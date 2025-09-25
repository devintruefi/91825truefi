import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { UserProvider } from "@/contexts/user-context"

export const metadata: Metadata = {
  title: "TrueFi.ai - AI-Driven Personal Finance",
  description:
    "AI-native personal finance platform with Penny, your AI financial assistant for budgeting, saving, and reaching long-term goals.",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
          storageKey="truefi-theme"
        >
          <UserProvider>
            <SidebarProvider>
              {/* Add a CSS class for consistent header spacing */}
              <div className="header-spacing">
                {children}
              </div>
            </SidebarProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
