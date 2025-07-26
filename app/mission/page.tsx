import { GlobalHeader } from "@/components/global-header"
import { MissionContent } from "@/components/mission-content"
import { Footer } from "@/components/footer"

export default function MissionPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <GlobalHeader />
      <MissionContent />
      <Footer />
    </div>
  )
}
