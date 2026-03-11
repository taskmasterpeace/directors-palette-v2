'use client'

import { cn } from '@/utils/utils'

interface DimensionPreviewProps {
  dimensions: { x: number; y: number; z: number } // in mm
  className?: string
}

function mmToInches(mm: number): string {
  return (mm / 25.4).toFixed(1)
}

function mmToCm(mm: number): string {
  return (mm / 10).toFixed(1)
}

export function DimensionPreview({ dimensions, className }: DimensionPreviewProps) {
  const { x, y, z } = dimensions

  return (
    <div className={cn('p-4 rounded-xl bg-card/40 border border-border/30', className)}>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Print Dimensions
      </span>
      <div className="mt-3 flex items-center justify-center">
        {/* Simple isometric wireframe box using SVG */}
        <div className="relative w-48 h-36">
          <svg viewBox="0 0 200 150" className="w-full h-full" fill="none" stroke="currentColor">
            {/* Back face */}
            <rect x="60" y="10" width="80" height="80" className="stroke-border/40" strokeDasharray="4 4" />
            {/* Bottom face */}
            <path d="M 40 90 L 60 90 L 140 90 L 160 110 L 80 110 L 40 90" className="stroke-border/40" strokeDasharray="4 4" />
            {/* Front face */}
            <rect x="40" y="30" width="80" height="80" className="stroke-cyan-400/60" strokeWidth="1.5" />
            {/* Connecting lines */}
            <line x1="40" y1="30" x2="60" y2="10" className="stroke-border/40" strokeDasharray="4 4" />
            <line x1="120" y1="30" x2="140" y2="10" className="stroke-cyan-400/40" strokeWidth="1" />
            <line x1="120" y1="110" x2="140" y2="90" className="stroke-border/40" strokeDasharray="4 4" />
          </svg>

          {/* Width label (bottom) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1">
            <p className="text-[10px] font-medium text-cyan-400 text-center whitespace-nowrap">
              {mmToCm(x)}cm <span className="text-muted-foreground/50">({mmToInches(x)}&quot;)</span>
            </p>
          </div>

          {/* Height label (left) */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1">
            <p className="text-[10px] font-medium text-cyan-400 text-center whitespace-nowrap">
              {mmToCm(y)}cm
            </p>
          </div>

          {/* Depth label (top right) */}
          <div className="absolute top-0 right-4">
            <p className="text-[10px] font-medium text-muted-foreground/60 text-center whitespace-nowrap">
              {mmToCm(z)}cm
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
