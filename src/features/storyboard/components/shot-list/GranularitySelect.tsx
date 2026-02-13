'use client'

import { useMemo, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useStoryboardStore } from '../../store'
import { breakdownStory } from '../../services/shot-breakdown.service'
import type { BreakdownLevel } from '../../types/storyboard.types'
import { toast } from 'sonner'

export function GranularitySelect() {
    const {
        storyText,
        breakdownLevel,
        setBreakdownLevel,
        setBreakdownResult,
        generatedPrompts,
        clearGeneratedPrompts,
        clearGeneratedImages
    } = useStoryboardStore()

    // Calculate breakdown whenever level or text changes
    const breakdown = useMemo(() => {
        if (!storyText.trim()) return null
        return breakdownStory(storyText, breakdownLevel)
    }, [storyText, breakdownLevel])

    // Update store in useEffect to avoid state update during render
    useEffect(() => {
        if (breakdown) {
            setBreakdownResult(breakdown)
        }
    }, [breakdown, setBreakdownResult])

    const handleChange = (value: string) => {
        const newLevel = Number(value) as BreakdownLevel

        if (generatedPrompts.length > 0) {
            const clearData = confirm(
                `Changing granularity will clear ${generatedPrompts.length} prompt(s) and any generated images.\n\nClick OK to clear and continue, or Cancel to keep current settings.`
            )
            if (!clearData) return
            clearGeneratedPrompts()
            clearGeneratedImages()
            toast.info('Prompts and images cleared')
        }

        setBreakdownLevel(newLevel)
    }

    const options = [
        { value: '1', label: 'Fine', desc: 'comma + period' },
        { value: '2', label: 'Standard', desc: 'sentence' },
        { value: '3', label: 'Coarse', desc: '2 sentences' },
    ]

    return (
        <div className="flex items-center gap-2">
            <Select value={String(breakdownLevel)} onValueChange={handleChange}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Granularity" />
                </SelectTrigger>
                <SelectContent>
                    {options.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            <span className="font-medium">{opt.label}</span>
                            <span className="text-muted-foreground ml-1">({opt.desc})</span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {breakdown && (
                <Badge variant="outline" className="text-xs">
                    {breakdown.total_count} shots
                </Badge>
            )}
        </div>
    )
}
