"use client"

import { cn } from "@/lib/utils"

interface ProgressDotsProps {
  total: number
  current: number
  className?: string
}

export function ProgressDots({ total, current, className }: ProgressDotsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 sm:gap-4 bg-white/40 backdrop-blur-xl rounded-full px-4 sm:px-6 py-2 sm:py-3 border border-white/40 shadow-2xl",
        className,
      )}
      role="progressbar"
      aria-label={`Question ${current + 1} of ${total}`}
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={total}
    >
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className={cn(
            "rounded-full transition-all duration-700 shadow-lg",
            index <= current
              ? "w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gradient-to-r from-emerald-500 to-teal-500 scale-125 shadow-[0_0_15px_rgba(16,185,129,0.6)]"
              : "w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white/40 scale-100",
          )}
          aria-hidden="true"
        />
      ))}
      <div className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium text-slate-700">
        {current + 1} of {total}
      </div>
    </div>
  )
} 