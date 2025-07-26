import { GlobalHeader } from "@/components/global-header"
import { SettingsContent } from "@/components/settings-content"
import { Footer } from "@/components/footer"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <GlobalHeader />
      <SettingsContent />
      <Footer />
    </div>
  )
}
