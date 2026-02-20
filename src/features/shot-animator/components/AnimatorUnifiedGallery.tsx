'use client'

import React, { useState } from 'react'
import { Download, Trash2, Film, Maximize2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ShotAnimationConfig } from '../types'
import { getVideoModelIcon } from '../config/models.config'

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
                        onClick={() => setFullscreenVideo(video)}
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

      {/* Fullscreen Video Modal */}
      <Dialog open={!!fullscreenVideo} onOpenChange={() => setFullscreenVideo(null)}>
        <DialogContent className="max-w-6xl w-[94vw] h-[90vh] bg-black/95 backdrop-blur-md border-white/5 p-0 rounded-xl overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{fullscreenVideo?.shotName || 'Video Player'}</DialogTitle>
          </DialogHeader>
          {fullscreenVideo && (
            <div className="relative w-full h-full flex flex-col">
              {/* Top bar */}
              <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/50 to-transparent absolute top-0 inset-x-0 z-10">
                <div className="flex items-center gap-2">
                  {fullscreenVideo.model && (
                    <span className="text-base">{getVideoModelIcon(fullscreenVideo.model)}</span>
                  )}
                  <span className="text-sm text-white/70 truncate max-w-[300px]">{fullscreenVideo.shotName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {onDownload && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDownload(fullscreenVideo.videoUrl)}
                      className="h-8 w-8 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        onDelete(fullscreenVideo.galleryId)
                        setFullscreenVideo(null)
                      }}
                      className="h-8 w-8 rounded-full bg-white/10 text-white/70 hover:text-red-400 hover:bg-red-500/10"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Video Player */}
              <div className="flex-1 flex items-center justify-center p-8 pt-14">
                <video
                  src={fullscreenVideo.videoUrl}
                  controls
                  autoPlay
                  className="max-w-full max-h-full rounded-lg shadow-[0_0_60px_rgba(0,0,0,0.5)]"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
