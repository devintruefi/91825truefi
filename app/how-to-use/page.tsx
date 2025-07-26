import { GlobalHeader } from "@/components/global-header"
import { HowToUseContent } from "@/components/how-to-use-content"
import { Footer } from "@/components/footer"

export default function HowToUsePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <GlobalHeader />
      <HowToUseContent />
      <Footer />
    </div>
  )
}
