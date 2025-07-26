"use client";
import { GlobalHeader } from "@/components/global-header"
import { EnhancedDashboardContent } from "@/components/enhanced-dashboard-content"
import { DashboardContent } from "@/components/dashboard-content"
import { useUser } from "@/contexts/user-context"

export default function DashboardPage() {
  const { user } = useUser();
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <GlobalHeader />
      {!user ? <DashboardContent /> : <EnhancedDashboardContent />}
    </div>
  )
}
