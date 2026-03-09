'use client'

import React from 'react'

interface CanvasLayersProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  cursorRef: React.RefObject<HTMLDivElement | null>
}

export function CanvasLayers({
  containerRef,
  canvasRef,
  cursorRef,
}: CanvasLayersProps) {
  return (
    <div
      ref={containerRef}
      className="flex-1 bg-background p-4 relative flex items-center justify-center overflow-auto border-2 border-primary/50"
      tabIndex={0}
      style={{
        touchAction: 'none',
        WebkitOverflowScrolling: 'auto',
        overscrollBehavior: 'contain'
      }}
    >
      <canvas
        ref={canvasRef}
        className="border-4 border-primary shadow-2xl"
      />

      <div
        ref={cursorRef}
        className="fixed pointer-events-none rounded-full border-2 z-[9999] opacity-0 transition-opacity duration-75 ease-out"
        style={{
          top: 0,
          left: 0
        }}
      />
    </div>
  )
}
