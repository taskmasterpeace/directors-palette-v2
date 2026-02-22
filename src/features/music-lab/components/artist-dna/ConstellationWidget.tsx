'use client'

import { useState, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'
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

  const delivery =
    (dna.lexicon.signaturePhrases.length > 0 ? 0.25 : 0) +
    (dna.lexicon.slang.length > 0 ? 0.25 : 0) +
    (dna.lexicon.adLibs.length > 0 ? 0.25 : 0) +
    (dna.lexicon.bannedWords.length > 0 ? 0.25 : 0)

  const lexicon =
    (dna.identity.name ? 0.2 : 0) +
    (dna.identity.backstory ? 0.2 : 0) +
    (dna.identity.city ? 0.2 : 0) +
    (dna.look.visualDescription ? 0.2 : 0) +
    (dna.catalog.entries.length > 0 ? 0.2 : 0)

  return { sound, influences, persona, delivery, lexicon }
}

const RING_COLORS = [
  '#f59e0b', // amber - Sound
  '#8b5cf6', // violet - Influences
  '#ef4444', // red - Persona
  '#06b6d4', // cyan - Delivery
  '#22c55e', // green - Lexicon
]

const RING_LABELS = ['Sound', 'Influences', 'Persona', 'Delivery', 'Lexicon']

interface OrbitalRingProps {
  radius: number
  fill: number
  color: string
  index: number
}

function OrbitalRing({ radius, fill, color, index }: OrbitalRingProps) {
  const groupRef = useRef<THREE.Group>(null)
  const starsCount = Math.round(fill * 8) // up to 8 stars per ring

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * (0.1 + index * 0.03)
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2 + index) * 0.1
    }
  })

  const stars = useMemo(() => {
    return Array.from({ length: starsCount }, (_, i) => {
      const angle = (i / Math.max(starsCount, 1)) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = (Math.random() - 0.5) * 0.3
      return { x, y, z, scale: 0.02 + Math.random() * 0.03 }
    })
  }, [starsCount, radius])

  const threeColor = useMemo(() => new THREE.Color(color), [color])

  return (
    <group ref={groupRef}>
      {/* Ring line */}
      <mesh rotation-x={Math.PI / 2}>
        <ringGeometry args={[radius - 0.005, radius + 0.005, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>

      {/* Stars */}
      {stars.map((star, i) => (
        <mesh key={i} position={[star.x, star.y, star.z]}>
          <sphereGeometry args={[star.scale, 8, 8]} />
          <meshBasicMaterial color={color} />
          {/* Glow */}
          <pointLight color={threeColor} intensity={0.1} distance={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function ConstellationScene() {
  const { draft } = useArtistDnaStore()
  const fills = calculateRingFill(draft)
  const fillValues = [fills.sound, fills.influences, fills.persona, fills.delivery, fills.lexicon]

  return (
    <>
      <ambientLight intensity={0.3} />

      {/* Center glow */}
      <mesh>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.6} />
      </mesh>
      <pointLight color="#f59e0b" intensity={0.5} distance={3} />

      {/* Orbital rings */}
      {RING_COLORS.map((color, i) => (
        <OrbitalRing
          key={i}
          radius={0.3 + i * 0.2}
          fill={fillValues[i]}
          color={color}
          index={i}
        />
      ))}

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={(3 * Math.PI) / 4}
      />
    </>
  )
}

export function ConstellationWidget() {
  const [expanded, setExpanded] = useState(false)
  const { draft } = useArtistDnaStore()

  const fills = calculateRingFill(draft)
  const totalFill = Object.values(fills).reduce((sum, v) => sum + v, 0) / 5

  if (!expanded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(true)}
        className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full"
        title="DNA Constellation"
      >
        <Star className="w-4 h-4 text-amber-400" />
      </Button>
    )
  }

  return (
    <div className="absolute top-2 right-2 w-[220px] rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1 border-b border-border/50">
        <span className="text-[10px] font-medium text-muted-foreground">DNA Constellation</span>
        <button
          className="text-[10px] text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(false)}
        >
          Collapse
        </button>
      </div>

      <div className="h-[200px] bg-black/50">
        <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }}>
          <ConstellationScene />
        </Canvas>
      </div>

      {/* Ring legend */}
      <div className="px-2 py-1.5 space-y-0.5">
        {RING_LABELS.map((label, i) => {
          const fillValues = [fills.sound, fills.influences, fills.persona, fills.delivery, fills.lexicon]
          return (
            <div key={label} className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: RING_COLORS[i] }}
              />
              <span className="text-[9px] text-muted-foreground flex-1">{label}</span>
              <span className="text-[9px] text-muted-foreground">
                {Math.round(fillValues[i] * 100)}%
              </span>
            </div>
          )
        })}
        <div className="border-t border-border/50 pt-0.5 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-medium">Overall</span>
            <span className="text-[9px] text-amber-400">{Math.round(totalFill * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
