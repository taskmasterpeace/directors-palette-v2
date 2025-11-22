'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Play, Edit2, Save, X, Plus } from 'lucide-react'
import type { StoryShot } from '../../types/story.types'

interface ShotsReviewSectionProps {
    shots: StoryShot[]
    onUpdateShot: (shotId: string, updates: { prompt?: string; reference_tags?: string[] }) => void
    onGenerateAll: () => void
    isGenerating: boolean
}

/**
 * Shots Review Section - Review and edit extracted shots
 */
export default function ShotsReviewSection({
    shots,
    onUpdateShot,
    onGenerateAll,
    isGenerating
}: ShotsReviewSectionProps) {
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editPrompt, setEditPrompt] = useState('')
    const [editTags, setEditTags] = useState<string[]>([])
    const [newTag, setNewTag] = useState('')

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
                <p className="text-slate-400">No shots extracted yet.</p>
                <p className="text-sm text-slate-500 mt-2">
                    Use the Story Input tab to extract shots from your story.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">
                        {shots.length} Shot{shots.length !== 1 ? 's' : ''} Extracted
                    </h3>
                    <p className="text-sm text-slate-400">
                        Review and edit prompts before generating
                    </p>
                </div>
                <Button
                    onClick={onGenerateAll}
                    disabled={isGenerating || shots.length === 0}
                    className="bg-red-600 hover:bg-red-700"
                >
                    <Play className="w-4 h-4 mr-2" />
                    Generate All
                </Button>
            </div>

            {/* Shots Grid */}
            <div className="space-y-3">
                {shots.map((shot) => (
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
    return (
        <Card className="p-4 bg-slate-800 border-slate-700">
            <div className="flex gap-4">
                {/* Sequence Number */}
                <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">
                            {shot.sequence_number}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2">
                    {/* Chapter Badge */}
                    {shot.chapter && shot.chapter !== 'null' && (
                        <Badge variant="outline" className="text-xs text-blue-400 border-blue-600">
                            {shot.chapter}
                        </Badge>
                    )}

                    {/* Prompt */}
                    {isEditing ? (
                        <Textarea
                            value={editPrompt}
                            onChange={(e) => onPromptChange(e.target.value)}
                            className="bg-slate-900 border-slate-600 text-white text-sm"
                            rows={3}
                        />
                    ) : (
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {shot.prompt.split(/(@\w+)/).map((part, i) =>
                                part.startsWith('@') ? (
                                    <span key={i} className="text-green-400 font-semibold">{part}</span>
                                ) : (
                                    part
                                )
                            )}
                        </p>
                    )}

                    {/* Reference Tags */}
                    <div className="flex flex-wrap gap-2">
                        {(isEditing ? editTags : shot.reference_tags).map((tag) => (
                            <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs bg-red-900/30 text-red-400 border-red-800"
                            >
                                {tag}
                                {isEditing && (
                                    <button
                                        onClick={() => onRemoveTag(tag)}
                                        className="ml-1 hover:text-red-300"
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
                                    className="h-6 w-20 text-xs bg-slate-900 border-slate-600"
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
                    </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0">
                    {isEditing ? (
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={() => onSaveEdit(shot.id)}
                                className="bg-green-600 hover:bg-green-700"
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
