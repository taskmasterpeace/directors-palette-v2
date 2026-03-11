'use client'

import React, { useRef, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { CameraAngle } from '../../helpers/camera-angle.helper'
import {
  getCameraAngleDescription,
  CAMERA_PRESETS,
  DEFAULT_CAMERA_ANGLE,
} from '../../helpers/camera-angle.helper'

// ── 3D Scene Components ─────────────────────────────────────────────

/** Subject image billboard at center — shows uploaded reference image */
function SubjectImage({ imageUrl }: { imageUrl: string }) {
  const texture = useLoader(THREE.TextureLoader, imageUrl)
  const aspect = texture.image ? texture.image.width / texture.image.height : 1
  const height = 1.0
  const width = height * aspect
  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  )
}

interface CameraIndicatorProps {
  angle: CameraAngle
  imageUrl?: string
}

/** Visual indicator showing where the camera is pointing from */
function CameraIndicator({ angle, imageUrl }: CameraIndicatorProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const lineObjRef = useRef<THREE.Line | null>(null)

  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3))
    const mat = new THREE.LineBasicMaterial({ color: '#06b6d4', opacity: 0.4, transparent: true })
    const l = new THREE.Line(geo, mat)
    lineObjRef.current = l
    return l
  }, [])

  useFrame(() => {
    if (!meshRef.current) return

    const azimuthRad = THREE.MathUtils.degToRad(angle.azimuth)
    const elevationRad = THREE.MathUtils.degToRad(angle.elevation)
    const radius = 3 - (angle.distance / 10) * 1.5 // Map 0=far(3) to 10=close(1.5)

    const x = radius * Math.cos(elevationRad) * Math.sin(azimuthRad)
    const y = radius * Math.sin(elevationRad)
    const z = radius * Math.cos(elevationRad) * Math.cos(azimuthRad)

    meshRef.current.position.set(x, y, z)
    meshRef.current.lookAt(0, 0, 0)

    if (lineObjRef.current) {
      const positions = lineObjRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
      positions.setXYZ(0, x, y, z)
      positions.setXYZ(1, 0, 0, 0)
      positions.needsUpdate = true
    }
  })

  return (
    <>
      {/* Subject at center */}
      {imageUrl ? (
        <React.Suspense fallback={
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.4, 32, 32]} />
            <meshStandardMaterial color="#06b6d4" opacity={0.6} transparent />
          </mesh>
        }>
          <SubjectImage imageUrl={imageUrl} />
        </React.Suspense>
      ) : (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshStandardMaterial color="#06b6d4" opacity={0.6} transparent />
        </mesh>
      )}

      {/* "F" marker on the front (positive Z) so you know which side is front */}
      <Text
        position={[0, -0.85, 1.2]}
        fontSize={0.22}
        color="#06b6d4"
        anchorX="center"
        anchorY="middle"
        fontWeight={700}
      >
        FRONT
      </Text>

      {/* Camera indicator cone */}
      <mesh ref={meshRef}>
        <coneGeometry args={[0.12, 0.35, 8]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.3} />
      </mesh>

      {/* Line from camera to subject */}
      <primitive object={lineObj} />

      {/* Azimuth ring (horizontal) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.8, 0.015, 16, 64]} />
        <meshStandardMaterial color="#ec4899" opacity={0.4} transparent />
      </mesh>

      {/* Elevation arc (vertical, follows azimuth) */}
      <mesh rotation={[0, THREE.MathUtils.degToRad(angle.azimuth), 0]}>
        <torusGeometry args={[1.8, 0.015, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#06b6d4" opacity={0.4} transparent />
      </mesh>

      {/* Ground grid — smaller, tighter */}
      <gridHelper args={[4, 8, '#334155', '#1e293b']} position={[0, -1.0, 0]} />
    </>
  )
}

/** Camera auto-positioning — closer to subject */
function CameraSetup() {
  const { camera } = useThree()
  React.useEffect(() => {
    camera.position.set(2.8, 2, 2.8)
    camera.lookAt(0, 0, 0)
  }, [camera])
  return null
}

// ── Main Component ──────────────────────────────────────────────────

interface CameraAngleGizmoProps {
  angle: CameraAngle
  onChange: (angle: CameraAngle) => void
  imageUrl?: string
}

export function CameraAngleGizmo({ angle, onChange, imageUrl }: CameraAngleGizmoProps) {
  const description = getCameraAngleDescription(angle)

  const updateAngle = useCallback((key: keyof CameraAngle, value: number) => {
    onChange({ ...angle, [key]: value })
  }, [angle, onChange])

  return (
    <div className="flex flex-col gap-2">
      {/* Compact layout: viewport + sliders side-by-side */}
      <div className="flex gap-2">
        {/* 3D Viewport — left side, square */}
        <div
          className="relative shrink-0 rounded-lg overflow-hidden border border-white/10"
          style={{ width: 140, height: 140, background: 'oklch(0.15 0.02 260)' }}
        >
          <Canvas>
            <CameraSetup />
            <ambientLight intensity={0.5} />
            <pointLight position={[5, 5, 5]} intensity={0.8} />
            <CameraIndicator angle={angle} imageUrl={imageUrl} />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI / 1.5}
            />
          </Canvas>

          {/* Description overlay */}
          <div className="absolute bottom-1 left-1 right-1 text-center">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-white/80 backdrop-blur-sm">
              {description}
            </span>
          </div>
        </div>

        {/* Sliders — right side */}
        <div className="flex-1 flex flex-col justify-center gap-2">
          {/* Azimuth */}
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-white/50 w-11 shrink-0">Rotate</label>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={angle.azimuth}
              onChange={(e) => updateAngle('azimuth', Number(e.target.value))}
              className="flex-1 h-1 accent-pink-500"
            />
            <span className="text-[10px] text-white/40 w-8 text-right">{Math.round(angle.azimuth)}°</span>
          </div>

          {/* Elevation */}
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-white/50 w-11 shrink-0">Tilt</label>
            <input
              type="range"
              min={-30}
              max={60}
              step={1}
              value={angle.elevation}
              onChange={(e) => updateAngle('elevation', Number(e.target.value))}
              className="flex-1 h-1 accent-cyan-500"
            />
            <span className="text-[10px] text-white/40 w-8 text-right">{Math.round(angle.elevation)}°</span>
          </div>

          {/* Distance */}
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-white/50 w-11 shrink-0">Zoom</label>
            <input
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={angle.distance}
              onChange={(e) => updateAngle('distance', Number(e.target.value))}
              className="flex-1 h-1 accent-amber-500"
            />
            <span className="text-[10px] text-white/40 w-8 text-right">{angle.distance.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Presets — compact row */}
      <div className="flex flex-wrap gap-1">
        {CAMERA_PRESETS.map((preset) => {
          const isActive =
            Math.abs(angle.azimuth - preset.angle.azimuth) < 5 &&
            Math.abs(angle.elevation - preset.angle.elevation) < 5 &&
            Math.abs(angle.distance - preset.angle.distance) < 1
          return (
            <button
              key={preset.name}
              onClick={() => onChange({ ...preset.angle })}
              className={`text-[9px] px-1.5 py-0.5 rounded-md transition-colors ${
                isActive
                  ? 'bg-cyan-600 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              {preset.name}
            </button>
          )
        })}
        <button
          onClick={() => onChange({ ...DEFAULT_CAMERA_ANGLE })}
          className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
