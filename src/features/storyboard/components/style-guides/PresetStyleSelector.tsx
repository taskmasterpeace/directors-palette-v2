'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Plus, X, RotateCcw, ChevronDown, Camera } from 'lucide-react'
import { PRESET_STYLES, type PresetStyleId, type PresetStyle } from '../../types/storyboard.types'
import { useCustomStylesStore, type CustomStyle } from '@/features/shot-creator/store/custom-styles.store'
import { AddCustomStyleModal } from './AddCustomStyleModal'
import { cn } from '@/utils/utils'

interface PresetStyleSelectorProps {
    selectedPresetId: string | null
    onSelect: (presetId: string | null) => void
}

// Medium category display helpers
const MEDIUM_LABELS: Record<string, string> = {
    'live-action': 'Live Action',
    '2d-animation': '2D',
    '3d-animation': '3D',
    'stop-motion': 'Stop Motion',
    'puppetry': 'Puppetry',
    'mixed-media': 'Mixed',
}

const MEDIUM_COLORS: Record<string, string> = {
    'live-action': 'bg-blue-500/20 text-blue-400',
    '2d-animation': 'bg-orange-500/20 text-orange-400',
    '3d-animation': 'bg-purple-500/20 text-purple-400',
    'stop-motion': 'bg-amber-500/20 text-amber-400',
    'puppetry': 'bg-green-500/20 text-green-400',
    'mixed-media': 'bg-pink-500/20 text-pink-400',
}

export function PresetStyleSelector({ selectedPresetId, onSelect }: PresetStyleSelectorProps) {
    const [addModalOpen, setAddModalOpen] = useState(false)
    const [expandedTechId, setExpandedTechId] = useState<string | null>(null)

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
                                        {/* Medium category badge */}
                                        {!isCustom && (style as PresetStyle).technicalAttributes && (
                                            <span className={`text-[10px] px-1 py-0 rounded ${MEDIUM_COLORS[(style as PresetStyle).technicalAttributes!.medium] || 'bg-muted text-muted-foreground'}`}>
                                                {MEDIUM_LABELS[(style as PresetStyle).technicalAttributes!.medium] || (style as PresetStyle).technicalAttributes!.medium}
                                            </span>
                                        )}
                                        {isCustom && (
                                            <Badge variant="secondary" className="text-xs px-1 py-0">
                                                Custom
                                            </Badge>
                                        )}
                                        {isSelected && (
                                            <Badge variant="default" className="text-xs px-1 py-0">
                                                Active
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                {/* Technical attributes expand toggle */}
                                {!isCustom && (style as PresetStyle).technicalAttributes && isSelected && (
                                    <button
                                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mt-1 w-full"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setExpandedTechId(expandedTechId === style.id ? null : style.id)
                                        }}
                                    >
                                        <Camera className="w-3 h-3" />
                                        Tech Details
                                        <ChevronDown className={`w-3 h-3 transition-transform ${expandedTechId === style.id ? 'rotate-180' : ''}`} />
                                    </button>
                                )}
                            </CardContent>
                            {/* Expanded technical attributes panel */}
                            {expandedTechId === style.id && !isCustom && (style as PresetStyle).technicalAttributes && (
                                <div className="px-2 pb-2 space-y-1 text-[10px] text-muted-foreground border-t border-border/50 pt-1">
                                    <div><span className="font-medium">Camera:</span> {(style as PresetStyle).technicalAttributes!.cameraRenderType}</div>
                                    <div><span className="font-medium">Lens:</span> {(style as PresetStyle).technicalAttributes!.lensPerspective}</div>
                                    <div><span className="font-medium">Stock:</span> {(style as PresetStyle).technicalAttributes!.stockMedium}</div>
                                    <div><span className="font-medium">Color:</span> {(style as PresetStyle).technicalAttributes!.colorPalette}</div>
                                    <div><span className="font-medium">Texture:</span> {(style as PresetStyle).technicalAttributes!.texture}</div>
                                </div>
                            )}
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
