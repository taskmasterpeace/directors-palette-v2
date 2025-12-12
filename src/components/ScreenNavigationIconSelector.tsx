'use client'

import { LayoutGrid, Check, Sparkles, ImageIcon, Layout, Film, Images, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { TabValue } from '@/store/layout.store'

interface ScreenOption {
    value: TabValue
    label: string
    icon: React.ComponentType<{ className?: string }>
}

const SCREEN_OPTIONS: ScreenOption[] = [
    { value: 'shot-creator', label: 'Shot Creator', icon: Sparkles },
    { value: 'shot-animator', label: 'Shot Animator', icon: ImageIcon },
    { value: 'layout-annotation', label: 'Layout & Annotation', icon: Layout },
    { value: 'storyboard', label: 'Storyboard', icon: Film },
    { value: 'gallery', label: 'Gallery', icon: Images },
    { value: 'wildcards', label: 'Wildcards', icon: Wand2 },
]

interface ScreenNavigationIconSelectorProps {
    value: TabValue
    onChange: (value: TabValue) => void
}

export function ScreenNavigationIconSelector({ value, onChange }: ScreenNavigationIconSelectorProps) {
    const currentScreen = SCREEN_OPTIONS.find(s => s.value === value)

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="sm:hidden fixed right-4 z-50 bg-gradient-to-br from-primary to-primary/70 hover:from-primary/90 hover:to-primary border-primary/30 rounded-full p-3 w-12 h-12 shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 touch-manipulation transition-all duration-300 ease-out"
                    style={{ top: 'calc(env(safe-area-inset-top) + 120px)' }}
                    aria-label={`Change screen, current: ${currentScreen?.label}`}
                >
                    <LayoutGrid className="w-5 h-5 text-white animate-pulse" />
                    <span className="sr-only">Screen: {currentScreen?.label}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-64 p-2 bg-background/95 backdrop-blur-md border-primary/40 rounded-xl shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
                align="end"
                side="bottom"
                sideOffset={8}
            >
                <div className="space-y-1">
                    {SCREEN_OPTIONS.map((screen) => {
                        const IconComponent = screen.icon
                        return (
                            <button
                                key={screen.value}
                                onClick={() => onChange(screen.value)}
                                className={`w-full min-h-[44px] px-4 py-3 rounded-lg text-white text-left hover:bg-primary/40 hover:scale-[1.02] active:scale-95 touch-manipulation transition-all duration-200 ease-out flex items-center justify-between group ${
                                    value === screen.value ? 'bg-primary/60 font-semibold shadow-lg' : ''
                                }`}
                                aria-label={screen.label}
                            >
                                <div className="flex items-center gap-3">
                                    <IconComponent className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                                        value === screen.value ? 'text-primary' : 'text-primary'
                                    }`} />
                                    <span className="text-base">{screen.label}</span>
                                </div>
                                {value === screen.value && (
                                    <Check className="w-5 h-5 text-primary animate-in zoom-in-50 duration-200" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </PopoverContent>
        </Popover>
    )
}
