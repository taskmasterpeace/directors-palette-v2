'use client'

import React, { useRef, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { CameraAngle } from '../../helpers/camera-angle.helper'
import {
  getCameraAngleDescription,
  CAMERA_PRESETS,
  DEFAULT_CAMERA_ANGLE,
} from '../../helpers/camera-angle.helper'

// ── 3D Scene Components ─────────────────────────────────────────────

interface SubjectSphereProps {
  angle: CameraAngle
}

/** Visual indicator showing where the camera is pointing from */
function CameraIndicator({ angle }: SubjectSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const lineObjRef = useRef<THREE.Line | null>(null)

  // Create line object imperatively to avoid JSX <line> conflict with SVG
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

    // Convert spherical coordinates to cartesian
    const azimuthRad = THREE.MathUtils.degToRad(angle.azimuth)
    const elevationRad = THREE.MathUtils.degToRad(angle.elevation)
    const radius = 2 + (angle.distance / 10) * 2 // Map 0-10 to 2-4

    const x = radius * Math.cos(elevationRad) * Math.sin(azimuthRad)
    const y = radius * Math.sin(elevationRad)
    const z = radius * Math.cos(elevationRad) * Math.cos(azimuthRad)

    meshRef.current.position.set(x, y, z)
    meshRef.current.lookAt(0, 0, 0)

    // Update line from camera to subject
    if (lineObjRef.current) {
      const positions = lineObjRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
      positions.setXYZ(0, x, y, z)
      positions.setXYZ(1, 0, 0, 0)
      positions.needsUpdate = true
    }
  })

  return (
    <>
      {/* Subject sphere at center */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#06b6d4" opacity={0.6} transparent />
      </mesh>

      {/* Camera indicator */}
      <mesh ref={meshRef}>
        <coneGeometry args={[0.15, 0.4, 8]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.3} />
      </mesh>

      {/* Line from camera to subject */}
      <primitive object={lineObj} />

      {/* Azimuth ring (horizontal) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.02, 16, 64]} />
        <meshStandardMaterial color="#ec4899" opacity={0.5} transparent />
      </mesh>

      {/* Elevation arc (vertical, follows azimuth) */}
      <mesh rotation={[0, THREE.MathUtils.degToRad(angle.azimuth), 0]}>
        <torusGeometry args={[2.5, 0.02, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#06b6d4" opacity={0.5} transparent />
      </mesh>

      {/* Ground grid */}
      <gridHelper args={[6, 12, '#334155', '#1e293b']} position={[0, -1.5, 0]} />
    </>
  )
}

/** Camera auto-positioning based on viewport */
function CameraSetup() {
  const { camera } = useThree()
  React.useEffect(() => {
    camera.position.set(4, 3, 4)
    camera.lookAt(0, 0, 0)
  }, [camera])
  return null
}

// ── Main Component ──────────────────────────────────────────────────

interface CameraAngleGizmoProps {
  angle: CameraAngle
  onChange: (angle: CameraAngle) => void
}

export function CameraAngleGizmo({ angle, onChange }: CameraAngleGizmoProps) {
  const description = getCameraAngleDescription(angle)

  const updateAngle = useCallback((key: keyof CameraAngle, value: number) => {
    onChange({ ...angle, [key]: value })
  }, [angle, onChange])

  return (
    <div className="flex flex-col gap-3">
      {/* 3D Viewport */}
      <div
        className="relative w-full rounded-lg overflow-hidden border border-white/10"
        style={{ height: 200, background: 'oklch(0.15 0.02 260)' }}
      >
        <Canvas>
          <CameraSetup />
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} intensity={0.8} />
          <CameraIndicator angle={angle} />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 1.5}
          />
        </Canvas>

        {/* Description overlay */}
        <div className="absolute bottom-2 left-2 right-2 text-center">
          <span className="text-xs px-2 py-1 rounded-md bg-black/60 text-white/80 backdrop-blur-sm">
            {description}
          </span>
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-2">
        {/* Azimuth */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-white/50 w-16 shrink-0">Rotate</label>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={angle.azimuth}
            onChange={(e) => updateAngle('azimuth', Number(e.target.value))}
            className="flex-1 h-1.5 accent-pink-500"
          />
          <span className="text-xs text-white/40 w-10 text-right">{Math.round(angle.azimuth)}°</span>
        </div>

        {/* Elevation */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-white/50 w-16 shrink-0">Tilt</label>
          <input
            type="range"
            min={-30}
            max={60}
            step={1}
            value={angle.elevation}
            onChange={(e) => updateAngle('elevation', Number(e.target.value))}
            className="flex-1 h-1.5 accent-cyan-500"
          />
          <span className="text-xs text-white/40 w-10 text-right">{Math.round(angle.elevation)}°</span>
        </div>

        {/* Distance */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-white/50 w-16 shrink-0">Zoom</label>
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={angle.distance}
            onChange={(e) => updateAngle('distance', Number(e.target.value))}
            className="flex-1 h-1.5 accent-amber-500"
          />
          <span className="text-xs text-white/40 w-10 text-right">{angle.distance.toFixed(1)}</span>
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {CAMERA_PRESETS.map((preset) => {
          const isActive =
            Math.abs(angle.azimuth - preset.angle.azimuth) < 5 &&
            Math.abs(angle.elevation - preset.angle.elevation) < 5 &&
            Math.abs(angle.distance - preset.angle.distance) < 1
          return (
            <button
              key={preset.name}
              onClick={() => onChange({ ...preset.angle })}
              className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${
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
          className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
