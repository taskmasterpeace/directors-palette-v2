'use client'

import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface GalleryLoadingCardProps {
    sequence: number
    promptText?: string
    color?: string
}

export function GalleryLoadingCard({ sequence, promptText, color }: GalleryLoadingCardProps) {
    return (
        <div className="relative group rounded-lg overflow-hidden bg-card border border-border">
            <div className="aspect-video relative flex flex-col items-center justify-center bg-gradient-to-br from-violet-950/30 via-background to-fuchsia-950/20">
                {/* Violet glow spinner */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full blur-xl opacity-30 animate-pulse" />
                    <LoadingSpinner size="xl" color="accent" className="relative z-10" />
                </div>
                <p className="text-sm text-muted-foreground mt-3">Generating...</p>
                {promptText && (
                    <p className="text-xs text-muted-foreground/60 mt-1 px-4 text-center line-clamp-2 max-w-[200px]">
                        {promptText.slice(0, 60)}...
                    </p>
                )}
            </div>
            {/* Shot number badge */}
            <div
                className="absolute top-1 left-1 text-xs px-2 py-0.5 rounded-full text-white font-medium"
                style={{ backgroundColor: color || '#8b5cf6' }}
            >
                {sequence}
            </div>
        </div>
    )
}
