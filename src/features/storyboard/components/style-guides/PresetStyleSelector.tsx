'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Plus, X, RotateCcw } from 'lucide-react'
import { PRESET_STYLES, type PresetStyleId } from '../../types/storyboard.types'
import { useCustomStylesStore, type CustomStyle } from '@/features/shot-creator/store/custom-styles.store'
import { AddCustomStyleModal } from './AddCustomStyleModal'
import { cn } from '@/utils/utils'

interface PresetStyleSelectorProps {
    selectedPresetId: string | null
    onSelect: (presetId: string | null) => void
}

export function PresetStyleSelector({ selectedPresetId, onSelect }: PresetStyleSelectorProps) {
    const [addModalOpen, setAddModalOpen] = useState(false)

    const {
        getAllStyles,
        hidePresetStyle,
        deleteCustomStyle,
        hiddenPresetIds,
        resetToDefaults
    } = useCustomStylesStore()

    const allStyles = getAllStyles()
    const hasHiddenPresets = hiddenPresetIds.length > 0

    const handleDelete = (e: React.MouseEvent, styleId: string, isCustom: boolean) => {
        e.stopPropagation() // Prevent card selection

        // If currently selected, deselect first
        if (selectedPresetId === styleId) {
            onSelect(null)
        }

        if (isCustom) {
            deleteCustomStyle(styleId)
        } else {
            hidePresetStyle(styleId as PresetStyleId)
        }
    }

    const handleResetToDefaults = () => {
        onSelect(null) // Deselect current style
        resetToDefaults()
    }

    const handleStyleAdded = (styleId: string) => {
        onSelect(styleId) // Auto-select newly added style
    }

    const isCustomStyle = (style: typeof allStyles[0]): style is CustomStyle => {
        return 'isCustom' in style && style.isCustom === true
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Quick Styles</h3>
                <div className="flex items-center gap-2">
                    {hasHiddenPresets && (
                        <button
                            onClick={handleResetToDefaults}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset to defaults
                        </button>
                    )}
                    {selectedPresetId && (
                        <button
                            onClick={() => onSelect(null)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Clear selection
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {allStyles.map((style) => {
                    const isSelected = selectedPresetId === style.id
                    const isCustom = isCustomStyle(style)

                    return (
                        <Card
                            key={style.id}
                            className={cn(
                                'cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 overflow-hidden relative group',
                                isSelected && 'ring-2 ring-primary bg-primary/5'
                            )}
                            onClick={() => onSelect(isSelected ? null : style.id)}
                        >
                            {/* Delete button */}
                            <button
                                className="absolute top-1 right-1 z-10 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                onClick={(e) => handleDelete(e, style.id, isCustom)}
                                title={isCustom ? 'Delete style' : 'Hide style'}
                            >
                                <X className="w-3 h-3" />
                            </button>

                            <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
                                {/* Fallback letter - always rendered, hidden by image when loaded */}
                                <span className="text-xs text-muted-foreground/50 absolute">{style.name[0]}</span>
                                {style.imagePath && (
                                    <img
                                        src={style.imagePath}
                                        alt={style.name}
                                        className="w-full h-full object-cover relative z-10"
                                        onError={(e) => {
                                            // Hide broken image to show fallback letter
                                            e.currentTarget.style.display = 'none'
                                        }}
                                    />
                                )}
                                {isSelected && (
                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                                            <Check className="w-4 h-4" />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <CardContent className="p-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium truncate">{style.name}</span>
                                    <div className="flex items-center gap-1">
                                        {isCustom && (
                                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                                Custom
                                            </Badge>
                                        )}
                                        {isSelected && (
                                            <Badge variant="default" className="text-[10px] px-1 py-0">
                                                Active
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}

                {/* Add New Style Card */}
                <Card
                    className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 overflow-hidden border-dashed"
                    onClick={() => setAddModalOpen(true)}
                >
                    <div className="aspect-video bg-muted/50 flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                            <Plus className="w-8 h-8 mx-auto mb-1" />
                            <span className="text-xs">Add Style</span>
                        </div>
                    </div>
                    <CardContent className="p-2">
                        <span className="text-xs font-medium text-muted-foreground">Custom Style</span>
                    </CardContent>
                </Card>
            </div>

            {selectedPresetId && (
                <p className="text-xs text-muted-foreground">
                    Style prompt: {
                        allStyles.find(s => s.id === selectedPresetId)?.stylePrompt ||
                        PRESET_STYLES.find(s => s.id === selectedPresetId)?.stylePrompt
                    }
                </p>
            )}

            <AddCustomStyleModal
                open={addModalOpen}
                onOpenChange={setAddModalOpen}
                onStyleAdded={handleStyleAdded}
            />
        </div>
    )
}
