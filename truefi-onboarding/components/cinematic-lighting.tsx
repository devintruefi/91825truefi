"use client"

export function CinematicLighting() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      {/* Main cinematic light source */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-amber-200/20 via-emerald-200/15 to-transparent rounded-full blur-3xl animate-pulse"></div>

      {/* Secondary dramatic lighting */}
      <div className="absolute top-1/4 right-1/4 w-[600px] h-[400px] bg-gradient-radial from-teal-200/15 via-cyan-200/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>

      {/* Atmospheric rim lighting */}
      <div className="absolute bottom-1/3 left-1/4 w-[500px] h-[300px] bg-gradient-radial from-emerald-200/20 via-green-200/10 to-transparent rounded-full blur-3xl animate-pulse delay-2000"></div>

      {/* Volumetric light rays */}
      <div className="absolute top-0 left-1/3 w-2 h-full bg-gradient-to-b from-amber-300/30 via-transparent to-transparent blur-sm animate-pulse opacity-40"></div>
      <div className="absolute top-0 right-1/3 w-1 h-full bg-gradient-to-b from-emerald-300/25 via-transparent to-transparent blur-sm animate-pulse delay-1000 opacity-30"></div>

      {/* Cinematic vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-slate-900/40 rounded-full"></div>
    </div>
  )
}
