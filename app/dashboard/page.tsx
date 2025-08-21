"use client";
import { GlobalHeader } from "@/components/global-header"
import { EnhancedDashboardContent } from "@/components/enhanced-dashboard-content"
import { DashboardContent } from "@/components/dashboard-content"
import { useUser } from "@/contexts/user-context"
import { useState, useEffect } from 'react'

export default function DashboardPage() {
  const { user, loading } = useUser();
  const [isClient, setIsClient] = useState(false);
  
  // Ensure hydration safety
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Show loading state during hydration to prevent mismatch
  if (!isClient || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <GlobalHeader />
        <div className="pt-0">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <GlobalHeader />
      <div className="pt-0">
        {!user ? <DashboardContent /> : <EnhancedDashboardContent />}
      </div>
    </div>
  )
}
