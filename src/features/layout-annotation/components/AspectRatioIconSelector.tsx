'use client'

import { RectangleHorizontal, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

interface AspectRatioIconSelectorProps {
    value: string
    onChange: (value: string) => void
    className?: string
}

const ASPECT_RATIOS = [
    { value: '16:9', label: '16:9 Landscape' },
    { value: '9:16', label: '9:16 Portrait' },
    { value: '1:1', label: '1:1 Square' },
    { value: '4:3', label: '4:3 Standard' },
    { value: '21:9', label: '21:9 Cinematic' },
    { value: 'custom', label: 'Custom' },
]

export function AspectRatioIconSelector({ value, onChange, className = '' }: AspectRatioIconSelectorProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={`sm:hidden fixed right-4 z-40 bg-primary hover:bg-primary border-primary/30 rounded-full p-3 w-12 h-12 shadow-lg touch-manipulation transition-all ${className}`}
                    style={{ top: 'calc(env(safe-area-inset-top) + 180px)' }}
                    aria-label={`Change aspect ratio, current: ${value}`}
                >
                    <RectangleHorizontal className="w-5 h-5 text-white" />
                    <span className="sr-only">Aspect Ratio: {value}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-56 p-2 bg-card border-primary/30 rounded-lg shadow-xl"
                align="end"
                side="bottom"
                sideOffset={8}
            >
                <div className="space-y-1">
                    <div className="px-3 py-2 text-sm font-semibold text-primary border-b border-primary/30 mb-2">
                        Aspect Ratio
                    </div>
                    {ASPECT_RATIOS.map((ratio) => (
                        <button
                            key={ratio.value}
                            onClick={() => onChange(ratio.value)}
                            className={`w-full min-h-[44px] px-3 py-2 rounded-md text-white text-left hover:bg-primary/30 touch-manipulation transition-colors flex items-center justify-between ${
                                value === ratio.value ? 'bg-primary font-semibold' : ''
                            }`}
                            aria-label={ratio.label}
                        >
                            <span>{ratio.label}</span>
                            {value === ratio.value && (
                                <Check className="w-4 h-4 text-primary" />
                            )}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}
