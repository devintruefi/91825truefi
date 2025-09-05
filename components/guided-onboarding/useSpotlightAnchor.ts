import { useEffect, useState, useCallback } from 'react'

interface ElementRect {
  x: number
  y: number
  width: number
  height: number
  top: number
  left: number
  right: number
  bottom: number
}

interface UseSpotlightAnchorReturn {
  rect: ElementRect | null
  isVisible: boolean
  scrollToElement: () => void
}

export function useSpotlightAnchor(selector: string): UseSpotlightAnchorReturn {
  const [rect, setRect] = useState<ElementRect | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const updateRect = useCallback(() => {
    const element = document.querySelector(selector)
    if (!element) {
      setRect(null)
      setIsVisible(false)
      return
    }

    const domRect = element.getBoundingClientRect()
    const elementRect: ElementRect = {
      x: domRect.x,
      y: domRect.y,
      width: domRect.width,
      height: domRect.height,
      top: domRect.top,
      left: domRect.left,
      right: domRect.right,
      bottom: domRect.bottom,
    }

    setRect(elementRect)
    
    // Check if element is visible in viewport
    const isElementVisible = 
      domRect.top < window.innerHeight &&
      domRect.bottom > 0 &&
      domRect.left < window.innerWidth &&
      domRect.right > 0
    
    setIsVisible(isElementVisible)
  }, [selector])

  const scrollToElement = useCallback(() => {
    const element = document.querySelector(selector)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      })
    }
  }, [selector])

  useEffect(() => {
    updateRect()

    // Create observers
    const resizeObserver = new ResizeObserver(updateRect)
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(() => {
          updateRect()
        })
      },
      { threshold: [0, 0.1, 0.5, 1] }
    )

    const element = document.querySelector(selector)
    if (element) {
      resizeObserver.observe(element)
      intersectionObserver.observe(element)
    }

    // Listen for scroll and resize events
    const handleUpdate = () => {
      // Use requestAnimationFrame to debounce
      requestAnimationFrame(updateRect)
    }

    window.addEventListener('scroll', handleUpdate)
    window.addEventListener('resize', handleUpdate)

    // Check for element periodically if not found initially
    let intervalId: NodeJS.Timeout | null = null
    if (!element) {
      intervalId = setInterval(() => {
        const newElement = document.querySelector(selector)
        if (newElement) {
          resizeObserver.observe(newElement)
          intersectionObserver.observe(newElement)
          updateRect()
          if (intervalId) clearInterval(intervalId)
        }
      }, 500)
    }

    return () => {
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      window.removeEventListener('scroll', handleUpdate)
      window.removeEventListener('resize', handleUpdate)
      if (intervalId) clearInterval(intervalId)
    }
  }, [selector, updateRect])

  return {
    rect,
    isVisible,
    scrollToElement
  }
}