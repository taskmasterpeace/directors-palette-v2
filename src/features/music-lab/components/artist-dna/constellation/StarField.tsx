'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { AtmospherePreset } from './types'
import { DEFAULT_PALETTE } from './constants'

interface StarFieldProps {
  atmosphere?: AtmospherePreset
}

export function StarField({ atmosphere }: StarFieldProps) {
  const palette = atmosphere?.palette || DEFAULT_PALETTE
  const size = atmosphere?.particleSize || 0.03
  const brightness = atmosphere?.brightness || 0.7
  const ref = useRef<THREE.Points>(null)

  const { positions, colors } = useMemo(() => {
    const count = 600
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 3 + Math.random() * 8
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)

      const tint = Math.random()
      const [pr, pg, pb] = tint < 0.5
        ? palette[0]
        : tint < 0.75
        ? (palette[1] || palette[0])
        : (palette[2] || palette[0])

      col[i * 3] = Math.min(1, pr * brightness + (Math.random() - 0.5) * 0.1)
      col[i * 3 + 1] = Math.min(1, pg * brightness + (Math.random() - 0.5) * 0.1)
      col[i * 3 + 2] = Math.min(1, pb * brightness + (Math.random() - 0.5) * 0.1)
    }
    return { positions: pos, colors: col }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette[0]?.[0], palette[1]?.[0], palette[2]?.[0], brightness])

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.02
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={size} vertexColors transparent opacity={brightness} sizeAttenuation />
    </points>
  )
}
