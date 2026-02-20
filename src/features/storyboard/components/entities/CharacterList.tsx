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
import { Users, ImagePlus, Upload, Link, X, ChevronDown, ChevronUp, CheckCircle, Sparkles, ChevronsUpDown, Images, UserPlus } from 'lucide-react'
import { useStoryboardStore } from '../../store'
import type { StoryboardCharacter, CharacterRole } from '../../types/storyboard.types'
import { GalleryImagePicker } from './GalleryImagePicker'

interface CharacterCardProps {
    character: StoryboardCharacter
    index: number
    onUpdate: (index: number, updates: Partial<StoryboardCharacter>) => void
    onOpenCharacterSheetRecipe: (characterId: string) => void
}

function CharacterCard({ character, index, onUpdate, onOpenCharacterSheetRecipe }: CharacterCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [imageInputMode, setImageInputMode] = useState<'upload' | 'url' | 'gallery'>('upload')
    const [imageUrl, setImageUrl] = useState(character.reference_image_url || '')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDescriptionOpen, setIsDescriptionOpen] = useState(!character.reference_image_url)
    const [galleryPickerOpen, setGalleryPickerOpen] = useState(false)

    // Auto-expand when reference is enabled but no image yet
    useEffect(() => {
        if (character.has_reference && !character.reference_image_url) {
            setIsExpanded(true)
        }
    }, [character.has_reference, character.reference_image_url])

    // Collapse description when a reference image is added, expand when removed
    useEffect(() => {
        setIsDescriptionOpen(!character.reference_image_url)
    }, [character.reference_image_url])

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
        onUpdate(index, { reference_image_url: undefined, reference_gallery_id: undefined })
        setImageUrl('')
    }

    const handleGallerySelect = (url: string, galleryId?: string) => {
        onUpdate(index, { reference_image_url: url, reference_gallery_id: galleryId })
        setImageUrl(url)
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
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium">{character.name}</span>
                                    {(() => {
                                        const aliases = (character.metadata as Record<string, unknown>)?.aliases
                                        return Array.isArray(aliases) && aliases.every(a => typeof a === 'string') ? (
                                            <span className="text-xs text-muted-foreground">
                                                aka {(aliases as string[]).join(', ')}
                                            </span>
                                        ) : null
                                    })()}
                                    {character.role && (
                                        <Badge
                                            variant={character.role === 'main' ? 'default' : 'outline'}
                                            className={`text-[10px] px-1.5 py-0 ${
                                                character.role === 'main'
                                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                                    : character.role === 'supporting'
                                                        ? 'border-blue-500/30 text-blue-400'
                                                        : 'border-zinc-500/30 text-zinc-400'
                                            }`}
                                        >
                                            {character.role}
                                        </Badge>
                                    )}
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
                                                <Button
                                                    variant={imageInputMode === 'gallery' ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setImageInputMode('gallery')}
                                                >
                                                    <Images className="w-3 h-3 mr-1" />
                                                    Gallery
                                                </Button>
                                            </div>

                                            {imageInputMode === 'upload' && (
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
                                            )}
                                            {imageInputMode === 'url' && (
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
                                            {imageInputMode === 'gallery' && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full h-24 border-dashed"
                                                        onClick={() => setGalleryPickerOpen(true)}
                                                    >
                                                        <div className="text-center">
                                                            <Images className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                                                            <span className="text-sm">Browse gallery images</span>
                                                        </div>
                                                    </Button>
                                                    <GalleryImagePicker
                                                        open={galleryPickerOpen}
                                                        onOpenChange={setGalleryPickerOpen}
                                                        onSelect={handleGallerySelect}
                                                        defaultMetadataTypeFilter="character-turnaround"
                                                    />
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Description */}
                            <Collapsible open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
                                <CollapsibleTrigger asChild>
                                    <button className="flex items-center gap-2 w-full text-left group">
                                        <Label className="text-sm font-medium cursor-pointer">
                                            {character.reference_image_url ? 'Description (optional)' : 'Description'}
                                        </Label>
                                        <ChevronsUpDown className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                                        {!isDescriptionOpen && character.description && (
                                            <span className="text-xs text-muted-foreground truncate flex-1">{character.description}</span>
                                        )}
                                    </button>
                                </CollapsibleTrigger>
                                {character.reference_image_url && !isDescriptionOpen && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Optional — add physical details the AI can&apos;t see in the image (e.g., height, voice, personality).
                                    </p>
                                )}
                                <CollapsibleContent>
                                    <div className="space-y-2 pt-2">
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
                                </CollapsibleContent>
                            </Collapsible>

                            {/* Character Sheet Generator Button */}
                            {(character.reference_image_url || character.description) && (
                                <div className="pt-2 border-t">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full gap-2"
                                        onClick={() => onOpenCharacterSheetRecipe(character.id)}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Generate Character Sheet
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    )
}

function AddCharacterForm({ onAdd, onCancel }: { onAdd: (name: string, role: CharacterRole) => void, onCancel: () => void }) {
    const [name, setName] = useState('')
    const [role, setRole] = useState<CharacterRole>('supporting')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (name.trim()) {
            onAdd(name.trim(), role)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="rounded-lg border bg-card/50 p-3 space-y-3">
            <Input
                placeholder="Enter character name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
            />
            <div>
                <Label htmlFor="role-select">Role</Label>
                <select
                    id="role-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value as CharacterRole)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                    <option value="main">main</option>
                    <option value="supporting">supporting</option>
                    <option value="background">background</option>
                </select>
            </div>
            <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={!name.trim()}>Add</Button>
                <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            </div>
        </form>
    )
}

export function CharacterList() {
    const { extractionResult, characters, setCharacters, addCharacter, setPreSelectedCharacterId } = useStoryboardStore()
    const [showAddForm, setShowAddForm] = useState(false)

    // Handler to pre-select a character in the CharacterSheetGenerator
    const handleOpenCharacterSheetRecipe = (characterId: string) => {
        setPreSelectedCharacterId(characterId)
    }

    const handleAddCharacter = (name: string, role: CharacterRole) => {
        const newCharacter: StoryboardCharacter = {
            id: `manual-${Date.now()}`,
            storyboard_id: '',
            name,
            role,
            mentions: 0,
            has_reference: false,
            metadata: { manual: true },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }
        addCharacter(newCharacter)
        setShowAddForm(false)
    }

    // Initialize characters from extraction result if not already set
    const displayCharacters = characters.length > 0
        ? characters
        : (extractionResult?.characters || []).map((c, i) => ({
            id: `temp-${i}`,
            storyboard_id: '',
            name: c.name,
            role: c.role || 'supporting' as CharacterRole,
            mentions: c.mentions,
            has_reference: false,
            reference_image_url: undefined,
            description: c.description,
            metadata: {
                ...(c.aliases && c.aliases.length > 0 ? { aliases: c.aliases } : {}),
            },
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

    const addCharacterSection = (
        <div className="mt-4">
            {showAddForm ? (
                <AddCharacterForm onAdd={handleAddCharacter} onCancel={() => setShowAddForm(false)} />
            ) : (
                <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Add Character
                </Button>
            )}
        </div>
    )

    if (!extractionResult && characters.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No characters extracted yet.</p>
                    <p className="text-sm">Go to the Story tab and extract characters first.</p>
                    {addCharacterSection}
                </CardContent>
            </Card>
        )
    }

    const charactersWithRef = displayCharacters.filter(c => c.has_reference && c.reference_image_url).length

    // Group characters by role, maintaining original index for updates
    const indexedCharacters = displayCharacters.map((c, index) => ({ ...c, _index: index }))
    const mainChars = indexedCharacters.filter(c => c.role === 'main')
    const supportingChars = indexedCharacters.filter(c => c.role === 'supporting')
    const backgroundChars = indexedCharacters.filter(c => c.role === 'background')
    // Characters without a role go into supporting
    const unclassified = indexedCharacters.filter(c => !c.role)
    const effectiveSupporting = [...supportingChars, ...unclassified]

    const roleGroups = [
        { label: 'Main Characters', chars: mainChars, color: 'text-amber-400' },
        { label: 'Supporting Characters', chars: effectiveSupporting, color: 'text-blue-400' },
        { label: 'Background', chars: backgroundChars, color: 'text-zinc-400' },
    ].filter(g => g.chars.length > 0)

    // Check if any characters have roles (otherwise render flat list)
    const hasRoles = displayCharacters.some(c => c.role)

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
                {hasRoles ? (
                    <div className="space-y-5">
                        {roleGroups.map(group => (
                            <div key={group.label} className="space-y-2">
                                <h4 className={`text-xs font-semibold uppercase tracking-wider ${group.color}`}>
                                    {group.label} ({group.chars.length})
                                </h4>
                                <div className="space-y-3">
                                    {group.chars.map((character) => (
                                        <CharacterCard
                                            key={character.id || character._index}
                                            character={character}
                                            index={character._index}
                                            onUpdate={handleUpdateCharacter}
                                            onOpenCharacterSheetRecipe={handleOpenCharacterSheetRecipe}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
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
                )}
                {addCharacterSection}
            </CardContent>
        </Card>
    )
}
