"use client"

import { useEffect, useRef } from "react"

export function DynamicBackground() {
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

    // Create organic, nature-inspired waves
    for (let i = 0; i < 8; i++) {
      waves.push({
        amplitude: 80 + Math.random() * 140,
        frequency: 0.002 + Math.random() * 0.006,
        phase: Math.random() * Math.PI * 2,
        speed: 0.006 + Math.random() * 0.012,
        color: ["16,185,129", "34,197,94", "20,184,166", "6,182,212", "22,163,74"][Math.floor(Math.random() * 5)],
        opacity: 0.03 + Math.random() * 0.06,
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Create organic gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width * 0.3,
        canvas.height * 0.2,
        0,
        canvas.width * 0.7,
        canvas.height * 0.8,
        Math.max(canvas.width, canvas.height) * 1.2,
      )
      gradient.addColorStop(0, "rgba(240, 253, 250, 0.9)")
      gradient.addColorStop(0.2, "rgba(220, 252, 231, 0.7)")
      gradient.addColorStop(0.4, "rgba(187, 247, 208, 0.5)")
      gradient.addColorStop(0.6, "rgba(134, 239, 172, 0.3)")
      gradient.addColorStop(0.8, "rgba(74, 222, 128, 0.2)")
      gradient.addColorStop(1, "rgba(5, 150, 105, 0.1)")

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw organic flowing waves
      waves.forEach((wave, index) => {
        ctx.beginPath()
        ctx.strokeStyle = `rgba(${wave.color}, ${wave.opacity})`
        ctx.lineWidth = 2 + Math.sin(time * 0.008 + index) * 1.5

        for (let x = 0; x <= canvas.width; x += 6) {
          const y =
            Math.sin(x * wave.frequency + time * wave.speed + wave.phase) * wave.amplitude +
            Math.sin(x * wave.frequency * 1.3 + time * wave.speed * 0.8) * (wave.amplitude * 0.7) +
            Math.cos(x * wave.frequency * 0.7 + time * wave.speed * 1.2) * (wave.amplitude * 0.4) +
            canvas.height / 2 +
            Math.sin(time * 0.003 + index) * 60

          if (x === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()

        // Create organic fill areas
        if (index % 2 === 0) {
          ctx.lineTo(canvas.width, canvas.height)
          ctx.lineTo(0, canvas.height)
          ctx.closePath()
          ctx.fillStyle = `rgba(${wave.color}, ${wave.opacity * 0.2})`
          ctx.fill()
        }
      })

      // Floating organic particles
      for (let i = 0; i < 20; i++) {
        const orbX = canvas.width * (0.05 + i * 0.045) + Math.sin(time * 0.004 + i * 0.5) * 180
        const orbY =
          canvas.height * (0.2 + Math.sin(time * 0.003 + i * 0.3) * 0.6) + Math.cos(time * 0.005 + i * 0.7) * 120
        const orbSize = 15 + Math.sin(time * 0.008 + i) * 12

        const orbGradient = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbSize * 3)
        const colors = ["16,185,129", "34,197,94", "20,184,166", "22,163,74"]
        const color = colors[i % colors.length]

        orbGradient.addColorStop(0, `rgba(${color}, ${0.15 + Math.sin(time * 0.01 + i) * 0.08})`)
        orbGradient.addColorStop(0.4, `rgba(${color}, ${0.08 + Math.sin(time * 0.01 + i) * 0.04})`)
        orbGradient.addColorStop(1, "transparent")

        ctx.fillStyle = orbGradient
        ctx.beginPath()
        ctx.arc(orbX, orbY, orbSize * 2, 0, Math.PI * 2)
        ctx.fill()
      }

      // Add organic texture overlay
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height
        const size = Math.random() * 2 + 0.5
        const opacity = Math.random() * 0.1 + 0.02

        ctx.fillStyle = `rgba(16, 185, 129, ${opacity})`
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
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
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} />
}
