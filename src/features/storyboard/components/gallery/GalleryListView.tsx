'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
    CheckCircle, AlertCircle, Film, RefreshCw, Eye, Download,
    Grid3X3, Layers, Clapperboard, Play, ChevronDown, ChevronUp,
    Users, Camera
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { GeneratedImageData, GeneratedShotPrompt, ShotBreakdownSegment, ContactSheetVariant } from '../../types/storyboard.types'

interface GalleryListViewProps {
    segments: ShotBreakdownSegment[]
    generatedImages: Record<number, GeneratedImageData>
    generatedPrompts: GeneratedShotPrompt[]
    contactSheetVariants: ContactSheetVariant[]
    showCompletedOnly: boolean
    animatingShots: Set<number>
    regeneratingShots: Set<number>
    generatingBRollId: number | null
    onPreview: (imageUrl: string) => void
    onContactSheet: (sequence: number) => void
    onBRoll: (imageUrl: string, sequence: number) => void
    onAnimate: (sequence: number) => void
    onRegenerate: (sequence: number) => void
    onRegenerateWithPrompt: (sequence: number, prompt: string) => void
    onDownload: (sequence: number) => void
    onVideoPreview: (url: string, sequence: number) => void
}

export function GalleryListView({
    segments,
    generatedImages,
    generatedPrompts,
    showCompletedOnly,
    animatingShots,
    regeneratingShots,
    generatingBRollId,
    onPreview,
    onContactSheet,
    onBRoll,
    onAnimate,
    onRegenerate,
    onRegenerateWithPrompt,
    onDownload,
    onVideoPreview,
}: GalleryListViewProps) {
    const [expandedShot, setExpandedShot] = useState<number | null>(null)
    const [editingPrompt, setEditingPrompt] = useState<{ sequence: number; text: string } | null>(null)

    const filteredSegments = showCompletedOnly
        ? segments.filter(segment => {
            const img = generatedImages[segment.sequence]
            return img?.status === 'completed' && img?.imageUrl
          })
        : segments

    if (filteredSegments.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <p>No shots to display.</p>
            </div>
        )
    }

    return (
        <ScrollArea className="h-[600px]">
            <div className="space-y-2">
                {filteredSegments.map((segment) => {
                    const genImage = generatedImages[segment.sequence]
                    const shotPrompt = generatedPrompts.find(p => p.sequence === segment.sequence)
                    const isAnimating = animatingShots.has(segment.sequence) || genImage?.videoStatus === 'generating'
                    const isRegenerating = regeneratingShots.has(segment.sequence)
                    const isFailed = genImage?.status === 'failed'
                    const isGenerating = genImage?.status === 'generating' || genImage?.status === 'pending'
                    const hasImage = !!genImage?.imageUrl
                    const isExpanded = expandedShot === segment.sequence
                    const isEditing = editingPrompt?.sequence === segment.sequence

                    return (
                        <div
                            key={segment.sequence}
                            className="group rounded-lg border bg-card overflow-hidden transition-colors hover:border-primary/40"
                            style={{ borderLeftWidth: 3, borderLeftColor: segment.color }}
                        >
                            {/* Main row */}
                            <div className="flex items-stretch min-h-[80px]">
                                {/* Thumbnail */}
                                <div className="w-[140px] flex-shrink-0 relative bg-muted/30">
                                    {isGenerating && !hasImage ? (
                                        <div className="flex items-center justify-center h-full">
                                            <LoadingSpinner size="sm" color="primary" />
                                        </div>
                                    ) : hasImage ? (
                                        <img
                                            src={genImage!.imageUrl!}
                                            alt={`Shot ${segment.sequence}`}
                                            className="w-full h-full object-cover cursor-pointer"
                                            onClick={() => onPreview(genImage!.imageUrl!)}
                                        />
                                    ) : isFailed ? (
                                        <div className="flex items-center justify-center h-full">
                                            <AlertCircle className="w-6 h-6 text-destructive" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <Camera className="w-6 h-6 text-muted-foreground/40" />
                                        </div>
                                    )}

                                    {/* Video badge on thumbnail */}
                                    {genImage?.videoStatus === 'completed' && genImage?.videoUrl && (
                                        <Badge
                                            className="absolute bottom-1 left-1 text-[10px] py-0 px-1 bg-indigo-600/90 text-white border-0 cursor-pointer"
                                            onClick={() => onVideoPreview(genImage.videoUrl!, segment.sequence)}
                                        >
                                            <Film className="w-2.5 h-2.5 mr-0.5" />
                                            Video
                                        </Badge>
                                    )}
                                    {isAnimating && (
                                        <Badge className="absolute bottom-1 left-1 text-[10px] py-0 px-1 bg-indigo-600/90 text-white border-0">
                                            <LoadingSpinner size="xs" color="current" className="mr-0.5" />
                                            Anim
                                        </Badge>
                                    )}
                                </div>

                                {/* Shot info */}
                                <div className="flex-1 min-w-0 px-3 py-2 flex flex-col justify-center gap-1">
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            className="text-[11px] py-0 px-1.5 font-mono"
                                            style={{ backgroundColor: segment.color }}
                                        >
                                            {segment.sequence}
                                        </Badge>
                                        {shotPrompt?.shotType && (
                                            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                                                {shotPrompt.shotType}
                                            </span>
                                        )}
                                        {/* Status */}
                                        {genImage?.status === 'completed' && hasImage && (
                                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                        )}
                                        {isFailed && (
                                            <span className="text-[11px] text-destructive font-medium">Failed</span>
                                        )}
                                        {isGenerating && (
                                            <span className="text-[11px] text-amber-500 font-medium">Generating...</span>
                                        )}
                                        {/* Character refs */}
                                        {shotPrompt?.characterRefs?.length ? (
                                            <div className="flex items-center gap-1 ml-auto mr-2">
                                                {shotPrompt.characterRefs.slice(0, 3).map(c => (
                                                    <Badge
                                                        key={c.id}
                                                        variant="outline"
                                                        className="text-[10px] py-0 px-1 gap-0.5"
                                                    >
                                                        {c.reference_image_url ? (
                                                            <img src={c.reference_image_url} alt={c.name} className="w-3 h-3 rounded-full object-cover" />
                                                        ) : (
                                                            <Users className="w-2.5 h-2.5" />
                                                        )}
                                                        {c.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Story text snippet */}
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                        {segment.text}
                                    </p>

                                    {/* Prompt preview */}
                                    {shotPrompt && (
                                        <p className="text-[11px] text-foreground/70 line-clamp-1 italic">
                                            {shotPrompt.prompt}
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-0.5 px-2 flex-shrink-0">
                                    <TooltipProvider delayDuration={200}>
                                        {hasImage && !isFailed && (
                                            <>
                                                <ActionButton icon={Eye} label="Preview" onClick={() => onPreview(genImage!.imageUrl!)} />
                                                <ActionButton icon={Grid3X3} label="Angles" onClick={() => onContactSheet(segment.sequence)} />
                                                <ActionButton
                                                    icon={generatingBRollId === segment.sequence ? undefined : Layers}
                                                    label="B-Roll"
                                                    onClick={() => onBRoll(genImage!.imageUrl!, segment.sequence)}
                                                    disabled={generatingBRollId === segment.sequence}
                                                    loading={generatingBRollId === segment.sequence}
                                                />
                                                <ActionButton
                                                    icon={isAnimating ? undefined : (genImage?.videoStatus === 'completed' && genImage?.videoUrl ? Play : Clapperboard)}
                                                    label={isAnimating ? 'Animating...' : genImage?.videoStatus === 'completed' ? 'Play' : 'Make Video'}
                                                    onClick={() => onAnimate(segment.sequence)}
                                                    disabled={isAnimating}
                                                    loading={isAnimating}
                                                    highlight={genImage?.videoStatus === 'completed'}
                                                />
                                                <ActionButton icon={Download} label="Download" onClick={() => onDownload(segment.sequence)} />
                                            </>
                                        )}
                                        {isFailed && (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() => onRegenerate(segment.sequence)}
                                                disabled={isRegenerating}
                                            >
                                                {isRegenerating ? (
                                                    <LoadingSpinner size="xs" color="current" className="mr-1" />
                                                ) : (
                                                    <RefreshCw className="w-3 h-3 mr-1" />
                                                )}
                                                Retry
                                            </Button>
                                        )}
                                    </TooltipProvider>

                                    {/* Expand toggle */}
                                    <button
                                        className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ml-1"
                                        onClick={() => setExpandedShot(isExpanded ? null : segment.sequence)}
                                    >
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Expanded detail panel */}
                            {isExpanded && shotPrompt && (
                                <div className="border-t bg-muted/20 px-4 py-3 space-y-3">
                                    {/* Full story text */}
                                    <div>
                                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Story Text</span>
                                        <p className="text-xs text-foreground/80 mt-1 leading-relaxed">{segment.text}</p>
                                    </div>

                                    {/* Editable prompt */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Prompt</span>
                                            <div className="flex items-center gap-1">
                                                {isEditing && editingPrompt.text !== shotPrompt.prompt && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-6 text-[11px] px-2"
                                                        onClick={() => {
                                                            onRegenerateWithPrompt(segment.sequence, editingPrompt.text)
                                                            setEditingPrompt(null)
                                                        }}
                                                        disabled={isRegenerating}
                                                    >
                                                        {isRegenerating ? (
                                                            <LoadingSpinner size="xs" color="current" className="mr-1" />
                                                        ) : (
                                                            <RefreshCw className="w-3 h-3 mr-1" />
                                                        )}
                                                        Regenerate with Changes
                                                    </Button>
                                                )}
                                                {!isEditing && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-[11px] px-2"
                                                        onClick={() => onRegenerate(segment.sequence)}
                                                        disabled={isRegenerating}
                                                    >
                                                        {isRegenerating ? (
                                                            <LoadingSpinner size="xs" color="current" className="mr-1" />
                                                        ) : (
                                                            <RefreshCw className="w-3 h-3 mr-1" />
                                                        )}
                                                        Regenerate
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <textarea
                                            value={isEditing ? editingPrompt.text : shotPrompt.prompt}
                                            onChange={(e) => setEditingPrompt({ sequence: segment.sequence, text: e.target.value })}
                                            onFocus={() => {
                                                if (!isEditing) setEditingPrompt({ sequence: segment.sequence, text: shotPrompt.prompt })
                                            }}
                                            onBlur={() => {
                                                if (isEditing && editingPrompt.text === shotPrompt.prompt) setEditingPrompt(null)
                                            }}
                                            className="w-full min-h-[60px] text-xs bg-background border rounded-md p-2 resize-y focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>

                                    {/* Error info */}
                                    {genImage?.error && (
                                        <div className="text-xs text-destructive bg-destructive/10 rounded-md p-2">
                                            {genImage.error}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </ScrollArea>
    )
}

/* Small icon button for the action toolbar */
function ActionButton({
    icon: Icon,
    label,
    onClick,
    disabled,
    loading,
    highlight,
}: {
    icon?: React.ComponentType<{ className?: string }>
    label: string
    onClick: () => void
    disabled?: boolean
    loading?: boolean
    highlight?: boolean
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${
                        highlight
                            ? 'text-emerald-500 hover:bg-emerald-500/10'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    disabled={disabled}
                    onClick={onClick}
                >
                    {loading ? (
                        <LoadingSpinner size="xs" color="current" />
                    ) : Icon ? (
                        <Icon className="w-4 h-4" />
                    ) : null}
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
        </Tooltip>
    )
}
