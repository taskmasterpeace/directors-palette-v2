'use client'

/**
 * Section Confirmation Component
 * 
 * Shows detected song sections for user confirmation/editing.
 */

import { useState } from 'react'
import { Layers, Edit2, Check, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useMusicLabStore } from '../store/music-lab.store'
import type { SongSection, SongSectionType } from '../types/music-lab.types'

const SECTION_COLORS: Record<SongSectionType, string> = {
    'intro': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    'verse': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    'pre-chorus': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
    'chorus': 'bg-green-500/20 text-green-400 border-green-500/50',
    'post-chorus': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
    'bridge': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    'breakdown': 'bg-red-500/20 text-red-400 border-red-500/50',
    'outro': 'bg-gray-500/20 text-gray-400 border-gray-500/50'
}

const SECTION_TYPES: SongSectionType[] = [
    'intro', 'verse', 'pre-chorus', 'chorus', 'post-chorus', 'bridge', 'breakdown', 'outro'
]

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface EditableSectionProps {
    section: SongSection
    onUpdate: (updated: SongSection) => void
}

function EditableSection({ section, onUpdate }: EditableSectionProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedName, setEditedName] = useState(section.customName || '')

    const handleSave = () => {
        onUpdate({
            ...section,
            customName: editedName || undefined
        })
        setIsEditing(false)
    }

    return (
        <div className={`p-3 rounded-lg border ${SECTION_COLORS[section.type]}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Select
                        value={section.type}
                        onValueChange={(value: SongSectionType) => onUpdate({ ...section, type: value })}
                    >
                        <SelectTrigger className="w-[130px] h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SECTION_TYPES.map(type => (
                                <SelectItem key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <Input
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                placeholder="Custom name..."
                                className="h-8 w-[140px]"
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave}>
                                <Check className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-1 text-sm opacity-75 hover:opacity-100"
                        >
                            {section.customName || 'Add name'}
                            <Edit2 className="w-3 h-3" />
                        </button>
                    )}
                </div>

                <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTime(section.startTime)} - {formatTime(section.endTime)}
                </Badge>
            </div>

            <p className="text-sm opacity-80 line-clamp-2">
                {section.lyrics || 'No lyrics in this section'}
            </p>
        </div>
    )
}

interface SectionConfirmationProps {
    onConfirm?: () => void
}

export function SectionConfirmation({ onConfirm }: SectionConfirmationProps) {
    const { project, confirmSections } = useMusicLabStore()
    const sections = project.songAnalysis?.confirmedSections || []

    const [localSections, setLocalSections] = useState<SongSection[]>(sections)

    const handleUpdateSection = (index: number, updated: SongSection) => {
        const newSections = [...localSections]
        newSections[index] = updated
        setLocalSections(newSections)
    }

    const handleConfirm = () => {
        confirmSections(localSections)
        onConfirm?.()
    }

    if (sections.length === 0) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No sections detected yet</p>
                    <p className="text-sm">Upload audio to analyze song structure</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Layers className="w-5 h-5" />
                    Song Sections
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Review and edit detected sections. Add custom names for clarity.
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                {localSections.map((section, index) => (
                    <EditableSection
                        key={section.id}
                        section={section}
                        onUpdate={(updated) => handleUpdateSection(index, updated)}
                    />
                ))}

                <Button onClick={handleConfirm} className="w-full mt-4">
                    <Check className="w-4 h-4 mr-2" />
                    Confirm Sections
                </Button>
            </CardContent>
        </Card>
    )
}
