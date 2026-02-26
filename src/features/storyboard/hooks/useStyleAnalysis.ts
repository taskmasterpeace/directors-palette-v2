import { useCallback } from 'react'
import { create } from 'zustand'
import { useStoryboardStore } from '../store'
import { useEffectiveStyleGuide } from './useEffectiveStyleGuide'
import { computeStyleMatch, type StyleAnalysisResult, type StyleMatchResult } from '../services/style-match.service'

export interface CharacterStyleAnalysis {
    analyzedStyle: StyleAnalysisResult | null
    matchResult: StyleMatchResult | null
    isAnalyzing: boolean
    error: string | null
}

// Lightweight store shared between CharacterSheetPanel and CharacterList
interface StyleAnalysisStore {
    results: Record<string, CharacterStyleAnalysis>
    setResult: (characterId: string, analysis: CharacterStyleAnalysis) => void
}

export const useStyleAnalysisStore = create<StyleAnalysisStore>((set) => ({
    results: {},
    setResult: (characterId, analysis) =>
        set((state) => ({
            results: { ...state.results, [characterId]: analysis },
        })),
}))

async function toBase64(url: string): Promise<string> {
    if (url.startsWith('data:')) return url
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}

export function useStyleAnalysis() {
    const { characters } = useStoryboardStore()
    const effectiveStyleGuide = useEffectiveStyleGuide()
    const results = useStyleAnalysisStore((s) => s.results)
    const setResult = useStyleAnalysisStore((s) => s.setResult)

    const analyzeCharacterSheet = useCallback(async (characterId: string, imageUrl: string) => {
        if (!effectiveStyleGuide) return

        setResult(characterId, {
            analyzedStyle: null,
            matchResult: null,
            isAnalyzing: true,
            error: null,
        })

        try {
            const base64 = await toBase64(imageUrl)

            const res = await fetch('/api/styles/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64 }),
            })

            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
            }

            const analyzedStyle: StyleAnalysisResult = await res.json()
            const matchResult = computeStyleMatch(analyzedStyle, {
                name: effectiveStyleGuide.name,
                style_prompt: effectiveStyleGuide.style_prompt,
            })

            setResult(characterId, {
                analyzedStyle,
                matchResult,
                isAnalyzing: false,
                error: null,
            })
        } catch (err) {
            setResult(characterId, {
                analyzedStyle: null,
                matchResult: null,
                isAnalyzing: false,
                error: err instanceof Error ? err.message : 'Analysis failed',
            })
        }
    }, [effectiveStyleGuide, setResult])

    const analyzeAllCharacters = useCallback(async () => {
        const charsWithRef = characters.filter(c => c.has_reference && c.reference_image_url)
        for (const char of charsWithRef) {
            await analyzeCharacterSheet(char.id, char.reference_image_url!)
        }
    }, [characters, analyzeCharacterSheet])

    return {
        analyzeCharacterSheet,
        analyzeAllCharacters,
        results,
        hasActiveStyle: !!effectiveStyleGuide,
    }
}
