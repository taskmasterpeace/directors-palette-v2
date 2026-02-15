'use client'

import { memo, useState, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    GripVertical,
    RefreshCw,
    FlaskConical,
    Film,
    ImageIcon,
    AlertCircle,
    Play,
    Download,
    Maximize2,
    RotateCw,
    Wand2,
    CheckCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/utils/utils'
import type { GeneratedShotPrompt, GeneratedImageData } from '../../types/storyboard.types'

/** Video entry stored per-panel */
export interface CanvasVideoEntry {
    galleryId: string
    videoUrl?: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    error?: string
}

interface CanvasPanelProps {
    shot: GeneratedShotPrompt
    imageData?: GeneratedImageData
    isSelected: boolean
    onToggleSelect: (sequence: number) => void
    onRegenerate: (sequence: number) => void
    onOpenShotLab: (sequence: number) => void
    onAnimate: (sequence: number) => void
    video?: CanvasVideoEntry
}

const SHOT_TYPE_COLORS: Record<string, string> = {
    'establishing': 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    'wide': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'medium': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'close-up': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'detail': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
}

function CanvasPanelComponent({
    shot,
    imageData,
    isSelected,
    onToggleSelect,
    onRegenerate,
    onOpenShotLab,
    onAnimate,
    video,
}: CanvasPanelProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: shot.sequence })

    const [isVideoPlaying, setIsVideoPlaying] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const hasImage = imageData?.status === 'completed' && imageData.imageUrl
    const isGenerating = imageData?.status === 'generating' || imageData?.status === 'pending'
    const isFailed = imageData?.status === 'failed'
    const hasVideo = video?.status === 'completed' && video.videoUrl
    const isVideoProcessing = video?.status === 'processing' || video?.status === 'pending'
    const isVideoFailed = video?.status === 'failed'
    const shotColor = SHOT_TYPE_COLORS[shot.shotType] || 'bg-muted text-muted-foreground'

    const toggleVideoPlayback = (e: React.MouseEvent) => {
        e.stopPropagation()
        const vid = videoRef.current
        if (!vid) return
        if (isVideoPlaying) {
            vid.pause()
            setIsVideoPlaying(false)
        } else {
            vid.play().then(() => setIsVideoPlaying(true)).catch(() => setIsVideoPlaying(false))
        }
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'group relative rounded-xl border-2 bg-card/50 overflow-hidden transition-all touch-manipulation',
                isDragging && 'opacity-40 z-50 shadow-2xl scale-105',
                isSelected ? 'border-primary shadow-lg shadow-primary/10' : 'border-border hover:border-border/80',
                !hasImage && !isGenerating && !hasVideo && 'border-dashed border-border/50'
            )}
        >
            {/* Drag Handle - top left */}
            <div
                {...attributes}
                {...listeners}
                className="absolute top-2 left-2 z-30 p-1.5 rounded-md bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
            >
                <GripVertical className="w-3.5 h-3.5" />
            </div>

            {/* Checkbox Selection - top left, below drag on mobile */}
            <div className="absolute top-2 left-10 z-30 sm:left-2 sm:top-10">
                <div
                    onClick={(e) => { e.stopPropagation(); onToggleSelect(shot.sequence) }}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={isSelected ? 'Deselect shot' : 'Select shot'}
                >
                    <Checkbox
                        checked={isSelected}
                        className="bg-white/90 border-white/80 w-5 h-5 pointer-events-none data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                </div>
            </div>

            {/* Shot Number + Shot Type Badge - top right */}
            <div className="absolute top-2 right-2 z-30 flex items-center gap-1">
                <Badge className={cn('text-[10px] px-1.5 py-0 border', shotColor)}>
                    {shot.shotType}
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-black/60 text-white border-0 backdrop-blur-sm">
                    #{shot.sequence}
                </Badge>
            </div>

            {/* Selection tint overlay */}
            {isSelected && (
                <div className="absolute inset-0 z-10 bg-primary/10 pointer-events-none" />
            )}

            {/* Video Status Badge - bottom right of image */}
            {video && (
                <div className="absolute bottom-[calc(theme(spacing.16)+4px)] right-2 z-30">
                    {isVideoProcessing && (
                        <Badge className="bg-primary text-white text-[10px] flex items-center gap-1 border-0">
                            <LoadingSpinner size="xs" color="current" />
                            Rendering
                        </Badge>
                    )}
                    {hasVideo && (
                        <Badge className="bg-emerald-600 text-white text-[10px] border-0">
                            <CheckCircle className="w-3 h-3 mr-0.5" />
                            Video
                        </Badge>
                    )}
                    {isVideoFailed && (
                        <Badge className="bg-destructive text-white text-[10px] border-0">
                            Failed
                        </Badge>
                    )}
                </div>
            )}

            {/* Character Avatars - bottom left of image */}
            {shot.characterRefs.length > 0 && (
                <div className="absolute bottom-[calc(theme(spacing.16)+4px)] left-2 z-30 flex -space-x-1.5">
                    {shot.characterRefs.slice(0, 3).map((char, i) => (
                        <Tooltip key={char.id || i}>
                            <TooltipTrigger asChild>
                                <div className="w-6 h-6 rounded-full border-2 border-card bg-muted overflow-hidden flex-shrink-0">
                                    {char.reference_image_url ? (
                                        <img src={char.reference_image_url} alt={char.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="flex items-center justify-center w-full h-full text-[8px] font-bold text-muted-foreground">
                                            {char.name[0]}
                                        </span>
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">{char.name}</TooltipContent>
                        </Tooltip>
                    ))}
                    {shot.characterRefs.length > 3 && (
                        <div className="w-6 h-6 rounded-full border-2 border-card bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-[8px] font-bold text-muted-foreground">+{shot.characterRefs.length - 3}</span>
                        </div>
                    )}
                </div>
            )}

            {/* ---- MEDIA AREA (Image or Video) ---- */}
            <div className="aspect-video bg-muted/30 flex items-center justify-center relative overflow-hidden">
                {/* Video player (when video exists and completed) */}
                {hasVideo ? (
                    <div className="w-full h-full relative">
                        <video
                            ref={videoRef}
                            src={video.videoUrl}
                            className="w-full h-full object-cover"
                            loop
                            playsInline
                            preload="metadata"
                            onEnded={() => setIsVideoPlaying(false)}
                        />
                        {/* Play/Pause overlay */}
                        {!isVideoPlaying && (
                            <div
                                className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-colors hover:bg-black/40"
                                onClick={toggleVideoPlayback}
                            >
                                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center hover:scale-110 transition-transform active:scale-95">
                                    <Play className="h-5 w-5 text-primary-foreground ml-0.5" fill="currentColor" />
                                </div>
                            </div>
                        )}
                        {isVideoPlaying && (
                            <div
                                className="absolute inset-0 cursor-pointer"
                                onClick={toggleVideoPlayback}
                            />
                        )}
                        {/* Video controls overlay */}
                        <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                                onClick={(e) => { e.stopPropagation(); /* fullscreen */ }}
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (video.videoUrl) {
                                        const a = document.createElement('a')
                                        a.href = video.videoUrl
                                        a.download = `shot-${shot.sequence}.mp4`
                                        a.click()
                                    }
                                }}
                            >
                                <Download className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                ) : hasImage ? (
                    /* Still image */
                    <img
                        src={imageData.imageUrl}
                        alt={`Shot ${shot.sequence}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : isGenerating ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <LoadingSpinner size="md" />
                        <span className="text-xs font-medium">Generating image...</span>
                    </div>
                ) : isFailed ? (
                    <div className="flex flex-col items-center gap-2 text-destructive group/failed">
                        <AlertCircle className="w-6 h-6" />
                        <span className="text-xs font-medium">Generation failed</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); onRegenerate(shot.sequence) }}
                        >
                            <RotateCw className="w-3 h-3 mr-1" />
                            Retry
                        </Button>
                    </div>
                ) : isVideoProcessing ? (
                    <div className="flex flex-col items-center gap-2 text-primary">
                        <LoadingSpinner size="md" color="primary" />
                        <span className="text-xs font-medium">Rendering video...</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-xs">Awaiting generation</span>
                    </div>
                )}

                {/* Prompt overlay on image - bottom gradient */}
                {(hasImage || hasVideo) && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-2 py-1.5 pointer-events-auto">
                                <p className="text-[10px] text-white/80 line-clamp-1 leading-tight">
                                    {shot.prompt.slice(0, 60)}{shot.prompt.length > 60 ? '...' : ''}
                                </p>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs text-xs">{shot.prompt}</TooltipContent>
                    </Tooltip>
                )}
            </div>

            {/* ---- INFO BAR ---- */}
            <div className="p-2 space-y-1.5">
                {/* Metadata row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        {shot.edited && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/30 text-amber-400">
                                Edited
                            </Badge>
                        )}
                        {shot.metadata?.isGreenlit && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/30 text-emerald-400">
                                Greenlit
                            </Badge>
                        )}
                    </div>
                    {shot.metadata?.rating && (
                        <span className="text-[10px] text-amber-400">{'★'.repeat(shot.metadata.rating)}</span>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 flex-1 text-[10px] bg-secondary/50 hover:bg-secondary text-foreground border border-border/50 touch-manipulation active:scale-95 transition-transform"
                        onClick={(e) => { e.stopPropagation(); onRegenerate(shot.sequence) }}
                    >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Regen
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 flex-1 text-[10px] bg-secondary/50 hover:bg-secondary text-foreground border border-border/50 touch-manipulation active:scale-95 transition-transform"
                        onClick={(e) => { e.stopPropagation(); onOpenShotLab(shot.sequence) }}
                    >
                        <FlaskConical className="w-3 h-3 mr-1" />
                        Lab
                    </Button>
                    {hasImage && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                'h-7 flex-1 text-[10px] border touch-manipulation active:scale-95 transition-transform',
                                hasVideo
                                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/30'
                            )}
                            onClick={(e) => { e.stopPropagation(); onAnimate(shot.sequence) }}
                        >
                            {hasVideo ? (
                                <><Film className="w-3 h-3 mr-1" /> View</>
                            ) : isVideoProcessing ? (
                                <><LoadingSpinner size="xs" color="current" className="mr-1" /> Rendering</>
                            ) : (
                                <><Wand2 className="w-3 h-3 mr-1" /> Animate</>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}

export const CanvasPanel = memo(CanvasPanelComponent, (prev, next) => {
    return (
        prev.shot.sequence === next.shot.sequence &&
        prev.shot.prompt === next.shot.prompt &&
        prev.shot.edited === next.shot.edited &&
        prev.shot.shotType === next.shot.shotType &&
        prev.shot.characterRefs.length === next.shot.characterRefs.length &&
        prev.imageData?.status === next.imageData?.status &&
        prev.imageData?.imageUrl === next.imageData?.imageUrl &&
        prev.isSelected === next.isSelected &&
        prev.video?.status === next.video?.status &&
        prev.video?.videoUrl === next.video?.videoUrl
    )
})
