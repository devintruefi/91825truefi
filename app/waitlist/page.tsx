import { GlobalHeader } from "@/components/global-header"
import { WaitlistContent } from "@/components/waitlist-content"
import { Footer } from "@/components/footer"

export default function WaitlistPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <GlobalHeader />
      <main>
        <WaitlistContent />
      </main>
      <Footer />
    </div>
  )
}
