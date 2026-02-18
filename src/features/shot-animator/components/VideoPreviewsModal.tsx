'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, Download, Maximize2, Grid3x3, List } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FullscreenVideoModal } from "./FullscreenVideoModal"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pagination } from "@/features/shot-creator/components/unified-gallery/Pagination"
import { VideoGalleryService } from "../services/gallery.service"
import type { GeneratedVideo } from "../types"
import { toast } from 'sonner'

type ViewMode = 'grid' | 'list'

interface VideoPreviewsModalProps {
    isOpen: boolean
    onClose: () => void
}

const VideoPreviewsModal = ({ isOpen, onClose }: VideoPreviewsModalProps) => {
    const [videos, setVideos] = useState<GeneratedVideo[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [playingVideo, setPlayingVideo] = useState<string | null>(null)
    const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<ViewMode>('grid')
    const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({})
    const pageSize = 6

    // Load videos with pagination
    useEffect(() => {
        if (!isOpen) return

        const loadVideos = async () => {
            setIsLoading(true)
            try {
                const result = await VideoGalleryService.loadUserVideosPaginated(currentPage, pageSize)
                setVideos(result.videos)
                setTotalPages(result.totalPages)
            } catch (error) {
                console.error('Failed to load videos:', error)
            } finally {
                setIsLoading(false)
            }
        }

        loadVideos()
    }, [isOpen, currentPage])

    const handleCancel = () => {
        // Pause all videos when closing
        Object.values(videoRefs.current).forEach(video => {
            if (video) {
                video.pause()
                video.currentTime = 0
            }
        })
        setPlayingVideo(null)
        onClose()
    }

    const togglePlayPause = (videoId: string) => {
        const video = videoRefs.current[videoId]
        if (!video) return

        if (playingVideo === videoId) {
            video.pause()
            setPlayingVideo(null)
        } else {
            // Pause all other videos
            Object.entries(videoRefs.current).forEach(([id, v]) => {
                if (id !== videoId && v) {
                    v.pause()
                    v.currentTime = 0
                }
            })
            video.play()
            setPlayingVideo(videoId)
        }
    }

    const handleDownload = async (videoUrl: string, videoId: string) => {
        try {
            const response = await fetch(videoUrl)
            const blob = await response.blob()
            const blobUrl = URL.createObjectURL(blob)

            const link = document.createElement('a')
            link.href = blobUrl
            link.download = `reference_${videoId}.mp4`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            URL.revokeObjectURL(blobUrl)
        } catch (error) {
            console.error('Failed to download video:', error)
            toast.error('Could not download video. Please try again.')
        }
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="w-full max-w-6xl bg-background border-border text-white safe-bottom">
                    <DialogHeader>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-3">
                            <div>
                                <DialogTitle>Video Gallery</DialogTitle>
                                <DialogDescription className="text-muted-foreground">
                                    Explore your AI-generated videos and find inspiration for your next creation.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* View Mode Toggle */}
                    <div className="my-2 flex justify-end px-4 sm:px-0 sm:pr-4">
                        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'list')}>
                            <TabsList className="bg-card border border-border rounded-lg h-11 sm:h-9 touch-manipulation">
                                <TabsTrigger
                                    value="grid"
                                    className="flex items-center gap-2 px-4 sm:px-3 min-h-[44px] sm:min-h-0 data-[state=active]:bg-primary data-[state=active]:text-white text-foreground"
                                >
                                    <Grid3x3 className="w-4 h-4" />
                                    Grid
                                </TabsTrigger>
                                <TabsTrigger
                                    value="list"
                                    className="flex items-center gap-2 px-4 sm:px-3 min-h-[44px] sm:min-h-0 data-[state=active]:bg-primary data-[state=active]:text-white text-foreground"
                                >
                                    <List className="w-4 h-4" />
                                    List
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    <ScrollArea className="h-[60vh] sm:h-[500px] px-2 sm:px-0 sm:pr-4">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <LoadingSpinner size="lg" className="mb-4" />
                                <p>Loading videos...</p>
                            </div>
                        ) : videos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <Play className="w-16 h-16 mb-4" />
                                <p>No videos in gallery</p>
                                <p className="text-sm mt-2">Generate some videos to see them here</p>
                            </div>
                        ) : (
                            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-4 sm:p-0' : 'flex flex-col gap-3 sm:gap-4 p-4 sm:p-0'}>
                                {videos.map((video) => {
                                    const isPlaying = playingVideo === video.id
                                    return (
                                        <div
                                            key={video.id}
                                            className={`relative group rounded-lg overflow-hidden border-2 transition-all touch-manipulation ${isPlaying
                                                ? 'border-primary ring-2 ring-ring/30'
                                                : 'border-border hover:border-border'
                                                } ${viewMode === 'list' ? 'flex flex-col sm:flex-row' : ''}`}
                                        >
                                            {/* Video Preview */}
                                            <div className={`relative bg-card rounded-lg overflow-hidden ${viewMode === 'grid' ? 'aspect-video' : 'w-full sm:w-64 aspect-video sm:h-36'}`}>
                                                <video
                                                    ref={(el) => {
                                                        videoRefs.current[video.id] = el
                                                    }}
                                                    src={video.videoUrl}
                                                    className="w-full h-full object-cover cursor-pointer"
                                                    playsInline
                                                    preload="metadata"
                                                    onClick={() => togglePlayPause(video.id)}
                                                />

                                                {/* Overlay */}
                                                <div
                                                    className={`absolute inset-0 transition-opacity ${isPlaying ? 'bg-primary/10' : 'bg-black/30 group-hover:bg-black/20'}`}
                                                    onClick={() => togglePlayPause(video.id)}
                                                />

                                                {/* Hover Controls - Top Right */}
                                                <div className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                                                    <div className="flex gap-2 bg-black/80 rounded-lg p-1.5 sm:p-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setFullscreenVideo(video.videoUrl)
                                                                onClose()
                                                            }}
                                                            className="h-10 w-10 sm:h-5 sm:w-5 text-white hover:bg-white/20 touch-manipulation"
                                                            aria-label="View fullscreen"
                                                        >
                                                            <Maximize2 className="h-5 w-5 sm:h-3 sm:w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDownload(video.videoUrl, video.id)
                                                            }}
                                                            className="h-10 w-10 sm:h-5 sm:w-5 text-white hover:bg-white/20 touch-manipulation"
                                                            aria-label="Download video"
                                                        >
                                                            <Download className="h-5 w-5 sm:h-3 sm:w-3" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Play/Pause Icon - Center */}
                                                <div
                                                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                                    onClick={() => togglePlayPause(video.id)}
                                                >
                                                    {!isPlaying && (
                                                        <div className="w-16 h-16 sm:w-16 sm:h-16 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors pointer-events-auto cursor-pointer touch-manipulation">
                                                            <Play className="h-8 w-8 sm:h-8 sm:w-8 text-white ml-1" fill="white" />
                                                        </div>
                                                    )}
                                                    {isPlaying && (
                                                        <div className="w-16 h-16 sm:w-16 sm:h-16 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100 pointer-events-auto cursor-pointer touch-manipulation">
                                                            <Pause className="h-8 w-8 sm:h-8 sm:w-8 text-white" fill="white" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Video Info */}
                                            <div className={`bg-card/90 ${viewMode === 'grid' ? 'p-3 sm:p-2' : 'flex-1 p-4 flex flex-col justify-center'}`}>
                                                <p className={`text-foreground ${viewMode === 'grid' ? 'text-sm sm:text-xs truncate' : 'text-sm font-medium mb-1'}`}>
                                                    {video.shotName}
                                                </p>
                                                {viewMode === 'list' && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(video.createdAt).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </ScrollArea>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-4 px-4 sm:px-0">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}

                    <DialogFooter className="gap-2 px-4 sm:px-6">
                        <Button
                            variant="outline"
                            onClick={handleCancel}
                            className="bg-card border-border min-h-[44px] touch-manipulation w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Fullscreen Modal */}
            {fullscreenVideo && (
                <FullscreenVideoModal
                    videoUrl={fullscreenVideo}
                    isOpen={!!fullscreenVideo}
                    onClose={() => setFullscreenVideo(null)}
                />
            )}
        </>
    )
}

export default VideoPreviewsModal
