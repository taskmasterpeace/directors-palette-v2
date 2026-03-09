'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react'

interface CanvasToolbarMobileProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onFitToScreen: () => void
  disabled: boolean
}

export function CanvasToolbarMobile({
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  disabled,
}: CanvasToolbarMobileProps) {
  return (
    <div className="sm:hidden fixed left-4 z-30 flex flex-col gap-2" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}>
      <Button
        size="sm"
        onClick={onZoomIn}
        disabled={disabled}
        className="bg-primary/90 hover:bg-primary rounded-full w-12 h-12 p-0 shadow-lg backdrop-blur-sm touch-manipulation flex items-center justify-center"
        aria-label="Zoom in"
      >
        <ZoomIn className="w-5 h-5 text-white" />
      </Button>
      <Button
        size="sm"
        onClick={onFitToScreen}
        disabled={disabled}
        className="bg-primary/90 hover:bg-primary rounded-full w-12 h-12 p-0 shadow-lg backdrop-blur-sm touch-manipulation flex items-center justify-center"
        aria-label="Fit to screen"
      >
        <Maximize2 className="w-5 h-5 text-white" />
      </Button>
      <Button
        size="sm"
        onClick={onZoomOut}
        disabled={disabled}
        className="bg-primary/90 hover:bg-primary rounded-full w-12 h-12 p-0 shadow-lg backdrop-blur-sm touch-manipulation flex items-center justify-center"
        aria-label="Zoom out"
      >
        <ZoomOut className="w-5 h-5 text-white" />
      </Button>
    </div>
  )
}
