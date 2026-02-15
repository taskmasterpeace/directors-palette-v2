'use client'

import { useState } from 'react'
import { Clapperboard, X, Camera, ChevronDown, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useStoryboardStore } from '../../store'
import { DIRECTORS } from '@/features/music-lab/data/directors.data'

const BRACKET_LABELS = { close: 'Close', medium: 'Medium', wide: 'Wide' } as const

export function DirectorSelector() {
    const { selectedDirectorId, setSelectedDirector } = useStoryboardStore()
    const [open, setOpen] = useState(false)

    const selectedDirector = DIRECTORS.find(d => d.id === selectedDirectorId)

    return (
        <div className="flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium text-muted-foreground flex-shrink-0">Director</span>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-sm transition-all ${
                            selectedDirector
                                ? 'border-primary/40 bg-primary/5 text-foreground'
                                : 'border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/30'
                        }`}
                    >
                        {selectedDirector ? (
                            <>
                                <span className="font-medium">{selectedDirector.name}</span>
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                    {selectedDirector.coreIntent.primaryFocus[0]}
                                </Badge>
                            </>
                        ) : (
                            <span className="text-xs">None (optional)</span>
                        )}
                        <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-50" />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-2" align="start">
                    <div className="space-y-1">
                        {/* None option */}
                        <button
                            onClick={() => { setSelectedDirector(null); setOpen(false) }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                !selectedDirectorId ? 'bg-muted font-medium' : 'hover:bg-muted/50'
                            }`}
                        >
                            <span className="text-muted-foreground">No director</span>
                        </button>

                        {DIRECTORS.map(director => {
                            const isSelected = selectedDirectorId === director.id
                            return (
                                <button
                                    key={director.id}
                                    onClick={() => { setSelectedDirector(director.id); setOpen(false) }}
                                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                                        isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-sm">{director.name}</span>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                        {director.description.split(' ').slice(0, 8).join(' ')}
                                    </p>
                                    <div className="flex gap-1 mt-1">
                                        {director.coreIntent.primaryFocus.slice(0, 3).map(tag => (
                                            <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-1">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {/* Camera Kit - shown for selected director */}
                    {selectedDirector?.cameraRig && (
                        <div className="mt-2 pt-2 border-t">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                                <Camera className="w-3 h-3" />
                                <span className="font-medium">{selectedDirector.name}&apos;s Camera Kit</span>
                            </div>
                            <div className="space-y-1">
                                {selectedDirector.cameraRig.setups.map(setup => (
                                    <div key={setup.shotBracket} className="flex items-start gap-2 text-xs">
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 flex-shrink-0 min-w-[44px] justify-center">
                                            {BRACKET_LABELS[setup.shotBracket]}
                                        </Badge>
                                        <span className="text-muted-foreground">
                                            <span className="text-foreground font-medium">{setup.cameraBody}</span>
                                            {' + '}{setup.lens}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </PopoverContent>
            </Popover>

            {/* Clear button */}
            {selectedDirectorId && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedDirector(null)}
                >
                    <X className="w-3.5 h-3.5" />
                </Button>
            )}
        </div>
    )
}
