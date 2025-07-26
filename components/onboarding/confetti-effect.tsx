"use client"

import { useEffect, useRef } from "react"

export function ConfettiEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const confetti: Array<{
      x: number
      y: number
      vx: number
      vy: number
      size: number
      color: string
      rotation: number
      rotationSpeed: number
      shape: "circle" | "square" | "triangle"
    }> = []

    // Create confetti particles with brand colors
    for (let i = 0; i < 80; i++) {
      confetti.push({
        x: Math.random() * canvas.width,
        y: -20,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 4 + 3,
        size: Math.random() * 12 + 6,
        color: ["#10b981", "#22c55e", "#14b8a6", "#06b6d4"][Math.floor(Math.random() * 4)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        shape: ["circle", "square", "triangle"][Math.floor(Math.random() * 3)] as "circle" | "square" | "triangle",
      })
    }

    let animationId: number

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      confetti.forEach((particle, index) => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.rotation += particle.rotationSpeed

        ctx.save()
        ctx.translate(particle.x, particle.y)
        ctx.rotate((particle.rotation * Math.PI) / 180)
        ctx.fillStyle = particle.color

        // Draw different shapes
        if (particle.shape === "circle") {
          ctx.beginPath()
          ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2)
          ctx.fill()
        } else if (particle.shape === "square") {
          ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size)
        } else {
          // Triangle
          ctx.beginPath()
          ctx.moveTo(0, -particle.size / 2)
          ctx.lineTo(-particle.size / 2, particle.size / 2)
          ctx.lineTo(particle.size / 2, particle.size / 2)
          ctx.closePath()
          ctx.fill()
        }

        ctx.restore()

        // Remove particles that have fallen off screen
        if (particle.y > canvas.height + 20) {
          confetti.splice(index, 1)
        }
      })

      if (confetti.length > 0) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animate()

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-50" />
} 