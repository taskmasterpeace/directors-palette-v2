'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Download, Trash2, Film, Maximize2, X } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ShotAnimationConfig } from '../types'
import { getVideoModelIcon } from '../config/models.config'
import { toast } from 'sonner'

interface DerivedVideo {
  galleryId: string
  videoUrl: string
  shotName: string
  createdAt: Date
  model?: string
}

interface AnimatorUnifiedGalleryProps {
  shotConfigs: ShotAnimationConfig[]
  onDelete?: (galleryId: string) => void
  onDownload?: (videoUrl: string) => void
}

export function AnimatorUnifiedGallery({
  shotConfigs,
  onDelete,
  onDownload
}: AnimatorUnifiedGalleryProps) {
  const [fullscreenVideo, setFullscreenVideo] = useState<DerivedVideo | null>(null)
  const [showControls, setShowControls] = useState(true)
  const [isEntering, setIsEntering] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Derive completed videos from shotConfigs
  const completedVideos: DerivedVideo[] = []
  shotConfigs.forEach(config => {
    config.generatedVideos?.forEach(video => {
      if (video.status === 'completed' && video.videoUrl) {
        completedVideos.push({
          galleryId: video.galleryId,
          videoUrl: video.videoUrl,
          shotName: config.imageName,
          createdAt: video.createdAt instanceof Date ? video.createdAt : new Date(video.createdAt),
          model: video.model,
        })
      }
    })
  })

  // Sort newest first
  completedVideos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  // Fullscreen control auto-hide
  const resetHideTimer = useCallback(() => {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  // Open fullscreen
  const openFullscreen = (video: DerivedVideo) => {
    setFullscreenVideo(video)
    requestAnimationFrame(() => setIsEntering(true))
    document.body.style.overflow = 'hidden'
    resetHideTimer()
  }

  // Close fullscreen
  const closeFullscreen = useCallback(() => {
    setIsEntering(false)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setTimeout(() => {
      setFullscreenVideo(null)
      document.body.style.overflow = 'unset'
    }, 200)
  }, [])

  // Keyboard + mouse listeners for fullscreen
  useEffect(() => {
    if (!fullscreenVideo) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFullscreen()
    }
    const handleMouseMove = () => resetHideTimer()

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousemove', handleMouseMove)
      document.body.style.overflow = 'unset'
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [fullscreenVideo, closeFullscreen, resetHideTimer])

  const handleDownloadBlob = async (videoUrl: string) => {
    try {
      const response = await fetch(videoUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `video_${Date.now()}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      toast.error('Could not download video.')
    }
  }

  return (
    <div className="h-full flex flex-col bg-background/30 border-l border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-medium flex items-center gap-2">
            <Film className="w-4 h-4 text-primary" />
            Video Gallery
          </h3>
          <Badge variant="outline" className="border-primary text-primary">
            {completedVideos.length} videos
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">All generated videos</p>
      </div>

      {/* Videos Grid - 2 Columns */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {completedVideos.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {completedVideos.map((video) => (
                <div
                  key={video.galleryId}
                  className="bg-card/50 border border-border rounded-lg overflow-hidden hover:border-border transition-colors"
                >
                  {/* Video Preview */}
                  <div className="relative aspect-video bg-background">
                      <video
                        src={video.videoUrl}
                        controls
                        className="w-full h-full"
                      />
                      {video.model && (
                        <span className="absolute top-1 left-1 text-sm drop-shadow-lg pointer-events-none">
                          {getVideoModelIcon(video.model)}
                        </span>
                      )}
                  </div>

                  {/* Info & Actions */}
                  <div className="p-2">
                    <p className="text-xs text-white truncate mb-2">{video.shotName}</p>

                    {/* Action Buttons */}
                    <div className="flex gap-1">
                      {onDownload && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDownload(video.videoUrl)}
                          className="h-7 w-7 text-muted-foreground hover:text-white hover:bg-white/10"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openFullscreen(video)}
                        className="h-7 w-7 text-accent hover:text-blue-300 hover:bg-blue-950/30"
                        title="Fullscreen"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </Button>

                      {onDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDelete(video.galleryId)}
                          className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Film className="w-12 h-12 mb-3" />
              <p className="text-sm">No videos generated yet</p>
              <p className="text-xs mt-1">Generated videos will appear here</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Fullscreen Video Overlay */}
      {fullscreenVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/95 backdrop-blur-xl transition-opacity duration-300 ${isEntering ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeFullscreen}
          />

          {/* Top bar */}
          <div className={`absolute top-0 inset-x-0 z-20 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
            {/* Left: video info */}
            <div className="flex items-center gap-2.5 min-w-0">
              {fullscreenVideo.model && (
                <span className="text-lg shrink-0">{getVideoModelIcon(fullscreenVideo.model)}</span>
              )}
              <span className="text-sm text-white/60 truncate max-w-[300px] font-medium">
                {fullscreenVideo.shotName}
              </span>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (onDownload) {
                    onDownload(fullscreenVideo.videoUrl)
                  } else {
                    handleDownloadBlob(fullscreenVideo.videoUrl)
                  }
                }}
                className="h-9 w-9 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.15] hover:border-white/[0.15] transition-all duration-200"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    onDelete(fullscreenVideo.galleryId)
                    closeFullscreen()
                  }}
                  className="h-9 w-9 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/[0.08] text-white/70 hover:text-red-400 hover:bg-red-500/[0.12] hover:border-red-500/20 transition-all duration-200"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={closeFullscreen}
                className="h-9 w-9 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.15] hover:border-white/[0.15] transition-all duration-200"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* ESC hint */}
          <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-20 transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
            <span className="text-[11px] text-white/30 font-medium tracking-wider uppercase">esc to close</span>
          </div>

          {/* Video */}
          <div className={`relative z-10 w-full h-full flex items-center justify-center p-8 sm:p-14 transition-all duration-500 ease-out ${isEntering ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97]'}`}>
            <div className="relative max-w-full max-h-full">
              <div className="absolute -inset-4 bg-white/[0.03] rounded-2xl blur-2xl" />
              <video
                src={fullscreenVideo.videoUrl}
                controls
                autoPlay
                className="relative max-w-full max-h-[calc(100vh-7rem)] rounded-lg ring-1 ring-white/[0.08] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
