'use client'

import { useMemo, useEffect } from 'react'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SplitSquareVertical } from 'lucide-react'
import { useStoryboardStore } from '../../store'
import { breakdownStory, getLevelDescription } from '../../services/shot-breakdown.service'
import type { BreakdownLevel } from '../../types/storyboard.types'

export function ShotSlider() {
    const {
        storyText,
        breakdownLevel,
        setBreakdownLevel,
        setBreakdownResult
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

    const handleSliderChange = (value: number[]) => {
        setBreakdownLevel(value[0] as BreakdownLevel)
    }

    const levelLabels: Record<BreakdownLevel, string> = {
        1: 'Fine',
        2: 'Standard',
        3: 'Coarse'
    }

    return (
        <Card className="bg-card/50">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <SplitSquareVertical className="w-4 h-4" />
                        Shot Granularity
                    </div>
                    {breakdown && (
                        <Badge variant="secondary">
                            {breakdown.total_count} shots
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Slider
                        value={[breakdownLevel]}
                        onValueChange={handleSliderChange}
                        min={1}
                        max={3}
                        step={1}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Fine (comma+period)</span>
                        <span>Standard (sentence)</span>
                        <span>Coarse (2 sentences)</span>
                    </div>
                </div>

                <div className="text-sm text-center">
                    <span className="font-medium">{levelLabels[breakdownLevel]}</span>
                    <span className="text-muted-foreground ml-2">
                        {getLevelDescription(breakdownLevel)}
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}
