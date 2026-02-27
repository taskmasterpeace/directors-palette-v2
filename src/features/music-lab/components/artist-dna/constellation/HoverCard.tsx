'use client'

import { Html } from '@react-three/drei'

interface HoverCardProps {
  label: string
  category: string
  color: string
}

export function HoverCard({ label, category, color }: HoverCardProps) {
  return (
    <Html
      center
      style={{ pointerEvents: 'none', transform: 'translateY(-28px)' }}
    >
      <div
        className="px-2.5 py-1.5 rounded-lg border max-w-[140px]"
        style={{
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(255,255,255,0.1)',
          boxShadow: `0 0 12px ${color}30`,
        }}
      >
        <p className="text-[11px] font-semibold text-white/90 leading-tight truncate">{label}</p>
        <p className="text-[9px] font-medium mt-0.5 leading-tight" style={{ color }}>{category}</p>
      </div>
    </Html>
  )
}
