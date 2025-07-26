import { GlobalHeader } from "@/components/global-header"
import { AuthContent } from "@/components/auth-content"

export default function AuthPage() {
  return (
    <div className="min-h-screen">
      <GlobalHeader />
      <main>
        <AuthContent />
      </main>
    </div>
  )
}
