"use client"

import { useEffect, useRef } from "react"

interface EtherealBackgroundProps {
  mousePosition: { x: number; y: number }
}

export function EtherealBackground({ mousePosition }: EtherealBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

    // Create multiple ethereal wave layers
    for (let i = 0; i < 8; i++) {
      waves.push({
        amplitude: 50 + Math.random() * 100,
        frequency: 0.005 + Math.random() * 0.01,
        phase: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.02,
        color: ["16,185,129", "20,184,166", "6,182,212", "34,197,94", "59,130,246"][Math.floor(Math.random() * 5)],
        opacity: 0.03 + Math.random() * 0.07,
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Create base ethereal gradient
      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        Math.max(canvas.width, canvas.height),
      )
      gradient.addColorStop(0, "rgba(16, 185, 129, 0.15)")
      gradient.addColorStop(0.3, "rgba(20, 184, 166, 0.08)")
      gradient.addColorStop(0.6, "rgba(6, 182, 212, 0.05)")
      gradient.addColorStop(1, "rgba(15, 23, 42, 0.95)")

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Mouse-interactive ethereal glow
      const mouseGradient = ctx.createRadialGradient(
        mousePosition.x,
        mousePosition.y,
        0,
        mousePosition.x,
        mousePosition.y,
        300,
      )
      mouseGradient.addColorStop(0, "rgba(16, 185, 129, 0.1)")
      mouseGradient.addColorStop(0.5, "rgba(20, 184, 166, 0.05)")
      mouseGradient.addColorStop(1, "transparent")

      ctx.fillStyle = mouseGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw ethereal waves
      waves.forEach((wave, index) => {
        ctx.beginPath()
        ctx.strokeStyle = `rgba(${wave.color}, ${wave.opacity})`
        ctx.lineWidth = 2 + Math.sin(time * 0.01 + index) * 1

        for (let x = 0; x <= canvas.width; x += 5) {
          const y =
            Math.sin(x * wave.frequency + time * wave.speed + wave.phase) * wave.amplitude +
            Math.sin(x * wave.frequency * 2 + time * wave.speed * 1.5) * (wave.amplitude * 0.5) +
            canvas.height / 2 +
            Math.sin(time * 0.005 + index) * 100

          if (x === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()
      })

      // Floating ethereal orbs
      for (let i = 0; i < 12; i++) {
        const orbX = canvas.width * (0.1 + i * 0.08) + Math.sin(time * 0.008 + i) * 150
        const orbY = canvas.height * (0.2 + Math.sin(time * 0.006 + i) * 0.6) + Math.cos(time * 0.01 + i) * 100
        const orbSize = 20 + Math.sin(time * 0.015 + i) * 15

        const orbGradient = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbSize * 2)
        orbGradient.addColorStop(0, `rgba(16, 185, 129, ${0.15 + Math.sin(time * 0.02 + i) * 0.1})`)
        orbGradient.addColorStop(0.5, `rgba(20, 184, 166, ${0.08 + Math.sin(time * 0.02 + i) * 0.05})`)
        orbGradient.addColorStop(1, "transparent")

        ctx.fillStyle = orbGradient
        ctx.beginPath()
        ctx.arc(orbX, orbY, orbSize, 0, Math.PI * 2)
        ctx.fill()
      }

      time += 1
      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [mousePosition])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} />
}
