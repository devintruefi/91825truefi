"use client"

import { cn } from "@/lib/utils"

interface VoiceWaveformProps {
  className?: string
}

export function VoiceWaveform({ className }: VoiceWaveformProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 bg-white/40 backdrop-blur-xl rounded-full px-6 py-4 border border-white/40 shadow-2xl",
        className,
      )}
    >
      <div className="text-sm font-medium text-slate-700 mr-2">Listening...</div>
      {Array.from({ length: 7 }, (_, index) => (
        <div
          key={index}
          className="w-1.5 bg-gradient-to-t from-emerald-500 to-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"
          style={{
            height: `${Math.random() * 25 + 15}px`,
            animationDelay: `${index * 0.1}s`,
            animationDuration: "0.6s",
          }}
        />
      ))}
    </div>
  )
} 