"use client"

import { cn } from "@/lib/utils"

interface PennyOrbProps {
  isSpeaking: boolean
  size?: "small" | "medium" | "large"
  className?: string
}

export function PennyOrb({ isSpeaking, size = "medium", className }: PennyOrbProps) {
  const sizeClasses = {
    small: "w-16 h-16",
    medium: "w-28 h-28",
    large: "w-40 h-40",
  }

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer glow ring with brand colors */}
      <div
        className={cn(
          "absolute rounded-full bg-gradient-to-r from-emerald-300/40 via-green-300/40 to-teal-300/40 blur-2xl animate-pulse",
          sizeClasses[size],
        )}
        style={{ transform: "scale(2.5)" }}
      />

      {/* Speaking animation rings */}
      {isSpeaking && (
        <>
          <div
            className={cn("absolute rounded-full border-2 border-emerald-400/60 animate-ping", sizeClasses[size])}
            style={{ transform: "scale(1.8)" }}
          />
          <div
            className={cn("absolute rounded-full border-2 border-green-400/50 animate-ping", sizeClasses[size])}
            style={{ transform: "scale(2.3)", animationDelay: "0.2s" }}
          />
          <div
            className={cn("absolute rounded-full border-2 border-teal-400/40 animate-ping", sizeClasses[size])}
            style={{ transform: "scale(2.8)", animationDelay: "0.4s" }}
          />
        </>
      )}

      {/* Main orb with brand gradient */}
      <div
        className={cn(
          "relative rounded-full bg-gradient-to-br from-emerald-400 via-green-400 to-teal-500 shadow-[0_0_60px_rgba(16,185,129,0.4)] flex items-center justify-center transition-all duration-500 border-4 border-white/30",
          sizeClasses[size],
          isSpeaking ? "scale-115 shadow-[0_0_80px_rgba(16,185,129,0.6)]" : "scale-100",
        )}
      >
        <div
          className={cn(
            "rounded-full bg-gradient-to-br from-white/95 to-emerald-50/80 flex items-center justify-center backdrop-blur-sm shadow-inner",
            size === "small" ? "w-12 h-12" : size === "medium" ? "w-24 h-24" : "w-36 h-36",
          )}
        >
          <div
            className={cn(
              "animate-pulse text-emerald-600",
              size === "small" ? "text-2xl" : size === "medium" ? "text-4xl" : "text-6xl",
            )}
          >
            <img
              src="/images/fin-logo-new.png"
              alt="Fin Logo"
              className={
                size === "small"
                  ? "w-8 h-8"
                  : size === "medium"
                  ? "w-16 h-16"
                  : "w-24 h-24"
              }
              style={{ objectFit: "contain" }}
            />
          </div>
        </div>
      </div>

      {/* Enhanced floating particles with brand colors */}
      <div className="absolute -top-3 -left-3 w-3 h-3 bg-emerald-400/70 rounded-full animate-bounce blur-sm shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
      <div className="absolute -top-2 -right-4 w-2.5 h-2.5 bg-green-400/60 rounded-full animate-bounce delay-300 blur-sm shadow-[0_0_12px_rgba(34,197,94,0.7)]" />
      <div className="absolute -bottom-3 -left-4 w-2 h-2 bg-teal-400/50 rounded-full animate-bounce delay-700 blur-sm shadow-[0_0_10px_rgba(20,184,166,0.6)]" />
      <div className="absolute -bottom-1 -right-5 w-1.5 h-1.5 bg-emerald-300/60 rounded-full animate-bounce delay-1000 blur-sm shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
    </div>
  )
} 