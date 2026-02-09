'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  Download,
  RefreshCw,
  Home,
  ExternalLink,
  Copy,
  Check,
  Video,
  Loader2,
  AlertCircle,
  Play,
} from 'lucide-react'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { useAdhubStore } from '../../store/adhub.store'

type VideoStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'unknown'

export function ResultStep() {
  const {
    generationResult,
    selectedBrand,
    selectedTemplate,
    selectedStyle,
    videoAdConfig,
    setLipSyncResult,
    reset,
    resetToStep,
  } = useAdhubStore()

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Video polling state
  const [videoStatus, setVideoStatus] = useState<VideoStatus>('pending')
  const [videoUrl, setVideoUrl] = useState<string | null>(videoAdConfig.lipSyncVideoUrl)
  const [videoError, setVideoError] = useState<string | null>(videoAdConfig.lipSyncError)

  // Poll for video status
  const pollVideoStatus = useCallback(async (predictionId: string) => {
    try {
      const response = await fetch(`/api/generation/status/${predictionId}`)
      if (!response.ok) {
        if (response.status === 404) {
          setVideoStatus('unknown')
          return false
        }
        throw new Error('Failed to fetch status')
      }

      const data = await response.json()

      if (data.status === 'succeeded' && data.output) {
        const url = Array.isArray(data.output) ? data.output[0] : data.output
        setVideoUrl(url)
        setVideoStatus('succeeded')
        setLipSyncResult(predictionId, videoAdConfig.lipSyncGalleryId, url)
        return true // Stop polling
      } else if (data.status === 'failed') {
        setVideoStatus('failed')
        setVideoError(data.error || 'Video generation failed')
        setLipSyncResult(predictionId, videoAdConfig.lipSyncGalleryId, null, data.error)
        return true // Stop polling
      } else if (data.status === 'processing' || data.status === 'starting') {
        setVideoStatus('processing')
        return false // Continue polling
      }

      return false
    } catch (error) {
      console.error('Video status poll error:', error)
      return false
    }
  }, [videoAdConfig.lipSyncGalleryId, setLipSyncResult])

  // Poll for video completion
  useEffect(() => {
    // Only poll if video is enabled and we have a prediction ID but no URL yet
    if (!videoAdConfig.enabled || !videoAdConfig.lipSyncPredictionId) {
      return
    }

    // If we already have the video URL, use it
    if (videoAdConfig.lipSyncVideoUrl) {
      setVideoUrl(videoAdConfig.lipSyncVideoUrl)
      setVideoStatus('succeeded')
      return
    }

    // If there was an error, show it
    if (videoAdConfig.lipSyncError) {
      setVideoError(videoAdConfig.lipSyncError)
      setVideoStatus('failed')
      return
    }

    // Start polling
    setVideoStatus('processing')
    let pollCount = 0
    const maxPolls = 120 // 10 minutes at 5s intervals (lip-sync can take a while)

    const interval = setInterval(async () => {
      pollCount++
      const isDone = await pollVideoStatus(videoAdConfig.lipSyncPredictionId!)

      if (isDone || pollCount >= maxPolls) {
        clearInterval(interval)
        if (pollCount >= maxPolls && !isDone) {
          setVideoStatus('unknown')
        }
      }
    }, 5000)

    // Initial poll
    pollVideoStatus(videoAdConfig.lipSyncPredictionId)

    return () => clearInterval(interval)
  }, [videoAdConfig.enabled, videoAdConfig.lipSyncPredictionId, videoAdConfig.lipSyncVideoUrl, videoAdConfig.lipSyncError, pollVideoStatus])

  // Poll for image completion
  useEffect(() => {
    if (!generationResult?.galleryId) {
      setIsLoading(false)
      return
    }

    // If we already have the image URL, use it
    if (generationResult.imageUrl) {
      setImageUrl(generationResult.imageUrl)
      setIsLoading(false)
      return
    }

    // Poll the generation status
    let pollCount = 0
    const maxPolls = 60 // 5 minutes at 5s intervals

    const pollStatus = async () => {
      try {
        // This would need a status endpoint - for now just show loading
        // In production, you'd poll /api/generation/status/{predictionId}
        pollCount++
        if (pollCount >= maxPolls) {
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Failed to poll status:', error)
        setIsLoading(false)
      }
    }

    const interval = setInterval(pollStatus, 5000)
    return () => clearInterval(interval)
  }, [generationResult])

  const handleCopyPrompt = () => {
    if (generationResult?.prompt) {
      navigator.clipboard.writeText(generationResult.prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = async () => {
    if (!imageUrl) return

    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ad-${selectedBrand?.name || 'image'}-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download:', error)
    }
  }

  const handleVideoDownload = async () => {
    if (!videoUrl) return

    try {
      const response = await fetch(videoUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `video-ad-${selectedBrand?.name || 'video'}-${Date.now()}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download video:', error)
    }
  }

  const handleStartOver = () => {
    reset()
  }

  const handleNewWithSameBrand = () => {
    resetToStep('template')
  }

  if (!generationResult) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">No generation result available.</p>
        <Button variant="outline" onClick={handleStartOver} className="mt-4">
          Start Over
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Your Ad is Ready!</h2>
        <p className="text-muted-foreground mt-1">
          Your ad has been generated and saved to your gallery.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Previews */}
        <div className="space-y-6">
          {/* Image Preview */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Static Image
            </h3>
            <div className="rounded-xl border border-border/50 overflow-hidden bg-slate-800/30 aspect-square flex items-center justify-center">
              {isLoading ? (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Generating your ad...</p>
                  <p className="text-xs text-muted-foreground mt-1">This may take a minute</p>
                </div>
              ) : imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Generated Ad"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <p>Image will appear here once ready.</p>
                  <p className="text-xs mt-1">Check your gallery for the result.</p>
                </div>
              )}
            </div>

            {/* Image Actions */}
            <div className="flex gap-2">
              {imageUrl && (
                <Button onClick={handleDownload} variant="outline" className="flex-1 gap-2">
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              )}
              <Button
                onClick={() => window.open('/gallery', '_blank')}
                variant="outline"
                className="flex-1 gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View in Gallery
              </Button>
            </div>
          </div>

          {/* Video Preview - Only show if video ad was enabled */}
          {videoAdConfig.enabled && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Video Ad
                </h3>
              </div>

              <div className={cn(
                'rounded-xl border overflow-hidden aspect-video flex items-center justify-center',
                videoStatus === 'succeeded' && 'border-green-500/30 bg-green-500/5',
                videoStatus === 'failed' && 'border-red-500/30 bg-red-500/5',
                videoStatus !== 'succeeded' && videoStatus !== 'failed' && 'border-border/50 bg-slate-800/30'
              )}>
                {videoStatus === 'processing' || videoStatus === 'pending' ? (
                  <div className="text-center p-6">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                      <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Generating your video...
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Lip-sync videos typically take 2-5 minutes. You can navigate away and check back later.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-amber-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Processing
                    </div>
                  </div>
                ) : videoStatus === 'succeeded' && videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full object-contain"
                    poster={imageUrl || undefined}
                  >
                    Your browser does not support video playback.
                  </video>
                ) : videoStatus === 'failed' ? (
                  <div className="text-center p-6">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <p className="text-sm font-medium text-red-400 mb-1">
                      Video generation failed
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      {videoError || 'An error occurred during video generation.'}
                    </p>
                  </div>
                ) : (
                  <div className="text-center p-6 text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Video status unknown</p>
                    <p className="text-xs mt-1">Check your gallery for the result.</p>
                  </div>
                )}
              </div>

              {/* Video Actions */}
              {videoStatus === 'succeeded' && videoUrl && (
                <div className="flex gap-2">
                  <Button onClick={handleVideoDownload} variant="outline" className="flex-1 gap-2">
                    <Download className="w-4 h-4" />
                    Download Video
                  </Button>
                  <Button
                    onClick={() => window.open(videoUrl, '_blank')}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Open Full Screen
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Details */}
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3">
            <h3 className="font-medium">Generation Details</h3>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Brand</p>
                <p className="font-medium">{selectedBrand?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Template</p>
                <p className="font-medium">{selectedTemplate?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Style</p>
                <p className="font-medium">{selectedStyle?.displayName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Ad ID</p>
                <p className="font-mono text-xs">{generationResult.adId?.slice(0, 8)}...</p>
              </div>
            </div>

            {/* Video ad details */}
            {videoAdConfig.enabled && (
              <>
                <div className="border-t border-border/50 pt-3 mt-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Video Model</p>
                      <p className="font-medium text-amber-400">
                        {videoAdConfig.modelSettings.model === 'kling-avatar-v2-pro' ? 'Avatar Pro' : 'Avatar Standard'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Resolution</p>
                      <p className="font-medium">{videoAdConfig.modelSettings.resolution}</p>
                    </div>
                    {videoAdConfig.audioDurationSeconds && (
                      <div>
                        <p className="text-muted-foreground text-xs">Duration</p>
                        <p className="font-medium">{videoAdConfig.audioDurationSeconds.toFixed(1)}s</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground text-xs">Audio Source</p>
                      <p className="font-medium">{videoAdConfig.audioSource === 'tts' ? 'Text-to-Speech' : 'Uploaded'}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Generated Prompt */}
          <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Generated Prompt</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyPrompt}
                className="gap-1 text-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
              {generationResult.prompt}
            </p>
          </div>

          {/* Next Actions */}
          <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3">
            <h3 className="font-medium">What&apos;s Next?</h3>
            <div className="space-y-2">
              <Button
                onClick={handleNewWithSameBrand}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Create Another Ad (Same Brand)
              </Button>
              <Button
                onClick={handleStartOver}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <Home className="w-4 h-4" />
                Start Over (New Brand)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
