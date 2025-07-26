"use client"

export function FloatingOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 4 }}>
      {/* Large ethereal orbs */}
      <div className="absolute top-1/4 left-1/5 w-32 h-32 bg-gradient-radial from-emerald-300/20 via-emerald-400/10 to-transparent rounded-full blur-2xl animate-float opacity-60"></div>
      <div className="absolute top-1/3 right-1/4 w-40 h-40 bg-gradient-radial from-teal-300/15 via-teal-400/8 to-transparent rounded-full blur-2xl animate-float-delayed opacity-50"></div>
      <div className="absolute bottom-1/3 left-1/3 w-36 h-36 bg-gradient-radial from-cyan-300/18 via-cyan-400/9 to-transparent rounded-full blur-2xl animate-float-slow opacity-55"></div>

      {/* Medium floating elements */}
      <div className="absolute top-1/2 right-1/5 w-24 h-24 bg-gradient-radial from-emerald-400/25 via-emerald-500/12 to-transparent rounded-full blur-xl animate-float opacity-40"></div>
      <div className="absolute bottom-1/4 right-1/3 w-28 h-28 bg-gradient-radial from-teal-400/20 via-teal-500/10 to-transparent rounded-full blur-xl animate-float-delayed opacity-45"></div>

      {/* Small magical sparkles */}
      <div className="absolute top-2/3 left-1/4 w-16 h-16 bg-gradient-radial from-amber-300/30 via-amber-400/15 to-transparent rounded-full blur-lg animate-float-slow opacity-35"></div>
      <div className="absolute top-1/6 left-2/3 w-20 h-20 bg-gradient-radial from-purple-300/25 via-purple-400/12 to-transparent rounded-full blur-lg animate-float opacity-40"></div>

      {/* Tiny floating lights */}
      <div className="absolute top-1/5 left-1/2 w-8 h-8 bg-gradient-radial from-emerald-400/40 via-emerald-500/20 to-transparent rounded-full blur-md animate-float opacity-60"></div>
      <div className="absolute bottom-1/5 right-1/2 w-12 h-12 bg-gradient-radial from-teal-400/35 via-teal-500/18 to-transparent rounded-full blur-md animate-float-slow opacity-50"></div>
      <div className="absolute top-2/3 left-1/6 w-10 h-10 bg-gradient-radial from-cyan-400/30 via-cyan-500/15 to-transparent rounded-full blur-md animate-float-delayed opacity-45"></div>
    </div>
  )
}
