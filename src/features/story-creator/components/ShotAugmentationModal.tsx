'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Sparkles, Layers } from 'lucide-react'
import { useState } from 'react'
import { ShotAugmentationService, type GeneratedShot } from '../services/shot-augmentation.service'
import type { ExtractedEntity } from '../types/story.types'

interface ShotAugmentationModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    characters: ExtractedEntity[]
    locations: ExtractedEntity[]
    nextSequenceNumber: number
    currentChapter?: string
    onShotsGenerated: (shots: GeneratedShot[]) => void
}

/**
 * Modal for generating additional shots with bracket syntax
 */
export function ShotAugmentationModal({
    open,
    onOpenChange,
    characters,
    locations,
    nextSequenceNumber,
    currentChapter,
    onShotsGenerated
}: ShotAugmentationModalProps) {
    const [selectedCharacters, setSelectedCharacters] = useState<string[]>([])
    const [selectedLocations, setSelectedLocations] = useState<string[]>([])
    const [selectedShotTypes, setSelectedShotTypes] = useState<Array<'establishing' | 'close-up' | 'action' | 'reaction' | 'dialogue'>>(['establishing', 'close-up', 'action'])
    const [shotCount, setShotCount] = useState(5)
    const [mood, setMood] = useState<'action' | 'dramatic' | 'suspenseful' | 'lighthearted'>('dramatic')

    const shotTypes = ShotAugmentationService.getAvailableShotTypes()

    const handleCharacterToggle = (tag: string) => {
        setSelectedCharacters(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        )
    }

    const handleLocationToggle = (tag: string) => {
        setSelectedLocations(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        )
    }

    const handleShotTypeToggle = (type: typeof selectedShotTypes[0]) => {
        setSelectedShotTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        )
    }

    const handleGenerate = () => {
        const selectedChars = characters.filter(c => selectedCharacters.includes(c.tag))
        const selectedLocs = locations.filter(l => selectedLocations.includes(l.tag))

        const generatedShots = ShotAugmentationService.generateShots(
            {
                characters: selectedChars,
                locations: selectedLocs,
                shotTypes: selectedShotTypes,
                count: shotCount,
                chapter: currentChapter,
                mood
            },
            nextSequenceNumber
        )

        onShotsGenerated(generatedShots)
        onOpenChange(false)

        // Reset selections
        setSelectedCharacters([])
        setSelectedLocations([])
        setSelectedShotTypes(['establishing', 'close-up', 'action'])
        setShotCount(5)
    }

    const estimatedImages = selectedShotTypes.reduce((total, type) => {
        const shotType = shotTypes.find(st => st.type === type)
        return total + (shotType?.variationCount || 1)
    }, 0) * selectedCharacters.length * selectedLocations.length

    const canGenerate = selectedCharacters.length > 0 && selectedLocations.length > 0 && selectedShotTypes.length > 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl bg-background border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-orange-500" />
                        Generate Additional Shots
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Create more shots with bracket variations for bulk image generation
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Characters Selection */}
                    <div>
                        <Label className="text-white text-sm font-medium mb-2 block">
                            Select Characters ({selectedCharacters.length} selected)
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                            {characters.map((char) => (
                                <div
                                    key={char.tag}
                                    className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                        selectedCharacters.includes(char.tag)
                                            ? 'border-emerald-500 bg-green-900/20'
                                            : 'border-border hover:border-border'
                                    }`}
                                    onClick={() => handleCharacterToggle(char.tag)}
                                >
                                    <Checkbox
                                        checked={selectedCharacters.includes(char.tag)}
                                        onCheckedChange={() => handleCharacterToggle(char.tag)}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-white font-medium">{char.name}</div>
                                        <code className="text-xs text-emerald-400">@{char.tag}</code>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Locations Selection */}
                    <div>
                        <Label className="text-white text-sm font-medium mb-2 block">
                            Select Locations ({selectedLocations.length} selected)
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                            {locations.map((loc) => (
                                <div
                                    key={loc.tag}
                                    className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                        selectedLocations.includes(loc.tag)
                                            ? 'border-accent bg-blue-900/20'
                                            : 'border-border hover:border-border'
                                    }`}
                                    onClick={() => handleLocationToggle(loc.tag)}
                                >
                                    <Checkbox
                                        checked={selectedLocations.includes(loc.tag)}
                                        onCheckedChange={() => handleLocationToggle(loc.tag)}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-white font-medium">{loc.name}</div>
                                        <code className="text-xs text-accent">@{loc.tag}</code>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shot Types Selection */}
                    <div>
                        <Label className="text-white text-sm font-medium mb-2 block">
                            Shot Types ({selectedShotTypes.length} selected)
                        </Label>
                        <div className="space-y-2">
                            {shotTypes.map((st) => (
                                <div
                                    key={st.type}
                                    className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                        selectedShotTypes.includes(st.type)
                                            ? 'border-orange-500 bg-orange-900/20'
                                            : 'border-border hover:border-border'
                                    }`}
                                    onClick={() => handleShotTypeToggle(st.type)}
                                >
                                    <div className="flex items-center space-x-3">
                                        <Checkbox
                                            checked={selectedShotTypes.includes(st.type)}
                                            onCheckedChange={() => handleShotTypeToggle(st.type)}
                                        />
                                        <div>
                                            <div className="text-sm text-white font-medium capitalize">{st.type}</div>
                                            <div className="text-xs text-muted-foreground">{st.description}</div>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                        <Layers className="w-3 h-3 mr-1" />
                                        {st.variationCount} variations
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shot Count Slider */}
                    <div>
                        <Label className="text-white text-sm font-medium mb-2 block">
                            Number of Shots: {shotCount}
                        </Label>
                        <Slider
                            value={[shotCount]}
                            onValueChange={([value]) => setShotCount(value)}
                            min={1}
                            max={20}
                            step={1}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>1 shot</span>
                            <span>20 shots</span>
                        </div>
                    </div>

                    {/* Mood Selection */}
                    <div>
                        <Label className="text-white text-sm font-medium mb-2 block">
                            Mood
                        </Label>
                        <div className="grid grid-cols-4 gap-2">
                            {(['action', 'dramatic', 'suspenseful', 'lighthearted'] as const).map((m) => (
                                <Button
                                    key={m}
                                    variant={mood === m ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setMood(m)}
                                    className={mood === m ? 'bg-primary' : ''}
                                >
                                    {m}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Estimated Output */}
                    {canGenerate && (
                        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-blue-300 font-medium">Estimated Output</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {shotCount} shots with bracket variations
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-blue-300">{estimatedImages}</div>
                                    <div className="text-xs text-muted-foreground">total images</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex justify-between gap-3">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={!canGenerate}
                        className="bg-primary hover:bg-primary/90"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Generate {shotCount} Shots
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
