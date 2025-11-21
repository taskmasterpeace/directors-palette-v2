'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Pause, Play, CheckCircle2, XCircle, Loader2, Image as ImageIcon } from 'lucide-react'
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
    if (!queue) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-slate-400">No active generation queue.</p>
                <p className="text-sm text-slate-500 mt-2">
                    Click Generate All in the Shots Review tab to start.
                </p>
            </div>
        )
    }

    const isPaused = queue.status === 'paused'
    const isProcessing = queue.status === 'processing'
    const isCompleted = queue.status === 'completed'

    return (
        <div className="space-y-6">
            {/* Queue Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">
                        Generation Progress
                    </h3>
                    <p className="text-sm text-slate-400">
                        {queue.current_shot_index + 1} of {queue.shot_ids.length} shots
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
            <div className="space-y-2 p-4 bg-slate-800 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Overall Progress</span>
                    <span className="text-slate-400">{Math.round(queue.progress)}%</span>
                </div>
                <Progress value={queue.progress} className="h-2" />
                {queue.error_message && (
                    <p className="text-xs text-red-400 mt-2">{queue.error_message}</p>
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
        pending: { color: 'bg-slate-700 text-slate-300', icon: <Loader2 className="w-3 h-3" />, label: 'Pending' },
        processing: { color: 'bg-blue-900/30 text-blue-400 border-blue-800', icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Processing' },
        paused: { color: 'bg-yellow-900/30 text-yellow-400 border-yellow-800', icon: <Pause className="w-3 h-3" />, label: 'Paused' },
        completed: { color: 'bg-green-900/30 text-green-400 border-green-800', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Completed' },
        failed: { color: 'bg-red-900/30 text-red-400 border-red-800', icon: <XCircle className="w-3 h-3" />, label: 'Failed' }
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
    return (
        <Card className={`p-3 ${isCurrent ? 'bg-slate-700 border-slate-600' : 'bg-slate-800 border-slate-700'}`}>
            <div className="flex items-center gap-3">
                {/* Status Icon */}
                <div className="flex-shrink-0">
                    {isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : isCurrent ? (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-600" />
                    )}
                </div>

                {/* Shot Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500">
                            Shot {shot.sequence_number}
                        </span>
                        {shot.chapter && (
                            <Badge variant="outline" className="text-xs">
                                {shot.chapter}
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-slate-300 truncate mt-1">
                        {shot.prompt}
                    </p>
                </div>

                {/* Thumbnail Preview */}
                {isComplete && shot.gallery_id && (
                    <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded bg-slate-700 flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-slate-500" />
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
        completed: { color: 'bg-green-900/30 text-green-400', label: 'Done' },
        failed: { color: 'bg-red-900/30 text-red-400', label: 'Failed' },
        generating: { color: 'bg-blue-900/30 text-blue-400', label: 'Generating' },
        ready: { color: 'bg-slate-700 text-slate-400', label: 'Ready' }
    }

    const variant = variants[status] || variants.ready

    return (
        <Badge className={`${variant.color} text-xs`}>
            {variant.label}
        </Badge>
    )
}
