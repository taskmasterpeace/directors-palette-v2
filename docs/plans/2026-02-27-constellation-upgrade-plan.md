# Constellation Widget v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Constellation widget from a decorative visualizer into a data-rich, interactive navigation tool with DNA-reactive atmosphere.

**Architecture:** Extract the monolithic 580-line ConstellationWidget.tsx into a `constellation/` subfolder with 10 focused files. Each 3D sub-component gets its own file. New features (Data Nebula, Particle Atmosphere, Interactive Solar System) are built into the extracted components. The r3f + drei architecture is preserved. Canvas stays 208px tall.

**Tech Stack:** React Three Fiber, @react-three/drei (Html, OrbitControls), Three.js, Zustand (artist-dna.store), TypeScript strict mode

---

## Task 1: Create constellation/ folder scaffold + constants + types

**Files:**
- Create: `src/features/music-lab/components/artist-dna/constellation/constants.ts`
- Create: `src/features/music-lab/components/artist-dna/constellation/types.ts`

**Step 1: Create constants.ts**

Extract ring colors, labels, and add genre-to-palette mapping:

```ts
import type { ArtistDnaTab } from '../../../types/artist-dna.types'

export const RING_COLORS = [
  '#f59e0b', // amber - Sound
  '#38bdf8', // sky blue - Influences
  '#ef4444', // red - Persona
  '#06b6d4', // cyan - Lexicon
  '#22c55e', // green - Profile
]

export const RING_LABELS = ['Sound', 'Influences', 'Persona', 'Lexicon', 'Profile'] as const

export const RING_TAB_MAP: Record<string, ArtistDnaTab> = {
  Sound: 'sound',
  Influences: 'sound',
  Persona: 'persona',
  Lexicon: 'lexicon',
  Profile: 'identity',
}

// Genre → particle color palettes for StarField atmosphere
export const GENRE_PALETTES: Record<string, [number, number, number][]> = {
  'hip-hop':    [[0.96, 0.62, 0.04], [0.92, 0.35, 0.05], [0.10, 0.10, 0.04]],
  'trap':       [[0.96, 0.62, 0.04], [0.92, 0.35, 0.05], [0.10, 0.10, 0.04]],
  'rap':        [[0.96, 0.62, 0.04], [0.92, 0.35, 0.05], [0.10, 0.10, 0.04]],
  'pop':        [[0.93, 0.28, 0.60], [0.66, 0.33, 0.97], [0.98, 0.98, 0.98]],
  'rock':       [[0.94, 0.27, 0.27], [0.98, 0.45, 0.09], [0.27, 0.10, 0.01]],
  'metal':      [[0.94, 0.27, 0.27], [0.98, 0.45, 0.09], [0.27, 0.10, 0.01]],
  'electronic': [[0.02, 0.71, 0.83], [0.23, 0.51, 0.96], [0.05, 0.65, 0.91]],
  'dance':      [[0.02, 0.71, 0.83], [0.23, 0.51, 0.96], [0.05, 0.65, 0.91]],
  'r&b':        [[0.49, 0.23, 0.93], [0.96, 0.62, 0.04], [0.60, 0.40, 0.90]],
  'soul':       [[0.49, 0.23, 0.93], [0.96, 0.62, 0.04], [0.60, 0.40, 0.90]],
  'jazz':       [[0.85, 0.47, 0.02], [0.57, 0.25, 0.05], [0.90, 0.75, 0.40]],
  'country':    [[0.85, 0.60, 0.20], [0.57, 0.40, 0.15], [0.40, 0.65, 0.30]],
  'reggae':     [[0.20, 0.80, 0.20], [0.96, 0.62, 0.04], [0.80, 0.20, 0.20]],
  'latino':     [[0.96, 0.40, 0.20], [0.96, 0.62, 0.04], [0.85, 0.25, 0.40]],
  'blues':      [[0.15, 0.30, 0.70], [0.40, 0.55, 0.80], [0.85, 0.75, 0.50]],
  'classical':  [[0.90, 0.85, 0.70], [0.70, 0.60, 0.45], [0.95, 0.92, 0.88]],
}

// Default palette when no genre matches
export const DEFAULT_PALETTE: [number, number, number][] = [
  [0.8, 0.8, 0.8],   // white
  [0.96, 0.62, 0.04], // amber
  [0.22, 0.74, 0.97], // sky blue
]

// Attitude → hue shift direction
export const ATTITUDE_SHIFTS: Record<string, number> = {
  aggressive: 0.08,   // warmer (toward red)
  angry: 0.08,
  defiant: 0.05,
  chill: -0.08,        // cooler (toward blue)
  mellow: -0.06,
  playful: 0.0,        // no hue shift, just brighter
  vulnerable: -0.04,
}
```

**Step 2: Create types.ts**

```ts
export interface NodeData {
  id: string          // "sound:trap", "persona:street"
  label: string       // "Trap", "Street"
  category: string    // "genre", "vocalTexture", "trait", etc.
  ring: string        // "Sound", "Persona", etc.
  importance: number  // 0-1, drives node size
}

export interface RingData {
  label: string
  color: string
  fill: number
  itemCount: number
  glowChars: number
  nodes: NodeData[]
  tabId: string
}

export interface AtmospherePreset {
  palette: [number, number, number][]  // RGB triplets 0-1
  particleSize: number                 // base size
  brightness: number                   // 0-1 multiplier
}
```

**Step 3: Commit**

```bash
git add src/features/music-lab/components/artist-dna/constellation/
git commit -m "feat(constellation): scaffold folder with types and constants"
git push origin main
```

---

## Task 2: Create utils.ts — data extraction and atmosphere computation

**Files:**
- Create: `src/features/music-lab/components/artist-dna/constellation/utils.ts`

**Step 1: Write utils.ts**

This extracts the existing `calculateRingFill`, `calculateRingCounts`, `calculateRingGlow` functions and adds new `extractRingNodes` and `getAtmospherePreset`:

```ts
import type { ArtistDNA } from '../../../types/artist-dna.types'
import type { NodeData, AtmospherePreset } from './types'
import { GENRE_PALETTES, DEFAULT_PALETTE, ATTITUDE_SHIFTS } from './constants'

// Safe array helper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sa = <T = string>(val: unknown): T[] => Array.isArray(val) ? val as T[] : []

// ── Ring fill calculation (0-1 per ring) ──────────────────────────────

export function calculateRingFill(dna: ArtistDNA) {
  const sound =
    (sa(dna.sound.genres).length > 0 ? 0.2 : 0) +
    (sa(dna.sound.vocalTextures).length > 0 ? 0.2 : 0) +
    (sa(dna.sound.productionPreferences).length > 0 ? 0.2 : 0) +
    (sa(dna.sound.artistInfluences).length > 0 ? 0.2 : 0) +
    (dna.sound.soundDescription ? 0.2 : 0)

  const influences =
    (sa(dna.sound.artistInfluences).length > 0 ? 0.5 : 0) +
    (sa(dna.sound.genres).length > 0 ? 0.25 : 0) +
    (sa(dna.sound.subgenres).length > 0 ? 0.25 : 0)

  const persona =
    (sa(dna.persona.traits).length > 0 ? 0.25 : 0) +
    (sa(dna.persona.likes).length > 0 ? 0.25 : 0) +
    (dna.persona.attitude ? 0.25 : 0) +
    (dna.persona.worldview ? 0.25 : 0)

  const lexicon =
    (sa(dna.lexicon.signaturePhrases).length > 0 ? 0.25 : 0) +
    (sa(dna.lexicon.slang).length > 0 ? 0.25 : 0) +
    (sa(dna.lexicon.adLibs).length > 0 ? 0.25 : 0) +
    (sa(dna.lexicon.bannedWords).length > 0 ? 0.25 : 0)

  const profile =
    (dna.identity.stageName || dna.identity.realName ? 0.2 : 0) +
    (dna.identity.backstory ? 0.2 : 0) +
    (dna.identity.city ? 0.2 : 0) +
    (dna.look.visualDescription ? 0.2 : 0) +
    (Array.isArray(dna.catalog.entries) && dna.catalog.entries.length > 0 ? 0.2 : 0)

  return { sound, influences, persona, lexicon, profile }
}

// ── Ring node counts ──────────────────────────────────────────────────

export function calculateRingCounts(dna: ArtistDNA) {
  const sound = sa(dna.sound.genres).length + sa(dna.sound.vocalTextures).length +
    sa(dna.sound.productionPreferences).length + (dna.sound.soundDescription ? 1 : 0)
  const influences = sa(dna.sound.artistInfluences).length
  const persona = sa(dna.persona.traits).length + sa(dna.persona.likes).length +
    sa(dna.persona.dislikes).length + (dna.persona.attitude ? 1 : 0) + (dna.persona.worldview ? 1 : 0)
  const lexicon = sa(dna.lexicon.signaturePhrases).length + sa(dna.lexicon.slang).length +
    sa(dna.lexicon.adLibs).length + sa(dna.lexicon.bannedWords).length
  const profile = (dna.identity.stageName || dna.identity.realName ? 1 : 0) + (dna.identity.backstory ? 1 : 0) +
    (dna.identity.city ? 1 : 0) + (dna.look.visualDescription ? 1 : 0) + (Array.isArray(dna.catalog.entries) ? dna.catalog.entries.length : 0)
  return [sound, influences, persona, lexicon, profile]
}

// ── Ring glow (character count) ───────────────────────────────────────

export function calculateRingGlow(dna: ArtistDNA) {
  const sound = sa(dna.sound.genres).join('').length + sa(dna.sound.vocalTextures).join('').length +
    sa(dna.sound.productionPreferences).join('').length + (dna.sound.soundDescription || '').length
  const influences = sa(dna.sound.artistInfluences).join('').length
  const persona = sa(dna.persona.traits).join('').length + sa(dna.persona.likes).join('').length +
    sa(dna.persona.dislikes).join('').length + (dna.persona.attitude || '').length + (dna.persona.worldview || '').length
  const lexicon = sa(dna.lexicon.signaturePhrases).join('').length + sa(dna.lexicon.slang).join('').length +
    sa(dna.lexicon.adLibs).join('').length + sa(dna.lexicon.bannedWords).join('').length
  const profile = (dna.identity.stageName?.length || 0) + (dna.identity.realName?.length || 0) + (dna.identity.backstory || '').length +
    (dna.identity.city || '').length + (dna.look.visualDescription || '').length
  return [sound, influences, persona, lexicon, profile]
}

// ── NEW: Extract actual data into typed nodes per ring ────────────────

function makeNodes(items: string[], ring: string, category: string, importance: number): NodeData[] {
  return items.filter(Boolean).map(label => ({
    id: `${ring.toLowerCase()}:${label.toLowerCase().replace(/\s+/g, '-')}`,
    label,
    category,
    ring,
    importance,
  }))
}

export function extractRingNodes(dna: ArtistDNA): NodeData[][] {
  // Sound ring
  const sound = [
    ...makeNodes(sa(dna.sound.genres), 'Sound', 'genre', 1.0),
    ...makeNodes(sa(dna.sound.subgenres), 'Sound', 'subgenre', 0.6),
    ...makeNodes(sa(dna.sound.vocalTextures), 'Sound', 'vocal', 0.6),
    ...makeNodes(sa(dna.sound.productionPreferences), 'Sound', 'production', 0.5),
    ...makeNodes(sa(dna.sound.microgenres), 'Sound', 'microgenre', 0.3),
  ]

  // Influences ring
  const influences = makeNodes(sa(dna.sound.artistInfluences), 'Influences', 'influence', 1.0)

  // Persona ring
  const persona = [
    ...makeNodes(sa(dna.persona.traits), 'Persona', 'trait', 1.0),
    ...makeNodes(sa(dna.persona.likes), 'Persona', 'like', 0.6),
    ...makeNodes(sa(dna.persona.dislikes), 'Persona', 'dislike', 0.4),
    ...(dna.persona.attitude ? [{ id: 'persona:attitude', label: dna.persona.attitude, category: 'attitude', ring: 'Persona', importance: 0.8 }] : []),
  ]

  // Lexicon ring
  const lexicon = [
    ...makeNodes(sa(dna.lexicon.signaturePhrases), 'Lexicon', 'phrase', 1.0),
    ...makeNodes(sa(dna.lexicon.slang), 'Lexicon', 'slang', 0.7),
    ...makeNodes(sa(dna.lexicon.adLibs), 'Lexicon', 'adlib', 0.5),
    ...makeNodes(sa(dna.lexicon.bannedWords), 'Lexicon', 'banned', 0.3),
  ]

  // Profile ring
  const profile = [
    ...(dna.identity.stageName ? [{ id: 'profile:stagename', label: dna.identity.stageName, category: 'name', ring: 'Profile', importance: 1.0 }] : []),
    ...(dna.identity.city ? [{ id: 'profile:city', label: dna.identity.city, category: 'location', ring: 'Profile', importance: 0.7 }] : []),
    ...(dna.identity.backstory ? [{ id: 'profile:backstory', label: 'Backstory', category: 'bio', ring: 'Profile', importance: 0.5 }] : []),
  ]

  return [sound, influences, persona, lexicon, profile]
}

// ── NEW: Atmosphere preset from DNA ───────────────────────────────────

export function getAtmospherePreset(dna: ArtistDNA): AtmospherePreset {
  const genres = sa(dna.sound.genres).map(g => g.toLowerCase().replace(/[^a-z&]/g, ''))
  const attitude = (dna.persona.attitude || '').toLowerCase()

  // Find matching palette — use first genre match, fallback to default
  let palette = DEFAULT_PALETTE
  for (const genre of genres) {
    // Check for partial matches (e.g. "hip-hop/rap" matches "hip-hop")
    for (const [key, pal] of Object.entries(GENRE_PALETTES)) {
      if (genre.includes(key) || key.includes(genre)) {
        palette = pal
        break
      }
    }
    if (palette !== DEFAULT_PALETTE) break
  }

  // Apply attitude hue shift
  const shift = ATTITUDE_SHIFTS[attitude] || 0
  if (shift !== 0) {
    palette = palette.map(([r, g, b]) => [
      Math.max(0, Math.min(1, r + shift)),
      Math.max(0, Math.min(1, g - Math.abs(shift) * 0.3)),
      Math.max(0, Math.min(1, b - shift)),
    ] as [number, number, number])
  }

  // Genre-based particle sizing
  const isElectronic = genres.some(g => g.includes('electronic') || g.includes('dance'))
  const isRock = genres.some(g => g.includes('rock') || g.includes('metal'))

  return {
    palette,
    particleSize: isElectronic ? 0.02 : isRock ? 0.04 : 0.03,
    brightness: attitude === 'playful' ? 0.9 : 0.7,
  }
}
```

**Step 2: Commit**

```bash
git add src/features/music-lab/components/artist-dna/constellation/utils.ts
git commit -m "feat(constellation): add data extraction, atmosphere, and ring calc utils"
git push origin main
```

---

## Task 3: Extract CentralStar.tsx

**Files:**
- Create: `src/features/music-lab/components/artist-dna/constellation/CentralStar.tsx`

**Step 1: Write CentralStar.tsx**

```tsx
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
```

**Step 2: Commit**

```bash
git add src/features/music-lab/components/artist-dna/constellation/CentralStar.tsx
git commit -m "feat(constellation): extract CentralStar component"
git push origin main
```

---

## Task 4: Create DataNode.tsx + HoverCard.tsx

**Files:**
- Create: `src/features/music-lab/components/artist-dna/constellation/DataNode.tsx`
- Create: `src/features/music-lab/components/artist-dna/constellation/HoverCard.tsx`

**Step 1: Write HoverCard.tsx**

```tsx
'use client'

import { Html } from '@react-three/drei'

interface HoverCardProps {
  label: string
  category: string
  color: string
}

export function HoverCard({ label, category, color }: HoverCardProps) {
  return (
    <Html
      center
      style={{ pointerEvents: 'none', transform: 'translateY(-28px)' }}
    >
      <div
        className="px-2.5 py-1.5 rounded-lg border max-w-[140px]"
        style={{
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(255,255,255,0.1)',
          boxShadow: `0 0 12px ${color}30`,
        }}
      >
        <p className="text-[11px] font-semibold text-white/90 leading-tight truncate">{label}</p>
        <p className="text-[9px] font-medium mt-0.5 leading-tight" style={{ color }}>{category}</p>
      </div>
    </Html>
  )
}
```

**Step 2: Write DataNode.tsx**

This replaces the old `AnimatedNode` with data awareness, hover state, and LOD labels:

```tsx
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

  // Scale node by importance
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

    // Fly-in
    if (flyProgress.current < 1) {
      flyProgress.current = Math.min(flyProgress.current + 0.035, 1)
      const ease = 1 - Math.pow(1 - flyProgress.current, 3)
      if (groupRef.current) {
        groupRef.current.position.lerpVectors(spawnOrigin, targetPos, ease)
      }
    }

    // Scale-in
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

    // Trail
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

  // LOD: show label when camera is close
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
      {/* Trail streak */}
      <mesh ref={trailRef}>
        <cylinderGeometry args={[scale * 0.3, 0, 0.15, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
      {/* Hover card */}
      {hovered && <HoverCard label={node.label} category={node.category} color={color} />}
      {/* LOD label */}
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
```

**Step 3: Commit**

```bash
git add src/features/music-lab/components/artist-dna/constellation/DataNode.tsx src/features/music-lab/components/artist-dna/constellation/HoverCard.tsx
git commit -m "feat(constellation): add DataNode with hover cards and LOD labels"
git push origin main
```

---

## Task 5: Extract OrbitalRing.tsx with interactivity

**Files:**
- Create: `src/features/music-lab/components/artist-dna/constellation/OrbitalRing.tsx`

**Step 1: Write OrbitalRing.tsx**

Refactored ring that uses DataNode for real content, supports hover highlight and click-to-navigate:

```tsx
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

  // Position nodes evenly around ring, using actual data
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
```

**Step 2: Commit**

```bash
git add src/features/music-lab/components/artist-dna/constellation/OrbitalRing.tsx
git commit -m "feat(constellation): extract OrbitalRing with interactivity and data nodes"
git push origin main
```

---

## Task 6: Extract StarField.tsx with DNA-reactive atmosphere

**Files:**
- Create: `src/features/music-lab/components/artist-dna/constellation/StarField.tsx`

**Step 1: Write StarField.tsx**

DNA-reactive version that shifts colors based on genre and attitude:

```tsx
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

      // Pick from genre palette
      const tint = Math.random()
      const [pr, pg, pb] = tint < 0.5
        ? palette[0]
        : tint < 0.75
        ? (palette[1] || palette[0])
        : (palette[2] || palette[0])

      // Add slight randomness for natural feel
      col[i * 3] = Math.min(1, pr * brightness + (Math.random() - 0.5) * 0.1)
      col[i * 3 + 1] = Math.min(1, pg * brightness + (Math.random() - 0.5) * 0.1)
      col[i * 3 + 2] = Math.min(1, pb * brightness + (Math.random() - 0.5) * 0.1)
    }
    return { positions: pos, colors: col }
  // Regenerate when palette changes (genre switch)
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
```

**Step 2: Commit**

```bash
git add src/features/music-lab/components/artist-dna/constellation/StarField.tsx
git commit -m "feat(constellation): DNA-reactive StarField with genre palette"
git push origin main
```

---

## Task 7: Create ConstellationScene.tsx

**Files:**
- Create: `src/features/music-lab/components/artist-dna/constellation/ConstellationScene.tsx`

**Step 1: Write ConstellationScene.tsx**

The scene orchestrator that reads DNA from the store and passes data to children:

```tsx
'use client'

import { useMemo, useCallback } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useArtistDnaStore } from '../../../store/artist-dna.store'
import { RING_COLORS, RING_LABELS, RING_TAB_MAP } from './constants'
import {
  calculateRingFill,
  calculateRingCounts,
  calculateRingGlow,
  extractRingNodes,
  getAtmospherePreset,
} from './utils'
import { CentralStar } from './CentralStar'
import { StarField } from './StarField'
import { OrbitalRing } from './OrbitalRing'

export function ConstellationScene() {
  const { draft, activeTab, setActiveTab } = useArtistDnaStore()

  const fills = calculateRingFill(draft)
  const fillValues = [fills.sound, fills.influences, fills.persona, fills.lexicon, fills.profile]
  const ringCounts = calculateRingCounts(draft)
  const ringGlow = calculateRingGlow(draft)
  const ringNodes = useMemo(() => extractRingNodes(draft), [draft])
  const atmosphere = useMemo(() => getAtmospherePreset(draft), [draft])

  const handleRingClick = useCallback((ringLabel: string) => {
    const tab = RING_TAB_MAP[ringLabel]
    if (tab) setActiveTab(tab)
  }, [setActiveTab])

  return (
    <>
      <ambientLight intensity={0.2} />
      <StarField atmosphere={atmosphere} />
      <CentralStar />
      {RING_COLORS.map((color, i) => {
        const ringLabel = RING_LABELS[i]
        const mappedTab = RING_TAB_MAP[ringLabel]
        return (
          <OrbitalRing
            key={i}
            radius={0.4 + i * 0.4}
            fill={fillValues[i]}
            color={color}
            label={ringLabel}
            index={i}
            itemCount={ringCounts[i]}
            glowChars={ringGlow[i]}
            nodes={ringNodes[i]}
            onRingClick={() => handleRingClick(ringLabel)}
            isActiveRing={activeTab === mappedTab}
          />
        )
      })}
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.8}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={(3 * Math.PI) / 4}
        minDistance={1.5}
        maxDistance={6}
      />
    </>
  )
}
```

**Step 2: Commit**

```bash
git add src/features/music-lab/components/artist-dna/constellation/ConstellationScene.tsx
git commit -m "feat(constellation): create scene orchestrator with data flow"
git push origin main
```

---

## Task 8: Rebuild ConstellationWidget.tsx — interactive legend + barrel export

**Files:**
- Create: `src/features/music-lab/components/artist-dna/constellation/ConstellationWidget.tsx`
- Modify: `src/features/music-lab/components/artist-dna/ConstellationWidget.tsx` (replace with barrel)

**Step 1: Write the new constellation/ConstellationWidget.tsx**

This is the main container — Canvas + interactive legend sidebar + overlays. The legend rows are now clickable to navigate tabs and highlight rings.

```tsx
'use client'

import { useState, useCallback } from 'react'
import { Star, ChevronUp, ChevronDown, ArrowLeft, Save, User, Sparkles, X, Dna } from 'lucide-react'
import { Canvas } from '@react-three/fiber'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useArtistDnaStore } from '../../../store/artist-dna.store'
import { RING_COLORS, RING_LABELS, RING_TAB_MAP } from './constants'
import { calculateRingFill } from './utils'
import { ConstellationScene } from './ConstellationScene'

export function ConstellationWidget() {
  const [expanded, setExpanded] = useState(true)
  const {
    draft, isDirty, saveArtist, closeEditor, artists,
    activeArtistId, loadArtistIntoDraft, startNewArtist,
    seededFrom, clearSeededFrom, setActiveTab,
  } = useArtistDnaStore()

  const fills = calculateRingFill(draft)
  const fillValues = [fills.sound, fills.influences, fills.persona, fills.lexicon, fills.profile]
  const totalFill = Object.values(fills).reduce((sum, v) => sum + v, 0) / 5

  const artistName = draft.identity.stageName || draft.identity.realName || 'New Artist'
  const otherArtists = artists.filter((a) => a.id !== activeArtistId)
  const portraitUrl = draft.look.portraitUrl

  const handleSave = useCallback(async () => {
    await saveArtist()
  }, [saveArtist])

  const handleLegendClick = useCallback((ringLabel: string) => {
    const tab = RING_TAB_MAP[ringLabel]
    if (tab) setActiveTab(tab)
  }, [setActiveTab])

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
      <div className="flex h-[208px]">
        {/* 3D Canvas */}
        <div className="flex-1 min-w-0 relative">
          <Canvas camera={{ position: [0, 1.4, 2.5], fov: 60 }}>
            <ConstellationScene />
          </Canvas>

          {/* Portrait thumbnail overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center justify-center bg-black/30">
              {portraitUrl ? (
                <img src={portraitUrl} alt="Artist portrait" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-amber-400/40" />
              )}
            </div>
          </div>

          {/* Overlay: Bottom-left — Back + Seeded badge + Artist Name */}
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

            {seededFrom && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 backdrop-blur-sm border border-amber-400/30">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] text-amber-300 font-medium whitespace-nowrap">
                  from {seededFrom}
                </span>
                <button
                  onClick={clearSeededFrom}
                  className="ml-0.5 text-amber-400/60 hover:text-amber-300 transition-colors"
                  title="Dismiss"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

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

          {/* Overlay: Top-right — Save */}
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

          {/* Overlay: Top-left — Collapse */}
          <button
            className="absolute top-3 left-3 z-10 bg-black/50 backdrop-blur-sm rounded-md p-1 text-white/60 hover:text-white/90 transition-colors"
            onClick={() => setExpanded(false)}
            title="Collapse"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Interactive legend sidebar */}
        <div className="w-[220px] shrink-0 px-4 py-3 flex flex-col justify-between border-l border-border/20 bg-gradient-to-b from-black/60 to-background/80">
          <div className="flex items-center gap-1.5 mb-2">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
            <span className="text-xs font-semibold text-muted-foreground">DNA Constellation</span>
          </div>

          <div className="space-y-1.5 flex-1">
            {RING_LABELS.map((label, i) => (
              <button
                key={label}
                className="flex items-center gap-2 w-full group hover:bg-white/5 rounded px-1 -mx-1 py-0.5 transition-colors"
                onClick={() => handleLegendClick(label)}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 ring-1 ring-white/10 group-hover:ring-white/30 transition-all"
                  style={{ backgroundColor: RING_COLORS[i] }}
                />
                <span className="text-[11px] text-muted-foreground group-hover:text-foreground/80 flex-1 text-left transition-colors">
                  {label}
                </span>
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
              </button>
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

          {/* Genome indicator */}
          {(Array.isArray(draft.catalog.entries) ? draft.catalog.entries : []).length > 0 && (
            <button
              onClick={() => setActiveTab('catalog')}
              className="border-t border-border/30 pt-2 mt-2 flex items-center gap-1.5 w-full hover:opacity-80 transition-opacity"
            >
              <Dna className="w-3 h-3 text-purple-400" />
              <span className="text-[11px] text-muted-foreground flex-1 text-left">Genome</span>
              <span className="text-[11px] tabular-nums text-purple-400 font-medium">
                {(Array.isArray(draft.catalog.entries) ? draft.catalog.entries : []).filter((e) => e.analysis).length} song{(Array.isArray(draft.catalog.entries) ? draft.catalog.entries : []).filter((e) => e.analysis).length !== 1 ? 's' : ''}
              </span>
              {draft.catalog.genome && (
                <span className="text-emerald-400 text-[11px]">&#10003;</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Replace the old barrel file**

Replace `src/features/music-lab/components/artist-dna/ConstellationWidget.tsx` with:

```tsx
export { ConstellationWidget } from './constellation/ConstellationWidget'
```

**Step 3: Commit**

```bash
git add src/features/music-lab/components/artist-dna/constellation/ConstellationWidget.tsx src/features/music-lab/components/artist-dna/ConstellationWidget.tsx
git commit -m "feat(constellation): rebuild widget with interactive legend, wire barrel export"
git push origin main
```

---

## Task 9: Clean build + verify

**Step 1: Run clean build**

```bash
rm -rf .next && npm run build
```

Expected: Build succeeds with no TypeScript or ESLint errors.

**Step 2: Fix any build errors**

Common issues to watch for:
- Import paths in `ArtistEditor.tsx` — should still work since the barrel export is in the same location
- `bufferAttribute` deprecation warnings in r3f — these are warnings, not errors
- Missing `'use client'` directives — all constellation files should have it since they use hooks

**Step 3: Start dev server and visual verify**

```bash
cd D:/git/directors-palette-v2 && node node_modules/next/dist/bin/next dev --port 3002 2>&1 &
```

Visual checks:
- Navigate to Music Lab → open an artist → constellation renders
- Hover nodes → glass card appears with label + category
- Click ring torus → corresponding tab activates below
- Click legend sidebar items → tab switches
- Empty rings show "+" button
- Star field colors shift based on artist genre

**Step 4: Commit if fixes were needed**

```bash
git add -A && git commit -m "fix(constellation): build and runtime fixes" && git push origin main
```

---

## Task 10: Playwright integration tests

**Files:**
- Modify: `tests/artist-dna-interactive.spec.ts` (add new tests)

**Step 1: Read existing test file**

Check `tests/artist-dna-interactive.spec.ts` for existing patterns and setup helpers.

**Step 2: Add constellation interaction tests**

Add tests for:
1. Legend click switches active tab
2. Hover on canvas shows cursor pointer (ring interactivity)
3. Collapsed bar shows fill percentages

```ts
// Inside the existing test.describe block, add:

test('legend sidebar items are clickable and switch tabs', async ({ page }) => {
  // Navigate to artist editor (adapt to existing setup)
  // Click the "Sound" legend item
  await page.click('text=Sound >> xpath=ancestor::button')
  // Verify the Sound tab is now active
  await expect(page.locator('[role="tablist"] >> text=Sound')).toHaveAttribute('data-state', 'active')
})

test('legend sidebar items switch to correct tabs', async ({ page }) => {
  // Click Persona legend item
  await page.click('button:has-text("Persona") >> nth=0')
  await expect(page.locator('[role="tablist"] >> text=Persona')).toHaveAttribute('data-state', 'active')

  // Click Lexicon legend item
  await page.click('button:has-text("Lexicon") >> nth=0')
  await expect(page.locator('[role="tablist"] >> text=Lexicon')).toHaveAttribute('data-state', 'active')
})

test('collapsed bar shows overall percentage', async ({ page }) => {
  // Click collapse button
  await page.click('button[title="Collapse"]')
  // Verify collapsed bar shows percentage
  await expect(page.locator('text=/%/')).toBeVisible()
})
```

**Step 3: Run tests**

```bash
npx playwright test tests/artist-dna-interactive.spec.ts --headed
```

**Step 4: Commit**

```bash
git add tests/artist-dna-interactive.spec.ts
git commit -m "test(constellation): add legend click and collapse interaction tests"
git push origin main
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Scaffold + constants + types | `constants.ts`, `types.ts` |
| 2 | Utils (data extraction, atmosphere) | `utils.ts` |
| 3 | Extract CentralStar | `CentralStar.tsx` |
| 4 | DataNode + HoverCard | `DataNode.tsx`, `HoverCard.tsx` |
| 5 | OrbitalRing with interactivity | `OrbitalRing.tsx` |
| 6 | DNA-reactive StarField | `StarField.tsx` |
| 7 | ConstellationScene orchestrator | `ConstellationScene.tsx` |
| 8 | ConstellationWidget + barrel export | `ConstellationWidget.tsx` (new + old) |
| 9 | Clean build + visual verify | — |
| 10 | Playwright tests | `tests/artist-dna-interactive.spec.ts` |
