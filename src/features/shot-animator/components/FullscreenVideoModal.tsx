'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { X, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface FullscreenVideoModalProps {
  videoUrl: string
  isOpen: boolean
  onClose: () => void
  onDelete?: () => void
  title?: string
  modelIcon?: string
}

export function FullscreenVideoModal({
  videoUrl,
  isOpen,
  onClose,
  onDelete,
  title,
  modelIcon
}: FullscreenVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showControls, setShowControls] = useState(true)
  const [isEntering, setIsEntering] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const resetHideTimer = useCallback(() => {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsEntering(true))

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      const handleMouseMove = () => resetHideTimer()

      document.addEventListener('keydown', handleEscape)
      document.addEventListener('mousemove', handleMouseMove)
      document.body.style.overflow = 'hidden'
      resetHideTimer()

      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.removeEventListener('mousemove', handleMouseMove)
        document.body.style.overflow = 'unset'
        if (hideTimer.current) clearTimeout(hideTimer.current)
        setIsEntering(false)
      }
    }
  }, [isOpen, onClose, resetHideTimer])

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/95 backdrop-blur-xl transition-opacity duration-300 ${isEntering ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Top bar */}
      <div className={`absolute top-0 inset-x-0 z-20 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
        {/* Left: title info */}
        <div className="flex items-center gap-2.5 min-w-0">
          {modelIcon && (
            <span className="text-lg shrink-0">{modelIcon}</span>
          )}
          {title && (
            <span className="text-sm text-white/60 truncate max-w-[300px] font-medium">{title}</span>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="h-9 w-9 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.15] hover:border-white/[0.15] transition-all duration-200"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-9 w-9 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/[0.08] text-white/70 hover:text-red-400 hover:bg-red-500/[0.12] hover:border-red-500/20 transition-all duration-200"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.15] hover:border-white/[0.15] transition-all duration-200"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ESC hint — shows briefly then fades */}
      <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-20 transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
        <span className="text-[11px] text-white/30 font-medium tracking-wider uppercase">esc to close</span>
      </div>

      {/* Video container */}
      <div className={`relative z-10 w-full h-full flex items-center justify-center p-8 sm:p-14 transition-all duration-500 ease-out ${isEntering ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97]'}`}>
        <div className="relative max-w-full max-h-full">
          {/* Ambient glow behind video */}
          <div className="absolute -inset-4 bg-white/[0.03] rounded-2xl blur-2xl" />
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            className="relative max-w-full max-h-[calc(100vh-7rem)] rounded-lg ring-1 ring-white/[0.08] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  )
}
