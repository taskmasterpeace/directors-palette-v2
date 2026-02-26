'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
// Card wrapper removed — rendered inside CharacterSheetPanel tabs
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, AlertCircle, Image as ImageIcon, UserCircle, Layers, Palette } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PromptEditor, type PromptVariable } from '../shared/PromptEditor'
import { characterSheetService, DEFAULT_SIDE1_PROMPT, DEFAULT_SIDE2_PROMPT } from '../../services/character-sheet.service'
import { useStoryboardStore } from '../../store'
import { useEffectiveStyleGuide } from '../../hooks/useEffectiveStyleGuide'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { getImageCostTokens } from '../../constants/generation.constants'
import { safeJsonParse } from '@/features/shared/utils/safe-fetch'
import { toast } from 'sonner'

type GenerationStatus = 'idle' | 'generating' | 'completed' | 'failed'

// Build turnaround prompt from character description
function buildTurnaroundPrompt(characterDescription: string, style: string = 'photographic'): string {
    return `Create a professional character reference sheet of ${characterDescription}.

Use a clean, neutral plain background and present the sheet as a technical model turnaround in a ${style} style.

Arrange the composition into two horizontal rows:

TOP ROW (4 full-body standing views, placed side-by-side):
- Front view
- Left profile view (facing left)
- Right profile view (facing right)
- Back view

BOTTOM ROW (3 highly detailed close-up portraits, aligned beneath the full-body row):
- Front portrait
- Left profile portrait (facing left)
- Right profile portrait (facing right)

CRITICAL REQUIREMENTS:
- Maintain PERFECT identity consistency across every panel
- Keep the subject in a relaxed A-pose
- Consistent scale and alignment between views
- Accurate anatomy and clear silhouette
- Even spacing and clean panel separation
- Uniform framing and consistent head height across the full-body lineup
- Consistent facial scale across the portraits
- Lighting must be consistent across all panels (same direction, intensity, and softness)
- Natural, controlled shadows that preserve detail without dramatic mood shifts

Output a crisp, print-ready reference sheet look with sharp details.`
}

export function CharacterSheetGenerator() {
    const { characters, updateCharacter, setInternalTab, preSelectedCharacterId, setPreSelectedCharacterId, generationSettings } = useStoryboardStore()
    const effectiveStyleGuide = useEffectiveStyleGuide()
    const { fetchBalance } = useCreditsStore()
    const containerRef = useRef<HTMLDivElement>(null)

    const [selectedCharacterId, setSelectedCharacterId] = useState<string>('')
    const [side1Prompt, setSide1Prompt] = useState(DEFAULT_SIDE1_PROMPT)
    const [side2Prompt, setSide2Prompt] = useState(DEFAULT_SIDE2_PROMPT)
    const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle')
    const [side1PredictionId, setSide1PredictionId] = useState<string | null>(null)
    const [side2PredictionId, setSide2PredictionId] = useState<string | null>(null)
    const [side1GalleryId, setSide1GalleryId] = useState<string | null>(null)
    const [side2GalleryId, setSide2GalleryId] = useState<string | null>(null)
    const [side1ImageUrl, setSide1ImageUrl] = useState<string | null>(null)
    const [side2ImageUrl, setSide2ImageUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Batch generation state
    const [isBatchGenerating, setIsBatchGenerating] = useState(false)
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
    const [batchResults, setBatchResults] = useState<{ name: string; success: boolean; error?: string }[]>([])

    // Handle preSelectedCharacterId from store (set by CharacterList)
    useEffect(() => {
        if (preSelectedCharacterId) {
            const char = characters.find(c => c.id === preSelectedCharacterId)
            if (char) {
                setSelectedCharacterId(preSelectedCharacterId)
            }
            setPreSelectedCharacterId(null)
            containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }, [preSelectedCharacterId, setPreSelectedCharacterId, characters])

    // Poll prediction status for side 1
    useEffect(() => {
        if (!side1PredictionId || side1ImageUrl) return

        const controller = new AbortController()
        let cancelled = false

        const poll = async () => {
            for (let i = 0; i < 60; i++) {
                if (cancelled) return
                try {
                    const res = await fetch(`/api/generation/status/${side1PredictionId}`, {
                        signal: controller.signal
                    })
                    if (res.ok) {
                        const data = await res.json()
                        if (data.status === 'succeeded') {
                            setSide1ImageUrl(data.persistedUrl || data.output)
                            return
                        }
                        if (data.status === 'failed') return
                    }
                } catch (err) {
                    if (err instanceof DOMException && err.name === 'AbortError') return
                }
                if (cancelled) return
                await new Promise(r => setTimeout(r, 2000))
            }
        }

        poll()
        return () => { cancelled = true; controller.abort() }
    }, [side1PredictionId, side1ImageUrl])

    // Poll prediction status for side 2
    useEffect(() => {
        if (!side2PredictionId || side2ImageUrl) return

        const controller = new AbortController()
        let cancelled = false

        const poll = async () => {
            for (let i = 0; i < 60; i++) {
                if (cancelled) return
                try {
                    const res = await fetch(`/api/generation/status/${side2PredictionId}`, {
                        signal: controller.signal
                    })
                    if (res.ok) {
                        const data = await res.json()
                        if (data.status === 'succeeded') {
                            setSide2ImageUrl(data.persistedUrl || data.output)
                            return
                        }
                        if (data.status === 'failed') return
                    }
                } catch (err) {
                    if (err instanceof DOMException && err.name === 'AbortError') return
                }
                if (cancelled) return
                await new Promise(r => setTimeout(r, 2000))
            }
        }

        poll()
        return () => { cancelled = true; controller.abort() }
    }, [side2PredictionId, side2ImageUrl])

    // Get characters that have reference images
    const charactersWithRef = useMemo(() => {
        return characters.filter(c => c.has_reference && c.reference_image_url)
    }, [characters])

    const selectedCharacter = useMemo(() => {
        return characters.find(c => c.id === selectedCharacterId)
    }, [characters, selectedCharacterId])

    const characterName = selectedCharacter?.name || '[Character Name]'
    const styleName = effectiveStyleGuide?.name || '[No style selected]'

    const side1Variables: PromptVariable[] = [
        {
            name: 'CHARACTER_NAME',
            value: characterName,
            description: 'Name of the character',
            editable: false
        },
        {
            name: 'STYLE_NAME',
            value: styleName,
            description: effectiveStyleGuide ? 'From Style tab' : 'No style set — go to Style tab',
            editable: false
        }
    ]

    const side2Variables: PromptVariable[] = [...side1Variables]

    const handleGenerate = async () => {
        if (!selectedCharacterId) {
            setError('Please select a character')
            return
        }

        if (!effectiveStyleGuide) {
            toast.error('Style guide required', {
                description: 'Select a style in the Style tab before generating character sheets.',
                action: {
                    label: 'Go to Style',
                    onClick: () => setInternalTab('style'),
                },
            })
            return
        }

        setGenerationStatus('generating')
        setError(null)
        setSide1PredictionId(null)
        setSide2PredictionId(null)
        setSide1GalleryId(null)
        setSide2GalleryId(null)
        setSide1ImageUrl(null)
        setSide2ImageUrl(null)

        try {
            const result = await characterSheetService.generateCharacterSheet({
                characterName: selectedCharacter?.name || '',
                styleName: effectiveStyleGuide.name,
                side1Prompt,
                side2Prompt,
                characterReferenceUrl: selectedCharacter?.reference_image_url,
                styleReferenceUrl: effectiveStyleGuide.reference_image_url,
                aspectRatio: '16:9'
            })

            if (result.side1.success && result.side2.success) {
                setGenerationStatus('completed')
                setSide1PredictionId(result.side1.predictionId || null)
                setSide2PredictionId(result.side2.predictionId || null)
                setSide1GalleryId(result.side1.galleryId || null)
                setSide2GalleryId(result.side2.galleryId || null)
            } else {
                setGenerationStatus('failed')
                const errors = [
                    result.side1.error ? `Side 1: ${result.side1.error}` : null,
                    result.side2.error ? `Side 2: ${result.side2.error}` : null
                ].filter(Boolean)
                setError(errors.join('; '))

                // Still record successful sides
                if (result.side1.success) {
                    setSide1PredictionId(result.side1.predictionId || null)
                    setSide1GalleryId(result.side1.galleryId || null)
                }
                if (result.side2.success) {
                    setSide2PredictionId(result.side2.predictionId || null)
                    setSide2GalleryId(result.side2.galleryId || null)
                }
            }
        } catch (err) {
            setGenerationStatus('failed')
            setError(err instanceof Error ? err.message : 'Generation failed')
        }
    }

    const handleSaveToCharacter = () => {
        if (!selectedCharacterId) return

        // Update character with generated sheet gallery IDs
        const metadata: Record<string, unknown> = {}
        if (side1GalleryId) metadata.side1_gallery_id = side1GalleryId
        if (side2GalleryId) metadata.side2_gallery_id = side2GalleryId

        updateCharacter(selectedCharacterId, { metadata })
    }

    // Batch generate turnaround sheets for all characters
    const handleBatchGenerate = async () => {
        if (characters.length === 0) {
            toast.error('No characters found', { description: 'Extract characters from your story first.' })
            return
        }

        // Credit check before batch generation
        const costPerImg = getImageCostTokens(generationSettings.imageModel, generationSettings.resolution)
        const totalCost = characters.length * costPerImg
        try {
            await fetchBalance()
        } catch {
            // Continue anyway, API will catch it
        }
        const currentBalance = useCreditsStore.getState().balance

        if (currentBalance < totalCost) {
            toast.error(
                `Insufficient credits. You need ${totalCost} tokens for ${characters.length} characters but only have ${currentBalance}.`,
                { duration: 5000 }
            )
            return
        }

        setIsBatchGenerating(true)
        setBatchProgress({ current: 0, total: characters.length })
        setBatchResults([])

        const batchStyleName = effectiveStyleGuide?.name || 'cinematic'
        const results: { name: string; success: boolean; error?: string }[] = []

        for (let i = 0; i < characters.length; i++) {
            const char = characters[i]
            setBatchProgress({ current: i + 1, total: characters.length })

            try {
                // Build the turnaround prompt using character description + effective style
                const description = char.description || `${char.name}, a person with no additional details`
                const prompt = buildTurnaroundPrompt(description, batchStyleName)

                // Build reference images array from style guide
                const referenceImages: string[] = []
                if (effectiveStyleGuide?.reference_image_url) {
                    referenceImages.push(effectiveStyleGuide.reference_image_url)
                }

                // Call the API to generate
                const response = await fetch('/api/generation/image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt,
                        model: 'nano-banana-pro',
                        modelSettings: {
                            aspectRatio: '16:9',
                            resolution: '2K'
                        },
                        ...(referenceImages.length > 0 && { referenceImages }),
                        extraMetadata: {
                            source: 'storyboard',
                            characterName: char.name,
                            type: 'character-turnaround'
                        }
                    })
                })

                if (!response.ok) {
                    const errorData = await safeJsonParse<{ error?: string }>(response).catch(() => ({} as { error?: string }))
                    throw new Error(errorData.error || `HTTP ${response.status}`)
                }

                // Parse response to get predictionId for polling
                const responseData = await response.json() as { predictionId?: string; galleryId?: string }
                const { predictionId, galleryId } = responseData

                // Poll for the final image URL and update the character
                if (predictionId) {
                    const pollForImage = async () => {
                        for (let attempt = 0; attempt < 60; attempt++) {
                            try {
                                const statusRes = await fetch(`/api/generation/status/${predictionId}`)
                                if (statusRes.ok) {
                                    const statusData = await statusRes.json()
                                    if (statusData.status === 'succeeded') {
                                        const imageUrl = statusData.persistedUrl || statusData.output
                                        if (imageUrl) {
                                            updateCharacter(char.id, {
                                                reference_image_url: imageUrl,
                                                has_reference: true,
                                                ...(galleryId ? { reference_gallery_id: galleryId } : {}),
                                                metadata: {
                                                    ...((char.metadata || {}) as Record<string, unknown>),
                                                    turnaround_gallery_id: galleryId,
                                                    turnaround_prediction_id: predictionId,
                                                }
                                            })
                                            toast.success(`Turnaround ready for ${char.name}`)
                                        }
                                        return
                                    }
                                    if (statusData.status === 'failed') {
                                        toast.error(`Turnaround failed for ${char.name}`)
                                        return
                                    }
                                }
                            } catch {
                                // continue polling
                            }
                            await new Promise(r => setTimeout(r, 2000))
                        }
                    }
                    // Fire and forget — poll in background so batch can continue
                    pollForImage()
                }

                results.push({ name: char.name, success: true })
                toast.success(`Generated turnaround for ${char.name}`)
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Generation failed'
                results.push({ name: char.name, success: false, error: errorMsg })
                toast.error(`Failed: ${char.name}`, { description: errorMsg })
            }

            // Small delay between requests to avoid rate limiting
            await new Promise(r => setTimeout(r, 1000))
        }

        setBatchResults(results)
        setIsBatchGenerating(false)

        const successCount = results.filter(r => r.success).length
        toast.info(`Batch generation complete`, {
            description: `${successCount}/${characters.length} turnarounds generated`
        })
    }

    const canGenerate = selectedCharacterId && effectiveStyleGuide

    return (
        <div className="space-y-4" ref={containerRef}>
            <p className="text-sm text-muted-foreground">
                Generates two sheets per character: a full-body turnaround reference + an expression/face sheet
            </p>
                {/* Active Style Badge */}
                {effectiveStyleGuide ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                        <Palette className="w-4 h-4 text-primary" />
                        <span className="text-xs text-muted-foreground">Using style:</span>
                        <Badge variant="secondary" className="text-xs">{effectiveStyleGuide.name}</Badge>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm text-amber-600 dark:text-amber-400">No style selected. Set a style in the Style tab first.</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Batch generation will use a generic &quot;cinematic&quot; fallback.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setInternalTab('style')}>
                            Go to Style
                        </Button>
                    </div>
                )}

                {/* Batch Generate All Turnarounds */}
                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                    <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-primary" />
                        <Label className="text-sm font-medium">Quick: Generate All Turnarounds</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Automatically generate a turnaround sheet for each extracted character using their descriptions
                        and the active style from the Style tab.
                    </p>

                    {/* Progress indicator */}
                    {isBatchGenerating && (
                        <div className="space-y-2">
                            <Progress value={(batchProgress.current / batchProgress.total) * 100} />
                            <p className="text-xs text-center text-muted-foreground">
                                Generating {batchProgress.current} of {batchProgress.total}...
                            </p>
                        </div>
                    )}

                    {/* Results summary */}
                    {batchResults.length > 0 && !isBatchGenerating && (
                        <div className="flex flex-wrap gap-1">
                            {batchResults.map((result, i) => (
                                <Badge
                                    key={i}
                                    variant={result.success ? "secondary" : "destructive"}
                                    className="text-xs"
                                >
                                    {result.success ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                                    {result.name}
                                </Badge>
                            ))}
                        </div>
                    )}

                    <Button
                        onClick={handleBatchGenerate}
                        disabled={isBatchGenerating || characters.length === 0}
                        size="sm"
                        className="w-full"
                    >
                        {isBatchGenerating ? (
                            <>
                                <LoadingSpinner size="sm" color="current" className="mr-2" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <UserCircle className="w-4 h-4 mr-2" />
                                Generate All ({characters.length} characters)
                            </>
                        )}
                    </Button>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or select individual</span>
                    </div>
                </div>

                {/* Character Selector */}
                <div className="space-y-2">
                    <Label>Select Character</Label>
                    {charactersWithRef.length === 0 ? (
                        <div className="p-3 rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
                            No characters with reference images. Toggle &quot;Reference&quot; on a character first.
                        </div>
                    ) : (
                        <Select value={selectedCharacterId} onValueChange={setSelectedCharacterId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a character..." />
                            </SelectTrigger>
                            <SelectContent>
                                {charactersWithRef.map(char => (
                                    <SelectItem key={char.id} value={char.id}>
                                        <div className="flex items-center gap-2">
                                            {char.reference_image_url && (
                                                <img
                                                    src={char.reference_image_url}
                                                    alt={char.name}
                                                    className="w-6 h-6 rounded object-cover"
                                                />
                                            )}
                                            <span>{char.name}</span>
                                            <Badge variant="secondary" className="text-xs">
                                                {char.mentions} mentions
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Prompt Editors */}
                <div className="space-y-3">
                    <PromptEditor
                        title="Side 1: Full Body Reference"
                        prompt={side1Prompt}
                        variables={side1Variables}
                        onPromptChange={setSide1Prompt}
                        collapsible={true}
                        defaultOpen={false}
                    />

                    <PromptEditor
                        title="Side 2: Face & Expressions"
                        prompt={side2Prompt}
                        variables={side2Variables}
                        onPromptChange={setSide2Prompt}
                        collapsible={true}
                        defaultOpen={false}
                    />
                </div>

                {/* Aspect Ratio Info */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">16:9</Badge>
                    <span>Widescreen aspect ratio for character sheets</span>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}

                {/* Generation Status with Inline Previews */}
                {(side1GalleryId || side2GalleryId) && (
                    <div className="space-y-3">
                        <Label>Generated Sheets</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {side1GalleryId && (
                                <div className="rounded-lg border bg-muted/30 overflow-hidden">
                                    <div className="p-2 flex items-center justify-between">
                                        <span className="text-xs font-medium">Side 1: Full Body Turnaround</span>
                                        {side1ImageUrl ? (
                                            <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600">
                                                <CheckCircle className="w-3 h-3 mr-1" /> Ready
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-xs">
                                                <LoadingSpinner size="xs" color="current" className="mr-1" /> Processing
                                            </Badge>
                                        )}
                                    </div>
                                    {side1ImageUrl ? (
                                        <img src={side1ImageUrl} alt="Full body turnaround" className="w-full aspect-video object-cover" />
                                    ) : (
                                        <div className="w-full aspect-video bg-muted/50 flex items-center justify-center">
                                            <LoadingSpinner size="md" />
                                        </div>
                                    )}
                                </div>
                            )}
                            {side2GalleryId && (
                                <div className="rounded-lg border bg-muted/30 overflow-hidden">
                                    <div className="p-2 flex items-center justify-between">
                                        <span className="text-xs font-medium">Side 2: Expression Sheet</span>
                                        {side2ImageUrl ? (
                                            <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600">
                                                <CheckCircle className="w-3 h-3 mr-1" /> Ready
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-xs">
                                                <LoadingSpinner size="xs" color="current" className="mr-1" /> Processing
                                            </Badge>
                                        )}
                                    </div>
                                    {side2ImageUrl ? (
                                        <img src={side2ImageUrl} alt="Expression sheet" className="w-full aspect-video object-cover" />
                                    ) : (
                                        <div className="w-full aspect-video bg-muted/50 flex items-center justify-center">
                                            <LoadingSpinner size="md" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <Button
                            onClick={handleSaveToCharacter}
                            variant="secondary"
                            className="w-full"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Save to Character
                        </Button>
                    </div>
                )}

                {/* Generate Button */}
                {!effectiveStyleGuide && selectedCharacterId && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            Select a style in the Style tab to enable generation.
                        </p>
                        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setInternalTab('style')}>
                            Style tab
                        </Button>
                    </div>
                )}
                <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate || generationStatus === 'generating'}
                    className="w-full"
                    size="lg"
                >
                    {generationStatus === 'generating' ? (
                        <>
                            <LoadingSpinner size="sm" color="current" className="mr-2" />
                            Generating Character Sheets...
                        </>
                    ) : (
                        <>
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Generate Character Sheets (2 Images)
                        </>
                    )}
                </Button>
        </div>
    )
}
