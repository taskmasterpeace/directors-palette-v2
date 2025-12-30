'use client'

/**
 * Prompt Expander Button
 *
 * Single tiny button that opens a popover with expansion level and director style options.
 * Expands prompts while preserving the user's original text as the core.
 */

import { useState, useCallback } from 'react'
import { Layers, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import {
    promptExpanderService,
    type ExpansionLevel,
    type DirectorStyle
} from '../../services/prompt-expander.service'

interface PromptExpanderButtonProps {
    prompt: string
    onPromptChange: (newPrompt: string) => void
    disabled?: boolean
}

const DIRECTOR_OPTIONS: { value: DirectorStyle; label: string; hint: string }[] = [
    { value: 'none', label: 'None (generic)', hint: 'Standard cinematography' },
    { value: 'ryan', label: 'Ryan Cooler', hint: 'Intimate, warm' },
    { value: 'clint', label: 'Clint Westwood', hint: 'Minimal, static' },
    { value: 'david', label: 'David Pincher', hint: 'Precise, symmetric' },
    { value: 'wes', label: 'Wes Sanderson', hint: 'Centered, pastel' },
    { value: 'hype', label: 'Hype Millions', hint: 'Extreme, flashy' }
]

export function PromptExpanderButton({
    prompt,
    onPromptChange,
    disabled = false
}: PromptExpanderButtonProps) {
    const { toast } = useToast()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [level, setLevel] = useState<ExpansionLevel>('original')
    const [director, setDirector] = useState<DirectorStyle>('none')
    const [originalPrompt, setOriginalPrompt] = useState<string | null>(null)

    const isActive = level !== 'original'

    const handleLevelChange = useCallback(async (newLevel: ExpansionLevel) => {
        // If switching to original, revert to stored original
        if (newLevel === 'original') {
            if (originalPrompt) {
                onPromptChange(originalPrompt)
            }
            setLevel('original')
            return
        }

        // Store original if not already stored
        if (!originalPrompt) {
            setOriginalPrompt(prompt)
        }

        const basePrompt = originalPrompt || prompt

        // Check cache first for instant switch
        const cached = promptExpanderService.getCachedExpansion(basePrompt, newLevel, director)
        if (cached) {
            onPromptChange(cached)
            setLevel(newLevel)
            return
        }

        // Call API
        setIsLoading(true)
        try {
            const expanded = await promptExpanderService.expand(basePrompt, newLevel, director)
            onPromptChange(expanded)
            setLevel(newLevel)
        } catch (error) {
            toast({
                title: 'Expansion failed',
                description: error instanceof Error ? error.message : 'Please try again',
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }, [prompt, originalPrompt, director, onPromptChange, toast])

    const handleDirectorChange = useCallback(async (newDirector: DirectorStyle) => {
        setDirector(newDirector)

        // If not at original level, re-expand with new director
        if (level !== 'original') {
            const basePrompt = originalPrompt || prompt

            // Check cache first
            const cached = promptExpanderService.getCachedExpansion(basePrompt, level, newDirector)
            if (cached) {
                onPromptChange(cached)
                return
            }

            // Call API with new director
            setIsLoading(true)
            try {
                const expanded = await promptExpanderService.expand(basePrompt, level, newDirector)
                onPromptChange(expanded)
            } catch (error) {
                toast({
                    title: 'Expansion failed',
                    description: error instanceof Error ? error.message : 'Please try again',
                    variant: 'destructive'
                })
            } finally {
                setIsLoading(false)
            }
        }
    }, [level, prompt, originalPrompt, onPromptChange, toast])

    // Reset when prompt is manually edited (no longer matches any expansion)
    const handlePopoverOpenChange = (open: boolean) => {
        setIsOpen(open)

        // If opening and prompt was edited, reset state
        if (open && originalPrompt && prompt !== originalPrompt) {
            const isExpanded = promptExpanderService.getOriginal(prompt) !== null
            if (!isExpanded) {
                // Prompt was manually edited, reset state
                setOriginalPrompt(null)
                setLevel('original')
                promptExpanderService.clearCache(originalPrompt)
            }
        }
    }

    return (
        <Popover open={isOpen} onOpenChange={handlePopoverOpenChange}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={disabled || !prompt.trim() || isLoading}
                            className={`relative text-muted-foreground hover:text-primary ${isActive ? 'text-accent' : ''}`}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Layers className="w-4 h-4" />
                            )}
                            {isActive && !isLoading && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full" />
                            )}
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Expand prompt detail</p>
                </TooltipContent>
            </Tooltip>

            <PopoverContent className="w-64" align="start">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Detail Level</Label>
                        <RadioGroup
                            value={level}
                            onValueChange={(value) => handleLevelChange(value as ExpansionLevel)}
                            className="space-y-1"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="original" id="original" />
                                <Label htmlFor="original" className="cursor-pointer text-sm">
                                    Original
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="2x" id="enhanced" />
                                <Label htmlFor="enhanced" className="cursor-pointer text-sm">
                                    Enhanced (2x)
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="3x" id="cinematic" />
                                <Label htmlFor="cinematic" className="cursor-pointer text-sm">
                                    Cinematic (3x)
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Style Guide</Label>
                        <Select value={director} onValueChange={(value) => handleDirectorChange(value as DirectorStyle)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select director..." />
                            </SelectTrigger>
                            <SelectContent>
                                {DIRECTOR_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        <div className="flex flex-col">
                                            <span>{option.label}</span>
                                            <span className="text-xs text-muted-foreground">{option.hint}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {originalPrompt && level !== 'original' && (
                        <>
                            <Separator />
                            <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Original:</span>
                                <p className="mt-1 line-clamp-2">{originalPrompt}</p>
                            </div>
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
