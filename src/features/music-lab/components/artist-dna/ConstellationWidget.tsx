'use client'

import { useState, useRef, useMemo } from 'react'
import { Star, ChevronUp, ChevronDown } from 'lucide-react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
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

interface OrbitalRingProps {
  radius: number
  fill: number
  color: string
  index: number
}

function OrbitalRing({ radius, fill, color, index }: OrbitalRingProps) {
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
      {/* Ring line — thicker, more visible */}
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[radius, 0.008, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={fill > 0 ? 0.3 : 0.08} />
      </mesh>
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

function ConstellationScene() {
  const { draft } = useArtistDnaStore()
  const fills = calculateRingFill(draft)
  const fillValues = [fills.sound, fills.influences, fills.persona, fills.lexicon, fills.profile]

  return (
    <>
      <ambientLight intensity={0.2} />
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
      {/* Subtle background glow */}
      <pointLight color="#f59e0b" intensity={0.15} distance={8} position={[0, 0, 0]} />
      {RING_COLORS.map((color, i) => (
        <OrbitalRing
          key={i}
          radius={0.3 + i * 0.25}
          fill={fillValues[i]}
          color={color}
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
  const { draft } = useArtistDnaStore()

  const fills = calculateRingFill(draft)
  const fillValues = [fills.sound, fills.influences, fills.persona, fills.lexicon, fills.profile]
  const totalFill = Object.values(fills).reduce((sum, v) => sum + v, 0) / 5

  // Collapsed: compact inline bar with ring dots and overall %
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

  // Expanded: full-width horizontal strip
  return (
    <div className="w-full rounded-xl border border-border/40 bg-gradient-to-r from-black/60 via-black/40 to-background/80 backdrop-blur-sm overflow-hidden">
      <div className="flex h-[150px]">
        {/* 3D Canvas — fills available width */}
        <div className="flex-1 min-w-0 bg-gradient-to-b from-black/90 to-black/70">
          <Canvas camera={{ position: [0, 0.8, 1.8], fov: 55 }}>
            <ConstellationScene />
          </Canvas>
        </div>

        {/* Legend + stats — compact sidebar */}
        <div className="w-[220px] shrink-0 px-4 py-3 flex flex-col justify-between border-l border-border/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
              DNA Constellation
            </span>
            <button
              className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
              onClick={() => setExpanded(false)}
              title="Collapse"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 flex-1">
            {RING_LABELS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0 ring-1 ring-white/10"
                  style={{ backgroundColor: RING_COLORS[i] }}
                />
                <span className="text-[11px] text-muted-foreground flex-1">{label}</span>
                {/* Progress bar */}
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
