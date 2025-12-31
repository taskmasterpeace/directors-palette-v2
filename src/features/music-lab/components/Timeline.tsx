'use client'

/**
 * Timeline Editor Component
 * 
 * Visual timeline for placing shots on a music track.
 */

import { useRef, useEffect, useState } from 'react'
import { Play, Pause, ZoomIn, ZoomOut, SkipBack } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useTimelineStore } from '../store/timeline.store'
import { cn } from '@/utils/utils'

interface TimelineProps {
    className?: string
}

export function Timeline({ className }: TimelineProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const audioRef = useRef<HTMLAudioElement>(null)
    const [containerWidth, setContainerWidth] = useState(0)

    const {
        audioUrl,
        duration,
        currentTime,
        isPlaying,
        zoom,
        sectionMarkers,
        shots,
        selectedShotId,
        setCurrentTime,
        setPlaying,
        setZoom,
        setDuration,
        selectShot
    } = useTimelineStore()

    // Calculate timeline width based on zoom
    const timelineWidth = containerWidth * zoom

    // Pixels per second
    const pixelsPerSecond = duration > 0 ? timelineWidth / duration : 0

    // Handle container resize
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth)
            }
        }
        updateWidth()
        window.addEventListener('resize', updateWidth)
        return () => window.removeEventListener('resize', updateWidth)
    }, [])

    // Sync audio playback
    useEffect(() => {
        if (!audioRef.current) return

        if (isPlaying) {
            audioRef.current.play().catch((error) => {
                console.error('Audio playback failed:', error)
                setPlaying(false)
            })
        } else {
            audioRef.current.pause()
        }
    }, [isPlaying, setPlaying])

    // Update time from audio
    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
        const handleLoadedMetadata = () => setDuration(audio.duration)
        const handleEnded = () => setPlaying(false)

        audio.addEventListener('timeupdate', handleTimeUpdate)
        audio.addEventListener('loadedmetadata', handleLoadedMetadata)
        audio.addEventListener('ended', handleEnded)

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate)
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
            audio.removeEventListener('ended', handleEnded)
        }
    }, [setCurrentTime, setDuration, setPlaying])

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!duration || !pixelsPerSecond) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const time = x / pixelsPerSecond
        setCurrentTime(Math.max(0, Math.min(duration, time)))
        if (audioRef.current) {
            audioRef.current.currentTime = time
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            {/* Hidden Audio Element */}
            {audioUrl && (
                <audio ref={audioRef} src={audioUrl} preload="metadata" />
            )}

            {/* Controls */}
            <div className="flex items-center gap-2">
                <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                        setCurrentTime(0)
                        if (audioRef.current) audioRef.current.currentTime = 0
                    }}
                >
                    <SkipBack className="w-4 h-4" />
                </Button>

                <Button
                    size="icon"
                    variant={isPlaying ? 'default' : 'outline'}
                    onClick={() => setPlaying(!isPlaying)}
                    disabled={!audioUrl}
                >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>

                <span className="text-sm font-mono min-w-[80px]">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                <div className="flex-1" />

                <Button size="icon" variant="outline" onClick={() => setZoom(zoom - 0.5)}>
                    <ZoomOut className="w-4 h-4" />
                </Button>

                <Slider
                    value={[zoom]}
                    min={1}
                    max={10}
                    step={0.5}
                    onValueChange={([v]) => setZoom(v)}
                    className="w-24"
                />

                <Button size="icon" variant="outline" onClick={() => setZoom(zoom + 0.5)}>
                    <ZoomIn className="w-4 h-4" />
                </Button>
            </div>

            {/* Timeline */}
            <div
                ref={containerRef}
                className="relative h-32 bg-muted rounded-lg overflow-x-auto"
            >
                <div
                    className="relative h-full"
                    style={{ width: timelineWidth || '100%' }}
                    onClick={handleSeek}
                >
                    {/* Section Markers */}
                    <div className="absolute inset-x-0 top-0 h-6">
                        {sectionMarkers.map(marker => (
                            <div
                                key={marker.id}
                                className="absolute top-0 h-full flex items-center justify-center text-xs font-medium text-white"
                                style={{
                                    left: marker.startTime * pixelsPerSecond,
                                    width: (marker.endTime - marker.startTime) * pixelsPerSecond,
                                    backgroundColor: marker.color
                                }}
                            >
                                {marker.label}
                            </div>
                        ))}
                    </div>

                    {/* Shot Blocks */}
                    <div className="absolute inset-x-0 top-8 bottom-0">
                        {shots.map(shot => (
                            <div
                                key={shot.id}
                                className={cn(
                                    'absolute top-1 bottom-1 rounded cursor-pointer transition-all',
                                    'bg-primary/80 hover:bg-primary border-2',
                                    selectedShotId === shot.id ? 'border-white ring-2 ring-white/50' : 'border-transparent'
                                )}
                                style={{
                                    left: shot.startTime * pixelsPerSecond,
                                    width: Math.max(20, (shot.endTime - shot.startTime) * pixelsPerSecond)
                                }}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    selectShot(shot.id)
                                }}
                            >
                                {shot.previewImageUrl && (
                                    <img
                                        src={shot.previewImageUrl}
                                        alt=""
                                        className="w-full h-full object-cover rounded"
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Playhead */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                        style={{ left: currentTime * pixelsPerSecond }}
                    >
                        <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rotate-45" />
                    </div>
                </div>
            </div>

            {/* Time Ruler (simplified) */}
            <div className="flex text-xs text-muted-foreground">
                <span>0:00</span>
                <span className="flex-1 text-center">{formatTime(duration / 2)}</span>
                <span>{formatTime(duration)}</span>
            </div>
        </div>
    )
}
