/**
 * Video Gallery Component
 * Displays generated videos with real-time updates
 */

'use client'

import { useGallery } from '../hooks/useGallery'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Trash2, RefreshCw } from 'lucide-react'

export function VideoGallery() {
  const { videos, isLoading, error, deleteVideo, refreshVideos } = useGallery()

  const handleDelete = async (videoId: string) => {
    if (confirm('Are you sure you want to delete this video?')) {
      const success = await deleteVideo(videoId)
      if (success) {
        console.log('Video deleted successfully')
      }
    }
  }

  if (isLoading && videos.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
        <span className="ml-2">Loading videos...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-primary">
        <p>Error: {error}</p>
        <Button onClick={refreshVideos} className="mt-2">
          Try Again
        </Button>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No videos yet. Generate your first video to see it here!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Video Gallery ({videos.length})</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshVideos}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <div
            key={video.id}
            className="border rounded-lg overflow-hidden bg-card"
          >
            <div className="aspect-video bg-muted relative">
              {video.status === 'processing' ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <LoadingSpinner size="lg" />
                  <span className="ml-2">Processing...</span>
                </div>
              ) : video.status === 'failed' ? (
                <div className="absolute inset-0 flex items-center justify-center text-primary">
                  <span>Failed to generate</span>
                </div>
              ) : (
                <video
                  src={video.videoUrl}
                  controls
                  className="w-full h-full object-cover"
                  poster={video.thumbnailUrl}
                />
              )}
            </div>

            <div className="p-4">
              <h3 className="font-semibold truncate" title={video.shotName}>
                {video.shotName}
              </h3>
              <p className="text-sm text-muted-foreground">
                Model: {video.model}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(video.createdAt).toLocaleString()}
              </p>

              <div className="mt-3 flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(video.id)}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
                {video.status === 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex-1"
                  >
                    <a href={video.videoUrl} download>
                      Download
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
