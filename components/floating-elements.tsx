export function FloatingElements() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
      {/* Very gentle, slow-moving organic shapes */}
      <div className="absolute top-1/4 left-1/5 w-32 h-24 bg-gradient-to-br from-emerald-200/8 via-green-200/5 to-teal-200/6 rounded-[2rem] blur-3xl animate-gentle-float opacity-30 transform rotate-6"></div>
      <div
        className="absolute top-1/3 right-1/4 w-36 h-28 bg-gradient-to-br from-green-200/6 via-emerald-200/4 to-teal-200/5 rounded-[2.5rem] blur-3xl opacity-25 transform -rotate-3"
        style={{ animation: "gentle-breathing-float 16s ease-in-out infinite 4s" }}
      ></div>
      <div
        className="absolute bottom-1/3 left-1/3 w-34 h-26 bg-gradient-to-br from-teal-200/7 via-emerald-200/5 to-green-200/4 rounded-[2.2rem] blur-3xl opacity-28 transform rotate-4"
        style={{ animation: "gentle-breathing-float 20s ease-in-out infinite 8s" }}
      ></div>

      {/* Smaller, very subtle elements */}
      <div
        className="absolute top-1/2 right-1/5 w-20 h-16 bg-gradient-to-br from-emerald-300/10 via-green-300/6 to-teal-300/8 rounded-[1.5rem] blur-2xl opacity-20 transform -rotate-8"
        style={{ animation: "gentle-breathing-float 14s ease-in-out infinite 2s" }}
      ></div>
      <div
        className="absolute bottom-1/4 right-1/3 w-22 h-18 bg-gradient-to-br from-green-300/8 via-teal-300/5 to-emerald-300/6 rounded-[1.8rem] blur-2xl opacity-22 transform rotate-10"
        style={{ animation: "gentle-breathing-float 18s ease-in-out infinite 6s" }}
      ></div>

      {/* Tiny, barely visible sparkles */}
      <div
        className="absolute top-2/3 left-1/4 w-12 h-10 bg-gradient-to-br from-teal-200/12 via-emerald-200/8 to-green-200/6 rounded-[1rem] blur-xl opacity-15 transform rotate-12"
        style={{ animation: "gentle-breathing-float 22s ease-in-out infinite 10s" }}
      ></div>
      <div
        className="absolute top-1/6 left-2/3 w-14 h-12 bg-gradient-to-br from-emerald-200/10 via-teal-200/6 to-green-200/8 rounded-[1.2rem] blur-xl opacity-18 transform -rotate-5"
        style={{ animation: "gentle-breathing-float 24s ease-in-out infinite 12s" }}
      ></div>

      {/* Very subtle light rays - barely visible */}
      <div
        className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-emerald-200/6 via-transparent to-transparent blur-lg opacity-8 transform rotate-1"
        style={{ animation: "slow-breathing-pulse 15s ease-in-out infinite" }}
      ></div>
      <div
        className="absolute top-0 right-1/3 w-0.5 h-full bg-gradient-to-b from-green-200/5 via-transparent to-transparent blur-lg opacity-6 transform -rotate-1"
        style={{ animation: "slow-breathing-pulse 18s ease-in-out infinite 5s" }}
      ></div>

      {/* Extremely subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.008] bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[length:120px_120px]"></div>
    </div>
  )
} 