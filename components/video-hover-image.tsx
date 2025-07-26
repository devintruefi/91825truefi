"use client"

import { useState } from "react"
import Image from "next/image"

interface VideoHoverImageProps {
  imageSrc: string
  videoSrc: string
  alt: string
  width: number
  height: number
  className?: string
}

export function VideoHoverImage({ imageSrc, videoSrc, alt, width, height, className = "" }: VideoHoverImageProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isTouched, setIsTouched] = useState(false)

  const handleMouseEnter = () => setIsHovered(true)
  const handleMouseLeave = () => setIsHovered(false)

  const handleTouchStart = () => setIsTouched(!isTouched)

  const showVideo = isHovered || isTouched

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
    >
      {showVideo ? (
        <video autoPlay loop muted playsInline className="w-full h-auto object-cover" width={width} height={height}>
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      ) : (
        <Image
          src={imageSrc || "/placeholder.svg"}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-auto object-cover"
          priority
        />
      )}
    </div>
  )
}
