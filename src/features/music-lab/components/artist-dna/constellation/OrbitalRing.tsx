'use client'

import { useRef, useMemo, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { NodeData } from './types'
import { DataNode } from './DataNode'

interface OrbitalRingProps {
  radius: number
  fill: number
  color: string
  label: string
  index: number
  itemCount: number
  glowChars: number
  nodes: NodeData[]
  onRingClick?: () => void
  isActiveRing?: boolean
}

export function OrbitalRing({
  radius, fill, color, label, index, itemCount, glowChars, nodes, onRingClick, isActiveRing,
}: OrbitalRingProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [ringHovered, setRingHovered] = useState(false)

  const nodeScale = 0.03 + Math.min(itemCount, 10) * 0.008
  const glowIntensity = 0.05 + Math.min(glowChars / 500, 0.3)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * (0.15 + index * 0.04)
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3 + index) * 0.15
    }
  })

  const nodePositions = useMemo(() => {
    const count = nodes.length || Math.max(Math.round(fill * 12), fill > 0 ? 2 : 0)
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / Math.max(count, 1)) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = (Math.random() - 0.5) * 0.2
      const pulseOffset = Math.random() * Math.PI * 2
      const pulseSpeed = 1.5 + Math.random() * 1.5
      return { x, y, z, pulseOffset, pulseSpeed }
    })
  }, [nodes.length, fill, radius])

  const handleRingPointerOver = useCallback(() => setRingHovered(true), [])
  const handleRingPointerOut = useCallback(() => setRingHovered(false), [])
  const handleRingClick = useCallback(() => onRingClick?.(), [onRingClick])

  const ringOpacity = fill > 0
    ? (ringHovered || isActiveRing ? 0.55 : 0.3)
    : (ringHovered ? 0.15 : 0.08)

  return (
    <group ref={groupRef}>
      {/* Ring torus — interactive */}
      <mesh
        rotation-x={Math.PI / 2}
        onPointerOver={handleRingPointerOver}
        onPointerOut={handleRingPointerOut}
        onClick={handleRingClick}
      >
        <torusGeometry args={[radius, ringHovered ? 0.018 : 0.012, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={ringOpacity} />
      </mesh>

      {/* Label */}
      <Html
        position={[radius + 0.12, 0, 0]}
        style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
        center={false}
      >
        <span
          style={{
            color,
            fontSize: '10px',
            fontWeight: 600,
            opacity: fill > 0 ? 0.8 : 0.3,
            textShadow: '0 0 4px rgba(0,0,0,0.8)',
          }}
        >
          {label}
        </span>
      </Html>

      {/* Empty ring "+" indicator */}
      {fill === 0 && (
        <Html position={[0, radius * 0.3, 0]} center>
          <button
            onClick={handleRingClick}
            className="text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border animate-pulse"
            style={{
              color,
              borderColor: `${color}50`,
              background: `${color}15`,
            }}
          >
            +
          </button>
        </Html>
      )}

      {/* Data nodes */}
      {nodePositions.map((pos, i) => {
        const nodeData = nodes[i] || {
          id: `${label.toLowerCase()}:node-${i}`,
          label: label,
          category: 'data',
          ring: label,
          importance: 0.5,
        }
        return (
          <DataNode
            key={nodeData.id}
            node={nodeData}
            position={[pos.x, pos.y, pos.z]}
            baseScale={nodeScale}
            color={color}
            glowIntensity={glowIntensity}
            pulseOffset={pos.pulseOffset}
            pulseSpeed={pos.pulseSpeed}
          />
        )
      })}
    </group>
  )
}
