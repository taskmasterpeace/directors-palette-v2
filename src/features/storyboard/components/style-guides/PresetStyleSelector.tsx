'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import { PRESET_STYLES, type PresetStyleId } from '../../types/storyboard.types'
import { cn } from '@/utils/utils'

interface PresetStyleSelectorProps {
    selectedPresetId: PresetStyleId | null
    onSelect: (presetId: PresetStyleId | null) => void
}

export function PresetStyleSelector({ selectedPresetId, onSelect }: PresetStyleSelectorProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Quick Styles</h3>
                {selectedPresetId && (
                    <button
                        onClick={() => onSelect(null)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Clear selection
                    </button>
                )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PRESET_STYLES.map((style) => {
                    const isSelected = selectedPresetId === style.id

                    return (
                        <Card
                            key={style.id}
                            className={cn(
                                'cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 overflow-hidden',
                                isSelected && 'ring-2 ring-primary bg-primary/5'
                            )}
                            onClick={() => onSelect(isSelected ? null : style.id)}
                        >
                            <div className="relative aspect-video">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={style.imagePath}
                                    alt={style.name}
                                    className="w-full h-full object-cover"
                                />
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
                                    <span className="text-xs font-medium">{style.name}</span>
                                    {isSelected && (
                                        <Badge variant="default" className="text-[10px] px-1 py-0">
                                            Active
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
            {selectedPresetId && (
                <p className="text-xs text-muted-foreground">
                    Style prompt: {PRESET_STYLES.find(s => s.id === selectedPresetId)?.stylePrompt}
                </p>
            )}
        </div>
    )
}
