'use client'

import React, { useState } from 'react'
import { Download, Trash2, Film, Maximize2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface GeneratedVideo {
  id: string
  videoUrl: string
  thumbnailUrl?: string
  shotName: string
  model: string
  createdAt: Date
  status: 'processing' | 'completed' | 'failed'
  progress?: number
}

interface AnimatorUnifiedGalleryProps {
  videos: GeneratedVideo[]
  onDelete?: (id: string) => void
  onDownload?: (videoUrl: string) => void
}

export function AnimatorUnifiedGallery({
  videos,
  onDelete,
  onDownload
}: AnimatorUnifiedGalleryProps) {
  const [fullscreenVideo, setFullscreenVideo] = useState<GeneratedVideo | null>(null)

  const completedVideos = videos.filter(v => v.status === 'completed')

  return (
    <div className="h-full flex flex-col bg-slate-900/30 border-l border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-medium flex items-center gap-2">
            <Film className="w-4 h-4 text-red-400" />
            Unified Gallery
          </h3>
          <Badge variant="outline" className="border-red-600 text-red-400">
            {completedVideos.length} videos
          </Badge>
        </div>
        <p className="text-xs text-slate-400">All generated videos</p>
      </div>

      {/* Videos Grid - 2 Columns */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {completedVideos.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {completedVideos.map((video) => (
                <div
                  key={video.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition-colors"
                >
                  {/* Thumbnail/Video Preview */}
                  <div className="relative aspect-video bg-slate-900">
                      <video
                        src={video.videoUrl}
                        controls
                        className="w-full h-full"
                      />
                  </div>

                  {/* Info & Actions */}
                  <div className="p-2">
                    <p className="text-xs text-white truncate mb-1">{video.shotName}</p>
                    <p className="text-xs text-slate-500 mb-2">{video.model}</p>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-4 gap-1">
                      {/* Download Button */}
                      {onDownload && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDownload(video.videoUrl)}
                          className="h-7 w-full text-green-400 hover:text-green-300 hover:bg-green-950/30"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {/* Zoom/Fullscreen Button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setFullscreenVideo(video)}
                        className="h-7 w-full text-blue-400 hover:text-blue-300 hover:bg-blue-950/30"
                        title="Fullscreen"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </Button>

                      {/* Delete Button */}
                      {onDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDelete(video.id)}
                          className="h-7 w-full text-red-400 hover:text-red-300 hover:bg-red-950/30"
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
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Film className="w-12 h-12 mb-3" />
              <p className="text-sm">No videos generated yet</p>
              <p className="text-xs mt-1">Generated videos will appear here</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Fullscreen Video Modal */}
      <Dialog open={!!fullscreenVideo} onOpenChange={() => setFullscreenVideo(null)}>
        <DialogContent className="max-w-7xl w-[95vw] h-[95vh] bg-black/95 border-slate-700 p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{fullscreenVideo?.shotName || 'Video Player'}</DialogTitle>
          </DialogHeader>
          {fullscreenVideo && (
            <div className="relative w-full h-full flex flex-col">
              {/* Video Info */}
              <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-white font-medium">{fullscreenVideo.shotName}</p>
                <p className="text-slate-300 text-sm">{fullscreenVideo.model}</p>
              </div>

              {/* Video Player */}
              <div className="flex-1 flex items-center justify-center p-4">
                <video
                  src={fullscreenVideo.videoUrl}
                  controls
                  autoPlay
                  className="max-w-full max-h-full rounded"
                />
              </div>

              {/* Bottom Actions */}
              <div className="absolute bottom-4 right-4 z-10 flex gap-2">
                {onDownload && (
                  <Button
                    onClick={() => onDownload(fullscreenVideo.videoUrl)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                )}
                {onDelete && (
                  <Button
                    onClick={() => {
                      onDelete(fullscreenVideo.id)
                      setFullscreenVideo(null)
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
