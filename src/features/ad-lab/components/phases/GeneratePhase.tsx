'use client'

import React, { useState, useMemo, useCallback, useRef } from 'react'
import {
  Video,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Play,
  X,
  Check,
} from 'lucide-react'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { useAdLabStore } from '../../store/ad-lab.store'
import { TotalScoreBadge, StatusBadge } from '../ScoreBar'
import type { AdPrompt, GenerationJob, GenerationJobStatus } from '../../types/ad-lab.types'

const IMAGE_MODEL = 'nano-banana-pro'
const VIDEO_MODEL = 'wan-2.2-i2v-fast'
const IMAGE_COST_PTS = 25  // nano-banana-pro = $0.25 = 25 pts
const VIDEO_COST_PTS = 16  // wan-2.2-i2v-fast = 16 pts/video
const POLL_INTERVAL = 3000

const STATUS_LABELS: Record<GenerationJobStatus, string> = {
  queued: 'Queued',
  generating_image: 'Creating opening frame...',
  image_done: 'Image ready',
  generating_video: 'Animating...',
  completed: 'Completed',
  failed: 'Failed',
}

const STATUS_ICONS: Record<GenerationJobStatus, React.ReactNode> = {
  queued: <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />,
  generating_image: <Loader2 className="w-4 h-4 animate-spin text-amber-400" />,
  image_done: <ImageIcon className="w-4 h-4 text-emerald-400" />,
  generating_video: <Loader2 className="w-4 h-4 animate-spin text-blue-400" />,
  completed: <CheckCircle2 className="w-4 h-4 text-green-400" />,
  failed: <XCircle className="w-4 h-4 text-red-400" />,
}

export function GeneratePhase() {
  const {
    prompts,
    grades,
    generationJobs,
    setGenerationJobs,
    updateGenerationJob,
    isGenerating,
    setIsGenerating,
    setError,
  } = useAdLabStore()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Default: all passing prompts selected, manual-review unchecked
    const passing = new Set<string>()
    for (const g of grades) {
      if (g.status === 'pass') passing.add(g.promptId)
    }
    return passing
  })

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const abortRef = useRef(false)

  const promptsWithGrades = useMemo(() => {
    return prompts.map(p => ({
      prompt: p,
      grade: grades.find(g => g.promptId === p.id)!,
    })).filter(item => item.grade)
  }, [prompts, grades])

  const selectedCount = selectedIds.size
  const imageCost = selectedCount * IMAGE_COST_PTS
  const videoCost = selectedCount * VIDEO_COST_PTS
  const totalCost = imageCost + videoCost

  const completedJobs = generationJobs.filter(j => j.status === 'completed')
  const hasResults = completedJobs.length > 0

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(prompts.map(p => p.id)))
  }

  const selectNone = () => {
    setSelectedIds(new Set())
  }

  const pollForVideo = useCallback(async (predictionId: string): Promise<{ url?: string; error?: string }> => {
    const maxAttempts = 120 // 6 minutes max
    for (let i = 0; i < maxAttempts; i++) {
      if (abortRef.current) return { error: 'Cancelled' }

      await new Promise(r => setTimeout(r, POLL_INTERVAL))

      try {
        const res = await fetch(`/api/generation/status/${predictionId}`)
        if (!res.ok) continue

        const data = await res.json()
        if (data.status === 'succeeded') {
          return { url: data.persistedUrl || data.output }
        }
        if (data.status === 'failed' || data.status === 'canceled') {
          return { error: data.error || 'Video generation failed' }
        }
      } catch {
        // Retry on network error
      }
    }
    return { error: 'Video generation timed out' }
  }, [])

  const generateForPrompt = useCallback(async (prompt: AdPrompt) => {
    if (abortRef.current) return

    // Step 1: Generate image
    updateGenerationJob(prompt.id, { status: 'generating_image' })

    try {
      const imageRes = await fetch('/api/generation/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: IMAGE_MODEL,
          prompt: prompt.openingFrame,
          modelSettings: {
            aspectRatio: prompt.aspectRatio,
            resolution: '1K',
            outputFormat: 'jpg',
          },
          waitForResult: true,
          extraMetadata: {
            source: 'ad-lab',
            promptId: prompt.id,
          },
        }),
      })

      if (!imageRes.ok) {
        const err = await imageRes.json()
        throw new Error(err.error || err.details || 'Image generation failed')
      }

      const imageData = await imageRes.json()
      if (imageData.status === 'failed') {
        throw new Error(imageData.error || 'Image generation failed')
      }

      const imageUrl = imageData.imageUrl || imageData.output
      if (!imageUrl) throw new Error('No image URL returned')

      updateGenerationJob(prompt.id, { status: 'image_done', imageUrl })

      if (abortRef.current) return

      // Step 2: Generate video
      updateGenerationJob(prompt.id, { status: 'generating_video' })

      const videoRes = await fetch('/api/generation/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: VIDEO_MODEL,
          prompt: prompt.fullPrompt,
          image: imageUrl,
          modelSettings: {
            duration: prompt.duration === '5s' ? 5 : prompt.duration === '15s' ? 5 : 5,
            resolution: '720p',
            aspectRatio: prompt.aspectRatio,
            fps: 24,
            cameraFixed: false,
          },
          extraMetadata: {
            source: 'ad-lab',
            promptId: prompt.id,
          },
        }),
      })

      if (!videoRes.ok) {
        const err = await videoRes.json()
        throw new Error(err.error || err.details || 'Video generation failed')
      }

      const videoData = await videoRes.json()
      const predictionId = videoData.predictionId
      if (!predictionId) throw new Error('No prediction ID returned for video')

      // Poll for video completion
      const videoResult = await pollForVideo(predictionId)
      if (videoResult.error) {
        throw new Error(videoResult.error)
      }

      updateGenerationJob(prompt.id, { status: 'completed', videoUrl: videoResult.url })
    } catch (err) {
      updateGenerationJob(prompt.id, {
        status: 'failed',
        error: err instanceof Error ? err.message : 'Generation failed',
      })
    }
  }, [updateGenerationJob, pollForVideo])

  const handleGenerateAll = async () => {
    if (selectedIds.size === 0) return

    abortRef.current = false
    setIsGenerating(true)
    setError(null)

    // Initialize jobs
    const jobs: GenerationJob[] = Array.from(selectedIds).map(id => ({
      promptId: id,
      status: 'queued' as const,
    }))
    setGenerationJobs(jobs)

    // Process sequentially
    for (const id of selectedIds) {
      if (abortRef.current) break
      const prompt = prompts.find(p => p.id === id)
      if (!prompt) continue
      await generateForPrompt(prompt)
    }

    setIsGenerating(false)
  }

  const handleRetry = async (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId)
    if (!prompt) return

    abortRef.current = false
    setIsGenerating(true)
    updateGenerationJob(promptId, { status: 'queued', error: undefined, imageUrl: undefined, videoUrl: undefined })
    await generateForPrompt(prompt)
    setIsGenerating(false)
  }

  const handleStop = () => {
    abortRef.current = true
  }

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      prompts: prompts.map(p => {
        const grade = grades.find(g => g.promptId === p.id)
        const job = generationJobs.find(j => j.promptId === p.id)
        return {
          ...p,
          grade: grade || null,
          generation: job ? { imageUrl: job.imageUrl, videoUrl: job.videoUrl, status: job.status } : null,
        }
      }),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ad-lab-campaign.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Generate Images & Videos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select prompts to generate opening frame images and animated videos.
        </p>
      </div>

      {/* Selection Controls */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={selectAll} disabled={isGenerating}>
          Select All
        </Button>
        <Button variant="outline" size="sm" onClick={selectNone} disabled={isGenerating}>
          Select None
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {selectedCount} of {prompts.length} selected
        </span>
      </div>

      {/* Prompt Selection Cards */}
      <div className="space-y-2">
        {promptsWithGrades.map(({ prompt, grade }) => {
          const isSelected = selectedIds.has(prompt.id)
          const isManualReview = grade.status === 'refine'
          const job = generationJobs.find(j => j.promptId === prompt.id)

          return (
            <div
              key={prompt.id}
              className={cn(
                'border rounded-lg p-3 flex items-center gap-3 transition-colors',
                isManualReview && 'opacity-50',
                isSelected ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-card/30',
              )}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleSelect(prompt.id)}
                disabled={isGenerating}
                className={cn(
                  'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                  isSelected
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground/30 hover:border-muted-foreground/60'
                )}
              >
                {isSelected && <Check className="w-3 h-3" />}
              </button>

              {/* Prompt Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium">{prompt.id}</span>
                  <TotalScoreBadge score={grade.total} />
                  <StatusBadge status={grade.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{prompt.openingFrame}</p>
              </div>

              {/* Job Status */}
              {job && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {STATUS_ICONS[job.status]}
                  <span className="text-xs text-muted-foreground">{STATUS_LABELS[job.status]}</span>

                  {job.status === 'image_done' && job.imageUrl && (
                    <img src={job.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                  )}

                  {job.status === 'completed' && job.videoUrl && (
                    <button
                      onClick={() => setPreviewUrl(job.videoUrl!)}
                      className="w-8 h-8 rounded bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <Play className="w-3 h-3 text-white" />
                    </button>
                  )}

                  {job.status === 'failed' && (
                    <Button variant="ghost" size="sm" onClick={() => handleRetry(prompt.id)} disabled={isGenerating}>
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Cost Estimate */}
      {selectedCount > 0 && !isGenerating && generationJobs.length === 0 && (
        <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Image generation ({selectedCount} x {IMAGE_COST_PTS} pts)</span>
            <span className="font-mono">{imageCost} pts</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Video generation ({selectedCount} x {VIDEO_COST_PTS} pts)</span>
            <span className="font-mono">{videoCost} pts</span>
          </div>
          <div className="flex justify-between font-medium border-t border-border/50 pt-1 mt-1">
            <span>Estimated total</span>
            <span className="font-mono">{totalCost} pts</span>
          </div>
        </div>
      )}

      {/* Generate / Stop Button */}
      {isGenerating ? (
        <Button onClick={handleStop} variant="destructive" className="w-full" size="lg">
          <XCircle className="w-4 h-4 mr-2" />
          Stop Generation
        </Button>
      ) : (
        <Button
          onClick={handleGenerateAll}
          disabled={selectedCount === 0}
          className="w-full"
          size="lg"
        >
          <Video className="w-4 h-4 mr-2" />
          Generate All ({selectedCount} prompts)
        </Button>
      )}

      {/* Results Gallery */}
      {hasResults && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Results</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {completedJobs.map(job => (
              <button
                key={job.promptId}
                onClick={() => job.videoUrl && setPreviewUrl(job.videoUrl)}
                className="group relative aspect-video rounded-lg overflow-hidden border border-border/50 bg-black hover:border-primary/50 transition-colors"
              >
                {job.imageUrl && (
                  <img src={job.imageUrl} alt={job.promptId} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="w-8 h-8 text-white" />
                </div>
                <span className="absolute bottom-1 left-1 text-[10px] font-mono text-white/80 bg-black/60 px-1 rounded">
                  {job.promptId}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Export */}
      {hasResults && (
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Download Campaign JSON
        </Button>
      )}

      {/* Video Preview Overlay */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-4xl w-full mx-4" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <video
              src={previewUrl}
              controls
              autoPlay
              loop
              className="w-full rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}
