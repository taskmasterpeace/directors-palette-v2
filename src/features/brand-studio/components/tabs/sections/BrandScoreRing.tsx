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
  if ((voice?.tone?.length ?? 0) >= 3) score += 1
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
