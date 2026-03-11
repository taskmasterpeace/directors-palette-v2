'use client'

import React, { useRef, useState, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
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

/** Mini camera model — box body + cylinder lens, looks like a real camera */
function CameraModel() {
  return (
    <group>
      {/* Camera body */}
      <mesh>
        <boxGeometry args={[0.28, 0.18, 0.16]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.4} />
      </mesh>
      {/* Lens barrel */}
      <mesh position={[0, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.14, 8]} />
        <meshStandardMaterial color="#0e7490" emissive="#06b6d4" emissiveIntensity={0.2} />
      </mesh>
      {/* Lens glass */}
      <mesh position={[0, 0, 0.21]}>
        <circleGeometry args={[0.055, 16]} />
        <meshStandardMaterial color="#67e8f9" emissive="#67e8f9" emissiveIntensity={0.6} />
      </mesh>
      {/* Viewfinder bump */}
      <mesh position={[0, 0.12, -0.02]}>
        <boxGeometry args={[0.1, 0.06, 0.08]} />
        <meshStandardMaterial color="#0e7490" emissive="#06b6d4" emissiveIntensity={0.2} />
      </mesh>
    </group>
  )
}

interface CameraIndicatorProps {
  angle: CameraAngle
  imageUrl?: string
}

function CameraIndicator({ angle, imageUrl }: CameraIndicatorProps) {
  const groupRef = useRef<THREE.Group>(null)
  const lineObjRef = useRef<THREE.Line | null>(null)

  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3))
    const mat = new THREE.LineBasicMaterial({ color: '#06b6d4', opacity: 0.3, transparent: true })
    const l = new THREE.Line(geo, mat)
    lineObjRef.current = l
    return l
  }, [])

  useFrame(() => {
    if (!groupRef.current) return

    const azimuthRad = THREE.MathUtils.degToRad(angle.azimuth)
    const elevationRad = THREE.MathUtils.degToRad(angle.elevation)
    const radius = 2.5 - (angle.distance / 10) * 1.2 // 0=far(2.5) to 10=close(1.3)

    const x = radius * Math.cos(elevationRad) * Math.sin(azimuthRad)
    const y = radius * Math.sin(elevationRad)
    const z = radius * Math.cos(elevationRad) * Math.cos(azimuthRad)

    groupRef.current.position.set(x, y, z)
    groupRef.current.lookAt(0, 0, 0)

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
            <sphereGeometry args={[0.35, 32, 32]} />
            <meshStandardMaterial color="#06b6d4" opacity={0.6} transparent />
          </mesh>
        }>
          <SubjectImage imageUrl={imageUrl} />
        </React.Suspense>
      ) : (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial color="#06b6d4" opacity={0.6} transparent />
        </mesh>
      )}

      {/* Front marker arrow on the ground */}
      <mesh position={[0, -0.85, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.25, 4]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, -0.85, 0.95]}>
        <boxGeometry args={[0.04, 0.04, 0.3]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.3} />
      </mesh>

      {/* Camera model indicator */}
      <group ref={groupRef}>
        <CameraModel />
      </group>

      {/* Line from camera to subject */}
      <primitive object={lineObj} />

      {/* Azimuth ring (horizontal) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.012, 16, 64]} />
        <meshStandardMaterial color="#ec4899" opacity={0.35} transparent />
      </mesh>

      {/* Elevation arc (vertical, follows azimuth) */}
      <mesh rotation={[0, THREE.MathUtils.degToRad(angle.azimuth), 0]}>
        <torusGeometry args={[1.5, 0.012, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#06b6d4" opacity={0.35} transparent />
      </mesh>

      {/* Ground grid */}
      <gridHelper args={[3.5, 7, '#334155', '#1e293b']} position={[0, -0.85, 0]} />
    </>
  )
}

/** Camera viewport position — adjustable zoom level */
function CameraSetup({ zoom }: { zoom: number }) {
  const { camera } = useThree()
  React.useEffect(() => {
    const dist = 4.5 - zoom * 0.5 // zoom 0→4.5, zoom 3→3.0
    camera.position.set(dist * 0.6, dist * 0.45, dist * 0.6)
    camera.lookAt(0, 0, 0)
  }, [camera, zoom])
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
  const [viewZoom, setViewZoom] = useState(2) // Default zoom level (0-4)
  const [hovered, setHovered] = useState(false)

  const updateAngle = useCallback((key: keyof CameraAngle, value: number) => {
    onChange({ ...angle, [key]: value })
  }, [angle, onChange])

  return (
    <div className="flex flex-col gap-2">
      {/* Compact layout: viewport + sliders side-by-side */}
      <div className="flex gap-2">
        {/* 3D Viewport — left side */}
        <div
          className="relative shrink-0 rounded-lg overflow-hidden border border-white/10"
          style={{ width: 160, height: 160, background: 'oklch(0.13 0.02 260)' }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <Canvas>
            <CameraSetup zoom={viewZoom} />
            <ambientLight intensity={0.6} />
            <pointLight position={[5, 5, 5]} intensity={0.8} />
            <CameraIndicator angle={angle} imageUrl={imageUrl} />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI / 1.5}
            />
          </Canvas>

          {/* +/- zoom buttons — top corners, desktop hover only */}
          <div className={`absolute top-1 left-1 right-1 flex justify-between pointer-events-none transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
            <button
              onClick={() => setViewZoom(z => Math.max(0, z - 1))}
              className="pointer-events-auto w-5 h-5 rounded bg-black/50 text-white/70 hover:bg-black/70 hover:text-white text-xs flex items-center justify-center backdrop-blur-sm"
            >
              −
            </button>
            <button
              onClick={() => setViewZoom(z => Math.min(4, z + 1))}
              className="pointer-events-auto w-5 h-5 rounded bg-black/50 text-white/70 hover:bg-black/70 hover:text-white text-xs flex items-center justify-center backdrop-blur-sm"
            >
              +
            </button>
          </div>

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
