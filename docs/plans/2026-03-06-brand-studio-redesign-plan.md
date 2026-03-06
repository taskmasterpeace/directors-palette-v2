# Brand Studio Professional Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Brand Studio from a scrolling developer prototype into a professional, tabbed, multi-column brand management interface with completeness and quality scoring.

**Architecture:** Restructure BrandTab into 3 sub-tabs (Visual Identity, Voice & Messaging, Audio) with multi-column layouts inside each. Add a brand-colored hero banner and dual scoring ring. Clean up prototype artifacts throughout.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Framer Motion, Zustand, Lucide icons, shadcn/ui components

---

### Task 1: Cleanup — Delete Dead Code & Prototype Artifacts

**Files:**
- Delete: `src/features/brand-studio/components/BrandSelector.tsx`
- Modify: `src/features/brand-studio/components/BrandStudioLayout.tsx`
- Modify: `src/features/brand-studio/components/tabs/BrandTab.tsx`

**Step 1: Delete unused BrandSelector.tsx**

```bash
rm src/features/brand-studio/components/BrandSelector.tsx
```

**Step 2: Remove "Brand Studio v1.0" version badge from sidebar footer**

In `src/features/brand-studio/components/BrandStudioLayout.tsx`, replace lines 168-174:

```tsx
// REMOVE this entire block:
        {/* Sidebar footer */}
        <div className="p-4 border-t border-border/20">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/50">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
            <span>Brand Studio v1.0</span>
          </div>
        </div>
```

**Step 3: Remove Raw JSON collapsible from BrandTab**

In `src/features/brand-studio/components/tabs/BrandTab.tsx`, remove lines 64-79 (the raw JSON collapsible block) and remove the unused `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger`, `ChevronDown` imports from lines 6-7.

**Step 4: Dim placeholder tabs in sidebar**

In `src/features/brand-studio/components/BrandStudioLayout.tsx`, modify the TABS array to add a `disabled` field and the tab buttons to show locked state:

```tsx
// Add Lock import at top
import { Palette, FolderOpen, Wand2, Megaphone, Loader2, Plus, Sparkles, Lock } from 'lucide-react'

// Update TABS array to add disabled flag
const TABS: { id: BrandStudioTab; label: string; icon: React.ComponentType<{ className?: string }>; accent: string; disabled?: boolean }[] = [
  { id: 'brand', label: 'Brand', icon: Palette, accent: 'from-amber-500/20 to-orange-500/10' },
  { id: 'library', label: 'Library', icon: FolderOpen, accent: 'from-teal-500/20 to-cyan-500/10', disabled: true },
  { id: 'create', label: 'Create', icon: Wand2, accent: 'from-violet-500/20 to-purple-500/10', disabled: true },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone, accent: 'from-rose-500/20 to-pink-500/10', disabled: true },
]
```

In the tab navigation buttons, add disabled styling:

```tsx
<motion.button
  key={tab.id}
  onClick={() => !tab.disabled && setActiveTab(tab.id)}
  whileHover={tab.disabled ? {} : { x: 2 }}
  whileTap={tab.disabled ? {} : { scale: 0.98 }}
  className={cn(
    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden',
    tab.disabled
      ? 'text-muted-foreground/30 cursor-default'
      : isActive
        ? 'text-foreground'
        : 'text-muted-foreground hover:text-foreground/80'
  )}
>
  {/* Active tab background glow - only if not disabled */}
  {isActive && !tab.disabled && (
    <motion.div
      layoutId="activeTabBg"
      className={cn('absolute inset-0 bg-gradient-to-r rounded-xl border border-primary/15', tab.accent)}
      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
    />
  )}
  <Icon className={cn('w-4 h-4 relative z-10', isActive && !tab.disabled && 'text-primary')} />
  <span className="relative z-10">{tab.label}</span>

  {/* Lock icon for disabled tabs */}
  {tab.disabled && (
    <Lock className="w-3 h-3 ml-auto text-muted-foreground/20" />
  )}

  {/* Active indicator dot */}
  {isActive && !tab.disabled && (
    <motion.div
      layoutId="activeIndicator"
      className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary"
      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
    />
  )}
</motion.button>
```

**Step 5: Build check**

```bash
rm -rf .next && npm run build
```

Expected: Clean build, no errors.

**Step 6: Commit**

```bash
git add -A && git commit -m "refactor(brand-studio): remove dead code and prototype artifacts" && git push origin main
```

---

### Task 2: Update SectionCard — Remove Numbers, Always-Visible Edit

**Files:**
- Modify: `src/features/brand-studio/components/tabs/sections/SectionCard.tsx`
- Modify: All 6 section components (ColorsSection, TypographySection, VoiceSection, AudienceSection, VisualStyleSection, MusicSection) to remove `number` prop

**Step 1: Rewrite SectionCard.tsx**

Replace the entire SectionCard component. Remove `number` prop, make edit button always visible, add ring glow when editing, add Cancel button:

```tsx
'use client'

import { Save, Loader2, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Brand } from '../../../types'

export interface SectionProps {
  brand: Brand
  onSave: (data: Partial<Brand> & { id: string }) => Promise<void>
  isSaving: boolean
}

export function SectionCard({ icon: Icon, title, iconColor, children, editing, onEdit, onSave, onCancel, isSaving }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  iconColor: string
  children: React.ReactNode
  editing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel?: () => void
  isSaving: boolean
}) {
  return (
    <Card className={cn(
      'border-border/25 bg-card/60 backdrop-blur-sm transition-all duration-300 overflow-hidden',
      editing
        ? 'ring-1 ring-primary/20 border-primary/30 shadow-lg shadow-primary/5'
        : 'hover:border-border/40'
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-base font-semibold tracking-tight">{title}</span>
          </span>
          {editing ? (
            <div className="flex items-center gap-2">
              {onCancel && (
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button size="sm" className="gap-1.5 h-7 text-xs px-3" onClick={onSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </Button>
            </div>
          ) : (
            <button
              className="text-xs text-muted-foreground/50 hover:text-primary transition-colors"
              onClick={onEdit}
            >
              Edit
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  )
}
```

Note: Add `import { cn } from '@/utils/utils'` at the top.

**Step 2: Update all 6 section components to remove `number` prop**

In each file, find the `<SectionCard` JSX and remove the `number={N}` prop. Also add `onCancel={() => setEditing(false)}`:

- `ColorsSection.tsx` line 46: Remove `number={1}`, add `onCancel={() => setEditing(false)}`
- `TypographySection.tsx` line 36: Remove `number={2}`, add `onCancel={() => setEditing(false)}`
- `VoiceSection.tsx` line 23: Remove `number={3}`, add `onCancel={() => setEditing(false)}`
- `AudienceSection.tsx` line 23: Remove `number={4}`, add `onCancel={() => setEditing(false)}`
- `VisualStyleSection.tsx` line 21: Remove `number={5}`, add `onCancel={() => setEditing(false)}`
- `MusicSection.tsx` line 21: Remove `number={6}`, add `onCancel={() => setEditing(false)}`

**Step 3: Build check**

```bash
rm -rf .next && npm run build
```

**Step 4: Commit**

```bash
git add -A && git commit -m "refactor(brand-studio): update SectionCard - remove numbers, always-visible edit, cancel button" && git push origin main
```

---

### Task 3: Redesign BrandGuideHero — Brand-Colored Banner

**Files:**
- Modify: `src/features/brand-studio/components/tabs/sections/BrandGuideHero.tsx`

**Step 1: Rewrite BrandGuideHero with brand-colored banner**

The hero should use the brand's primary color as a gradient banner background. Extract primary color from `brand.visual_identity_json?.colors`:

```tsx
'use client'

import { RefreshCw, Loader2, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Brand } from '../../../types'

interface BrandGuideHeroProps {
  brand: Brand
  isGenerating: boolean
  onRegenerate: () => void
}

export function BrandGuideHero({ brand, isGenerating, onRegenerate }: BrandGuideHeroProps) {
  // Extract brand's primary color for the banner gradient
  const primaryColor = brand.visual_identity_json?.colors?.find(c => c.role === 'primary')?.hex || '#6366f1'
  const secondaryColor = brand.visual_identity_json?.colors?.find(c => c.role === 'secondary')?.hex || '#8b5cf6'

  return (
    <div className="space-y-5">
      {/* Brand-Colored Banner */}
      <div
        className="relative rounded-2xl overflow-hidden p-6 pb-8"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}18 0%, ${secondaryColor}0a 50%, transparent 100%)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(${primaryColor} 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative flex items-center gap-5">
          {/* Logo */}
          {brand.logo_url ? (
            <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 shadow-xl shadow-black/10 flex items-center justify-center overflow-hidden shrink-0 backdrop-blur-sm">
              <img src={brand.logo_url} alt={`${brand.name} logo`} className="w-16 h-16 object-contain" />
            </div>
          ) : (
            <div
              className="w-20 h-20 rounded-2xl border border-white/15 shadow-xl shadow-black/10 flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg, ${primaryColor}30, ${primaryColor}10)` }}
            >
              <span className="text-2xl font-bold text-foreground/80">{brand.name.charAt(0)}</span>
            </div>
          )}

          {/* Brand Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold tracking-tight truncate">{brand.name}</h2>
            {brand.tagline && (
              <p className="text-sm text-muted-foreground/70 truncate mt-0.5">{brand.tagline}</p>
            )}
            {brand.industry && (
              <span
                className="inline-block mt-2 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: `${primaryColor}15`,
                  color: `${primaryColor}cc`,
                  border: `1px solid ${primaryColor}25`,
                }}
              >
                {brand.industry}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Brand Guide Image */}
      {brand.brand_guide_image_url ? (
        <div className="relative rounded-2xl overflow-hidden border border-border/30 shadow-lg shadow-black/20">
          <img src={brand.brand_guide_image_url} alt={`${brand.name} brand guide`} className="w-full object-contain" />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80 to-transparent">
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5 bg-background/90 backdrop-blur-md border border-border/40 shadow-lg"
                onClick={onRegenerate}
                disabled={isGenerating}
              >
                {isGenerating
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RefreshCw className="w-3.5 h-3.5" />
                }
                Regenerate Guide (15 pts)
              </Button>
            </div>
          </div>
        </div>
      ) : isGenerating ? (
        <div className="flex items-center justify-center py-16 rounded-2xl border border-dashed border-border/30 bg-secondary/10">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary/50 mx-auto" />
            <p className="text-sm text-muted-foreground/60">Generating brand guide image...</p>
          </div>
        </div>
      ) : (
        <button
          onClick={onRegenerate}
          className="w-full flex items-center justify-center gap-2 py-10 rounded-2xl border border-dashed border-border/30 bg-secondary/5 hover:bg-secondary/15 hover:border-border/50 transition-all duration-200 cursor-pointer group/gen"
        >
          <ImageIcon className="w-5 h-5 text-muted-foreground/40 group-hover/gen:text-primary/60 transition-colors" />
          <span className="text-sm text-muted-foreground/50 group-hover/gen:text-muted-foreground transition-colors">
            Generate Visual Brand Guide (15 pts)
          </span>
        </button>
      )}
    </div>
  )
}
```

**Step 2: Build check**

```bash
rm -rf .next && npm run build
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(brand-studio): redesign hero with brand-colored banner" && git push origin main
```

---

### Task 4: Create BrandScoreRing Component

**Files:**
- Create: `src/features/brand-studio/components/tabs/sections/BrandScoreRing.tsx`

**Step 1: Create the dual-score component**

This component shows completeness (ring) + quality (letter grade) side-by-side:

```tsx
'use client'

import { Check, Circle } from 'lucide-react'
import type { Brand } from '../../../types'

interface BrandScoreRingProps {
  brand: Brand
}

interface ScoreItem {
  label: string
  complete: boolean
}

function getCompletenessItems(brand: Brand): ScoreItem[] {
  const colors = brand.visual_identity_json?.colors ?? []
  const typo = brand.visual_identity_json?.typography
  const voice = brand.voice_json
  const audience = brand.audience_json
  const visualStyle = brand.visual_style_json
  const music = brand.music_json

  return [
    { label: 'Logo', complete: !!brand.logo_url },
    { label: 'Colors', complete: colors.length > 0 },
    { label: 'Typography', complete: !!(typo?.heading_font && typo?.body_font) },
    { label: 'Voice', complete: !!(voice?.tone?.length && voice?.persona) },
    { label: 'Audience', complete: !!(audience?.primary) },
    { label: 'Visual Style', complete: !!(visualStyle?.photography_tone) },
    { label: 'Music', complete: !!(music?.genres?.length) },
  ]
}

function getQualityScore(brand: Brand): { grade: string; score: number; feedback: string } {
  let score = 0
  const maxScore = 10
  const feedback: string[] = []

  // Colors: 1pt for any, 2pt for 3+, 3pt for 5+
  const colorCount = brand.visual_identity_json?.colors?.length ?? 0
  if (colorCount >= 5) { score += 3 }
  else if (colorCount >= 3) { score += 2 }
  else if (colorCount > 0) { score += 1 }
  else { feedback.push('Add brand colors') }

  // Typography: 1pt heading, 1pt body
  const typo = brand.visual_identity_json?.typography
  if (typo?.heading_font) score += 1
  if (typo?.body_font) score += 1
  if (!typo?.heading_font || !typo?.body_font) feedback.push('Define both heading and body fonts')

  // Voice: 1pt for tone (3+ words), 1pt for persona
  const voice = brand.voice_json
  if (voice?.tone?.length >= 3) score += 1
  else if (voice?.tone?.length) { score += 0.5; feedback.push('Add more tone words (3+)') }
  if (voice?.persona) score += 1
  else feedback.push('Add a brand persona')

  // Audience: 1pt primary + secondary
  if (brand.audience_json?.primary && brand.audience_json?.secondary) score += 1
  else feedback.push('Define primary and secondary audiences')

  // Visual + Music: 1pt each
  if (brand.visual_style_json?.subjects?.length) score += 1
  if (brand.music_json?.genres?.length && brand.music_json?.bpm_range) score += 1

  const pct = score / maxScore
  let grade: string
  if (pct >= 0.9) grade = 'A+'
  else if (pct >= 0.8) grade = 'A'
  else if (pct >= 0.7) grade = 'B+'
  else if (pct >= 0.6) grade = 'B'
  else if (pct >= 0.5) grade = 'C+'
  else if (pct >= 0.4) grade = 'C'
  else grade = 'D'

  return {
    grade,
    score: Math.round(pct * 100),
    feedback: feedback.length > 0 ? feedback[0] : 'Strong brand identity!',
  }
}

export function BrandScoreRing({ brand }: BrandScoreRingProps) {
  const items = getCompletenessItems(brand)
  const completed = items.filter(i => i.complete).length
  const total = items.length
  const pct = completed / total
  const quality = getQualityScore(brand)

  // SVG ring calculation
  const size = 80
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - pct * circumference

  return (
    <div className="flex items-start gap-6 p-4 rounded-xl bg-card/40 border border-border/20">
      {/* Completeness Ring */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke="currentColor"
              className="text-secondary/30"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke="currentColor"
              className="text-primary transition-all duration-700"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold">{completed}/{total}</span>
          </div>
        </div>

        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              {item.complete ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Circle className="w-3 h-3 text-muted-foreground/20" />
              )}
              <span className={`text-xs ${item.complete ? 'text-foreground/70' : 'text-muted-foreground/40'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px self-stretch bg-border/20" />

      {/* Quality Grade */}
      <div className="flex-1 flex flex-col items-center justify-center text-center py-2">
        <div className="text-4xl font-black tracking-tight text-primary mb-1">{quality.grade}</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-2">Quality Score</div>
        <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-[200px]">{quality.feedback}</p>
      </div>
    </div>
  )
}
```

**Step 2: Build check**

```bash
rm -rf .next && npm run build
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(brand-studio): add BrandScoreRing with completeness + quality scoring" && git push origin main
```

---

### Task 5: Restructure BrandTab with Sub-Tabs

**Files:**
- Modify: `src/features/brand-studio/components/tabs/BrandTab.tsx`

**Step 1: Rewrite BrandTab with 3 sub-tabs**

Replace the entire file. The new BrandTab renders: Hero → ScoreRing → Sub-tabs (Visual Identity | Voice & Messaging | Audio):

```tsx
'use client'

import { useState } from 'react'
import { Palette, Sparkles, Eye, Mic2, Users, Music2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { useActiveBrand, useBrandStore } from '../../hooks/useBrandStore'
import { BrandGuideHero } from './sections/BrandGuideHero'
import { BrandScoreRing } from './sections/BrandScoreRing'
import { ColorsSection } from './sections/ColorsSection'
import { TypographySection } from './sections/TypographySection'
import { VoiceSection } from './sections/VoiceSection'
import { AudienceSection } from './sections/AudienceSection'
import { VisualStyleSection } from './sections/VisualStyleSection'
import { MusicSection } from './sections/MusicSection'

type BrandSubTab = 'visual' | 'voice' | 'audio'

const SUB_TABS: { id: BrandSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'visual', label: 'Visual Identity', icon: Eye },
  { id: 'voice', label: 'Voice & Messaging', icon: Mic2 },
  { id: 'audio', label: 'Audio', icon: Music2 },
]

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export function BrandTab() {
  const brand = useActiveBrand()
  const { updateBrand, generateBrandGuide, isGeneratingGuide, isSaving } = useBrandStore()
  const [activeSubTab, setActiveSubTab] = useState<BrandSubTab>('visual')

  if (!brand) {
    return <EmptyBrandState />
  }

  const handleRegenerate = () => {
    generateBrandGuide(brand.id, brand.logo_url, brand.raw_company_info || brand.name)
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Hero: Brand-Colored Banner + Guide Image */}
      <motion.div {...fadeUp}>
        <BrandGuideHero brand={brand} isGenerating={isGeneratingGuide} onRegenerate={handleRegenerate} />
      </motion.div>

      {/* Brand Score */}
      <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
        <BrandScoreRing brand={brand} />
      </motion.div>

      {/* Sub-Tab Navigation */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
        <div className="flex gap-1 p-1 bg-secondary/30 rounded-xl border border-border/20 w-fit">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeSubTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-background shadow-sm text-foreground border border-border/30'
                    : 'text-muted-foreground/60 hover:text-muted-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Sub-Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeSubTab === 'visual' && (
            <div className="space-y-5">
              {/* Two-column: Colors | Typography */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ColorsSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
                <TypographySection brand={brand} onSave={updateBrand} isSaving={isSaving} />
              </div>
              {/* Full-width: Visual Style */}
              <VisualStyleSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
            </div>
          )}

          {activeSubTab === 'voice' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <VoiceSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
              <AudienceSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
            </div>
          )}

          {activeSubTab === 'audio' && (
            <MusicSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function EmptyBrandState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-24 text-center relative"
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 rounded-full border border-primary/5 absolute" />
        <div className="w-48 h-48 rounded-full border border-primary/8 absolute" />
        <div className="w-32 h-32 rounded-full border border-primary/10 absolute" />
      </div>

      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-transparent border border-primary/20 flex items-center justify-center mb-6 shadow-lg shadow-primary/5"
      >
        <Palette className="w-9 h-9 text-primary/50" />
      </motion.div>

      <h3 className="text-xl font-bold tracking-tight mb-2">No Brand Selected</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
        Create a new brand to get started. Upload a logo and describe your brand — AI will generate a complete visual identity guide.
      </p>
      <Button className="gap-2 shadow-lg shadow-primary/10" size="sm">
        <Sparkles className="w-4 h-4" />
        Create Your First Brand
      </Button>
    </motion.div>
  )
}
```

**Step 2: Build check**

```bash
rm -rf .next && npm run build
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(brand-studio): restructure BrandTab with sub-tabs and multi-column layout" && git push origin main
```

---

### Task 6: Widen Content Area for Multi-Column

**Files:**
- Modify: `src/features/brand-studio/components/BrandStudioLayout.tsx`

**Step 1: Increase max-width to accommodate 2-column grid**

The current `max-w-3xl` (48rem/768px) is too narrow for side-by-side cards. Change to `max-w-5xl` (64rem/1024px):

In `BrandStudioLayout.tsx` line 188, change:

```tsx
// FROM:
<div className="max-w-3xl mx-auto px-8 py-6">

// TO:
<div className="max-w-5xl mx-auto px-8 py-6">
```

**Step 2: Build check**

```bash
rm -rf .next && npm run build
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(brand-studio): widen content area for multi-column layout" && git push origin main
```

---

### Task 7: Visual Test — Start Dev Server and Verify

**Files:** None (testing only)

**Step 1: Start dev server**

```bash
cd D:/git/directors-palette-v2 && node node_modules/next/dist/bin/next dev --port 3002 2>&1 &
```

**Step 2: Verify page loads**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/test-brand-studio
```

Expected: `200`

**Step 3: Test API**

```bash
curl -s http://localhost:3002/api/brand-studio/brands | head -c 200
```

Expected: JSON array (even if empty, should return `[]`)

**Step 4: Manual visual check**

Navigate to `http://localhost:3002/test-brand-studio` and verify:
- Brand-colored banner with logo and name
- Score ring showing completeness + quality grade
- Three pill-style sub-tabs: Visual Identity | Voice & Messaging | Audio
- Visual Identity tab shows Colors and Typography side-by-side
- Voice & Messaging tab shows Voice and Audience side-by-side
- Audio tab shows Music section full-width
- Sidebar has dimmed/locked placeholder tabs
- No version badge in sidebar footer
- No raw JSON collapsible
- Section cards have no numbered badges
- Edit button always visible (not hover-only)
- Editing a section shows ring glow + cancel button

---

### Task 8: Final Build Verification

**Files:** None

**Step 1: Clean build**

```bash
rm -rf .next && npm run build
```

Expected: Clean build, zero errors.

**Step 2: Final commit if any fixes were needed**

```bash
git status
# If any uncommitted changes:
git add -A && git commit -m "fix(brand-studio): final polish and build fixes" && git push origin main
```
