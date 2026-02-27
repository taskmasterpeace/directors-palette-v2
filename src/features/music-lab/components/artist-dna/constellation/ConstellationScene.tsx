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
