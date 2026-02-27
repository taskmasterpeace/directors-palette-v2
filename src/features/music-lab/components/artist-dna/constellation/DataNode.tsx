'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { NodeData } from './types'
import { HoverCard } from './HoverCard'

interface DataNodeProps {
  node: NodeData
  position: [number, number, number]
  baseScale: number
  color: string
  glowIntensity: number
  pulseOffset: number
  pulseSpeed: number
}

export function DataNode({ node, position, baseScale, color, glowIntensity, pulseOffset, pulseSpeed }: DataNodeProps) {
  const [hovered, setHovered] = useState(false)
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const trailRef = useRef<THREE.Mesh>(null)
  const animatedScale = useRef(0)
  const flyProgress = useRef(0)

  const { camera } = useThree()

  const scale = baseScale * (0.6 + node.importance * 0.4)

  const spawnOrigin = useMemo(() => {
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ).normalize()
    return dir.multiplyScalar(4 + Math.random() * 3)
  }, [])

  const targetPos = useMemo(() => new THREE.Vector3(...position), [position])
  const threeColor = useMemo(() => new THREE.Color(color), [color])

  const handlePointerOver = useCallback(() => setHovered(true), [])
  const handlePointerOut = useCallback(() => setHovered(false), [])

  useFrame((state) => {
    const t = state.clock.elapsedTime

    if (flyProgress.current < 1) {
      flyProgress.current = Math.min(flyProgress.current + 0.035, 1)
      const ease = 1 - Math.pow(1 - flyProgress.current, 3)
      if (groupRef.current) {
        groupRef.current.position.lerpVectors(spawnOrigin, targetPos, ease)
      }
    }

    const scaleDelay = Math.max((flyProgress.current - 0.3) / 0.7, 0)
    const targetScale = scale * scaleDelay
    if (animatedScale.current < targetScale) {
      animatedScale.current += (targetScale - animatedScale.current) * 0.1
    }

    if (meshRef.current) {
      const pulse = 1 + Math.sin(t * pulseSpeed + pulseOffset) * 0.15
      const hoverScale = hovered ? 1.3 : 1.0
      const s = animatedScale.current * pulse * hoverScale
      meshRef.current.scale.setScalar(s / scale)
    }
    if (lightRef.current) {
      const hoverGlow = hovered ? 0.4 : 0
      lightRef.current.intensity = (glowIntensity + hoverGlow) * (1 + Math.sin(t * pulseSpeed + pulseOffset) * 0.3)
    }

    if (trailRef.current) {
      const trailOpacity = flyProgress.current < 1 ? 0.6 * (1 - flyProgress.current) : 0
      const mat = trailRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = trailOpacity
      if (flyProgress.current < 1 && groupRef.current) {
        const dir = targetPos.clone().sub(groupRef.current.position)
        if (dir.length() > 0.01) {
          trailRef.current.lookAt(groupRef.current.position.clone().sub(dir))
          const stretch = Math.min(dir.length() * 1.5, 0.8)
          trailRef.current.scale.set(1, 1, stretch / 0.15)
        }
      }
    }
  })

  const showLabel = camera.position.length() < 2.8 && flyProgress.current >= 1

  return (
    <group ref={groupRef} position={spawnOrigin.toArray() as [number, number, number]}>
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[scale, 12, 12]} />
        <meshBasicMaterial color={color} />
        <pointLight ref={lightRef} color={threeColor} intensity={glowIntensity} distance={0.8} />
      </mesh>
      <mesh ref={trailRef}>
        <cylinderGeometry args={[scale * 0.3, 0, 0.15, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
      {hovered && <HoverCard label={node.label} category={node.category} color={color} />}
      {showLabel && !hovered && (
        <Html center style={{ pointerEvents: 'none' }}>
          <span
            className="text-[8px] font-medium px-1 py-0.5 rounded whitespace-nowrap"
            style={{
              color,
              opacity: 0.7,
              textShadow: '0 0 4px rgba(0,0,0,0.9)',
            }}
          >
            {node.label}
          </span>
        </Html>
      )}
    </group>
  )
}
