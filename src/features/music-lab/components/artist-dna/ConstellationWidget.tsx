'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { Star, ChevronUp, ChevronDown, ArrowLeft, Save, ZoomIn, ZoomOut } from 'lucide-react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import type { ArtistDNA } from '../../types/artist-dna.types'
import * as THREE from 'three'

// Calculate how "filled" each DNA ring is (0-1)
function calculateRingFill(dna: ArtistDNA) {
  const sound =
    (dna.sound.genres.length > 0 ? 0.2 : 0) +
    (dna.sound.vocalTextures.length > 0 ? 0.2 : 0) +
    (dna.sound.productionPreferences.length > 0 ? 0.2 : 0) +
    (dna.sound.artistInfluences.length > 0 ? 0.2 : 0) +
    (dna.sound.soundDescription ? 0.2 : 0)

  const influences =
    (dna.sound.artistInfluences.length > 0 ? 0.5 : 0) +
    (dna.sound.genres.length > 0 ? 0.25 : 0) +
    (dna.sound.subgenres.length > 0 ? 0.25 : 0)

  const persona =
    (dna.persona.traits.length > 0 ? 0.25 : 0) +
    (dna.persona.likes.length > 0 ? 0.25 : 0) +
    (dna.persona.attitude ? 0.25 : 0) +
    (dna.persona.worldview ? 0.25 : 0)

  const lexicon =
    (dna.lexicon.signaturePhrases.length > 0 ? 0.25 : 0) +
    (dna.lexicon.slang.length > 0 ? 0.25 : 0) +
    (dna.lexicon.adLibs.length > 0 ? 0.25 : 0) +
    (dna.lexicon.bannedWords.length > 0 ? 0.25 : 0)

  const profile =
    (dna.identity.name ? 0.2 : 0) +
    (dna.identity.backstory ? 0.2 : 0) +
    (dna.identity.city ? 0.2 : 0) +
    (dna.look.visualDescription ? 0.2 : 0) +
    (dna.catalog.entries.length > 0 ? 0.2 : 0)

  return { sound, influences, persona, lexicon, profile }
}

const RING_COLORS = [
  '#f59e0b', // amber - Sound
  '#8b5cf6', // violet - Influences
  '#ef4444', // red - Persona
  '#06b6d4', // cyan - Lexicon
  '#22c55e', // green - Profile
]

const RING_LABELS = ['Sound', 'Influences', 'Persona', 'Lexicon', 'Profile']

// Background star field
function StarField() {
  const points = useMemo(() => {
    const positions = new Float32Array(600 * 3)
    const colors = new Float32Array(600 * 3)
    for (let i = 0; i < 600; i++) {
      const r = 3 + Math.random() * 8
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      // Warm tints — mostly white/amber/violet
      const tint = Math.random()
      if (tint < 0.6) {
        colors[i * 3] = 0.8 + Math.random() * 0.2
        colors[i * 3 + 1] = 0.8 + Math.random() * 0.2
        colors[i * 3 + 2] = 0.8 + Math.random() * 0.2
      } else if (tint < 0.8) {
        colors[i * 3] = 0.9
        colors[i * 3 + 1] = 0.7
        colors[i * 3 + 2] = 0.3
      } else {
        colors[i * 3] = 0.6
        colors[i * 3 + 1] = 0.4
        colors[i * 3 + 2] = 0.9
      }
    }
    return { positions, colors }
  }, [])

  const ref = useRef<THREE.Points>(null)
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.02
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[points.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} vertexColors transparent opacity={0.7} sizeAttenuation />
    </points>
  )
}

interface OrbitalRingProps {
  radius: number
  fill: number
  color: string
  label: string
  index: number
}

function OrbitalRing({ radius, fill, color, label, index }: OrbitalRingProps) {
  const groupRef = useRef<THREE.Group>(null)
  const starsCount = Math.max(Math.round(fill * 12), fill > 0 ? 2 : 0)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * (0.15 + index * 0.04)
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3 + index) * 0.15
    }
  })

  const stars = useMemo(() => {
    return Array.from({ length: starsCount }, (_, i) => {
      const angle = (i / Math.max(starsCount, 1)) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = (Math.random() - 0.5) * 0.2
      return { x, y, z, scale: 0.03 + Math.random() * 0.04 }
    })
  }, [starsCount, radius])

  const threeColor = useMemo(() => new THREE.Color(color), [color])

  return (
    <group ref={groupRef}>
      {/* Ring torus */}
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[radius, 0.008, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={fill > 0 ? 0.3 : 0.08} />
      </mesh>
      {/* Label at the edge of the ring */}
      <Text
        position={[radius + 0.08, 0, 0]}
        fontSize={0.06}
        color={color}
        anchorX="left"
        anchorY="middle"
        fillOpacity={fill > 0 ? 0.8 : 0.3}
      >
        {label}
      </Text>
      {/* Stars on the ring */}
      {stars.map((star, i) => (
        <mesh key={i} position={[star.x, star.y, star.z]}>
          <sphereGeometry args={[star.scale, 12, 12]} />
          <meshBasicMaterial color={color} />
          <pointLight color={threeColor} intensity={0.15} distance={0.8} />
        </mesh>
      ))}
    </group>
  )
}

// Camera controller that responds to zoom level
function CameraController({ zoom }: { zoom: number }) {
  const { camera } = useThree()
  // zoom 0 = closest (0.8), zoom 1 = furthest (1.8)
  const targetZ = 0.8 + zoom * 1.0
  const targetY = 0.3 + zoom * 0.5

  useFrame(() => {
    camera.position.z += (targetZ - camera.position.z) * 0.05
    camera.position.y += (targetY - camera.position.y) * 0.05
    camera.lookAt(0, 0, 0)
  })

  return null
}

function ConstellationScene({ zoom }: { zoom: number }) {
  const { draft } = useArtistDnaStore()
  const fills = calculateRingFill(draft)
  const fillValues = [fills.sound, fills.influences, fills.persona, fills.lexicon, fills.profile]

  return (
    <>
      <ambientLight intensity={0.2} />
      <StarField />
      <CameraController zoom={zoom} />
      {/* Core star — glowing amber */}
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.15} />
      </mesh>
      <pointLight color="#f59e0b" intensity={0.8} distance={4} />
      <pointLight color="#f59e0b" intensity={0.15} distance={8} position={[0, 0, 0]} />
      {RING_COLORS.map((color, i) => (
        <OrbitalRing
          key={i}
          radius={0.3 + i * 0.25}
          fill={fillValues[i]}
          color={color}
          label={RING_LABELS[i]}
          index={i}
        />
      ))}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.8}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={(3 * Math.PI) / 4}
      />
    </>
  )
}

export function ConstellationWidget() {
  const [expanded, setExpanded] = useState(true)
  const [zoom, setZoom] = useState(0.5) // 0 = closest, 1 = furthest out
  const { draft, isDirty, saveArtist, closeEditor, artists, activeArtistId, loadArtistIntoDraft, startNewArtist } = useArtistDnaStore()

  const fills = calculateRingFill(draft)
  const fillValues = [fills.sound, fills.influences, fills.persona, fills.lexicon, fills.profile]
  const totalFill = Object.values(fills).reduce((sum, v) => sum + v, 0) / 5

  const artistName = draft.identity.name || 'New Artist'
  const otherArtists = artists.filter((a) => a.id !== activeArtistId)

  const handleSave = useCallback(async () => {
    await saveArtist()
  }, [saveArtist])

  // Collapsed: compact inline bar
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 bg-background/80 hover:bg-muted/50 transition-colors"
      >
        <Star className="w-3.5 h-3.5 text-amber-400" />
        {RING_LABELS.map((_, i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: RING_COLORS[i],
              opacity: fillValues[i] > 0 ? 0.4 + fillValues[i] * 0.6 : 0.15,
            }}
          />
        ))}
        <span className="text-[10px] font-medium text-amber-400 ml-1">
          {Math.round(totalFill * 100)}%
        </span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>
    )
  }

  return (
    <div className="w-full rounded-xl border border-border/40 overflow-hidden relative">
      <div className="flex h-[200px]">
        {/* 3D Canvas — fills available width */}
        <div className="flex-1 min-w-0 relative">
          <Canvas camera={{ position: [0, 0.55, 1.3], fov: 55 }}>
            <ConstellationScene zoom={zoom} />
          </Canvas>

          {/* Overlay: Bottom-left — Back + Artist Name */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={closeEditor}
              className="bg-black/50 hover:bg-black/70 text-white/90 backdrop-blur-sm h-7 px-2 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors">
                  <span className="text-sm font-semibold text-white/90">{artistName}</span>
                  {otherArtists.length > 0 && (
                    <ChevronDown className="w-3 h-3 text-white/50" />
                  )}
                  {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-1" />}
                </button>
              </DropdownMenuTrigger>
              {otherArtists.length > 0 && (
                <DropdownMenuContent align="start">
                  <p className="px-2 py-1 text-[10px] text-muted-foreground font-medium">Switch Artist</p>
                  {otherArtists.map((a) => (
                    <DropdownMenuItem key={a.id} onClick={() => loadArtistIntoDraft(a.id)} className="text-sm">
                      {a.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={startNewArtist} className="text-sm">+ New Artist</DropdownMenuItem>
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          </div>

          {/* Overlay: Top-right — Save button */}
          <div className="absolute top-3 right-3 z-10">
            <Button
              onClick={handleSave}
              disabled={!isDirty}
              size="sm"
              className="bg-black/50 hover:bg-black/70 backdrop-blur-sm h-7 px-3 text-xs disabled:opacity-30"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              Save
            </Button>
          </div>

          {/* Overlay: Bottom-right — Zoom slider */}
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-md px-2 py-1">
            <ZoomIn className="w-3 h-3 text-white/60" />
            <input
              type="range"
              min={0}
              max={100}
              value={zoom * 100}
              onChange={(e) => setZoom(Number(e.target.value) / 100)}
              className="w-20 h-1 accent-amber-500 cursor-pointer"
              title="Zoom"
            />
            <ZoomOut className="w-3 h-3 text-white/60" />
          </div>

          {/* Overlay: Top-left — Collapse button */}
          <button
            className="absolute top-3 left-3 z-10 bg-black/50 backdrop-blur-sm rounded-md p-1 text-white/60 hover:text-white/90 transition-colors"
            onClick={() => setExpanded(false)}
            title="Collapse"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Legend sidebar */}
        <div className="w-[220px] shrink-0 px-4 py-3 flex flex-col justify-between border-l border-border/20 bg-gradient-to-b from-black/60 to-background/80">
          <div className="flex items-center gap-1.5 mb-2">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
            <span className="text-xs font-semibold text-muted-foreground">DNA Constellation</span>
          </div>

          <div className="space-y-1.5 flex-1">
            {RING_LABELS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0 ring-1 ring-white/10"
                  style={{ backgroundColor: RING_COLORS[i] }}
                />
                <span className="text-[11px] text-muted-foreground flex-1">{label}</span>
                <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.max(fillValues[i] * 100, 2)}%`,
                      backgroundColor: RING_COLORS[i],
                      boxShadow: fillValues[i] > 0 ? `0 0 6px ${RING_COLORS[i]}40` : 'none',
                    }}
                  />
                </div>
                <span className="text-[11px] tabular-nums text-muted-foreground w-8 text-right font-medium">
                  {Math.round(fillValues[i] * 100)}%
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-border/30 pt-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/80">Overall</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-700"
                    style={{
                      width: `${Math.max(totalFill * 100, 2)}%`,
                      boxShadow: '0 0 8px #f59e0b40',
                    }}
                  />
                </div>
                <span className="text-sm font-bold text-amber-400 tabular-nums">
                  {Math.round(totalFill * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
