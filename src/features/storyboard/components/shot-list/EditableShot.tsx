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
    Pencil,
    Check,
    X,
    Users,
    MapPin,
    CheckCircle,
    Image as ImageIcon,
    Copy,
    MessageSquare,
    Grid3X3,
    Film,
    UserPlus,
    UserMinus
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { HighlightedPrompt } from '../shared'
import type { ShotBreakdownSegment, GeneratedShotPrompt, StoryboardCharacter, StoryboardLocation } from '../../types/storyboard.types'
import { useStoryboardStore } from '../../store'

export interface EditableShotProps {
    segment: ShotBreakdownSegment
    generatedPrompt?: GeneratedShotPrompt
    characters: string[]
    locations: string[]
    shotNote?: string
    hasGeneratedImage?: boolean
    onPromptChange?: (sequence: number, newPrompt: string) => void
    onGeneratedPromptChange?: (sequence: number, newPrompt: string) => void
    onNoteChange?: (sequence: number, note: string) => void
    onCharacterRefsChange?: (sequence: number, characterRefs: StoryboardCharacter[]) => void
    onLocationRefChange?: (sequence: number, locationRef: StoryboardLocation | undefined) => void
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
    hasGeneratedImage,
    onPromptChange,
    onGeneratedPromptChange,
    onNoteChange,
    onCharacterRefsChange,
    onLocationRefChange,
    onGetAngles,
    onGetBRoll,
}: EditableShotProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedPrompt, setEditedPrompt] = useState(generatedPrompt?.prompt || segment.text)
    const [isExpanded, setIsExpanded] = useState(false)
    const [copied, setCopied] = useState(false)

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation()
        const textToCopy = generatedPrompt?.prompt || segment.text
        await navigator.clipboard.writeText(textToCopy)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Get full character and location data from store
    const storeCharacters = useStoryboardStore(s => s.characters)
    const storeLocations = useStoryboardStore(s => s.locations)

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
                                </div>
                            )}
                            <div className="text-sm leading-relaxed line-clamp-2">
                                <HighlightedPrompt text={generatedPrompt ? generatedPrompt.prompt : segment.text} />
                            </div>
                            {/* Quick reference badges with larger character thumbnails */}
                            {(mentionedCharacters.length > 0 || mentionedLocations.length > 0) && (
                                <TooltipProvider>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                        {mentionedCharacters.map(c => {
                                            const thumbnail = getCharThumbnail(c)
                                            return (
                                                <Tooltip key={c}>
                                                    <TooltipTrigger asChild>
                                                        <div className={`flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs font-medium cursor-default ${getRoleBadgeClass(c)}`}>
                                                            {thumbnail ? (
                                                                <img src={thumbnail} alt={c} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                                                            ) : (
                                                                <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                                                    <Users className="w-3 h-3" />
                                                                </span>
                                                            )}
                                                            {c}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" className="p-0 overflow-hidden">
                                                        {thumbnail ? (
                                                            <div className="flex flex-col items-center">
                                                                <img src={thumbnail} alt={c} className="w-32 h-32 object-cover" />
                                                                <span className="text-xs font-medium py-1 px-2">{c}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs px-2 py-1">{c} (no reference image)</span>
                                                        )}
                                                    </TooltipContent>
                                                </Tooltip>
                                            )
                                        })}
                                        {mentionedLocations.map(l => (
                                            <Badge key={l} variant="secondary" className="text-xs py-0.5 px-2">
                                                <MapPin className="w-3 h-3 mr-1" />
                                                {l}
                                            </Badge>
                                        ))}
                                    </div>
                                </TooltipProvider>
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
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setEditedPrompt(generatedPrompt?.prompt || segment.text)
                                                    setIsEditing(true)
                                                }}
                                            >
                                                <Edit2 className="w-3 h-3 mr-1" />
                                                Edit
                                            </Button>
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
                                            {hasGeneratedImage && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-blue-500 hover:text-blue-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onGetAngles?.(segment.sequence)
                                                    }}
                                                >
                                                    <Grid3X3 className="w-3 h-3 mr-1" />
                                                    Angles
                                                </Button>
                                            )}
                                            {hasGeneratedImage && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-amber-500 hover:text-amber-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onGetBRoll?.(segment.sequence)
                                                    }}
                                                >
                                                    <Film className="w-3 h-3 mr-1" />
                                                    B-Roll
                                                </Button>
                                            )}
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
                                    <div
                                        className="group relative p-2 rounded bg-background border text-sm cursor-pointer hover:border-primary/30 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setEditedPrompt(generatedPrompt?.prompt || segment.text)
                                            setIsEditing(true)
                                        }}
                                    >
                                        <HighlightedPrompt text={generatedPrompt?.prompt || segment.text} />
                                        <Pencil className="absolute top-2 right-2 w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors" />
                                    </div>
                                )}
                            </div>

                            {/* Character References (with images if available) + Add/Remove */}
                            {generatedPrompt && (
                                <div>
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        Characters in Shot:
                                    </Label>
                                    <div className="flex gap-2 mt-1 flex-wrap">
                                        {generatedPrompt.characterRefs.map((char: StoryboardCharacter) => (
                                            <div key={char.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/50 border group">
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
                                                {onCharacterRefsChange && (
                                                    <button
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            const updated = generatedPrompt.characterRefs.filter(c => c.id !== char.id)
                                                            onCharacterRefsChange(segment.sequence, updated)
                                                        }}
                                                        title={`Remove ${char.name}`}
                                                    >
                                                        <UserMinus className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {/* Add Character Button - show characters not yet in this shot */}
                                        {onCharacterRefsChange && (() => {
                                            const currentIds = new Set(generatedPrompt.characterRefs.map(c => c.id))
                                            const available = storeCharacters.filter(c => !currentIds.has(c.id))
                                            if (available.length === 0) return null
                                            return (
                                                <div className="relative group/add">
                                                    <button
                                                        className="flex items-center gap-1.5 p-1.5 rounded border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <UserPlus className="w-4 h-4" />
                                                        <span className="text-xs">Add</span>
                                                    </button>
                                                    <div className="absolute z-10 top-full left-0 mt-1 hidden group-hover/add:block bg-popover border rounded-md shadow-md p-1 min-w-[180px]">
                                                        {available.map(char => (
                                                            <button
                                                                key={char.id}
                                                                className="w-full flex items-center gap-2 p-1.5 rounded text-xs hover:bg-muted transition-colors"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    onCharacterRefsChange(segment.sequence, [...generatedPrompt.characterRefs, char])
                                                                }}
                                                            >
                                                                {char.reference_image_url ? (
                                                                    <img src={char.reference_image_url} alt={char.name} className="w-6 h-6 rounded object-cover" />
                                                                ) : (
                                                                    <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                                                                        <Users className="w-3 h-3" />
                                                                    </div>
                                                                )}
                                                                <span className="font-medium">{char.name}</span>
                                                                {char.role && (
                                                                    <Badge variant="secondary" className="text-[10px] py-0 px-1 ml-auto">{char.role}</Badge>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Location Reference + Change/Add */}
                            {generatedPrompt && (
                                <div>
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        Location:
                                    </Label>
                                    <div className="flex gap-2 mt-1 flex-wrap items-center">
                                        {generatedPrompt.locationRef ? (
                                            <div className="flex items-center gap-2 p-1.5 rounded bg-muted/50 border group">
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
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-medium">{generatedPrompt.locationRef.name}</span>
                                                    {generatedPrompt.locationRef.description && (
                                                        <span className="text-[10px] text-muted-foreground line-clamp-1">{generatedPrompt.locationRef.description}</span>
                                                    )}
                                                </div>
                                                {onLocationRefChange && (
                                                    <button
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onLocationRefChange(segment.sequence, undefined)
                                                        }}
                                                        title="Remove location"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ) : null}
                                        {/* Change / Add location */}
                                        {onLocationRefChange && (() => {
                                            const currentLocId = generatedPrompt.locationRef?.id
                                            const available = storeLocations.filter(l => l.id !== currentLocId)
                                            if (available.length === 0 && !generatedPrompt.locationRef) return null
                                            if (available.length === 0) return null
                                            return (
                                                <div className="relative group/loc">
                                                    <button
                                                        className="flex items-center gap-1.5 p-1.5 rounded border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MapPin className="w-4 h-4" />
                                                        <span className="text-xs">{generatedPrompt.locationRef ? 'Change' : 'Set Location'}</span>
                                                    </button>
                                                    <div className="absolute z-10 top-full left-0 mt-1 hidden group-hover/loc:block bg-popover border rounded-md shadow-md p-1 min-w-[220px]">
                                                        {available.map(loc => (
                                                            <button
                                                                key={loc.id}
                                                                className="w-full flex items-center gap-2 p-1.5 rounded text-xs hover:bg-muted transition-colors"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    onLocationRefChange(segment.sequence, loc)
                                                                }}
                                                            >
                                                                {loc.reference_image_url ? (
                                                                    <img src={loc.reference_image_url} alt={loc.name} className="w-6 h-6 rounded object-cover" />
                                                                ) : (
                                                                    <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                                                                        <MapPin className="w-3 h-3" />
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-col items-start">
                                                                    <span className="font-medium">{loc.name}</span>
                                                                    {loc.description && (
                                                                        <span className="text-[10px] text-muted-foreground line-clamp-1">{loc.description}</span>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })()}
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
