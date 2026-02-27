'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function CentralStar() {
  const meshRef = useRef<THREE.Mesh>(null)

  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f59e0b' }), [])
  const glowMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.15 }), [])

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.elapsedTime
      meshRef.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.04)
    }
  })

  return (
    <group>
      <mesh ref={meshRef} material={material}>
        <sphereGeometry args={[0.12, 16, 16]} />
      </mesh>
      <mesh material={glowMaterial}>
        <sphereGeometry args={[0.22, 16, 16]} />
      </mesh>
      <pointLight color="#f59e0b" intensity={0.8} distance={4} />
      <pointLight color="#f59e0b" intensity={0.15} distance={8} />
    </group>
  )
}
