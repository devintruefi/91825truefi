import { GlobalHeader } from "@/components/global-header"
import { AboutUsContent } from "@/components/about-us-content"
import { Footer } from "@/components/footer"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <GlobalHeader />
      <AboutUsContent />
      <Footer />
    </div>
  )
}
