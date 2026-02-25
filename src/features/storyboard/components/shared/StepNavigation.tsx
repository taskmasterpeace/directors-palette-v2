'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStoryboardStore } from '../../store'

const TAB_ORDER = ['input', 'style', 'directors', 'entities', 'shots', 'generation', 'gallery'] as const
const TAB_LABELS: Record<string, string> = {
    input: 'Story',
    style: 'Style',
    directors: 'Director',
    entities: 'Characters',
    shots: 'Shots',
    generation: 'Generate',
    gallery: 'Results',
}

export function StepNavigation() {
    const { internalTab, setInternalTab } = useStoryboardStore()

    const currentIndex = TAB_ORDER.indexOf(internalTab as typeof TAB_ORDER[number])
    const prevTab = currentIndex > 0 ? TAB_ORDER[currentIndex - 1] : null
    const nextTab = currentIndex < TAB_ORDER.length - 1 ? TAB_ORDER[currentIndex + 1] : null

    return (
        <div className="flex items-center justify-between pt-4 mt-4 border-t">
            {prevTab ? (
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground gap-1"
                    onClick={() => setInternalTab(prevTab)}
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    {TAB_LABELS[prevTab]}
                </Button>
            ) : (
                <div />
            )}
            {nextTab ? (
                <Button
                    variant="default"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => setInternalTab(nextTab)}
                >
                    {TAB_LABELS[nextTab]}
                    <ChevronRight className="w-3.5 h-3.5" />
                </Button>
            ) : (
                <div />
            )}
        </div>
    )
}
