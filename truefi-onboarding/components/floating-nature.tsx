"use client"

export function FloatingNature() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Gentle floating elements */}
      <div className="absolute top-1/4 left-1/5 animate-float opacity-30">
        <div className="text-4xl text-emerald-400">🌿</div>
      </div>
      <div className="absolute top-1/3 right-1/4 animate-float-delayed opacity-25">
        <div className="text-3xl text-teal-400">🍃</div>
      </div>
      <div className="absolute bottom-1/3 left-1/3 animate-float-slow opacity-20">
        <div className="text-5xl text-green-400">🌱</div>
      </div>
      <div className="absolute top-1/2 right-1/5 animate-float opacity-30">
        <div className="text-2xl text-emerald-300">✨</div>
      </div>
      <div className="absolute bottom-1/4 right-1/3 animate-float-delayed opacity-25">
        <div className="text-3xl text-amber-400">🦋</div>
      </div>
      <div className="absolute top-2/3 left-1/4 animate-float-slow opacity-20">
        <div className="text-4xl text-yellow-300">🌸</div>
      </div>

      {/* Soft light orbs */}
      <div className="absolute top-1/6 left-1/2 w-6 h-6 bg-amber-300/20 rounded-full animate-float blur-sm"></div>
      <div className="absolute bottom-1/5 right-1/2 w-8 h-8 bg-emerald-300/15 rounded-full animate-float-slow blur-sm"></div>
      <div className="absolute top-2/3 left-1/6 w-4 h-4 bg-teal-300/25 rounded-full animate-float-delayed blur-sm"></div>

      {/* Gentle motion trails */}
      <div className="absolute top-1/3 left-2/3 w-32 h-1 bg-gradient-to-r from-transparent via-emerald-200/30 to-transparent animate-float opacity-40"></div>
      <div className="absolute bottom-1/2 right-2/3 w-24 h-1 bg-gradient-to-r from-transparent via-teal-200/25 to-transparent animate-float-delayed opacity-30"></div>
    </div>
  )
}
