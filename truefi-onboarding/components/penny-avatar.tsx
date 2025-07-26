import { cn } from "@/lib/utils"

interface PennyAvatarProps {
  className?: string
}

export function PennyAvatar({ className }: PennyAvatarProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Outer ethereal glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-300/40 via-teal-400/30 to-cyan-400/40 blur-3xl animate-pulse"></div>

      {/* Secondary glow ring */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-300/20 via-emerald-400/25 to-teal-400/20 blur-2xl animate-pulse delay-700"></div>

      {/* Magical aura */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/10 via-emerald-300/15 to-white/10 blur-xl animate-pulse delay-1000"></div>

      {/* Main avatar container */}
      <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-emerald-200/80 via-teal-300/70 to-cyan-300/80 flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.4)] border-4 border-white/30 backdrop-blur-sm">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-white/90 via-emerald-50/80 to-teal-50/70 flex items-center justify-center backdrop-blur-sm shadow-inner">
          <div className="text-5xl animate-pulse">💎</div>
        </div>
      </div>

      {/* Status indicator with magical glow */}
      <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 rounded-full border-4 border-white/40 animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.6)] flex items-center justify-center backdrop-blur-sm">
        <div className="w-5 h-5 bg-white rounded-full animate-pulse shadow-lg"></div>
      </div>

      {/* Floating magical particles around avatar */}
      <div className="absolute -top-4 -left-4 w-4 h-4 bg-emerald-300/70 rounded-full animate-bounce delay-0 blur-sm shadow-[0_0_20px_rgba(16,185,129,0.8)]"></div>
      <div className="absolute -top-3 -right-5 w-3 h-3 bg-teal-300/60 rounded-full animate-bounce delay-300 blur-sm shadow-[0_0_15px_rgba(20,184,166,0.7)]"></div>
      <div className="absolute -bottom-4 -left-5 w-2.5 h-2.5 bg-cyan-300/50 rounded-full animate-bounce delay-700 blur-sm shadow-[0_0_12px_rgba(6,182,212,0.6)]"></div>
      <div className="absolute -bottom-2 -right-6 w-2 h-2 bg-amber-300/60 rounded-full animate-bounce delay-1000 blur-sm shadow-[0_0_10px_rgba(245,158,11,0.8)]"></div>
      <div className="absolute top-1/2 -left-6 w-1.5 h-1.5 bg-purple-300/40 rounded-full animate-bounce delay-500 blur-sm shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div>
    </div>
  )
}
