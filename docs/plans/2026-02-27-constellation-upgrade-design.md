# Constellation Widget v2 Design

**Date:** 2026-02-27
**Scope:** 4 features — Data Nebula, Particle Atmosphere, Interactive Solar System, file restructure
**Skipped:** Connection Web (deferred to follow-up)

---

## Architecture

### File Structure

```
src/features/music-lab/components/artist-dna/constellation/
├── ConstellationWidget.tsx      # Main container (canvas + legend + overlays)
├── ConstellationScene.tsx       # r3f scene orchestrator
├── StarField.tsx                # DNA-reactive atmospheric particles
├── OrbitalRing.tsx              # Ring torus + data nodes per section
├── DataNode.tsx                 # Single node with hover/label
├── HoverCard.tsx                # Glass card popup on hover
├── CentralStar.tsx              # Core star + glow
├── types.ts                     # NodeData, RingData, AtmospherePreset
├── utils.ts                     # Ring fill calc, DNA extraction, genre mapping
└── constants.ts                 # RING_COLORS, RING_LABELS, genre palettes
```

Existing `ConstellationWidget.tsx` becomes a barrel re-export.

### Constraints

- Canvas stays at 208px tall (no size change)
- Keep r3f + drei architecture (no raw Three.js rewrite)
- Each extracted component stays under 70 lines where possible

---

## Feature 1: Data Nebula

**Goal:** Each node represents real DNA data. Hover reveals content.

### Node Data Extraction

New `extractRingNodes(dna)` in `utils.ts` returns typed arrays per ring:

```ts
interface NodeData {
  id: string          // "sound:trap"
  label: string       // "Trap"
  category: string    // "genre", "vocalTexture", "trait"
  ring: string        // "Sound", "Persona", etc.
  importance: number  // 0-1, drives node size
}
```

### Importance Sizing

| Ring | High (1.0) | Medium (0.6) | Low (0.3) |
|------|-----------|-------------|----------|
| Sound | genres | subgenres, vocalTextures | productionPrefs, microgenres |
| Influences | artistInfluences | — | — |
| Persona | traits | likes | dislikes |
| Lexicon | signaturePhrases | slang | adLibs, bannedWords |
| Profile | stageName | backstory, city | catalog entries |

### DataNode Behavior

- Default: colored sphere, no label
- Hover: scale 1.3x, HoverCard fades in
- Zoom (camera distance < 2.5): all labels fade in (LOD)

### HoverCard

- `Html` overlay from drei, positioned above node
- Shows: label, category tag, ring color accent
- Glass style: `bg-black/60 backdrop-blur-md border border-white/10`
- Max width ~120px (compact for 208px canvas)

---

## Feature 2: Particle Atmosphere

**Goal:** Background particles shift colors/density based on DNA.

### Genre-to-Palette Mapping

| Genre | Primary | Secondary | Tertiary |
|-------|---------|-----------|----------|
| Hip-Hop/Trap | #f59e0b amber | #ea580c orange | #1a1a0a dark |
| Pop | #ec4899 pink | #a855f7 purple | #fafafa white |
| Rock | #ef4444 red | #f97316 orange | #451a03 ember |
| Electronic | #06b6d4 cyan | #3b82f6 blue | #0ea5e9 sky |
| R&B | #7c3aed purple | #f59e0b gold | — |
| Jazz | #d97706 gold | #92400e brown | — |
| Default | #cccccc white | #f59e0b amber | #38bdf8 sky |

### Attitude Modifier

- Aggressive: shift hues +20 toward red
- Chill: shift hues -20 toward blue
- Playful: increase saturation

### Implementation

- `StarField` accepts `genres[]` and `attitude` props
- Blend colors from all active genres
- Particle count stays 600, sizes vary: electronic = 0.02, rock = 0.04

---

## Feature 3: Interactive Solar System

**Goal:** Constellation is a navigation tool, not just decoration.

### Ring Click-to-Tab

| Ring | Maps to Tab |
|------|------------|
| Sound | sound |
| Influences | sound |
| Persona | persona |
| Lexicon | lexicon |
| Profile | identity |

Ring torus: `onPointerOver` → highlight (opacity 0.3→0.6), `onClick` → `setActiveTab()`.

### Legend Sidebar Clicks

Each legend row is clickable. Click: sets active tab + highlight pulse on the ring.

### Empty Ring Indicator

Rings with fill === 0 show a pulsing "+" via Html overlay. Click jumps to that tab.

### Camera Behavior

No camera zoom on click (too tight in 208px). Just visual ring highlight + tab switch.

---

## Data Flow

```
ArtistDNA (store draft)
  → extractRingNodes() → NodeData[] per ring
  → calculateRingFill() → fill values (existing)
  → getAtmospherePreset() → color palette for StarField
  → ConstellationScene passes data to children
  → User clicks ring → setActiveTab() → tab switches below
```

---

## Non-Goals

- Connection Web between nodes (deferred)
- Camera zoom animation on click
- Inline field editing from double-click
- Canvas size change (stays 208px)
