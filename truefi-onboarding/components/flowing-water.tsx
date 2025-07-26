"use client"

import { useEffect, useRef } from "react"

export function FlowingWater() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    let time = 0

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Create flowing water effect
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, "rgba(16, 185, 129, 0.1)")
      gradient.addColorStop(0.5, "rgba(20, 184, 166, 0.05)")
      gradient.addColorStop(1, "rgba(6, 182, 212, 0.1)")

      ctx.fillStyle = gradient

      // Draw flowing waves
      ctx.beginPath()
      for (let x = 0; x <= canvas.width; x += 10) {
        const y = Math.sin(x * 0.01 + time * 0.02) * 30 + Math.sin(x * 0.02 + time * 0.03) * 20 + canvas.height * 0.7
        if (x === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.lineTo(canvas.width, canvas.height)
      ctx.lineTo(0, canvas.height)
      ctx.closePath()
      ctx.fill()

      // Add ripple effects
      for (let i = 0; i < 3; i++) {
        const rippleX = canvas.width * (0.2 + i * 0.3) + Math.sin(time * 0.01 + i) * 100
        const rippleY = canvas.height * 0.6 + Math.sin(time * 0.015 + i) * 50

        ctx.beginPath()
        ctx.arc(rippleX, rippleY, Math.sin(time * 0.02 + i) * 20 + 30, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(16, 185, 129, ${0.05 + Math.sin(time * 0.02 + i) * 0.03})`
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

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-60" />
}
