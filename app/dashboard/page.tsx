"use client";
import { GlobalHeader } from "@/components/global-header"
import { EnhancedDashboardContent } from "@/components/enhanced-dashboard-content"
import { DashboardContent } from "@/components/dashboard-content"
import { useUser } from "@/contexts/user-context"
import { useEffect } from 'react'

export default function DashboardPage() {
  const { user } = useUser();
  
  // Clear logged out flag if coming from OAuth
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('oauth_success') === 'true') {
      console.log('OAuth success detected, clearing logged out flag');
      localStorage.removeItem('user_logged_out');
      // Clear the URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('oauth_success');
      window.history.replaceState({}, '', newUrl.toString());
      // Force a page reload to ensure user context picks up the change
      window.location.reload();
    }
  }, []);
  
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <GlobalHeader />
      {/* Remove the top padding since the UltimateDashboard component handles spacing */}
      <div className="pt-0">
        {!user ? <DashboardContent /> : <EnhancedDashboardContent />}
      </div>
    </div>
  )
}
