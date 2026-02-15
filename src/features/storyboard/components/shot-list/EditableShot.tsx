'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
    ChevronDown,
    ChevronUp,
    Edit2,
    Check,
    X,
    Users,
    MapPin,
    CheckCircle,
    Image as ImageIcon,
    Copy,
    MessageSquare,
    Star,
    FlaskConical,
    Grid3X3,
    Film
} from 'lucide-react'
import { HighlightedPrompt } from '../shared'
import type { ShotBreakdownSegment, GeneratedShotPrompt, StoryboardCharacter, ShotMetadata } from '../../types/storyboard.types'
import { useStoryboardStore } from '../../store'

export interface EditableShotProps {
    segment: ShotBreakdownSegment
    generatedPrompt?: GeneratedShotPrompt
    characters: string[]
    locations: string[]
    shotNote?: string
    onPromptChange?: (sequence: number, newPrompt: string) => void
    onGeneratedPromptChange?: (sequence: number, newPrompt: string) => void
    onNoteChange?: (sequence: number, note: string) => void
    onMetadataChange?: (sequence: number, metadata: Partial<ShotMetadata>) => void
    onRefine?: (sequence: number) => void
    onGetAngles?: (sequence: number) => void
    onGetBRoll?: (sequence: number) => void
}

function getShotTypeColor(type: string) {
    switch (type) {
        case 'establishing': return 'bg-purple-500/20 text-purple-500 border-purple-500/30'
        case 'wide': return 'bg-blue-500/20 text-blue-500 border-blue-500/30'
        case 'medium': return 'bg-green-500/20 text-green-500 border-green-500/30'
        case 'close-up': return 'bg-amber-500/20 text-amber-500 border-amber-500/30'
        case 'detail': return 'bg-red-500/20 text-red-500 border-red-500/30'
        default: return 'bg-muted text-muted-foreground'
    }
}

export function EditableShot({
    segment,
    generatedPrompt,
    characters,
    locations,
    shotNote,
    onPromptChange,
    onGeneratedPromptChange,
    onNoteChange,
    onMetadataChange,
    onRefine,
    onGetAngles,
    onGetBRoll
}: EditableShotProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedPrompt, setEditedPrompt] = useState(generatedPrompt?.prompt || segment.text)
    const [isExpanded, setIsExpanded] = useState(false)
    const [copied, setCopied] = useState(false)
    const [hoveredRating, setHoveredRating] = useState(0)

    const isGreenlit = generatedPrompt?.metadata?.isGreenlit
    const rating = generatedPrompt?.metadata?.rating || 0

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation()
        const textToCopy = generatedPrompt?.prompt || segment.text
        await navigator.clipboard.writeText(textToCopy)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Get full character data from store for thumbnails and role colors
    const storeCharacters = useStoryboardStore(s => s.characters)

    // Find mentioned characters and locations in original text
    const mentionedCharacters = characters.filter(c =>
        segment.text.toLowerCase().includes(c.toLowerCase())
    )
    const mentionedLocations = locations.filter(l =>
        segment.text.toLowerCase().includes(l.toLowerCase())
    )

    // Get role-based badge color
    const getRoleBadgeClass = (charName: string) => {
        const char = storeCharacters.find(c => c.name.toLowerCase() === charName.toLowerCase())
        switch (char?.role) {
            case 'main': return 'border-amber-500/50 bg-amber-500/10 text-amber-600'
            case 'supporting': return 'border-blue-500/50 bg-blue-500/10 text-blue-600'
            case 'background': return 'border-zinc-500/50 bg-zinc-500/10 text-zinc-500'
            default: return ''
        }
    }

    // Get character reference thumbnail URL
    const getCharThumbnail = (charName: string) => {
        const char = storeCharacters.find(c => c.name.toLowerCase() === charName.toLowerCase())
        return char?.reference_image_url || null
    }

    const handleSave = () => {
        if (generatedPrompt) {
            onGeneratedPromptChange?.(segment.sequence, editedPrompt)
        } else {
            onPromptChange?.(segment.sequence, editedPrompt)
        }
        setIsEditing(false)
    }

    const handleCancel = () => {
        setEditedPrompt(generatedPrompt?.prompt || segment.text)
        setIsEditing(false)
    }

    return (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <div className="rounded-lg border bg-card/50 hover:bg-card/80 transition-colors overflow-hidden">
                {/* Header Row - Always visible */}
                <CollapsibleTrigger asChild>
                    <div className="flex gap-3 p-3 cursor-pointer">
                        <div
                            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md"
                            style={{ backgroundColor: segment.color }}
                        >
                            {segment.sequence}
                        </div>
                        <div className="flex-1 min-w-0">
                            {/* Shot type badge if generated */}
                            {generatedPrompt && (
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className={`text-xs py-0 ${getShotTypeColor(generatedPrompt.shotType)}`}>
                                        {generatedPrompt.shotType}
                                    </Badge>
                                    {generatedPrompt.edited && (
                                        <Badge variant="secondary" className="text-xs py-0">
                                            edited
                                        </Badge>
                                    )}
                                    {isGreenlit && (
                                        <Badge variant="default" className="text-xs py-0 bg-green-500 hover:bg-green-600 border-none shadow-none">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Greenlit
                                        </Badge>
                                    )}
                                </div>
                            )}
                            <div className="text-sm leading-relaxed line-clamp-2">
                                <HighlightedPrompt text={generatedPrompt ? generatedPrompt.prompt : segment.text} />
                            </div>
                            {/* Quick reference badges */}
                            {(mentionedCharacters.length > 0 || mentionedLocations.length > 0) && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {mentionedCharacters.map(c => {
                                        const thumbnail = getCharThumbnail(c)
                                        return (
                                            <Badge key={c} variant="outline" className={`text-sm py-0.5 px-2 ${getRoleBadgeClass(c)}`}>
                                                {thumbnail ? (
                                                    <img src={thumbnail} alt={c} className="w-4 h-4 rounded-full object-cover mr-1.5 inline-block" />
                                                ) : (
                                                    <Users className="w-3.5 h-3.5 mr-1.5" />
                                                )}
                                                {c}
                                            </Badge>
                                        )
                                    })}
                                    {mentionedLocations.map(l => (
                                        <Badge key={l} variant="secondary" className="text-sm py-0.5 px-2">
                                            <MapPin className="w-3.5 h-3.5 mr-1.5" />
                                            {l}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex-shrink-0">
                            {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                        </div>
                    </div>
                </CollapsibleTrigger>

                {/* Expanded Content */}
                <CollapsibleContent>
                    <div className="px-3 pb-3 border-t bg-muted/20">
                        <div className="pt-3 space-y-3">
                            {/* Original Story Text */}
                            <div>
                                <Label className="text-xs text-muted-foreground">From Story:</Label>
                                <div className="mt-1 p-2 rounded bg-muted/30 text-sm italic border border-dashed">
                                    &ldquo;{segment.text}&rdquo;
                                </div>
                            </div>

                            {/* Director's Notes - Guidance for AI */}
                            {!generatedPrompt && onNoteChange && (
                                <div>
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" />
                                        Director&apos;s Notes (optional guidance for AI):
                                    </Label>
                                    <Input
                                        className="mt-1 h-8 text-xs"
                                        placeholder="e.g., looking out over a city skyline at sunset..."
                                        value={shotNote || ''}
                                        onChange={(e) => {
                                            e.stopPropagation()
                                            onNoteChange(segment.sequence, e.target.value)
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    {shotNote && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            This note will guide the AI when generating the shot prompt
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Show notes if already set and prompt generated */}
                            {generatedPrompt && shotNote && (
                                <div>
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" />
                                        Director&apos;s Notes Used:
                                    </Label>
                                    <div className="mt-1 p-2 rounded bg-amber-500/10 text-xs border border-amber-500/20">
                                        {shotNote}
                                    </div>
                                </div>
                            )}

                            {/* Rating & Greenlight (Director Mode) */}
                            {generatedPrompt && (
                                <div className="p-3 bg-muted/20 border rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <Label className="text-xs text-muted-foreground mb-1">Director Rating</Label>
                                            <div className="flex gap-0.5" onMouseLeave={() => setHoveredRating(0)}>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        className="focus:outline-none transition-transform hover:scale-110 p-1 -m-1"
                                                        onMouseEnter={() => setHoveredRating(star)}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onMetadataChange?.(segment.sequence, { ...generatedPrompt.metadata, rating: star })
                                                        }}
                                                    >
                                                        <Star
                                                            className={`w-4 h-4 ${(hoveredRating || rating || 0) >= star
                                                                ? "fill-primary text-primary"
                                                                : "fill-muted text-muted-foreground/30"
                                                                }`}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                                        <Button
                                            size="sm"
                                            className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onRefine?.(segment.sequence)
                                            }}
                                        >
                                            <FlaskConical className="w-4 h-4 mr-2" />
                                            Shot Lab
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 sm:flex-none border-blue-500/20 text-blue-500 hover:bg-blue-500/10"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onGetAngles?.(segment.sequence)
                                            }}
                                        >
                                            <Grid3X3 className="w-4 h-4 mr-2" />
                                            Angles
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 sm:flex-none border-amber-500/20 text-amber-500 hover:bg-amber-500/10"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onGetBRoll?.(segment.sequence)
                                            }}
                                        >
                                            <Film className="w-4 h-4 mr-2" />
                                            B-Roll
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={isGreenlit ? "default" : "outline"}
                                            className={`flex-1 sm:flex-none ${isGreenlit ? "bg-green-500 hover:bg-green-600" : ""}`}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onMetadataChange?.(segment.sequence, { ...generatedPrompt.metadata, isGreenlit: !isGreenlit })
                                            }}
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            {isGreenlit ? "Greenlit" : "Greenlight"}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Generated/Edited Prompt */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">
                                        {generatedPrompt ? 'Shot Prompt:' : 'Raw Text (no AI prompt yet):'}
                                    </Label>
                                    {!isEditing && (
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2"
                                                onClick={handleCopy}
                                            >
                                                {copied ? (
                                                    <>
                                                        <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                                                        Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3 h-3 mr-1" />
                                                        Copy
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setEditedPrompt(generatedPrompt?.prompt || segment.text)
                                                    setIsEditing(true)
                                                }}
                                            >
                                                <Edit2 className="w-3 h-3 mr-1" />
                                                Edit
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {isEditing ? (
                                    <div className="space-y-2">
                                        <Textarea
                                            value={editedPrompt}
                                            onChange={(e) => setEditedPrompt(e.target.value)}
                                            className="min-h-[100px] text-sm"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleCancel()
                                                }}
                                            >
                                                <X className="w-3 h-3 mr-1" />
                                                Cancel
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleSave()
                                                }}
                                            >
                                                <Check className="w-3 h-3 mr-1" />
                                                Save
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-2 rounded bg-background border text-sm">
                                        <HighlightedPrompt text={generatedPrompt?.prompt || segment.text} />
                                    </div>
                                )}
                            </div>

                            {/* Character References (with images if available) */}
                            {generatedPrompt?.characterRefs && generatedPrompt.characterRefs.length > 0 && (
                                <div>
                                    <Label className="text-xs text-muted-foreground">Character References:</Label>
                                    <div className="flex gap-2 mt-1 flex-wrap">
                                        {generatedPrompt.characterRefs.map((char: StoryboardCharacter) => (
                                            <div key={char.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/50 border">
                                                {char.reference_image_url ? (
                                                    <img
                                                        src={char.reference_image_url}
                                                        alt={char.name}
                                                        className="w-8 h-8 rounded object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <span className="text-xs font-medium">{char.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Location Reference */}
                            {generatedPrompt?.locationRef && (
                                <div>
                                    <Label className="text-xs text-muted-foreground">Location Reference:</Label>
                                    <div className="flex items-center gap-2 mt-1 p-1.5 rounded bg-muted/50 border w-fit">
                                        {generatedPrompt.locationRef.reference_image_url ? (
                                            <img
                                                src={generatedPrompt.locationRef.reference_image_url}
                                                alt={generatedPrompt.locationRef.name}
                                                className="w-8 h-8 rounded object-cover"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                        )}
                                        <span className="text-xs font-medium">{generatedPrompt.locationRef.name}</span>
                                    </div>
                                </div>
                            )}

                            {/* Placeholder if no prompts generated yet */}
                            {!generatedPrompt && (
                                <div className="text-xs text-muted-foreground italic p-2 bg-muted/30 rounded border border-dashed">
                                    Click &ldquo;Generate Shot Prompts&rdquo; to transform this text into a cinematic shot description
                                </div>
                            )}
                        </div>
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    )
}
