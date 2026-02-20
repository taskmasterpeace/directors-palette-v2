'use client'

import React, { useEffect, useRef, useState } from 'react'
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
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [isOpen, onClose])

  const resetHideTimer = () => {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowControls(false), 3000)
  }

  const handleDownload = async () => {
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
      toast.error('Could not download video. Please try again.')
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200"
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
    >
      {/* Backdrop — deep black with subtle blur */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Top bar — fades with controls */}
      <div className={`absolute top-0 inset-x-0 z-20 flex items-center justify-end gap-2 p-4 bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDownload}
          className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-all"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-all"
          title="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Video — centered with breathing room */}
      <div className="relative z-10 w-full h-full flex items-center justify-center p-6 sm:p-12">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          autoPlay
          className="max-w-full max-h-full rounded-lg shadow-[0_0_80px_rgba(0,0,0,0.6)]"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )
}
