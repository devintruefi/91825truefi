"use client"

export function WarmLight() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Main warm light source */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-gradient-radial from-amber-200/30 via-yellow-100/20 to-transparent rounded-full blur-3xl animate-pulse"></div>

      {/* Secondary light rays */}
      <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-gradient-radial from-emerald-200/20 via-teal-100/15 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>

      {/* Gentle morning glow */}
      <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-gradient-radial from-amber-100/25 via-orange-50/15 to-transparent rounded-full blur-3xl animate-pulse delay-2000"></div>

      {/* Soft light particles */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-amber-300/40 rounded-full animate-float-slow blur-sm"
            style={{
              left: `${Math.cos((i * 45 * Math.PI) / 180) * 200}px`,
              top: `${Math.sin((i * 45 * Math.PI) / 180) * 200}px`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
