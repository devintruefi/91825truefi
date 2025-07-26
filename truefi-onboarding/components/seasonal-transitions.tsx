"use client"

import type React from "react"

import { useNaturalTheme } from "@/hooks/use-natural-theme"

interface SeasonalTransitionsProps {
  children: React.ReactNode
  isTransitioning: boolean
}

export function SeasonalTransitions({ children, isTransitioning }: SeasonalTransitionsProps) {
  const theme = useNaturalTheme()

  const getSeasonalTransitionClass = () => {
    const base = "transition-all"
    const duration = theme.animations.duration
    const easing = theme.animations.easing

    return `${base} duration-[${duration}] ease-[${easing}]`
  }

  const getSeasonalOverlay = () => {
    if (!isTransitioning) return null

    const overlayColors = theme.colors.secondary
      .map((color, index) => `rgba(${color}, ${0.1 - index * 0.02})`)
      .join(", ")

    return (
      <div
        className="fixed inset-0 z-40 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${overlayColors})`,
          animation: `seasonal-transition-overlay ${theme.animations.duration} ${theme.animations.easing}`,
        }}
      />
    )
  }

  return (
    <div
      className={getSeasonalTransitionClass()}
      style={
        {
          "--seasonal-primary": `rgb(${theme.colors.primary[0]})`,
          "--seasonal-secondary": `rgb(${theme.colors.secondary[0]})`,
          "--seasonal-accent": `rgb(${theme.colors.accent[0]})`,
          "--seasonal-intensity": theme.animations.intensity,
        } as React.CSSProperties
      }
    >
      {getSeasonalOverlay()}
      {children}
    </div>
  )
}
