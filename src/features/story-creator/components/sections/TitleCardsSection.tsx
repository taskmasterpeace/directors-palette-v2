'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
    FileText,
    Plus,
    Sparkles,
    Edit2,
    Trash2,
    Save,
    X,
    AlertCircle,
    CheckCircle2
} from 'lucide-react'
import type { StoryShot } from '../../types/story.types'
import { TitleCardService } from '../../services/title-card.service'

interface TitleCardsSectionProps {
    projectId: string  // Required for proper typing but handled by parent handlers
    storyText: string
    shots: StoryShot[]
    onCreateTitleCard: (title: string, sequenceNumber: number, style: string) => Promise<void>
    onUpdateTitleCard: (shotId: string, title: string, style: string) => Promise<void>
    onDeleteTitleCard: (shotId: string) => Promise<void>
    onGenerateAllTitleCards: (style: string) => Promise<void>
}

interface TitleCardEditing {
    shotId: string
    title: string
    style: string
}

/**
 * Title Cards Section - Manage cinematic title cards for chapters
 * Handles both auto-detected and manually created title cards
 */
export default function TitleCardsSection({
    projectId: _projectId,
    storyText,
    shots,
    onCreateTitleCard,
    onUpdateTitleCard,
    onDeleteTitleCard,
    onGenerateAllTitleCards
}: TitleCardsSectionProps) {
    const [globalStyle, setGlobalStyle] = useState('cinematic title card, elegant typography, dark background with gold text')
    const [isGenerating, setIsGenerating] = useState(false)
    const [showAddCustom, setShowAddCustom] = useState(false)
    const [customTitle, setCustomTitle] = useState('')
    const [customSequence, setCustomSequence] = useState('1')
    const [customStyle, setCustomStyle] = useState('')
    const [editing, setEditing] = useState<TitleCardEditing | null>(null)

    // Get all detected chapters and title card status
    const detectedChapters = TitleCardService.detectChapters(storyText, shots)
    const existingTitleCards = TitleCardService.getTitleCardShots(shots)
    const untitledSuggestions = TitleCardService.suggestTitlesForUntitledChapters(shots)

    const handleGenerateAll = async () => {
        setIsGenerating(true)
        try {
            await onGenerateAllTitleCards(globalStyle)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleAddCustom = async () => {
        if (!customTitle.trim()) return

        const sequence = parseFloat(customSequence)
        if (isNaN(sequence)) {
            alert('Invalid sequence number')
            return
        }

        await onCreateTitleCard(
            customTitle.trim(),
            sequence,
            customStyle.trim() || globalStyle
        )

        // Reset form
        setCustomTitle('')
        setCustomSequence('')
        setCustomStyle('')
        setShowAddCustom(false)
    }

    const handleStartEdit = (shot: StoryShot) => {
        setEditing({
            shotId: shot.id,
            title: shot.metadata.title_card_config?.chapter_name || shot.chapter || '',
            style: shot.metadata.title_card_config?.style_description || ''
        })
    }

    const handleSaveEdit = async () => {
        if (!editing) return
        await onUpdateTitleCard(editing.shotId, editing.title, editing.style)
        setEditing(null)
    }

    const handleCancelEdit = () => {
        setEditing(null)
    }

    const handleDelete = async (shotId: string) => {
        if (confirm('Delete this title card?')) {
            await onDeleteTitleCard(shotId)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-yellow-500" />
                        Title Cards
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                        Add cinematic title cards for chapters and sections
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setShowAddCustom(true)}
                        variant="outline"
                        size="sm"
                        className="border-slate-600 hover:bg-slate-800"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Custom
                    </Button>
                    <Button
                        onClick={handleGenerateAll}
                        disabled={isGenerating || detectedChapters.length === 0}
                        className="bg-yellow-600 hover:bg-yellow-700"
                        size="sm"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate All
                    </Button>
                </div>
            </div>

            {/* Global Style Setting */}
            <Card className="p-4 bg-slate-800 border-slate-700">
                <label className="text-sm font-medium text-slate-300 block mb-2">
                    Default Title Card Style
                </label>
                <Textarea
                    value={globalStyle}
                    onChange={(e) => setGlobalStyle(e.target.value)}
                    placeholder="Describe the visual style for title cards..."
                    className="bg-slate-900 border-slate-600 text-white text-sm"
                    rows={2}
                />
                <p className="text-xs text-slate-500 mt-1">
                    This style will be used for all auto-generated title cards
                </p>
            </Card>

            {/* Add Custom Title Card Form */}
            {showAddCustom && (
                <Card className="p-4 bg-slate-800 border-yellow-600">
                    <h4 className="text-sm font-semibold text-white mb-3">Add Custom Title Card</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Title Text</label>
                            <Input
                                value={customTitle}
                                onChange={(e) => setCustomTitle(e.target.value)}
                                placeholder="e.g., Prologue, The Beginning, Act I"
                                className="bg-slate-900 border-slate-600 text-white"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Sequence Number</label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={customSequence}
                                    onChange={(e) => setCustomSequence(e.target.value)}
                                    placeholder="1"
                                    className="bg-slate-900 border-slate-600 text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Custom Style (optional)</label>
                                <Input
                                    value={customStyle}
                                    onChange={(e) => setCustomStyle(e.target.value)}
                                    placeholder="Override default style"
                                    className="bg-slate-900 border-slate-600 text-white"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <Button
                                onClick={handleAddCustom}
                                size="sm"
                                className="bg-yellow-600 hover:bg-yellow-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Title Card
                            </Button>
                            <Button
                                onClick={() => setShowAddCustom(false)}
                                size="sm"
                                variant="ghost"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Detected Chapters Summary */}
            {detectedChapters.length > 0 && (
                <Card className="p-4 bg-slate-800 border-slate-700">
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-400" />
                        Detected Chapters
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {detectedChapters.map((chapter) => {
                            const hasCard = TitleCardService.hasTitleCard(shots, chapter)
                            const suggestion = untitledSuggestions.get(chapter)

                            return (
                                <div key={chapter} className="flex items-center gap-1">
                                    <Badge
                                        variant="outline"
                                        className={`text-xs ${
                                            hasCard
                                                ? 'bg-green-900/20 border-green-700 text-green-400'
                                                : 'bg-slate-700 border-slate-600 text-slate-300'
                                        }`}
                                    >
                                        {hasCard && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                        {chapter}
                                    </Badge>
                                    {suggestion && (
                                        <span className="text-xs text-slate-500">
                                            → {suggestion}
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        {existingTitleCards.length} of {detectedChapters.length} chapters have title cards
                    </p>
                </Card>
            )}

            {/* Existing Title Cards */}
            <div>
                <h4 className="text-sm font-semibold text-white mb-3">
                    Existing Title Cards ({existingTitleCards.length})
                </h4>
                {existingTitleCards.length === 0 ? (
                    <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No title cards yet</p>
                        <p className="text-sm text-slate-500 mt-1">
                            Click &ldquo;Generate All&rdquo; to create title cards for detected chapters
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {existingTitleCards.map((shot) => {
                            const isEditing = editing?.shotId === shot.id
                            const config = shot.metadata.title_card_config

                            return (
                                <Card key={shot.id} className="p-4 bg-slate-800 border-yellow-600/30">
                                    <div className="flex gap-4">
                                        {/* Sequence Badge */}
                                        <div className="flex-shrink-0">
                                            <div className="w-12 h-12 rounded-lg bg-yellow-900/30 border border-yellow-700 flex items-center justify-center">
                                                <span className="text-xs font-semibold text-yellow-400">
                                                    {shot.sequence_number}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 space-y-2">
                                            {/* Chapter Name */}
                                            {isEditing ? (
                                                <Input
                                                    value={editing.title}
                                                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                                                    className="bg-slate-900 border-slate-600 text-white"
                                                />
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <h5 className="font-semibold text-white">
                                                        {config?.chapter_name || shot.chapter}
                                                    </h5>
                                                    {config?.generated_automatically && (
                                                        <Badge variant="outline" className="text-xs">
                                                            Auto
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}

                                            {/* Style Description */}
                                            {isEditing ? (
                                                <Textarea
                                                    value={editing.style}
                                                    onChange={(e) => setEditing({ ...editing, style: e.target.value })}
                                                    className="bg-slate-900 border-slate-600 text-white text-sm"
                                                    rows={2}
                                                />
                                            ) : (
                                                <p className="text-xs text-slate-400">
                                                    Style: {config?.style_description || 'Default'}
                                                </p>
                                            )}

                                            {/* Prompt Preview */}
                                            <div className="bg-slate-900 p-2 rounded border border-slate-700">
                                                <p className="text-xs text-slate-300">{shot.prompt}</p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex-shrink-0 flex flex-col gap-2">
                                            {isEditing ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        onClick={handleSaveEdit}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        <Save className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={handleCancelEdit}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleStartEdit(shot)}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-red-400 hover:text-red-300"
                                                        onClick={() => handleDelete(shot.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
