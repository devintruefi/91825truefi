import { GlobalHeader } from "@/components/global-header"
import { HeroSection } from "@/components/hero-section"
import { FeaturesSection } from "@/components/features-section"
import { PennySection } from "@/components/penny-section"
import { SecuritySection } from "@/components/security-section"
import { TestimonialsSection } from "@/components/testimonials-section"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <div className="min-h-screen transition-colors duration-300">
      <GlobalHeader />
      <HeroSection />
      <PennySection />
      <FeaturesSection />
      <SecuritySection />
      <TestimonialsSection />
      <Footer />
    </div>
  )
}
