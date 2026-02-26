export interface StyleAnalysisResult {
    name: string
    description: string
    stylePrompt: string
}

export type MatchLevel = 'match' | 'partial' | 'mismatch'

export interface StyleMatchResult {
    score: number
    level: MatchLevel
    detectedStyle: string
    reason: string
}

// Common style keywords grouped by category for better matching
const STYLE_SYNONYMS: Record<string, string[]> = {
    anime: ['anime', 'manga', 'cel-shaded', 'cel shaded', 'japanese animation'],
    cartoon: ['cartoon', 'animated', 'toon', 'looney'],
    claymation: ['claymation', 'clay', 'stop-motion', 'stop motion', 'plasticine'],
    comic: ['comic', 'comic book', 'graphic novel', 'sequential art'],
    watercolor: ['watercolor', 'watercolour', 'aquarelle'],
    oil: ['oil painting', 'oil paint', 'impasto'],
    photorealistic: ['photorealistic', 'photographic', 'hyperrealistic', 'photo-realistic', 'realistic'],
    pixel: ['pixel art', 'pixel', '8-bit', '16-bit', 'retro'],
    '3d': ['3d', 'cgi', 'rendered', 'blender', 'unreal'],
    noir: ['noir', 'film noir', 'black and white', 'monochrome'],
    cinematic: ['cinematic', 'filmic', 'movie', 'film'],
    sketch: ['sketch', 'pencil', 'charcoal', 'drawing', 'line art'],
    muppet: ['muppet', 'puppet', 'felt', 'jim henson'],
    toybox: ['toy', 'toy story', 'action figure', 'plastic'],
}

function extractKeywords(text: string): Set<string> {
    const normalized = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ')
    const words = normalized.split(/\s+/).filter(w => w.length > 2)
    return new Set(words)
}

function resolveCanonicalStyles(text: string): Set<string> {
    const lower = text.toLowerCase()
    const canonical = new Set<string>()
    for (const [category, synonyms] of Object.entries(STYLE_SYNONYMS)) {
        if (synonyms.some(s => lower.includes(s))) {
            canonical.add(category)
        }
    }
    return canonical
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 1
    const intersection = new Set([...a].filter(x => b.has(x)))
    const union = new Set([...a, ...b])
    return intersection.size / union.size
}

export function computeStyleMatch(
    analyzed: StyleAnalysisResult,
    effectiveStyle: { name: string; style_prompt?: string | null }
): StyleMatchResult {
    const detectedStyle = analyzed.name

    // Build combined text for each side
    const analyzedText = `${analyzed.name} ${analyzed.description} ${analyzed.stylePrompt}`
    const effectiveText = `${effectiveStyle.name} ${effectiveStyle.style_prompt || ''}`

    // 1. Canonical style category matching (strongest signal)
    const analyzedCategories = resolveCanonicalStyles(analyzedText)
    const effectiveCategories = resolveCanonicalStyles(effectiveText)
    const categoryOverlap = jaccardSimilarity(analyzedCategories, effectiveCategories)

    // 2. Keyword-level similarity
    const analyzedKeywords = extractKeywords(analyzedText)
    const effectiveKeywords = extractKeywords(effectiveText)
    const keywordSimilarity = jaccardSimilarity(analyzedKeywords, effectiveKeywords)

    // 3. Direct name match check
    const nameMatch =
        effectiveStyle.name.toLowerCase().includes(analyzed.name.toLowerCase()) ||
        analyzed.name.toLowerCase().includes(effectiveStyle.name.toLowerCase())

    // Weighted score
    let score: number
    if (nameMatch) {
        score = 90
    } else if (categoryOverlap > 0) {
        // Category overlap is the strongest signal
        score = Math.round(categoryOverlap * 60 + keywordSimilarity * 40)
    } else {
        score = Math.round(keywordSimilarity * 50)
    }

    score = Math.min(100, Math.max(0, score))

    let level: MatchLevel
    if (score >= 70) level = 'match'
    else if (score >= 40) level = 'partial'
    else level = 'mismatch'

    // Build reason
    let reason: string
    if (level === 'match') {
        reason = `Detected "${detectedStyle}" matches the active style`
    } else if (level === 'partial') {
        reason = `Detected "${detectedStyle}" — some overlap with active style`
    } else {
        reason = `Detected "${detectedStyle}" — different from active style "${effectiveStyle.name}"`
    }

    return { score, level, detectedStyle, reason }
}
