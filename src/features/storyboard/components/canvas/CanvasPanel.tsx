'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, RefreshCw, FlaskConical, Film, ImageIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/utils'
import type { GeneratedShotPrompt, GeneratedImageData } from '../../types/storyboard.types'

interface CanvasPanelProps {
    shot: GeneratedShotPrompt
    imageData?: GeneratedImageData
    isSelected: boolean
    onToggleSelect: (sequence: number) => void
    onRegenerate: (sequence: number) => void
    onOpenShotLab: (sequence: number) => void
}

export function CanvasPanel({
    shot,
    imageData,
    isSelected,
    onToggleSelect,
    onRegenerate,
    onOpenShotLab,
}: CanvasPanelProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: shot.sequence })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const hasImage = imageData?.status === 'completed' && imageData.imageUrl
    const isGenerating = imageData?.status === 'generating' || imageData?.status === 'pending'
    const isFailed = imageData?.status === 'failed'

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'group relative rounded-lg border bg-card overflow-hidden transition-all',
                isDragging && 'opacity-50 z-50 shadow-xl',
                isSelected && 'ring-2 ring-primary',
                !hasImage && !isGenerating && 'border-dashed'
            )}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute top-1 left-1 z-20 p-1 rounded bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
            >
                <GripVertical className="w-3.5 h-3.5" />
            </div>

            {/* Shot Number Badge */}
            <Badge
                variant="secondary"
                className="absolute top-1 right-1 z-20 text-[10px] px-1.5 py-0"
            >
                #{shot.sequence}
            </Badge>

            {/* Selection overlay */}
            <button
                className="absolute inset-0 z-10"
                onClick={() => onToggleSelect(shot.sequence)}
                aria-label={`Select shot ${shot.sequence}`}
            />

            {/* Image Area */}
            <div className="aspect-video bg-muted flex items-center justify-center relative">
                {hasImage ? (
                    <img
                        src={imageData.imageUrl}
                        alt={`Shot ${shot.sequence}`}
                        className="w-full h-full object-cover"
                    />
                ) : isGenerating ? (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-xs">Generating...</span>
                    </div>
                ) : isFailed ? (
                    <div className="flex flex-col items-center gap-1 text-destructive">
                        <ImageIcon className="w-5 h-5" />
                        <span className="text-xs">Failed</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                        <ImageIcon className="w-5 h-5" />
                        <span className="text-xs">No image</span>
                    </div>
                )}
            </div>

            {/* Info Bar */}
            <div className="p-1.5 space-y-1">
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
                    {shot.prompt.slice(0, 80)}{shot.prompt.length > 80 ? '...' : ''}
                </p>
                <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {shot.shotType}
                    </Badge>
                    {shot.edited && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">
                            Edited
                        </Badge>
                    )}
                </div>
            </div>

            {/* Hover Toolbar */}
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-white hover:bg-white/20"
                    onClick={(e) => { e.stopPropagation(); onRegenerate(shot.sequence) }}
                >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Regen
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-white hover:bg-white/20"
                    onClick={(e) => { e.stopPropagation(); onOpenShotLab(shot.sequence) }}
                >
                    <FlaskConical className="w-3 h-3 mr-1" />
                    Lab
                </Button>
                {hasImage && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-white hover:bg-white/20"
                        onClick={(e) => { e.stopPropagation(); /* animate placeholder */ }}
                    >
                        <Film className="w-3 h-3 mr-1" />
                        Animate
                    </Button>
                )}
            </div>
        </div>
    )
}
