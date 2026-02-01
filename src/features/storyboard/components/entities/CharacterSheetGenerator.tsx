'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Users, Wand2, CheckCircle, AlertCircle, Image as ImageIcon, UserCircle, Layers } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PromptEditor, type PromptVariable } from '../shared/PromptEditor'
import { characterSheetService, DEFAULT_SIDE1_PROMPT, DEFAULT_SIDE2_PROMPT } from '../../services/character-sheet.service'
import { useStoryboardStore } from '../../store'
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
    const { characters, styleGuides, currentStyleGuide, updateCharacter } = useStoryboardStore()

    const [selectedCharacterId, setSelectedCharacterId] = useState<string>('')
    const [selectedStyleId, setSelectedStyleId] = useState<string>(currentStyleGuide?.id || '')
    const [side1Prompt, setSide1Prompt] = useState(DEFAULT_SIDE1_PROMPT)
    const [side2Prompt, setSide2Prompt] = useState(DEFAULT_SIDE2_PROMPT)
    const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle')
    const [side1GalleryId, setSide1GalleryId] = useState<string | null>(null)
    const [side2GalleryId, setSide2GalleryId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Batch generation state
    const [isBatchGenerating, setIsBatchGenerating] = useState(false)
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
    const [batchResults, setBatchResults] = useState<{ name: string; success: boolean; error?: string }[]>([])
    const [selectedBatchStyle, setSelectedBatchStyle] = useState('photographic')

    // Get characters that have reference images
    const charactersWithRef = useMemo(() => {
        return characters.filter(c => c.has_reference && c.reference_image_url)
    }, [characters])

    const selectedCharacter = useMemo(() => {
        return characters.find(c => c.id === selectedCharacterId)
    }, [characters, selectedCharacterId])

    const selectedStyle = useMemo(() => {
        return styleGuides.find(s => s.id === selectedStyleId) || currentStyleGuide
    }, [styleGuides, selectedStyleId, currentStyleGuide])

    const characterName = selectedCharacter?.name || '[Character Name]'
    const styleName = selectedStyle?.name || '[Style Name]'

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
            description: 'Name of the visual style',
            editable: false
        }
    ]

    const side2Variables: PromptVariable[] = [...side1Variables]

    const handleGenerate = async () => {
        if (!selectedCharacterId) {
            setError('Please select a character')
            return
        }

        if (!selectedStyle) {
            setError('Please select or create a style guide first')
            return
        }

        setGenerationStatus('generating')
        setError(null)
        setSide1GalleryId(null)
        setSide2GalleryId(null)

        try {
            const result = await characterSheetService.generateCharacterSheet({
                characterName: selectedCharacter?.name || '',
                styleName: selectedStyle.name,
                side1Prompt,
                side2Prompt,
                characterReferenceUrl: selectedCharacter?.reference_image_url,
                styleReferenceUrl: selectedStyle.reference_image_url,
                aspectRatio: '16:9'
            })

            if (result.side1.success && result.side2.success) {
                setGenerationStatus('completed')
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
                if (result.side1.success) setSide1GalleryId(result.side1.galleryId || null)
                if (result.side2.success) setSide2GalleryId(result.side2.galleryId || null)
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

        setIsBatchGenerating(true)
        setBatchProgress({ current: 0, total: characters.length })
        setBatchResults([])

        const results: { name: string; success: boolean; error?: string }[] = []

        for (let i = 0; i < characters.length; i++) {
            const char = characters[i]
            setBatchProgress({ current: i + 1, total: characters.length })

            try {
                // Build the turnaround prompt using character description
                const description = char.description || `${char.name}, a person with no additional details`
                const prompt = buildTurnaroundPrompt(description, selectedBatchStyle)

                // Call the API to generate
                const response = await fetch('/api/generate/image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt,
                        model: 'nano-banana-pro',
                        modelSettings: {
                            aspectRatio: '16:9',
                            resolution: '2K'
                        },
                        metadata: {
                            source: 'storyboard',
                            characterName: char.name,
                            type: 'character-turnaround'
                        }
                    })
                })

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    throw new Error(errorData.error || `HTTP ${response.status}`)
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

    const canGenerate = selectedCharacterId && (selectedStyle || currentStyleGuide)

    return (
        <Card className="border-primary/20">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Character Sheet Generator
                </CardTitle>
                <CardDescription>
                    Generate a 2-sided character model sheet: full body turnaround + expression sheet
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Batch Generate All Turnarounds */}
                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                    <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-primary" />
                        <Label className="text-sm font-medium">Quick: Generate All Turnarounds</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Automatically generate a turnaround sheet for each extracted character using their descriptions.
                        No reference images needed.
                    </p>

                    {/* Style selector for batch */}
                    <div className="flex items-center gap-2">
                        <Label className="text-xs">Style:</Label>
                        <Select value={selectedBatchStyle} onValueChange={setSelectedBatchStyle}>
                            <SelectTrigger className="w-40 h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="photographic">Photographic</SelectItem>
                                <SelectItem value="cinematic">Cinematic</SelectItem>
                                <SelectItem value="3D render">3D Render</SelectItem>
                                <SelectItem value="anime">Anime</SelectItem>
                                <SelectItem value="cartoon">Cartoon</SelectItem>
                                <SelectItem value="concept art">Concept Art</SelectItem>
                                <SelectItem value="illustrated">Illustrated</SelectItem>
                                <SelectItem value="Pixar-style">Pixar-style</SelectItem>
                                <SelectItem value="Disney-style">Disney-style</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

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

                {/* Style Guide Selector */}
                <div className="space-y-2">
                    <Label>Style Guide</Label>
                    {styleGuides.length === 0 && !currentStyleGuide ? (
                        <div className="p-3 rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
                            No style guides available. Create one in the Style tab first.
                        </div>
                    ) : (
                        <Select value={selectedStyleId} onValueChange={setSelectedStyleId}>
                            <SelectTrigger>
                                <SelectValue placeholder={currentStyleGuide ? currentStyleGuide.name : "Select a style..."} />
                            </SelectTrigger>
                            <SelectContent>
                                {currentStyleGuide && (
                                    <SelectItem value={currentStyleGuide.id}>
                                        <div className="flex items-center gap-2">
                                            <Wand2 className="w-4 h-4" />
                                            <span>{currentStyleGuide.name}</span>
                                            <Badge variant="outline" className="text-xs">Active</Badge>
                                        </div>
                                    </SelectItem>
                                )}
                                {styleGuides
                                    .filter(s => s.id !== currentStyleGuide?.id)
                                    .map(style => (
                                        <SelectItem key={style.id} value={style.id}>
                                            {style.name}
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

                {/* Generation Status */}
                {(side1GalleryId || side2GalleryId) && (
                    <div className="space-y-3">
                        <Label>Generation Started</Label>
                        <div className="p-4 rounded-lg bg-muted/30 border space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>Character sheets are being generated. They will appear in the Gallery when complete.</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {side1GalleryId && (
                                    <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                        <div className="flex-1">
                                            <div className="text-xs font-medium">Side 1: Full Body</div>
                                            <div className="text-xs text-muted-foreground font-mono truncate">
                                                {side1GalleryId}
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">Processing</Badge>
                                    </div>
                                )}
                                {side2GalleryId && (
                                    <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                        <div className="flex-1">
                                            <div className="text-xs font-medium">Side 2: Expressions</div>
                                            <div className="text-xs text-muted-foreground font-mono truncate">
                                                {side2GalleryId}
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">Processing</Badge>
                                    </div>
                                )}
                            </div>
                        </div>
                        <Button
                            onClick={handleSaveToCharacter}
                            variant="secondary"
                            className="w-full"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Save Gallery IDs to Character
                        </Button>
                    </div>
                )}

                {/* Generate Button */}
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
            </CardContent>
        </Card>
    )
}
