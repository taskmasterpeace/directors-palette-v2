'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Users, ImagePlus, Upload, Link, X, ChevronDown, ChevronUp, CheckCircle, Sparkles } from 'lucide-react'
import { useStoryboardStore } from '../../store'
import { useLayoutStore } from '@/store/layout.store'
import { useRecipeStore } from '@/features/shot-creator/store/recipe.store'
import type { StoryboardCharacter } from '../../types/storyboard.types'

interface CharacterCardProps {
    character: StoryboardCharacter
    index: number
    onUpdate: (index: number, updates: Partial<StoryboardCharacter>) => void
    onOpenCharacterSheetRecipe: (characterName: string, data?: string, type?: 'photo' | 'description') => void
}

function CharacterCard({ character, index, onUpdate, onOpenCharacterSheetRecipe }: CharacterCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload')
    const [imageUrl, setImageUrl] = useState(character.reference_image_url || '')
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Auto-expand when reference is enabled but no image yet
    useEffect(() => {
        if (character.has_reference && !character.reference_image_url) {
            setIsExpanded(true)
        }
    }, [character.has_reference, character.reference_image_url])

    const handleToggleReference = () => {
        onUpdate(index, { has_reference: !character.has_reference })
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Convert to base64 for local use (or upload to storage)
        const reader = new FileReader()
        reader.onloadend = () => {
            const base64 = reader.result as string
            onUpdate(index, { reference_image_url: base64 })
            setImageUrl(base64)
        }
        reader.readAsDataURL(file)
    }

    const handleUrlSubmit = () => {
        if (imageUrl.trim()) {
            onUpdate(index, { reference_image_url: imageUrl.trim() })
        }
    }

    const handleRemoveImage = () => {
        onUpdate(index, { reference_image_url: undefined })
        setImageUrl('')
    }

    const handleDescriptionChange = (description: string) => {
        onUpdate(index, { description })
    }

    return (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <div className="rounded-lg border bg-card/50 hover:bg-card/80 transition-colors overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-3">
                    <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-3 flex-1 cursor-pointer">
                            {/* Reference Image Thumbnail */}
                            {character.reference_image_url ? (
                                <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-primary/30 flex-shrink-0">
                                    <img
                                        src={character.reference_image_url}
                                        alt={character.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                    <Users className="w-5 h-5 text-muted-foreground" />
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{character.name}</span>
                                    <Badge variant="secondary" className="text-xs">
                                        {character.mentions} mentions
                                    </Badge>
                                    {character.has_reference && character.reference_image_url && (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    )}
                                </div>
                                {character.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                                        {character.description}
                                    </p>
                                )}
                            </div>

                            {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                        </div>
                    </CollapsibleTrigger>

                    <div className="flex items-center gap-1 sm:gap-2 text-sm ml-2 sm:ml-3 flex-shrink-0">
                        <span className="text-muted-foreground text-xs hidden sm:inline">Reference</span>
                        <Switch
                            checked={character.has_reference}
                            onCheckedChange={handleToggleReference}
                        />
                    </div>
                </div>

                {/* Expanded Content */}
                <CollapsibleContent>
                    <div className="px-3 pb-3 border-t bg-muted/20">
                        <div className="pt-3 space-y-4">
                            {/* Reference Image Section */}
                            {character.has_reference && (
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Reference Image</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Add a reference image with the character&apos;s name written on it for best results.
                                    </p>

                                    {character.reference_image_url ? (
                                        /* Show current image */
                                        <div className="relative">
                                            <img
                                                src={character.reference_image_url}
                                                alt={character.name}
                                                className="w-full max-h-48 object-contain rounded-lg border"
                                            />
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                className="absolute top-2 right-2"
                                                onClick={handleRemoveImage}
                                            >
                                                <X className="w-3 h-3 mr-1" />
                                                Remove
                                            </Button>
                                        </div>
                                    ) : (
                                        /* Image input options */
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <Button
                                                    variant={imageInputMode === 'upload' ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setImageInputMode('upload')}
                                                >
                                                    <Upload className="w-3 h-3 mr-1" />
                                                    Upload
                                                </Button>
                                                <Button
                                                    variant={imageInputMode === 'url' ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setImageInputMode('url')}
                                                >
                                                    <Link className="w-3 h-3 mr-1" />
                                                    URL
                                                </Button>
                                            </div>

                                            {imageInputMode === 'upload' ? (
                                                <div>
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleFileUpload}
                                                        className="hidden"
                                                    />
                                                    <Button
                                                        variant="outline"
                                                        className="w-full h-24 border-dashed"
                                                        onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        <div className="text-center">
                                                            <ImagePlus className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                                                            <span className="text-sm">Click to upload image</span>
                                                        </div>
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="Enter image URL..."
                                                        value={imageUrl}
                                                        onChange={(e) => setImageUrl(e.target.value)}
                                                        className="flex-1"
                                                    />
                                                    <Button onClick={handleUrlSubmit}>Add</Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Description */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Description</Label>
                                <Textarea
                                    placeholder="Physical description for AI generation..."
                                    value={character.description || ''}
                                    onChange={(e) => handleDescriptionChange(e.target.value)}
                                    className="min-h-[60px] text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                    This description will be included in prompts when this character appears.
                                </p>
                            </div>

                            {/* Character Sheet Recipe Buttons */}
                            <div className="pt-2 border-t space-y-2">
                                {character.reference_image_url ? (
                                    /* Has photo - use photo-based recipe */
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full gap-2"
                                        onClick={() => onOpenCharacterSheetRecipe(
                                            character.name,
                                            character.reference_image_url,
                                            'photo'
                                        )}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Create Character Sheet (from photo)
                                    </Button>
                                ) : character.description ? (
                                    /* No photo but has description - use description-based recipe */
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full gap-2"
                                        onClick={() => onOpenCharacterSheetRecipe(
                                            character.name,
                                            character.description,
                                            'description'
                                        )}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Create Character Sheet (from description)
                                    </Button>
                                ) : null}
                                {(character.reference_image_url || character.description) && (
                                    <p className="text-xs text-muted-foreground text-center">
                                        Opens Shot Creator with the Character Sheet recipe
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    )
}

export function CharacterList() {
    const { extractionResult, characters, setCharacters } = useStoryboardStore()
    const { setActiveTab } = useLayoutStore()
    const { recipes, setActiveRecipe, setFieldValue } = useRecipeStore()

    // Handler to open Shot Creator with Character Sheet recipe
    const handleOpenCharacterSheetRecipe = (characterName: string, data?: string, type: 'photo' | 'description' = 'photo') => {
        // Find the appropriate recipe based on type
        const recipeName = type === 'description'
            ? 'Character Sheet (From Description)'
            : 'Character Sheet'

        const targetRecipe = recipes.find(r => r.name === recipeName)

        if (targetRecipe) {
            // Set the active recipe
            setActiveRecipe(targetRecipe.id)

            // Pre-fill the character name field
            setFieldValue('stage0_field0_character_name', characterName)

            // For description-based recipe, also pre-fill the description
            if (type === 'description' && data) {
                setFieldValue('stage0_field1_character_description', data)
            }
        }

        // Switch to Shot Creator tab
        setActiveTab('shot-creator')
    }

    // Initialize characters from extraction result if not already set
    const displayCharacters = characters.length > 0
        ? characters
        : (extractionResult?.characters || []).map((c, i) => ({
            id: `temp-${i}`,
            storyboard_id: '',
            name: c.name,
            mentions: c.mentions,
            has_reference: false,
            reference_image_url: undefined,
            description: c.description,
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }))

    // Sync characters to store if using extraction result
    useEffect(() => {
        if (extractionResult && characters.length === 0) {
            setCharacters(displayCharacters)
        }
    }, [extractionResult, characters.length, setCharacters, displayCharacters])

    const handleUpdateCharacter = (index: number, updates: Partial<StoryboardCharacter>) => {
        const updated = displayCharacters.map((c, i) =>
            i === index ? { ...c, ...updates } : c
        )
        setCharacters(updated)
    }

    if (!extractionResult && characters.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No characters extracted yet.</p>
                    <p className="text-sm">Go to the Story tab and extract characters first.</p>
                </CardContent>
            </Card>
        )
    }

    const charactersWithRef = displayCharacters.filter(c => c.has_reference && c.reference_image_url).length

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Characters ({displayCharacters.length})
                </CardTitle>
                <CardDescription>
                    {charactersWithRef > 0 && (
                        <span className="text-green-600">{charactersWithRef} with reference images</span>
                    )}
                    {charactersWithRef === 0 && 'Toggle reference to add character images'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {displayCharacters.map((character, index) => (
                        <CharacterCard
                            key={character.id || index}
                            character={character}
                            index={index}
                            onUpdate={handleUpdateCharacter}
                            onOpenCharacterSheetRecipe={handleOpenCharacterSheetRecipe}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
