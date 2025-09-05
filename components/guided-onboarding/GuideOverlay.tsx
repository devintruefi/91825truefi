"use client"

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSpotlightAnchor } from './useSpotlightAnchor'

interface GuideOverlayProps {
  targetSelector: string
  title: string
  body: string
  primaryButtonText?: string
  onPrimary: () => void
  onSkip: () => void
  onDone: () => void
  onClose: () => void
  isVisible: boolean
  stepNumber?: number
  totalSteps?: number
}

interface BubblePosition {
  x: number
  y: number
  placement: 'top' | 'bottom' | 'left' | 'right'
}

const BUBBLE_MARGIN = 16
const BUBBLE_WIDTH = 320
const BUBBLE_HEIGHT = 200 // Approximate

function calculateBubblePosition(targetRect: DOMRect, viewportWidth: number, viewportHeight: number): BubblePosition {
  const { top, left, right, bottom, width, height } = targetRect
  
  // Try positions in order of preference: bottom, top, right, left
  const positions: Array<{ placement: BubblePosition['placement'], x: number, y: number, score: number }> = []
  
  // Bottom placement
  if (bottom + BUBBLE_MARGIN + BUBBLE_HEIGHT <= viewportHeight) {
    positions.push({
      placement: 'bottom',
      x: Math.max(BUBBLE_MARGIN, Math.min(left + width / 2 - BUBBLE_WIDTH / 2, viewportWidth - BUBBLE_WIDTH - BUBBLE_MARGIN)),
      y: bottom + BUBBLE_MARGIN,
      score: 4
    })
  }
  
  // Top placement
  if (top - BUBBLE_MARGIN - BUBBLE_HEIGHT >= 0) {
    positions.push({
      placement: 'top',
      x: Math.max(BUBBLE_MARGIN, Math.min(left + width / 2 - BUBBLE_WIDTH / 2, viewportWidth - BUBBLE_WIDTH - BUBBLE_MARGIN)),
      y: top - BUBBLE_MARGIN - BUBBLE_HEIGHT,
      score: 3
    })
  }
  
  // Right placement
  if (right + BUBBLE_MARGIN + BUBBLE_WIDTH <= viewportWidth) {
    positions.push({
      placement: 'right',
      x: right + BUBBLE_MARGIN,
      y: Math.max(BUBBLE_MARGIN, Math.min(top + height / 2 - BUBBLE_HEIGHT / 2, viewportHeight - BUBBLE_HEIGHT - BUBBLE_MARGIN)),
      score: 2
    })
  }
  
  // Left placement
  if (left - BUBBLE_MARGIN - BUBBLE_WIDTH >= 0) {
    positions.push({
      placement: 'left',
      x: left - BUBBLE_MARGIN - BUBBLE_WIDTH,
      y: Math.max(BUBBLE_MARGIN, Math.min(top + height / 2 - BUBBLE_HEIGHT / 2, viewportHeight - BUBBLE_HEIGHT - BUBBLE_MARGIN)),
      score: 1
    })
  }
  
  // Choose the best position
  const bestPosition = positions.sort((a, b) => b.score - a.score)[0]
  
  // Fallback to center if no good position
  if (!bestPosition) {
    return {
      placement: 'bottom',
      x: viewportWidth / 2 - BUBBLE_WIDTH / 2,
      y: viewportHeight / 2 - BUBBLE_HEIGHT / 2,
    }
  }
  
  return bestPosition
}

function SpotlightBubble({ 
  position, 
  title, 
  body, 
  primaryButtonText = "Do it",
  onPrimary, 
  onSkip, 
  onDone, 
  onClose,
  stepNumber,
  totalSteps 
}: {
  position: BubblePosition
  title: string
  body: string
  primaryButtonText?: string
  onPrimary: () => void
  onSkip: () => void
  onDone: () => void
  onClose: () => void
  stepNumber?: number
  totalSteps?: number
}) {
  const bubbleRef = useRef<HTMLDivElement>(null)
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false)

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setShouldReduceMotion(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => {
      setShouldReduceMotion(e.matches)
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Focus trap
  useEffect(() => {
    const bubble = bubbleRef.current
    if (!bubble) return

    const focusableElements = bubble.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    firstElement?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const animationProps = shouldReduceMotion 
    ? {} 
    : {
        initial: { opacity: 0, scale: 0.9 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.9 },
        transition: { duration: 0.2 }
      }

  return (
    <motion.div
      ref={bubbleRef}
      className="absolute bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 border-2 border-blue-200 dark:border-blue-700 rounded-xl shadow-2xl z-50 max-w-sm"
      style={{
        left: position.x,
        top: position.y,
        width: BUBBLE_WIDTH,
      }}
      {...animationProps}
      role="dialog"
      aria-labelledby="guide-title"
      aria-describedby="guide-body"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-sm font-bold text-white">
                {stepNumber || '1'}
              </span>
            </div>
            {totalSteps && (
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Step {stepNumber} of {totalSteps}
                </span>
                <div className="flex space-x-1 mt-1">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 w-6 rounded-full ${
                        i < (stepNumber || 0) 
                          ? 'bg-blue-500' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            aria-label="Close guide"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <h3 id="guide-title" className="font-bold text-lg text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p id="guide-body" className="text-sm text-gray-600 dark:text-gray-300 mb-5 leading-relaxed">
          {body}
        </p>

        {/* Actions */}
        <div className="flex flex-col space-y-2">
          {primaryButtonText && (
            <Button
              onClick={onPrimary}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              {primaryButtonText}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDone}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              I've done this
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="flex-1"
            >
              Skip
            </Button>
          </div>
        </div>
      </div>

      {/* Arrow indicator */}
      <div className={`absolute ${
        position.placement === 'top' ? 'top-full -mt-px' :
        position.placement === 'bottom' ? 'bottom-full -mb-px' :
        position.placement === 'left' ? 'left-full -ml-px' :
        'right-full -mr-px'
      }`}>
        <div className={`w-3 h-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rotate-45 ${
          position.placement === 'top' || position.placement === 'bottom' ? 'mx-auto' : 'my-auto'
        } ${
          position.placement === 'top' ? '-translate-y-1.5' :
          position.placement === 'bottom' ? 'translate-y-1.5' :
          position.placement === 'left' ? '-translate-x-1.5' :
          'translate-x-1.5'
        }`} />
      </div>
    </motion.div>
  )
}

export function GuideOverlay({
  targetSelector,
  title,
  body,
  primaryButtonText,
  onPrimary,
  onSkip,
  onDone,
  onClose,
  isVisible,
  stepNumber,
  totalSteps
}: GuideOverlayProps) {
  const { rect, isVisible: isTargetVisible, scrollToElement } = useSpotlightAnchor(targetSelector)
  const [showFallback, setShowFallback] = useState(false)
  const [bubblePosition, setBubblePosition] = useState<BubblePosition>({ x: 0, y: 0, placement: 'bottom' })

  // Update bubble position when target rect changes
  useEffect(() => {
    if (rect && isTargetVisible) {
      const position = calculateBubblePosition(
        rect,
        window.innerWidth,
        window.innerHeight
      )
      setBubblePosition(position)
      setShowFallback(false)
    } else if (rect && !isTargetVisible) {
      // Target exists but not visible, show fallback
      setShowFallback(true)
    } else {
      // Target doesn't exist, show fallback
      setShowFallback(true)
    }
  }, [rect, isTargetVisible])

  if (!isVisible) return null

  // Portal container
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // Create or find portal container
    let container = document.getElementById('guide-overlay-portal')
    if (!container) {
      container = document.createElement('div')
      container.id = 'guide-overlay-portal'
      container.style.position = 'fixed'
      container.style.top = '0'
      container.style.left = '0'
      container.style.right = '0'
      container.style.bottom = '0'
      container.style.zIndex = '9999'
      container.style.pointerEvents = 'none'
      document.body.appendChild(container)
    }
    setPortalContainer(container)

    return () => {
      // Don't remove container on unmount as it might be used by other overlays
    }
  }, [])

  if (!portalContainer) return null

  const overlayContent = (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop with spotlight cutout */}
          <div 
            className="fixed inset-0 pointer-events-auto"
            style={{
              background: rect && isTargetVisible 
                ? `radial-gradient(circle at ${rect.left + rect.width/2}px ${rect.top + rect.height/2}px, transparent ${Math.max(rect.width, rect.height)/2 + 8}px, rgba(0,0,0,0.5) ${Math.max(rect.width, rect.height)/2 + 12}px)`
                : 'rgba(0,0,0,0.5)'
            }}
            onClick={onClose}
          />
          
          {/* Highlight ring around target */}
          {rect && isTargetVisible && (
            <div
              className="fixed border-2 border-blue-500 rounded-lg pointer-events-none"
              style={{
                left: rect.left - 4,
                top: rect.top - 4,
                width: rect.width + 8,
                height: rect.height + 8,
              }}
            />
          )}

          {/* Fallback banner */}
          {showFallback && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto z-50">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 max-w-md"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{body}</p>
                <div className="flex space-x-2">
                  <Button size="sm" onClick={() => { scrollToElement(); onPrimary(); }}>
                    Take me there
                  </Button>
                  <Button variant="outline" size="sm" onClick={onSkip}>
                    Skip
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Spotlight bubble */}
          {rect && isTargetVisible && !showFallback && (
            <div className="pointer-events-auto">
              <SpotlightBubble
                position={bubblePosition}
                title={title}
                body={body}
                primaryButtonText={primaryButtonText}
                onPrimary={onPrimary}
                onSkip={onSkip}
                onDone={onDone}
                onClose={onClose}
                stepNumber={stepNumber}
                totalSteps={totalSteps}
              />
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(overlayContent, portalContainer)
}