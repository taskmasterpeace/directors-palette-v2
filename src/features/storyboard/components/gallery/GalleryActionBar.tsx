'use client'

import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Eye, Grid3X3, Layers, Clapperboard, Play, Download } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface GalleryActionBarProps {
    sequence: number
    imageUrl: string
    videoStatus?: 'idle' | 'generating' | 'completed' | 'failed'
    videoUrl?: string
    isAnimating: boolean
    isGeneratingBRoll: boolean
    onPreview: () => void
    onContactSheet: () => void
    onBRoll: () => void
    onAnimate: () => void
    onDownload: () => void
}

export function GalleryActionBar({
    videoStatus,
    videoUrl,
    isAnimating,
    isGeneratingBRoll,
    onPreview,
    onContactSheet,
    onBRoll,
    onAnimate,
    onDownload,
}: GalleryActionBarProps) {
    const actions = [
        { icon: Eye, label: 'Preview', onClick: onPreview, disabled: false },
        { icon: Grid3X3, label: 'Angles', onClick: onContactSheet, disabled: false },
        {
            icon: isGeneratingBRoll ? undefined : Layers,
            label: 'B-Roll',
            onClick: onBRoll,
            disabled: isGeneratingBRoll,
            loading: isGeneratingBRoll,
        },
        {
            icon: isAnimating ? undefined : (videoStatus === 'completed' && videoUrl ? Play : Clapperboard),
            label: isAnimating ? 'Animating...' : videoStatus === 'completed' ? 'Play Video' : 'Make Video',
            onClick: onAnimate,
            disabled: isAnimating,
            loading: isAnimating,
            highlight: videoStatus === 'completed',
        },
        {
            icon: Download,
            label: 'Download',
            onClick: onDownload,
            disabled: false,
        },
    ]

    return (
        <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-center gap-1 bg-black/80 backdrop-blur-sm px-2 py-1.5 rounded-b-lg">
                <TooltipProvider delayDuration={200}>
                    {actions.map((action) => (
                        <Tooltip key={action.label}>
                            <TooltipTrigger asChild>
                                <button
                                    className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${
                                        action.highlight
                                            ? 'text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300'
                                            : action.label === 'Animate'
                                            ? 'text-indigo-400 hover:bg-indigo-500/30 hover:text-indigo-300'
                                            : 'text-white/90 hover:bg-white/20 hover:text-white'
                                    }`}
                                    disabled={action.disabled}
                                    onClick={action.onClick}
                                >
                                    {action.loading ? (
                                        <LoadingSpinner size="xs" color="current" />
                                    ) : action.icon ? (
                                        <action.icon className="w-4 h-4" />
                                    ) : null}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">{action.label}</TooltipContent>
                        </Tooltip>
                    ))}
                </TooltipProvider>
            </div>
        </div>
    )
}
