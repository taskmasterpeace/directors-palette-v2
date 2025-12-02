'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { Play, Edit2, Save, X, Plus, Layers, Sparkles } from 'lucide-react'
import type { StoryShot, ExtractedEntity } from '../../types/story.types'
import {
    hasBracketSyntax,
    getVariationCount,
    getPromptVariations,
    getVariationBadgeText
} from '../../helpers/bracket-prompt.helper'
import { ShotAugmentationModal } from '../ShotAugmentationModal'
import type { GeneratedShot } from '../../services/shot-augmentation.service'

interface ShotsReviewSectionProps {
    shots: StoryShot[]
    entities: ExtractedEntity[]
    onUpdateShot: (shotId: string, updates: { prompt?: string; reference_tags?: string[] }) => void
    onAddShots: (shots: GeneratedShot[]) => void
    onGenerateAll: () => void
    isGenerating: boolean
}

/**
 * Shots Review Section - Review and edit extracted shots
 */
export default function ShotsReviewSection({
    shots,
    entities,
    onUpdateShot,
    onAddShots,
    onGenerateAll,
    isGenerating
}: ShotsReviewSectionProps) {
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editPrompt, setEditPrompt] = useState('')
    const [editTags, setEditTags] = useState<string[]>([])
    const [newTag, setNewTag] = useState('')
    const [showAugmentationModal, setShowAugmentationModal] = useState(false)

    const characters = entities.filter(e => e.type === 'character')
    const locations = entities.filter(e => e.type === 'location')
    const nextSequenceNumber = shots.length > 0 ? Math.max(...shots.map(s => s.sequence_number)) + 1 : 1

    const handleStartEdit = (shot: StoryShot) => {
        setEditingId(shot.id)
        setEditPrompt(shot.prompt)
        setEditTags(shot.reference_tags)
    }

    const handleSaveEdit = (shotId: string) => {
        onUpdateShot(shotId, {
            prompt: editPrompt,
            reference_tags: editTags
        })
        setEditingId(null)
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setEditPrompt('')
        setEditTags([])
    }

    const handleAddTag = () => {
        if (newTag.trim() && !editTags.includes(newTag.trim())) {
            setEditTags([...editTags, newTag.trim()])
            setNewTag('')
        }
    }

    const handleRemoveTag = (tag: string) => {
        setEditTags(editTags.filter(t => t !== tag))
    }

    if (shots.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No shots extracted yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                    Use the Story Input tab to extract shots from your story.
                </p>
            </div>
        )
    }

    // Group shots by chapter
    const shotsByChapter = shots.reduce((acc, shot) => {
        const chapterName = shot.chapter && shot.chapter !== 'null' ? shot.chapter : 'Uncategorized'
        if (!acc[chapterName]) {
            acc[chapterName] = []
        }
        acc[chapterName].push(shot)
        return acc
    }, {} as Record<string, StoryShot[]>)

    // Sort chapters to ensure "Uncategorized" is last
    const sortedChapters = Object.keys(shotsByChapter).sort((a, b) => {
        if (a === 'Uncategorized') return 1
        if (b === 'Uncategorized') return -1
        return a.localeCompare(b)
    })

    // Calculate total images (accounting for bracket variations)
    const totalImages = shots.reduce((total, shot) => {
        return total + getVariationCount(shot.prompt)
    }, 0)
    const hasBracketShots = totalImages > shots.length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">
                            {shots.length} Shot{shots.length !== 1 ? 's' : ''} Extracted
                        </h3>
                        {hasBracketShots && (
                            <Badge
                                variant="outline"
                                className="text-xs bg-orange-900/30 text-orange-400 border-orange-700"
                            >
                                <Layers className="w-3 h-3 mr-1" />
                                {totalImages} images
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {hasBracketShots
                            ? `Review and edit prompts • Bracket syntax will generate ${totalImages} total images`
                            : 'Review and edit prompts before generating'
                        }
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setShowAugmentationModal(true)}
                        disabled={isGenerating || characters.length === 0 || locations.length === 0}
                        variant="outline"
                        className="border-orange-700 text-orange-400 hover:bg-orange-900/20"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Add More Shots
                    </Button>
                    <Button
                        onClick={onGenerateAll}
                        disabled={isGenerating || shots.length === 0}
                        className="bg-primary hover:bg-primary/90"
                    >
                        <Play className="w-4 h-4 mr-2" />
                        Generate All {hasBracketShots && `(${totalImages})`}
                    </Button>
                </div>
            </div>

            {/* Shots Grouped by Chapter */}
            <div className="space-y-8">
                {sortedChapters.map((chapterName) => {
                    const chapterShots = shotsByChapter[chapterName]
                    const chapterTotalImages = chapterShots.reduce((total, shot) => {
                        return total + getVariationCount(shot.prompt)
                    }, 0)
                    const chapterHasBrackets = chapterTotalImages > chapterShots.length

                    return (
                        <div key={chapterName} className="space-y-3">
                            {/* Chapter Header */}
                            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border pb-3 mb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <h4 className="text-xl font-bold text-white">
                                            {chapterName}
                                        </h4>
                                        <Badge
                                            variant="outline"
                                            className="text-xs text-muted-foreground border-border"
                                        >
                                            {chapterShots.length} shot{chapterShots.length !== 1 ? 's' : ''}
                                        </Badge>
                                        {chapterHasBrackets && (
                                            <Badge
                                                variant="outline"
                                                className="text-xs bg-orange-900/30 text-orange-400 border-orange-700"
                                            >
                                                <Layers className="w-3 h-3 mr-1" />
                                                {chapterTotalImages} images
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Chapter Shots */}
                            <div className="space-y-3">
                                {chapterShots.map((shot) => (
                                    <ShotCard
                                        key={shot.id}
                                        shot={shot}
                                        isEditing={editingId === shot.id}
                                        editPrompt={editPrompt}
                                        editTags={editTags}
                                        newTag={newTag}
                                        onStartEdit={handleStartEdit}
                                        onSaveEdit={handleSaveEdit}
                                        onCancelEdit={handleCancelEdit}
                                        onPromptChange={setEditPrompt}
                                        onAddTag={handleAddTag}
                                        onRemoveTag={handleRemoveTag}
                                        onNewTagChange={setNewTag}
                                    />
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Shot Augmentation Modal */}
            <ShotAugmentationModal
                open={showAugmentationModal}
                onOpenChange={setShowAugmentationModal}
                characters={characters}
                locations={locations}
                nextSequenceNumber={nextSequenceNumber}
                currentChapter={shots[0]?.chapter}
                onShotsGenerated={onAddShots}
            />
        </div>
    )
}

interface ShotCardProps {
    shot: StoryShot
    isEditing: boolean
    editPrompt: string
    editTags: string[]
    newTag: string
    onStartEdit: (shot: StoryShot) => void
    onSaveEdit: (shotId: string) => void
    onCancelEdit: () => void
    onPromptChange: (prompt: string) => void
    onAddTag: () => void
    onRemoveTag: (tag: string) => void
    onNewTagChange: (tag: string) => void
}

function ShotCard({
    shot,
    isEditing,
    editPrompt,
    editTags,
    newTag,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onPromptChange,
    onAddTag,
    onRemoveTag,
    onNewTagChange
}: ShotCardProps) {
    const promptToCheck = isEditing ? editPrompt : shot.prompt
    const hasBrackets = hasBracketSyntax(promptToCheck)
    const variationCount = getVariationCount(promptToCheck)
    const variations = hasBrackets ? getPromptVariations(promptToCheck, 5) : []

    return (
        <Card className={`p-4 border-border ${hasBrackets ? 'bg-card border-l-4 border-l-orange-500' : 'bg-card'}`}>
            <div className="flex gap-4">
                {/* Sequence Number */}
                <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasBrackets ? 'bg-orange-900/40 border border-orange-700' : 'bg-secondary'}`}>
                        <span className="text-sm font-semibold text-white">
                            {shot.sequence_number}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2">
                    {/* Prompt */}
                    {isEditing ? (
                        <Textarea
                            value={editPrompt}
                            onChange={(e) => onPromptChange(e.target.value)}
                            className="bg-background border-border text-white text-sm"
                            rows={3}
                        />
                    ) : (
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {shot.prompt.split(/(@\w+)/).map((part, i) =>
                                part.startsWith('@') ? (
                                    <span key={i} className="text-emerald-400 font-semibold">{part}</span>
                                ) : (
                                    part
                                )
                            )}
                        </p>
                    )}

                    {/* Reference Tags & Bracket Indicator */}
                    <div className="flex flex-wrap gap-2 items-center">
                        {(isEditing ? editTags : shot.reference_tags).map((tag) => (
                            <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs bg-primary/20 text-primary border-primary/30"
                            >
                                {tag}
                                {isEditing && (
                                    <button
                                        onClick={() => onRemoveTag(tag)}
                                        className="ml-1 hover:text-primary"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </Badge>
                        ))}
                        {isEditing && (
                            <div className="flex gap-1">
                                <Input
                                    value={newTag}
                                    onChange={(e) => onNewTagChange(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && onAddTag()}
                                    placeholder="@tag"
                                    className="h-6 w-20 text-xs bg-background border-border"
                                />
                                <Button
                                    size="sm"
                                    onClick={onAddTag}
                                    className="h-6 px-2"
                                >
                                    <Plus className="w-3 h-3" />
                                </Button>
                            </div>
                        )}

                        {/* Bracket Variation Badge */}
                        {hasBrackets && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge
                                            variant="outline"
                                            className="text-xs bg-orange-900/30 text-orange-400 border-orange-700 cursor-help"
                                        >
                                            <Layers className="w-3 h-3 mr-1" />
                                            {getVariationBadgeText(promptToCheck)}
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="bottom"
                                        className="bg-card border-border max-w-md"
                                    >
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-orange-400">
                                                Will generate {variationCount} image{variationCount !== 1 ? 's' : ''}:
                                            </p>
                                            <div className="space-y-1">
                                                {variations.map((variation, idx) => (
                                                    <p key={idx} className="text-xs text-foreground leading-relaxed">
                                                        {idx + 1}. {variation}
                                                    </p>
                                                ))}
                                                {variationCount > 5 && (
                                                    <p className="text-xs text-muted-foreground italic">
                                                        + {variationCount - 5} more...
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0">
                    {isEditing ? (
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={() => onSaveEdit(shot.id)}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                <Save className="w-4 h-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onCancelEdit}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onStartEdit(shot)}
                        >
                            <Edit2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    )
}
