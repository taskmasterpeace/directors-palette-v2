/**
 * PageLayoutRenderer Component
 * Centralized rendering for all 5 PageLayout types
 *
 * Layout Types:
 * 1. image-with-text - Image with text overlay
 * 2. image-only - Full bleed image, no text
 * 3. text-only - Text page with decorative border
 * 4. image-left-text-right - Spread layout (v2)
 * 5. text-left-image-right - Spread layout (v2)
 */

import { forwardRef } from 'react'
import Image from 'next/image'
import { cn } from '@/utils/utils'
import { PageLayout, TextPosition } from '../types/storybook.types'

export interface PageLayoutRendererProps {
  layout?: PageLayout
  imageUrl?: string
  text: string
  textPosition: TextPosition
  className?: string
}

/**
 * Get text positioning classes for image-with-text layout
 * Updated from 33% to 45% width for better readability
 */
function getTextPositionClasses(position: TextPosition): string {
  switch (position) {
    case 'top':
      return 'top-0 left-0 right-0'
    case 'bottom':
      return 'bottom-0 left-0 right-0'
    case 'left':
      return 'left-0 top-0 bottom-0 w-[45%]' // ✅ Fixed from w-1/3 (33%) to 45%
    case 'right':
      return 'right-0 top-0 bottom-0 w-[45%]' // ✅ Fixed from w-1/3 (33%) to 45%
    default:
      return 'hidden'
  }
}

/**
 * PageLayoutRenderer - Forward ref required for react-pageflip
 */
export const PageLayoutRenderer = forwardRef<HTMLDivElement, PageLayoutRendererProps>(
  ({ layout = 'image-with-text', imageUrl, text, textPosition, className }, ref) => {

    // Layout 1: Image with text overlay (default, improved)
    if (layout === 'image-with-text') {
      return (
        <div ref={ref} className={cn('relative w-full h-full bg-white overflow-hidden', className)}>
          {/* Background Image */}
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt="Page illustration"
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 to-zinc-200" />
          )}

          {/* Text Overlay - Improved readability */}
          {textPosition !== 'none' && (
            <div
              className={cn(
                'absolute p-6 bg-white/95 backdrop-blur-md shadow-lg',
                getTextPositionClasses(textPosition)
              )}
            >
              <p className="text-gray-900 text-base leading-relaxed font-medium">
                {text}
              </p>
            </div>
          )}
        </div>
      )
    }

    // Layout 2: Image only (full bleed, no text)
    if (layout === 'image-only') {
      return (
        <div ref={ref} className={cn('relative w-full h-full bg-white overflow-hidden', className)}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt="Page illustration"
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center">
              <span className="text-zinc-400 text-sm">No image</span>
            </div>
          )}
        </div>
      )
    }

    // Layout 3: Text only (with decorative border)
    if (layout === 'text-only') {
      return (
        <div ref={ref} className={cn('relative w-full h-full bg-white overflow-hidden', className)}>
          {/* Decorative border */}
          <div className="absolute inset-0 border-8 border-amber-200 rounded-lg m-4" />

          {/* Text content - centered */}
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <div className="max-w-md">
              <p className="text-gray-900 text-lg leading-relaxed font-medium text-center">
                {text}
              </p>
            </div>
          </div>
        </div>
      )
    }

    // Layout 4 & 5: Spread layouts (deferred to v2)
    if (layout === 'image-left-text-right' || layout === 'text-left-image-right') {
      return (
        <div ref={ref} className={cn('relative w-full h-full bg-white overflow-hidden', className)}>
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <p className="text-zinc-600 text-sm font-medium">
                Spread Layout (Coming Soon)
              </p>
              <p className="text-gray-900 text-base leading-relaxed max-w-md">
                {text}
              </p>
              {imageUrl && (
                <div className="relative w-48 h-48 mx-auto">
                  <Image
                    src={imageUrl}
                    alt="Page illustration"
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    // Fallback: Default to image-with-text
    return (
      <div ref={ref} className={cn('relative w-full h-full bg-white overflow-hidden', className)}>
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center">
          <p className="text-zinc-500 text-sm">Unknown layout: {layout}</p>
        </div>
      </div>
    )
  }
)

PageLayoutRenderer.displayName = 'PageLayoutRenderer'
