'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropZone } from '@/components/ui/drop-zone'
import {
    Upload, Link, Images, ImagePlus, X, Palette,
    AlertCircle, CheckCircle,
    Loader2, Search, Wand2, Users
} from 'lucide-react'
import { useStoryboardStore } from '../../store'
import { useEffectiveStyleGuide } from '../../hooks/useEffectiveStyleGuide'
import { useStyleAnalysis, type CharacterStyleAnalysis } from '../../hooks/useStyleAnalysis'
import { CharacterSheetGenerator } from './CharacterSheetGenerator'
import { GalleryImagePicker } from './GalleryImagePicker'
import type { MatchLevel } from '../../services/style-match.service'

// ──────────────────────────────────────────────
// Tab 1: Attach (upload existing sheet)
// ──────────────────────────────────────────────

function AttachTab({
    onUploaded,
}: {
    onUploaded: (characterId: string, imageUrl: string) => void
}) {
    const { characters, updateCharacter } = useStoryboardStore()
    const [selectedCharacterId, setSelectedCharacterId] = useState<string>('')
    const [imageInputMode, setImageInputMode] = useState<'upload' | 'url' | 'gallery'>('upload')
    const [imageUrl, setImageUrl] = useState('')
    const [galleryPickerOpen, setGalleryPickerOpen] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const selectedCharacter = characters.find(c => c.id === selectedCharacterId)

    const applyImage = useCallback((url: string, galleryId?: string) => {
        if (!selectedCharacterId) return
        updateCharacter(selectedCharacterId, {
            reference_image_url: url,
            has_reference: true,
            ...(galleryId ? { reference_gallery_id: galleryId } : {}),
        })
        onUploaded(selectedCharacterId, url)
    }, [selectedCharacterId, updateCharacter, onUploaded])

    const handleFileDrop = useCallback((files: File[]) => {
        const file = files[0]
        if (!file || !selectedCharacterId) return
        const reader = new FileReader()
        reader.onloadend = () => {
            const base64 = reader.result as string
            applyImage(base64)
        }
        reader.readAsDataURL(file)
    }, [selectedCharacterId, applyImage])

    const handleUrlSubmit = () => {
        if (imageUrl.trim()) {
            applyImage(imageUrl.trim())
            setImageUrl('')
        }
    }

    const handleGallerySelect = (url: string, galleryId?: string) => {
        applyImage(url, galleryId)
    }

    const handleRemoveImage = () => {
        if (!selectedCharacterId) return
        updateCharacter(selectedCharacterId, {
            reference_image_url: undefined,
            reference_gallery_id: undefined,
        })
    }

    return (
        <div className="space-y-4">
            {/* Character Selector — ALL characters */}
            <div className="space-y-2">
                <Label>Character</Label>
                {characters.length === 0 ? (
                    <div className="p-3 rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
                        No characters yet. Extract from story or add manually.
                    </div>
                ) : (
                    <Select value={selectedCharacterId} onValueChange={setSelectedCharacterId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a character..." />
                        </SelectTrigger>
                        <SelectContent>
                            {characters.map(char => (
                                <SelectItem key={char.id} value={char.id}>
                                    <div className="flex items-center gap-2">
                                        {char.reference_image_url ? (
                                            <img
                                                src={char.reference_image_url}
                                                alt={char.name}
                                                className="w-6 h-6 rounded object-cover"
                                            />
                                        ) : (
                                            <Users className="w-4 h-4 text-muted-foreground" />
                                        )}
                                        <span>{char.name}</span>
                                        {char.role && (
                                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                                                {char.role}
                                            </Badge>
                                        )}
                                        {char.has_reference && char.reference_image_url && (
                                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                        )}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* Show existing image if selected character already has one */}
            {selectedCharacter?.reference_image_url && (
                <div className="relative">
                    <img
                        src={selectedCharacter.reference_image_url}
                        alt={selectedCharacter.name}
                        className="w-full max-h-48 object-contain rounded-lg border"
                    />
                    <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveImage}
                    >
                        <X className="w-3 h-3 mr-1" />
                        Replace
                    </Button>
                </div>
            )}

            {/* Upload area */}
            {selectedCharacterId && !selectedCharacter?.reference_image_url && (
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
                        <>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleFileDrop([file])
                                }}
                                className="hidden"
                            />
                            <DropZone
                                accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }}
                                maxFiles={1}
                                multiple={false}
                                onDropAccepted={handleFileDrop}
                                idleText="Drag & drop a character sheet, or click to browse"
                                dragText="Drop character sheet here..."
                                size="large"
                                icon={<ImagePlus className="h-6 w-6" />}
                            />
                        </>
                    )}

                    {imageInputMode === 'url' && (
                        <div className="flex gap-2">
                            <Input
                                placeholder="Paste image URL..."
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                                className="flex-1"
                            />
                            <Button onClick={handleUrlSubmit} disabled={!imageUrl.trim()}>
                                Add
                            </Button>
                        </div>
                    )}

                    {imageInputMode === 'gallery' && (
                        <>
                            <Button
                                variant="outline"
                                className="w-full h-20 border-dashed"
                                onClick={() => setGalleryPickerOpen(true)}
                            >
                                <div className="text-center">
                                    <Images className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                                    <span className="text-sm">Browse gallery</span>
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

            {/* Hint when no character selected */}
            {!selectedCharacterId && characters.length > 0 && (
                <div className="p-4 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                    Select a character above to attach a sheet
                </div>
            )}
        </div>
    )
}

// ──────────────────────────────────────────────
// Style Check (shared, below tabs)
// ──────────────────────────────────────────────

const MATCH_COLORS: Record<MatchLevel, { bg: string; text: string; border: string }> = {
    match: { bg: 'bg-green-500/15', text: 'text-green-500', border: 'border-green-500/30' },
    partial: { bg: 'bg-yellow-500/15', text: 'text-yellow-500', border: 'border-yellow-500/30' },
    mismatch: { bg: 'bg-red-500/15', text: 'text-red-500', border: 'border-red-500/30' },
}

const MATCH_LABELS: Record<MatchLevel, string> = {
    match: 'Match',
    partial: 'Different Style',
    mismatch: 'Mismatch',
}

function StyleMatchBadge({ analysis }: { analysis: CharacterStyleAnalysis }) {
    if (analysis.isAnalyzing) {
        return (
            <Badge variant="secondary" className="text-xs gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking...
            </Badge>
        )
    }
    if (analysis.error) {
        return (
            <Badge variant="secondary" className="text-xs gap-1 bg-red-500/10 text-red-400">
                <AlertCircle className="w-3 h-3" />
                Error
            </Badge>
        )
    }
    if (analysis.matchResult) {
        const colors = MATCH_COLORS[analysis.matchResult.level]
        return (
            <Badge variant="secondary" className={`text-xs gap-1 ${colors.bg} ${colors.text} ${colors.border}`}>
                {analysis.matchResult.level === 'match' && <CheckCircle className="w-3 h-3" />}
                {analysis.matchResult.level !== 'match' && <AlertCircle className="w-3 h-3" />}
                {MATCH_LABELS[analysis.matchResult.level]}
            </Badge>
        )
    }
    return (
        <Badge variant="secondary" className="text-xs text-muted-foreground">
            Not checked
        </Badge>
    )
}

function StyleCheckSection({
    analysisResults,
    onAnalyzeAll,
}: {
    analysisResults: Record<string, CharacterStyleAnalysis>
    onAnalyzeAll: () => void
}) {
    const { characters, setInternalTab } = useStoryboardStore()
    const effectiveStyleGuide = useEffectiveStyleGuide()

    const charsWithRef = characters.filter(c => c.has_reference && c.reference_image_url)

    if (charsWithRef.length === 0) return null

    const isAnyAnalyzing = Object.values(analysisResults).some(a => a.isAnalyzing)

    return (
        <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Style Check
                </h3>
                {effectiveStyleGuide && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onAnalyzeAll}
                        disabled={isAnyAnalyzing}
                        className="h-7 text-xs"
                    >
                        {isAnyAnalyzing ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                            <Search className="w-3 h-3 mr-1" />
                        )}
                        Check All
                    </Button>
                )}
            </div>

            {/* Active style badge */}
            {effectiveStyleGuide ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                    <Palette className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Active style:</span>
                    <Badge variant="secondary" className="text-xs">{effectiveStyleGuide.name}</Badge>
                </div>
            ) : (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex-1">
                        No style selected. Set one in the Style tab.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setInternalTab('style')}>
                        Style tab
                    </Button>
                </div>
            )}

            {/* Character match list */}
            <div className="space-y-1.5">
                {charsWithRef.map(char => {
                    const analysis = analysisResults[char.id]
                    return (
                        <div key={char.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                            {char.reference_image_url && (
                                <img
                                    src={char.reference_image_url}
                                    alt={char.name}
                                    className="w-10 h-10 rounded-lg object-cover border flex-shrink-0"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium truncate block">{char.name}</span>
                                {analysis?.matchResult && (
                                    <span className="text-xs text-muted-foreground truncate block">
                                        Detected: {analysis.matchResult.detectedStyle}
                                    </span>
                                )}
                            </div>
                            {analysis ? (
                                <StyleMatchBadge analysis={analysis} />
                            ) : (
                                <Badge variant="secondary" className="text-xs text-muted-foreground">
                                    Not checked
                                </Badge>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ──────────────────────────────────────────────
// Main Panel — Tabs layout
// ──────────────────────────────────────────────

export function CharacterSheetPanel() {
    const { analyzeCharacterSheet, analyzeAllCharacters, results, hasActiveStyle } = useStyleAnalysis()

    const handleUploaded = useCallback((characterId: string, imageUrl: string) => {
        if (hasActiveStyle) {
            analyzeCharacterSheet(characterId, imageUrl)
        }
    }, [hasActiveStyle, analyzeCharacterSheet])

    return (
        <Card className="border-primary/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Character Sheets
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="attach">
                    <TabsList className="w-full">
                        <TabsTrigger value="attach" className="flex-1 gap-1.5">
                            <ImagePlus className="w-4 h-4" />
                            Attach
                        </TabsTrigger>
                        <TabsTrigger value="generate" className="flex-1 gap-1.5">
                            <Wand2 className="w-4 h-4" />
                            Generate
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="attach" className="mt-4">
                        <AttachTab onUploaded={handleUploaded} />
                    </TabsContent>

                    <TabsContent value="generate" className="mt-4">
                        <CharacterSheetGenerator />
                    </TabsContent>
                </Tabs>

                {/* Style Check — always visible below tabs */}
                <StyleCheckSection
                    analysisResults={results}
                    onAnalyzeAll={analyzeAllCharacters}
                />
            </CardContent>
        </Card>
    )
}
