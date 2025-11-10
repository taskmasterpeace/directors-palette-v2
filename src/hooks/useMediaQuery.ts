'use client'

import { useState, useEffect } from 'react'

/**
 * Custom hook for responsive media query detection
 * @param query - CSS media query string (e.g., "(min-width: 768px)")
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Check if window is available (client-side only)
    if (typeof window === 'undefined') return

    const media = window.matchMedia(query)

    // Set initial value
    setMatches(media.matches)

    // Create listener for changes
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Add listener (supports both modern and legacy APIs)
    if (media.addEventListener) {
      media.addEventListener('change', listener)
    } else {
      // Fallback for older browsers
      media.addListener(listener)
    }

    // Cleanup
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener)
      } else {
        // Fallback for older browsers
        media.removeListener(listener)
      }
    }
  }, [query])

  return matches
}

/**
 * Pre-configured breakpoint hooks for common screen sizes
 */
export const useIsMobile = () => useMediaQuery('(max-width: 767px)')
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
