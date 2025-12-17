'use client'

import React, { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/utils/utils'

interface RatingStarsProps {
  rating: number // Current rating (can be fractional for display)
  count?: number // Number of ratings
  interactive?: boolean // Allow user to click to rate
  onRate?: (rating: number) => void
  userRating?: number | null // User's current rating
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
}

export function RatingStars({
  rating,
  count = 0,
  interactive = false,
  onRate,
  userRating,
  size = 'sm',
  showCount = true,
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null)

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  const displayRating = hoverRating ?? userRating ?? rating

  const handleClick = (starIndex: number) => {
    if (interactive && onRate) {
      onRate(starIndex + 1)
    }
  }

  const handleMouseEnter = (starIndex: number) => {
    if (interactive) {
      setHoverRating(starIndex + 1)
    }
  }

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(null)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={handleMouseLeave}
      >
        {[0, 1, 2, 3, 4].map((index) => {
          const filled = index < Math.floor(displayRating)
          const partial = !filled && index < displayRating
          const isUserRated = userRating && index < userRating

          return (
            <button
              key={index}
              type="button"
              disabled={!interactive}
              onClick={() => handleClick(index)}
              onMouseEnter={() => handleMouseEnter(index)}
              className={cn(
                'transition-colors',
                interactive && 'cursor-pointer hover:scale-110',
                !interactive && 'cursor-default'
              )}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  'transition-colors',
                  filled || isUserRated
                    ? 'fill-amber-400 text-amber-400'
                    : partial
                    ? 'fill-amber-400/50 text-amber-400'
                    : hoverRating && index < hoverRating
                    ? 'fill-amber-300 text-amber-300'
                    : 'fill-transparent text-muted-foreground/40'
                )}
              />
            </button>
          )
        })}
      </div>

      {showCount && count > 0 && (
        <span className="text-xs text-muted-foreground ml-0.5">
          {rating.toFixed(1)} ({count})
        </span>
      )}

      {showCount && count === 0 && (
        <span className="text-xs text-muted-foreground/50 ml-0.5">
          No ratings
        </span>
      )}
    </div>
  )
}

interface RatingInputProps {
  value: number | null
  onChange: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
}

export function RatingInput({ value, onChange, size = 'md' }: RatingInputProps) {
  return (
    <RatingStars
      rating={value || 0}
      interactive
      onRate={onChange}
      userRating={value}
      size={size}
      showCount={false}
    />
  )
}
