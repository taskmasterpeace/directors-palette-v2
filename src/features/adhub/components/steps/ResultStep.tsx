'use client'

import React, { useEffect, useState } from 'react'
import { Download, RefreshCw, Home, ExternalLink, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAdhubStore } from '../../store/adhub.store'

export function ResultStep() {
  const {
    generationResult,
    selectedBrand,
    selectedTemplate,
    selectedStyle,
    reset,
    resetToStep,
  } = useAdhubStore()

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Your Ad is Ready!</h2>
        <p className="text-muted-foreground mt-1">
          Your ad has been generated and saved to your gallery.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Image Preview */}
        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden bg-muted/30 aspect-square flex items-center justify-center">
            {isLoading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
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

          {/* Actions */}
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

        {/* Details */}
        <div className="space-y-4">
          {/* Summary */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-medium">Generation Details</h3>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Brand</p>
                <p className="font-medium">{selectedBrand?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Template</p>
                <p className="font-medium">{selectedTemplate?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Style</p>
                <p className="font-medium">{selectedStyle?.displayName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ad ID</p>
                <p className="font-mono text-xs">{generationResult.adId?.slice(0, 8)}...</p>
              </div>
            </div>
          </div>

          {/* Generated Prompt */}
          <div className="border rounded-lg p-4 space-y-2">
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
          <div className="border rounded-lg p-4 space-y-3">
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
