/**
 * Animated progress bar component
 */
"use client"

import { useEffect, useState } from "react"
import { cn } from "@/utils/utils"

interface ProgressBarProps {
  isActive: boolean
  duration: number // in milliseconds
  className?: string
  showPercentage?: boolean
}

export function ProgressBar({
  isActive,
  duration = 30000, // 30 seconds default
  className,
  showPercentage = true
}: ProgressBarProps) {
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (!isActive) {
      setProgress(0)
      setIsComplete(false)
      return
    }

    setIsComplete(false)
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / duration) * 100, 100)

      setProgress(newProgress)

      if (newProgress >= 100) {
        setIsComplete(true)
        clearInterval(interval)
      }
    }, 100) // Update every 100ms for smooth animation

    return () => clearInterval(interval)
  }, [isActive, duration])

  if (!isActive && progress === 0) {
    return null
  }

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="relative w-full bg-secondary rounded-full h-3 overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-100 ease-linear rounded-full",
            isComplete
              ? "bg-emerald-500"
              : "bg-gradient-to-r from-amber-500 to-orange-500"
          )}
          style={{
            width: `${progress}%`,
            transition: isComplete ? 'background-color 0.3s ease' : undefined
          }}
        />

        {/* Animated shimmer effect while loading */}
        {isActive && !isComplete && (
          <div
            className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
            style={{
              animation: 'shimmer 2s infinite'
            }}
          />
        )}
      </div>

      {showPercentage && (
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>
            {isComplete ? '✅ Complete!' : 'Generating story breakdown...'}
          </span>
          <span className="font-mono">
            {Math.round(progress)}%
          </span>
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  )
}