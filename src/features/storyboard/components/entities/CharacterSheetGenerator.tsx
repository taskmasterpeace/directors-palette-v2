'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Wand2, Loader2, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { PromptEditor, type PromptVariable } from '../shared/PromptEditor'
import { characterSheetService, DEFAULT_SIDE1_PROMPT, DEFAULT_SIDE2_PROMPT } from '../../services/character-sheet.service'
import { useStoryboardStore } from '../../store'

type GenerationStatus = 'idle' | 'generating' | 'completed' | 'failed'

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
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
