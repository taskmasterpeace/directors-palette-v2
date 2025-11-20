'use client'

import * as React from "react"
import { cn } from "@/utils/utils"

// Shimmer effect component
interface ShimmerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  duration?: string
  direction?: 'left' | 'right' | 'top' | 'bottom'
}

const Shimmer = React.forwardRef<HTMLDivElement, ShimmerProps>(
  ({ className, duration = "2s", direction = "right", ...props }, ref) => {
    const shimmerClass = {
      right: "bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-right",
      left: "bg-gradient-to-l from-transparent via-white/20 to-transparent animate-shimmer-left",
      top: "bg-gradient-to-t from-transparent via-white/20 to-transparent animate-shimmer-up",
      bottom: "bg-gradient-to-b from-transparent via-white/20 to-transparent animate-shimmer-down"
    }

    return (
      <div
        ref={ref}
        className={cn(
          "absolute inset-0 -translate-x-full",
          shimmerClass[direction],
          className
        )}
        style={{ animationDuration: duration }}
        {...props}
      />
    )
  }
)
Shimmer.displayName = "Shimmer"

// Glow effect component
interface GlowProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: 'blue' | 'red' | 'amber' | 'green' | 'red' | 'pink'
  intensity?: 'low' | 'medium' | 'high'
  pulse?: boolean
}

const Glow = React.forwardRef<HTMLDivElement, GlowProps>(
  ({ className, color = 'blue', intensity = 'medium', pulse = false, ...props }, ref) => {
    const glowColors = {
      blue: 'shadow-blue-500',
      red: 'shadow-red-500',
      amber: 'shadow-amber-500',
      green: 'shadow-green-500',
      red: 'shadow-red-500',
      pink: 'shadow-pink-500'
    }

    const glowIntensity = {
      low: '10',
      medium: '20',
      high: '40'
    }

    return (
      <div
        ref={ref}
        className={cn(
          "absolute inset-0 rounded-xl blur-xl -z-10",
          `${glowColors[color]}/${glowIntensity[intensity]}`,
          pulse && "animate-pulse",
          className
        )}
        {...props}
      />
    )
  }
)
Glow.displayName = "Glow"

// Magnetic hover effect
interface MagneticProps extends React.HTMLAttributes<HTMLDivElement> {
  strength?: number
  children: React.ReactNode
}

const Magnetic = React.forwardRef<HTMLDivElement, MagneticProps>(
  ({ className, strength = 10, children, ...props }) => {
    const magneticRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
      const element = magneticRef.current
      if (!element) return

      const handleMouseMove = (e: MouseEvent) => {
        const rect = element.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2

        const deltaX = (e.clientX - centerX) * 0.1
        const deltaY = (e.clientY - centerY) * 0.1

        element.style.transform = `translate(${deltaX}px, ${deltaY}px)`
      }

      const handleMouseLeave = () => {
        element.style.transform = 'translate(0px, 0px)'
      }

      element.addEventListener('mousemove', handleMouseMove)
      element.addEventListener('mouseleave', handleMouseLeave)

      return () => {
        element.removeEventListener('mousemove', handleMouseMove)
        element.removeEventListener('mouseleave', handleMouseLeave)
      }
    }, [strength])

    return (
      <div
        ref={magneticRef}
        className={cn("transition-transform duration-200 ease-out", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Magnetic.displayName = "Magnetic"

// Floating animation component
interface FloatingProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number
  duration?: number
  distance?: number
}

const Floating = React.forwardRef<HTMLDivElement, FloatingProps>(
  ({ className, delay = 0, duration = 3, distance = 10, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("animate-float", className)}
        style={{
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          '--float-distance': `${distance}px`
        } as React.CSSProperties}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Floating.displayName = "Floating"

// Parallax scroll effect
interface ParallaxProps extends React.HTMLAttributes<HTMLDivElement> {
  speed?: number
  direction?: 'up' | 'down' | 'left' | 'right'
}

const Parallax = React.forwardRef<HTMLDivElement, ParallaxProps>(
  ({ className, speed = 0.5, direction = 'up', children, ...props }) => {
    const parallaxRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
      const element = parallaxRef.current
      if (!element) return

      const handleScroll = () => {
        const _rect = element.getBoundingClientRect()
        const scrolled = window.pageYOffset
        const rate = scrolled * speed

        let transform = ''
        switch (direction) {
          case 'up':
            transform = `translateY(${-rate}px)`
            break
          case 'down':
            transform = `translateY(${rate}px)`
            break
          case 'left':
            transform = `translateX(${-rate}px)`
            break
          case 'right':
            transform = `translateX(${rate}px)`
            break
        }

        element.style.transform = transform
      }

      window.addEventListener('scroll', handleScroll)
      return () => window.removeEventListener('scroll', handleScroll)
    }, [speed, direction])

    return (
      <div
        ref={parallaxRef}
        className={className}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Parallax.displayName = "Parallax"

export { Shimmer, Glow, Magnetic, Floating, Parallax }