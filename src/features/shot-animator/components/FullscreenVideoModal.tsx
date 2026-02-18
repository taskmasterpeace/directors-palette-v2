'use client'

import React, { useEffect, useRef } from 'react'
import { X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface FullscreenVideoModalProps {
  videoUrl: string
  isOpen: boolean
  onClose: () => void
}

export function FullscreenVideoModal({
  videoUrl,
  isOpen,
  onClose
}: FullscreenVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleDownload = async (videoUrl: string, videoId: string) => {
    try {
      // Fetch the video as a blob
      const response = await fetch(videoUrl)
      const blob = await response.blob()

      // Create a temporary URL for the blob
      const blobUrl = URL.createObjectURL(blob)

      // Create and trigger download
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `reference_${videoId}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Failed to download video:', error)
      toast.error('Could not download video. Please try again.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-card/80 hover:bg-secondary text-white"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Download button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleDownload(videoUrl, 'fullscreen')}
        className="absolute top-4 right-16 z-50 h-10 w-10 rounded-full bg-card/80 hover:bg-secondary text-white"
      >
        <Download className="h-5 w-5" />
      </Button>

      {/* Video container */}
      <div className="w-full h-full flex items-center justify-center p-8">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          autoPlay
          className="max-w-full max-h-full rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Click outside to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  )
}
