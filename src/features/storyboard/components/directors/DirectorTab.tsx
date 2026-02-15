'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Clapperboard,
    Camera,
    Check,
    Sparkles,
    Video,
    Eye,
    Zap,
} from 'lucide-react'
import { useStoryboardStore } from '../../store'
import { DIRECTORS } from '@/features/music-lab/data/directors.data'
import { StoryDirectorService } from '../../services/story-director.service'
import { DirectorProposalDialog } from '../DirectorProposalDialog'
import type { DirectorPitch } from '../../types/storyboard.types'
import type { DirectorFingerprint } from '@/features/music-lab/types/director.types'

const BRACKET_LABELS: Record<string, string> = { close: 'Close', medium: 'Medium', wide: 'Wide' }

function getTemperatureLabel(temp: string) {
    switch (temp) {
        case 'warm': return 'Warm'
        case 'cool': return 'Cool'
        case 'neutral': return 'Neutral'
        case 'warm_but_distant': return 'Warm/Distant'
        case 'electric': return 'Electric'
        default: return temp
    }
}

export function DirectorTab() {
    const {
        selectedDirectorId,
        setSelectedDirector,
        generatedPrompts,
        promptsGenerated,
        setGeneratedPrompts,
    } = useStoryboardStore()

    const [pitchOpen, setPitchOpen] = useState(false)
    const [currentPitch, setCurrentPitch] = useState<DirectorPitch | null>(null)
    const [pitchDirector, setPitchDirector] = useState<DirectorFingerprint | null>(null)

    const selectedDirector = DIRECTORS.find(d => d.id === selectedDirectorId)

    const handleSelectDirector = (directorId: string) => {
        if (selectedDirectorId === directorId) {
            setSelectedDirector(null)
        } else {
            setSelectedDirector(directorId)
        }
    }

    const handleGeneratePitch = (director: DirectorFingerprint) => {
        if (!generatedPrompts.length) return

        const pitch = StoryDirectorService.generateDirectorPitch(generatedPrompts, director)
        setCurrentPitch(pitch)
        setPitchDirector(director)
        setPitchOpen(true)
    }

    const handleGreenlightPitch = () => {
        if (!pitchDirector) return

        const enhanced = StoryDirectorService.enhanceGeneratedPrompts(generatedPrompts, pitchDirector)
        setGeneratedPrompts(enhanced)
        setSelectedDirector(pitchDirector.id)
        setPitchOpen(false)
        setPitchDirector(null)
        setCurrentPitch(null)
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Clapperboard className="w-5 h-5" />
                        AI Directors
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Each director applies a unique visual fingerprint to your shots.
                    </p>
                </div>
                {selectedDirector && (
                    <Badge className="bg-primary/10 text-primary border-primary/30">
                        <Check className="w-3 h-3 mr-1" />
                        {selectedDirector.name} selected
                    </Badge>
                )}
            </div>

            {/* Director Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {DIRECTORS.map(director => {
                    const isSelected = selectedDirectorId === director.id
                    return (
                        <Card
                            key={director.id}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                                isSelected
                                    ? 'ring-2 ring-primary border-primary bg-primary/5'
                                    : 'hover:border-primary/40'
                            }`}
                            onClick={() => handleSelectDirector(director.id)}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        {director.name}
                                    </span>
                                    {isSelected && (
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white">
                                            <Check className="w-3.5 h-3.5" />
                                        </span>
                                    )}
                                </CardTitle>
                                <CardDescription className="text-xs line-clamp-2">
                                    {director.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {/* Core focus tags */}
                                <div className="flex flex-wrap gap-1">
                                    {director.coreIntent.primaryFocus.slice(0, 3).map(tag => (
                                        <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-1.5">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>

                                {/* Visual signature summary */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Eye className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{director.cameraPhilosophy.distanceBias || 'Varied'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Zap className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{getTemperatureLabel(director.coreIntent.emotionalTemperature)}</span>
                                    </div>
                                </div>

                                {/* Camera kit preview */}
                                {director.cameraRig && (
                                    <div className="pt-2 border-t">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                                            <Camera className="w-3 h-3" />
                                            <span className="font-medium">Camera Kit</span>
                                        </div>
                                        <div className="space-y-0.5">
                                            {director.cameraRig.setups.map(setup => (
                                                <div key={setup.shotBracket} className="flex items-start gap-2 text-[11px]">
                                                    <Badge variant="outline" className="text-[9px] py-0 px-1 flex-shrink-0 min-w-[38px] justify-center">
                                                        {BRACKET_LABELS[setup.shotBracket] || setup.shotBracket}
                                                    </Badge>
                                                    <span className="text-muted-foreground truncate">
                                                        {setup.cameraBody} + {setup.lens}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div className="flex gap-2 pt-1">
                                    {promptsGenerated && generatedPrompts.length > 0 && (
                                        <Button
                                            size="sm"
                                            variant={isSelected ? 'default' : 'outline'}
                                            className="flex-1 text-xs h-7"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleGeneratePitch(director)
                                            }}
                                        >
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            {isSelected ? 'View Pitch' : 'Preview Pitch'}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Selected director detail */}
            {selectedDirector && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Video className="w-4 h-4" />
                            {selectedDirector.name}&apos;s Approach
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            {/* Framing */}
                            <div className="p-2.5 rounded-lg bg-background/80 border">
                                <div className="text-xs font-medium text-muted-foreground mb-1">Framing</div>
                                <div className="flex flex-wrap gap-1">
                                    {selectedDirector.cameraPhilosophy.framingInstinct.map(f => (
                                        <Badge key={f} variant="outline" className="text-xs py-0">
                                            {f}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            {/* Emotions */}
                            <div className="p-2.5 rounded-lg bg-background/80 border">
                                <div className="text-xs font-medium text-muted-foreground mb-1">Emotions</div>
                                <div className="flex flex-wrap gap-1">
                                    {selectedDirector.emotionalLanguage.preferredEmotionalStates.slice(0, 4).map(e => (
                                        <Badge key={e} variant="outline" className="text-xs py-0">
                                            {e}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            {/* Pacing */}
                            <div className="p-2.5 rounded-lg bg-background/80 border">
                                <div className="text-xs font-medium text-muted-foreground mb-1">Pacing</div>
                                <span className="text-sm capitalize">
                                    {selectedDirector.rhythmAndPacing?.baselinePacing || 'Measured'}
                                </span>
                                <span className="text-xs text-muted-foreground ml-1.5">
                                    / {selectedDirector.cameraPhilosophy.stillnessVsMovement?.replace('-', ' ') || 'balanced'}
                                </span>
                            </div>
                        </div>

                        {/* Full camera kit with translations */}
                        {selectedDirector.cameraRig && (
                            <div className="p-3 rounded-lg bg-background/80 border">
                                <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                                    <Camera className="w-3.5 h-3.5" />
                                    Full Camera Kit
                                </div>
                                <ScrollArea className="max-h-[160px]">
                                    <div className="space-y-2">
                                        {selectedDirector.cameraRig.setups.map(setup => (
                                            <div key={setup.shotBracket} className="flex items-start gap-3 text-sm">
                                                <Badge variant="outline" className="text-xs py-0 px-2 flex-shrink-0 min-w-[50px] justify-center font-medium">
                                                    {BRACKET_LABELS[setup.shotBracket] || setup.shotBracket}
                                                </Badge>
                                                <div>
                                                    <div className="font-medium text-xs">
                                                        {setup.cameraBody} + {setup.lens}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {setup.perspectiveTranslation}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}

                        {/* Commission / Greenlight */}
                        {promptsGenerated && generatedPrompts.length > 0 && (
                            <Button
                                className="w-full"
                                onClick={() => handleGeneratePitch(selectedDirector)}
                            >
                                <Clapperboard className="w-4 h-4 mr-2" />
                                Commission {selectedDirector.name}
                            </Button>
                        )}

                        {!promptsGenerated && (
                            <p className="text-xs text-muted-foreground italic text-center py-2">
                                Generate shot prompts first (in the Shots tab) to commission a director.
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Director Proposal Dialog (pitch review) */}
            <DirectorProposalDialog
                open={pitchOpen}
                onOpenChange={setPitchOpen}
                pitch={currentPitch}
                director={pitchDirector}
                onConfirm={handleGreenlightPitch}
            />
        </div>
    )
}
