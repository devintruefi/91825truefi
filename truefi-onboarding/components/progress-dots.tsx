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
        "flex items-center gap-4 bg-white/40 backdrop-blur-xl rounded-full px-6 py-3 border border-white/40 shadow-2xl",
        className,
      )}
    >
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className={cn(
            "rounded-full transition-all duration-700 shadow-lg",
            index <= current
              ? "w-3 h-3 bg-gradient-to-r from-emerald-500 to-teal-500 scale-125 shadow-[0_0_15px_rgba(16,185,129,0.6)]"
              : "w-2 h-2 bg-white/40 scale-100",
          )}
        />
      ))}
      <div className="ml-2 text-sm font-medium text-slate-700">
        {current + 1} of {total}
      </div>
    </div>
  )
}
