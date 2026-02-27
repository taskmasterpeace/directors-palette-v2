'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { Star, ChevronUp, ChevronDown, ArrowLeft, Save, User, Sparkles, X, Dna } from 'lucide-react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
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
// Safe array helper - ensures we always get an array
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sa = <T = string>(val: unknown): T[] => Array.isArray(val) ? val as T[] : []

function calculateRingFill(dna: ArtistDNA) {
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

// Count items per ring for dynamic node sizing
function calculateRingCounts(dna: ArtistDNA) {
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

// Total character length per ring for glow intensity
function calculateRingGlow(dna: ArtistDNA) {
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

const RING_COLORS = [
  '#f59e0b', // amber - Sound
  '#38bdf8', // sky blue - Influences
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
      // Warm tints — mostly white/amber/sky blue
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
        colors[i * 3] = 0.22
        colors[i * 3 + 1] = 0.74
        colors[i * 3 + 2] = 0.97
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
  itemCount: number
  glowChars: number
}

function OrbitalRing({ radius, fill, color, label, index, itemCount, glowChars }: OrbitalRingProps) {
  const groupRef = useRef<THREE.Group>(null)
  const starsCount = Math.max(Math.round(fill * 12), fill > 0 ? 2 : 0)

  // Dynamic node sizing based on item count
  const nodeScale = 0.03 + Math.min(itemCount, 10) * 0.008
  // Dynamic glow based on text richness
  const glowIntensity = 0.05 + Math.min(glowChars / 500, 0.3)

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
      // Vary pulse speed per node for organic feel
      const pulseOffset = Math.random() * Math.PI * 2
      const pulseSpeed = 1.5 + Math.random() * 1.5
      return { x, y, z, pulseOffset, pulseSpeed }
    })
  }, [starsCount, radius])

  const threeColor = useMemo(() => new THREE.Color(color), [color])

  return (
    <group ref={groupRef}>
      {/* Ring torus */}
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[radius, 0.012, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={fill > 0 ? 0.3 : 0.08} />
      </mesh>
      {/* Label at the edge of the ring */}
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
      {/* Stars on the ring */}
      {stars.map((star, i) => (
        <AnimatedNode
          key={i}
          position={[star.x, star.y, star.z]}
          scale={nodeScale}
          color={color}
          threeColor={threeColor}
          glowIntensity={glowIntensity}
          pulseOffset={star.pulseOffset}
          pulseSpeed={star.pulseSpeed}
        />
      ))}
    </group>
  )
}

interface AnimatedNodeProps {
  position: [number, number, number]
  scale: number
  color: string
  threeColor: THREE.Color
  glowIntensity: number
  pulseOffset: number
  pulseSpeed: number
}

function AnimatedNode({ position, scale, color, threeColor, glowIntensity, pulseOffset, pulseSpeed }: AnimatedNodeProps) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const trailRef = useRef<THREE.Mesh>(null)
  const animatedScale = useRef(0)
  const flyProgress = useRef(0) // 0 = at origin, 1 = at final position

  // Random spawn direction from far away (for the shooting-in effect)
  const spawnOrigin = useMemo(() => {
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ).normalize()
    return dir.multiplyScalar(4 + Math.random() * 3) // spawn 4-7 units away
  }, [])

  const targetPos = useMemo(() => new THREE.Vector3(...position), [position])

  useFrame((state) => {
    const t = state.clock.elapsedTime

    // Fly-in animation (fast ease-out)
    if (flyProgress.current < 1) {
      flyProgress.current = Math.min(flyProgress.current + 0.035, 1)
      const ease = 1 - Math.pow(1 - flyProgress.current, 3) // cubic ease-out
      if (groupRef.current) {
        groupRef.current.position.lerpVectors(spawnOrigin, targetPos, ease)
      }
    }

    // Scale-in (starts after 30% of fly-in)
    const scaleDelay = Math.max((flyProgress.current - 0.3) / 0.7, 0)
    const targetScale = scale * scaleDelay
    if (animatedScale.current < targetScale) {
      animatedScale.current += (targetScale - animatedScale.current) * 0.1
    }

    if (meshRef.current) {
      const pulse = 1 + Math.sin(t * pulseSpeed + pulseOffset) * 0.15
      const s = animatedScale.current * pulse
      meshRef.current.scale.setScalar(s / scale)
    }
    if (lightRef.current) {
      lightRef.current.intensity = glowIntensity * (1 + Math.sin(t * pulseSpeed + pulseOffset) * 0.3)
    }

    // Trail effect — visible during fly-in, fades out
    if (trailRef.current) {
      const trailOpacity = flyProgress.current < 1 ? 0.6 * (1 - flyProgress.current) : 0
      const mat = trailRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = trailOpacity
      // Stretch trail in the direction of travel
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

  return (
    <group ref={groupRef} position={spawnOrigin.toArray() as [number, number, number]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[scale, 12, 12]} />
        <meshBasicMaterial color={color} />
        <pointLight ref={lightRef} color={threeColor} intensity={glowIntensity} distance={0.8} />
      </mesh>
      {/* Trail streak */}
      <mesh ref={trailRef}>
        <cylinderGeometry args={[scale * 0.3, 0, 0.15, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
    </group>
  )
}

function ConstellationScene() {
  const { draft } = useArtistDnaStore()
  const fills = calculateRingFill(draft)
  const fillValues = [fills.sound, fills.influences, fills.persona, fills.lexicon, fills.profile]
  const ringCounts = calculateRingCounts(draft)
  const ringGlow = calculateRingGlow(draft)

  return (
    <>
      <ambientLight intensity={0.2} />
      <StarField />
      {/* Core star — glowing amber */}
      <mesh>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.15} />
      </mesh>
      <pointLight color="#f59e0b" intensity={0.8} distance={4} />
      <pointLight color="#f59e0b" intensity={0.15} distance={8} position={[0, 0, 0]} />
      {RING_COLORS.map((color, i) => (
        <OrbitalRing
          key={i}
          radius={0.4 + i * 0.4}
          fill={fillValues[i]}
          color={color}
          label={RING_LABELS[i]}
          index={i}
          itemCount={ringCounts[i]}
          glowChars={ringGlow[i]}
        />
      ))}
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

export function ConstellationWidget() {
  const [expanded, setExpanded] = useState(true)
  const { draft, isDirty, saveArtist, closeEditor, artists, activeArtistId, loadArtistIntoDraft, startNewArtist, seededFrom, clearSeededFrom, setActiveTab } = useArtistDnaStore()

  const fills = calculateRingFill(draft)
  const fillValues = [fills.sound, fills.influences, fills.persona, fills.lexicon, fills.profile]
  const totalFill = Object.values(fills).reduce((sum, v) => sum + v, 0) / 5

  const artistName = draft.identity.stageName || draft.identity.realName || 'New Artist'
  const otherArtists = artists.filter((a) => a.id !== activeArtistId)
  const portraitUrl = draft.look.portraitUrl

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
      <div className="flex h-[208px]">
        {/* 3D Canvas — fills available width */}
        <div className="flex-1 min-w-0 relative">
          <Canvas camera={{ position: [0, 1.4, 2.5], fov: 60 }}>
            <ConstellationScene />
          </Canvas>

          {/* Portrait thumbnail overlay at center */}
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
