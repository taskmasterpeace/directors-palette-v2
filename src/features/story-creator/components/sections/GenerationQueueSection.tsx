'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Pause, Play, CheckCircle2, XCircle, Loader2, Image as ImageIcon, Layers } from 'lucide-react'
import { useStoryGeneration } from '../../hooks/useStoryGeneration'
import { getVariationCount } from '../../helpers/bracket-prompt.helper'
import { QueueRecoveryBanner } from '../QueueRecoveryBanner'
import type { StoryShot, GenerationQueue } from '../../types/story.types'

interface GenerationQueueSectionProps {
    shots: StoryShot[]
    queue: GenerationQueue | null
    onPauseResume: () => void
}

/**
 * Generation Queue Section - Monitor batch generation progress
 */
export default function GenerationQueueSection({
    shots,
    queue,
    onPauseResume
}: GenerationQueueSectionProps) {
    const { processQueue, isGenerating, loadCheckpoint, clearCheckpoint, getRecoveryMessage } = useStoryGeneration()
    const [showRecovery, setShowRecovery] = useState(false)
    const [recoveryCheckpoint, setRecoveryCheckpoint] = useState<ReturnType<typeof loadCheckpoint>>(null)

    // Check for recoverable checkpoint on mount
    useEffect(() => {
        const checkpoint = loadCheckpoint()
        if (checkpoint && queue && checkpoint.queueId === queue.id) {
            setRecoveryCheckpoint(checkpoint)
            setShowRecovery(true)
        }
    }, [queue, loadCheckpoint])

    const handleResume = () => {
        if (recoveryCheckpoint && queue) {
            const queuedShots = shots.filter(s => queue.shot_ids.includes(s.id))
            // Resume from checkpoint index
            const resumeShots = queuedShots.slice(recoveryCheckpoint.currentShotIndex)
            processQueue(resumeShots)
            setShowRecovery(false)
        }
    }

    const handleDismissRecovery = () => {
        clearCheckpoint()
        setShowRecovery(false)
        setRecoveryCheckpoint(null)
    }

    // Auto-start generation when queue becomes active (if no recovery)
    useEffect(() => {
        if (queue && queue.status === 'pending' && shots.length > 0 && !isGenerating && !showRecovery) {
            const queuedShots = shots.filter(s => queue.shot_ids.includes(s.id))
            processQueue(queuedShots)
        }
    }, [queue, shots, isGenerating, processQueue, showRecovery])

    if (!queue) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No active generation queue.</p>
                <p className="text-sm text-muted-foreground mt-2">
                    Click Generate All in the Shots Review tab to start.
                </p>
            </div>
        )
    }

    const isPaused = queue.status === 'paused'
    const isProcessing = queue.status === 'processing' || isGenerating
    const isCompleted = queue.status === 'completed'

    // Calculate total images accounting for bracket variations
    const queuedShots = shots.filter(s => queue.shot_ids.includes(s.id))
    const totalImages = queuedShots.reduce((total, shot) => {
        return total + getVariationCount(shot.prompt)
    }, 0)
    const hasBrackets = totalImages > queuedShots.length

    return (
        <div className="space-y-6">
            {/* Recovery Banner */}
            {showRecovery && recoveryCheckpoint && (
                <QueueRecoveryBanner
                    message={getRecoveryMessage(recoveryCheckpoint)}
                    onResume={handleResume}
                    onDismiss={handleDismissRecovery}
                />
            )}

            {/* Queue Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">
                            Generation Progress
                        </h3>
                        {hasBrackets && (
                            <Badge
                                variant="outline"
                                className="text-xs bg-orange-900/30 text-orange-400 border-orange-700"
                            >
                                <Layers className="w-3 h-3 mr-1" />
                                {totalImages} images
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {queue.current_shot_index + 1} of {queue.shot_ids.length} shots
                        {hasBrackets && ` • ${totalImages} total images`}
                    </p>
                </div>
                {(isProcessing || isPaused) && (
                    <Button
                        onClick={onPauseResume}
                        variant="outline"
                        size="sm"
                    >
                        {isPaused ? (
                            <>
                                <Play className="w-4 h-4 mr-2" />
                                Resume
                            </>
                        ) : (
                            <>
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                            </>
                        )}
                    </Button>
                )}
            </div>

            {/* Overall Progress */}
            <div className="space-y-2 p-4 bg-card rounded-lg border border-border">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">Overall Progress</span>
                    <span className="text-muted-foreground">{Math.round(queue.progress)}%</span>
                </div>
                <Progress value={queue.progress} className="h-2" />
                {queue.error_message && (
                    <p className="text-xs text-primary mt-2">{queue.error_message}</p>
                )}
            </div>

            {/* Status Badge */}
            <div className="flex gap-2">
                <QueueStatusBadge status={queue.status} />
            </div>

            {/* Shots List */}
            <div className="space-y-2">
                {queue.shot_ids.map((shotId, index) => {
                    const shot = shots.find(s => s.id === shotId)
                    if (!shot) return null

                    const isCurrent = index === queue.current_shot_index
                    const isComplete = index < queue.current_shot_index || isCompleted
                    const isPending = index > queue.current_shot_index && !isCompleted

                    return (
                        <ShotQueueItem
                            key={shotId}
                            shot={shot}
                            index={index}
                            isCurrent={isCurrent}
                            isComplete={isComplete}
                            isPending={isPending}
                        />
                    )
                })}
            </div>
        </div>
    )
}

interface QueueStatusBadgeProps {
    status: string
}

function QueueStatusBadge({ status }: QueueStatusBadgeProps) {
    const variants: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
        pending: { color: 'bg-secondary text-foreground', icon: <Loader2 className="w-3 h-3" />, label: 'Pending' },
        processing: { color: 'bg-blue-900/30 text-accent border-blue-800', icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Processing' },
        paused: { color: 'bg-yellow-900/30 text-yellow-400 border-yellow-800', icon: <Pause className="w-3 h-3" />, label: 'Paused' },
        completed: { color: 'bg-green-900/30 text-emerald-400 border-green-800', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Completed' },
        failed: { color: 'bg-primary/20 text-primary border-primary/30', icon: <XCircle className="w-3 h-3" />, label: 'Failed' }
    }

    const variant = variants[status] || variants.pending

    return (
        <Badge variant="outline" className={variant.color}>
            {variant.icon}
            <span className="ml-1">{variant.label}</span>
        </Badge>
    )
}

interface ShotQueueItemProps {
    shot: StoryShot
    index: number
    isCurrent: boolean
    isComplete: boolean
    isPending: boolean
}

function ShotQueueItem({ shot, isCurrent, isComplete }: ShotQueueItemProps) {
    const variationCount = getVariationCount(shot.prompt)
    const hasBrackets = variationCount > 1

    return (
        <Card className={`p-3 ${isCurrent ? 'bg-secondary border-border' : 'bg-card border-border'}`}>
            <div className="flex items-center gap-3">
                {/* Status Icon */}
                <div className="flex-shrink-0">
                    {isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : isCurrent ? (
                        <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-border" />
                    )}
                </div>

                {/* Shot Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-muted-foreground">
                            Shot {shot.sequence_number}
                        </span>
                        {shot.chapter && (
                            <Badge variant="outline" className="text-xs">
                                {shot.chapter}
                            </Badge>
                        )}
                        {hasBrackets && (
                            <Badge
                                variant="outline"
                                className="text-xs bg-orange-900/30 text-orange-400 border-orange-700"
                            >
                                <Layers className="w-3 h-3 mr-1" />
                                {variationCount}
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-foreground truncate mt-1">
                        {shot.prompt}
                    </p>
                </div>

                {/* Thumbnail Preview */}
                {isComplete && shot.gallery_id && (
                    <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                    </div>
                )}

                {/* Status Badge */}
                <div className="flex-shrink-0">
                    {isComplete && <ShotStatusBadge status={shot.status} />}
                </div>
            </div>
        </Card>
    )
}

interface ShotStatusBadgeProps {
    status: string
}

function ShotStatusBadge({ status }: ShotStatusBadgeProps) {
    const variants: Record<string, { color: string; label: string }> = {
        completed: { color: 'bg-green-900/30 text-emerald-400', label: 'Done' },
        failed: { color: 'bg-primary/20 text-primary', label: 'Failed' },
        generating: { color: 'bg-blue-900/30 text-accent', label: 'Generating' },
        ready: { color: 'bg-secondary text-muted-foreground', label: 'Ready' }
    }

    const variant = variants[status] || variants.ready

    return (
        <Badge className={`${variant.color} text-xs`}>
            {variant.label}
        </Badge>
    )
}
