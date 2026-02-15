'use client'

import { useState } from 'react'
import { Clapperboard, X, Camera, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useStoryboardStore } from '../../store'
import { DIRECTORS } from '@/features/music-lab/data/directors.data'

const BRACKET_LABELS = { close: 'Close', medium: 'Medium', wide: 'Wide' } as const

export function DirectorSelector() {
    const { selectedDirectorId, setSelectedDirector } = useStoryboardStore()
    const [showCameraKit, setShowCameraKit] = useState(false)

    const selectedDirector = DIRECTORS.find(d => d.id === selectedDirectorId)

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clapperboard className="w-4 h-4" />
                    <span className="font-medium">Director Style</span>
                    {!selectedDirectorId && (
                        <span className="text-xs">(optional)</span>
                    )}
                </div>
                {selectedDirectorId && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground"
                        onClick={() => setSelectedDirector(null)}
                    >
                        <X className="w-3 h-3 mr-1" />
                        Clear
                    </Button>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                {DIRECTORS.map(director => {
                    const isSelected = selectedDirectorId === director.id
                    return (
                        <button
                            key={director.id}
                            onClick={() => setSelectedDirector(isSelected ? null : director.id)}
                            className={`flex flex-col items-start gap-1 p-2.5 rounded-lg border text-left transition-all text-sm
                                ${isSelected
                                    ? 'ring-2 ring-primary border-primary bg-primary/5'
                                    : 'hover:border-primary/50 hover:bg-muted/30'
                                }`}
                        >
                            <span className="font-semibold text-sm">{director.name}</span>
                            <span className="text-xs text-muted-foreground line-clamp-1">
                                {director.description.split(' ').slice(0, 6).join(' ')}
                            </span>
                            <div className="flex flex-wrap gap-1">
                                {director.coreIntent.primaryFocus.slice(0, 2).map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs py-0 px-1.5">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Camera Kit - expandable when director selected */}
            {selectedDirector?.cameraRig && (
                <div className="border rounded-lg bg-muted/20">
                    <button
                        className="flex items-center gap-2 w-full p-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowCameraKit(!showCameraKit)}
                    >
                        <Camera className="w-3.5 h-3.5" />
                        <span className="font-medium">{selectedDirector.name}&apos;s Camera Kit</span>
                        <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${showCameraKit ? 'rotate-180' : ''}`} />
                    </button>
                    {showCameraKit && (
                        <div className="px-2 pb-2 space-y-1.5 border-t border-border/50 pt-1.5">
                            {selectedDirector.cameraRig.setups.map(setup => (
                                <div key={setup.shotBracket} className="flex items-start gap-2 text-xs">
                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 flex-shrink-0 min-w-[50px] justify-center">
                                        {BRACKET_LABELS[setup.shotBracket]}
                                    </Badge>
                                    <div className="text-muted-foreground">
                                        <span className="text-foreground font-medium">{setup.cameraBody}</span>
                                        {' + '}
                                        {setup.lens}
                                        {setup.filmStock && <span className="text-muted-foreground/70"> | {setup.filmStock}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
