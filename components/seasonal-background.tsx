"use client"

import { useEffect, useRef } from "react"
import { useNaturalTheme } from "@/hooks/use-natural-theme"

export function SeasonalBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const theme = useNaturalTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    let time = 0
    const waves: Array<{
      amplitude: number
      frequency: number
      phase: number
      speed: number
      color: string
      opacity: number
    }> = []

    // Create seasonal wave patterns
    const waveCount = theme.timeOfDay === "night" ? 4 : theme.season === "summer" ? 12 : 8
    for (let i = 0; i < waveCount; i++) {
      waves.push({
        amplitude: 60 + Math.random() * (theme.animations.intensity * 100),
        frequency: 0.001 + Math.random() * 0.008,
        phase: Math.random() * Math.PI * 2,
        speed: 0.003 + Math.random() * (theme.animations.intensity * 0.015),
        color: theme.colors.primary[i % theme.colors.primary.length],
        opacity: 0.02 + Math.random() * 0.08 * theme.animations.intensity,
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Create seasonal gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width * 0.3,
        canvas.height * 0.2,
        0,
        canvas.width * 0.7,
        canvas.height * 0.8,
        Math.max(canvas.width, canvas.height) * 1.2,
      )

      // Apply seasonal colors
      theme.colors.background.forEach((color, index) => {
        gradient.addColorStop(index / (theme.colors.background.length - 1), `rgba(${color}, ${0.9 - index * 0.2})`)
      })

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw very gentle, breathing-like waves
      waves.forEach((wave, index) => {
        ctx.beginPath()
        ctx.strokeStyle = `rgba(${wave.color}, ${wave.opacity * 0.6})` // Much more subtle
        ctx.lineWidth = 0.8 + Math.sin(time * 0.003 + index) * 0.3 // Very gentle line variation

        for (let x = 0; x <= canvas.width; x += 12) {
          // Fewer calculation points for smoother curves
          // Much gentler wave calculations - like slow breathing
          const breathingModifier = Math.sin(time * 0.001) * 0.3 + 0.7 // Slow breathing rhythm
          const seasonalModifier = theme.season === "winter" ? 0.4 : theme.season === "summer" ? 0.8 : 0.6
          const timeModifier = theme.timeOfDay === "night" ? 0.2 : theme.timeOfDay === "afternoon" ? 0.6 : 0.4

          const y =
            Math.sin(x * wave.frequency + time * wave.speed + wave.phase) *
              wave.amplitude *
              seasonalModifier *
              breathingModifier +
            Math.sin(x * wave.frequency * 0.7 + time * wave.speed * 0.4) * (wave.amplitude * 0.3 * timeModifier) +
            canvas.height / 2 +
            Math.sin(time * 0.0008 + index) * 30 * theme.animations.intensity // Much slower overall movement

          if (x === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()

        // Very subtle fill areas
        if (index % 4 === 0) {
          // Less frequent fills
          ctx.lineTo(canvas.width, canvas.height)
          ctx.lineTo(0, canvas.height)
          ctx.closePath()
          ctx.fillStyle = `rgba(${wave.color}, ${wave.opacity * 0.08})` // Much more transparent
          ctx.fill()
        }
      })

      // Very slow, breathing-like floating particles
      const particleCount = Math.min(theme.particles.count, 15) // Cap particle count
      for (let i = 0; i < particleCount; i++) {
        // Much slower, more breathing-like movement
        const breathingX = Math.sin(time * theme.particles.speed * 0.3 + i * 0.8) * 80 // Slower, smaller movement
        const breathingY = Math.sin(time * (theme.particles.speed * 0.2) + i * 0.6) * 60

        const orbX = canvas.width * (0.1 + i * (0.8 / particleCount)) + breathingX
        const orbY =
          canvas.height * (0.2 + Math.sin(time * (theme.particles.speed * 0.15) + i * 0.5) * 0.6) + breathingY
        const orbSize = 4 + Math.sin(time * 0.004 + i) * 3 // Smaller, gentler size variation

        const orbGradient = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbSize * 6)
        const color = theme.particles.colors[i % theme.particles.colors.length]

        orbGradient.addColorStop(0, `rgba(${color}, ${0.06 + Math.sin(time * 0.005 + i) * 0.03})`) // Much more subtle
        orbGradient.addColorStop(0.4, `rgba(${color}, ${0.03 + Math.sin(time * 0.005 + i) * 0.02})`)
        orbGradient.addColorStop(1, "transparent")

        ctx.fillStyle = orbGradient
        ctx.beginPath()
        ctx.arc(orbX, orbY, orbSize * 4, 0, Math.PI * 2)
        ctx.fill()
      }

      // Much gentler seasonal texture effects
      if (theme.season === "winter") {
        // Very gentle snowflake-like sparkles
        for (let i = 0; i < 20; i++) {
          // Fewer particles
          const x = Math.random() * canvas.width
          const y = Math.random() * canvas.height + Math.sin(time * 0.002 + i) * 8 // Much slower fall
          const size = Math.random() * 1 + 0.3 // Smaller
          const opacity = Math.random() * 0.15 + 0.05 // More subtle

          ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
          ctx.beginPath()
          ctx.arc(x, y, size, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (theme.season === "autumn") {
        // Very gentle falling leaf effect
        for (let i = 0; i < 12; i++) {
          // Fewer leaves
          const x = Math.random() * canvas.width + Math.sin(time * 0.001 + i) * 20 // Much slower drift
          const y = Math.random() * canvas.height + Math.cos(time * 0.002 + i) * 15
          const size = Math.random() * 2 + 0.5 // Smaller
          const opacity = Math.random() * 0.1 + 0.03 // More subtle

          ctx.fillStyle = `rgba(${theme.colors.accent[i % theme.colors.accent.length]}, ${opacity})`
          ctx.beginPath()
          ctx.arc(x, y, size, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      time += theme.animations.intensity * 0.3 // Much slower time progression
      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [theme])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} />
} 