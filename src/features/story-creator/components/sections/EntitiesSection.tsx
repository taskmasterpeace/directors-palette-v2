'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { User, MapPin, Image as ImageIcon, Edit2, Check, X } from 'lucide-react'
import type { ExtractedEntity } from '../../types/story.types'
import { ReferencePickerModal } from '../dialogs/ReferencePickerModal'

interface EntitiesSectionProps {
    entities: ExtractedEntity[]
    onUpdateEntity: (tag: string, updates: Partial<ExtractedEntity>) => void
    onContinue: () => void
}

/**
 * Entities Section - Assign references or edit descriptions
 */
export default function EntitiesSection({
    entities,
    onUpdateEntity,
    onContinue
}: EntitiesSectionProps) {
    const [editingTag, setEditingTag] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [referencePickerOpen, setReferencePickerOpen] = useState(false)
    const [selectedEntityTag, setSelectedEntityTag] = useState<string | null>(null)

    const characters = entities.filter(e => e.type === 'character')
    const locations = entities.filter(e => e.type === 'location')

    const handleEdit = (entity: ExtractedEntity) => {
        setEditingTag(entity.tag)
        setEditName(entity.name)
        setEditDescription(entity.description || '')
    }

    const handleSave = () => {
        if (editingTag) {
            onUpdateEntity(editingTag, {
                name: editName,
                description: editDescription
            })
            setEditingTag(null)
        }
    }

    const handleCancel = () => {
        setEditingTag(null)
        setEditName('')
        setEditDescription('')
    }

    const handleAssignReference = (tag: string) => {
        setSelectedEntityTag(tag)
        setReferencePickerOpen(true)
    }

    const handleReferenceSelect = (imageUrl: string) => {
        if (selectedEntityTag) {
            onUpdateEntity(selectedEntityTag, { referenceImageUrl: imageUrl })
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Characters & Locations</h2>
                <p className="text-slate-400">
                    Assign reference images or edit descriptions. References will be used as @tags in prompts.
                </p>
            </div>

            {/* Characters */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-red-500" />
                    <h3 className="text-lg font-semibold text-white">
                        Characters ({characters.length})
                    </h3>
                </div>

                <ScrollArea className="h-[300px] rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                    <div className="space-y-3">
                        {characters.map((char) => (
                            <Card key={char.tag} className="p-4 bg-slate-800 border-slate-700">
                                {editingTag === char.tag ? (
                                    // Edit mode
                                    <div className="space-y-3">
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder="Character name"
                                            className="bg-slate-900 border-slate-700 text-white"
                                        />
                                        <Textarea
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            placeholder="Visual description for image generation"
                                            className="bg-slate-900 border-slate-700 text-white min-h-[80px]"
                                        />
                                        <div className="flex gap-2">
                                            <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                                                <Check className="w-4 h-4 mr-1" />
                                                Save
                                            </Button>
                                            <Button onClick={handleCancel} size="sm" variant="outline" className="border-slate-600">
                                                <X className="w-4 h-4 mr-1" />
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    // View mode
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-white">{char.name}</span>
                                                <code className="text-xs bg-slate-900 px-2 py-0.5 rounded text-slate-400">
                                                    @{char.tag}
                                                </code>
                                            </div>
                                            <p className="text-sm text-slate-400 line-clamp-2">
                                                {char.description || 'No description'}
                                            </p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-xs text-slate-500">In prompts:</span>
                                                {char.referenceImageUrl ? (
                                                    <code className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded border border-green-700">
                                                        @{char.tag}
                                                    </code>
                                                ) : (
                                                    <code className="text-xs bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                                                        {char.description || char.name}
                                                    </code>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => handleAssignReference(char.tag)}
                                                size="sm"
                                                variant="outline"
                                                className="border-slate-600"
                                            >
                                                <ImageIcon className="w-4 h-4 mr-1" />
                                                {char.referenceImageUrl ? 'Change' : 'Assign'} Ref
                                            </Button>
                                            <Button
                                                onClick={() => handleEdit(char)}
                                                size="sm"
                                                variant="outline"
                                                className="border-slate-600"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Locations */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-white">
                        Locations ({locations.length})
                    </h3>
                </div>

                <ScrollArea className="h-[200px] rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                    <div className="space-y-3">
                        {locations.map((loc) => (
                            <Card key={loc.tag} className="p-4 bg-slate-800 border-slate-700">
                                {editingTag === loc.tag ? (
                                    // Edit mode
                                    <div className="space-y-3">
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder="Location name"
                                            className="bg-slate-900 border-slate-700 text-white"
                                        />
                                        <Textarea
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            placeholder="Visual description for image generation"
                                            className="bg-slate-900 border-slate-700 text-white min-h-[60px]"
                                        />
                                        <div className="flex gap-2">
                                            <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                                                <Check className="w-4 h-4 mr-1" />
                                                Save
                                            </Button>
                                            <Button onClick={handleCancel} size="sm" variant="outline" className="border-slate-600">
                                                <X className="w-4 h-4 mr-1" />
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    // View mode
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-white">{loc.name}</span>
                                                <code className="text-xs bg-slate-900 px-2 py-0.5 rounded text-slate-400">
                                                    @{loc.tag}
                                                </code>
                                            </div>
                                            <p className="text-sm text-slate-400 line-clamp-2">
                                                {loc.description || 'No description'}
                                            </p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-xs text-slate-500">In prompts:</span>
                                                {loc.referenceImageUrl ? (
                                                    <code className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-700">
                                                        @{loc.tag}
                                                    </code>
                                                ) : (
                                                    <code className="text-xs bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                                                        {loc.description || loc.name}
                                                    </code>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => handleAssignReference(loc.tag)}
                                                size="sm"
                                                variant="outline"
                                                className="border-slate-600"
                                            >
                                                <ImageIcon className="w-4 h-4 mr-1" />
                                                {loc.referenceImageUrl ? 'Change' : 'Assign'} Ref
                                            </Button>
                                            <Button
                                                onClick={() => handleEdit(loc)}
                                                size="sm"
                                                variant="outline"
                                                className="border-slate-600"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Continue Button */}
            <div className="flex justify-end pt-4 border-t border-slate-700">
                <Button
                    onClick={onContinue}
                    size="lg"
                    className="bg-red-600 hover:bg-red-700"
                >
                    Continue to Shots Review
                </Button>
            </div>

            {/* Reference Picker Modal */}
            {selectedEntityTag && (
                <ReferencePickerModal
                    isOpen={referencePickerOpen}
                    onClose={() => setReferencePickerOpen(false)}
                    onSelect={handleReferenceSelect}
                    entityName={entities.find(e => e.tag === selectedEntityTag)?.name || ''}
                    entityType={
                        (() => {
                            const type = entities.find(e => e.tag === selectedEntityTag)?.type
                            return type === 'prop' ? 'character' : (type || 'character')
                        })()
                    }
                />
            )}
        </div>
    )
}
