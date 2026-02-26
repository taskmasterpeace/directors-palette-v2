'use client'

import { useState, useRef, useCallback } from 'react'
import { useStoryboardStore } from '../store'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { storyboardGenerationService } from '../services/storyboard-generation.service'
import { ShotAnimationService } from '../services/shot-animation.service'
import { getImageCostTokens } from '../constants/generation.constants'
import { safeJsonParse } from '@/features/shared/utils/safe-fetch'
import { DIRECTORS } from '@/features/music-lab/data/directors.data'
import { toast } from 'sonner'
import JSZip from 'jszip'
import { logger } from '@/lib/logger'

export function useGalleryActions() {
  const {
    generatedImages,
    generatedPrompts,
    generationSettings,
    currentStyleGuide,
    characters,
    locations,
    selectedDirectorId,
    storyText,
    shotNotes,
    globalPromptPrefix,
    globalPromptSuffix,
    setGeneratedImage,
    setVideoStatus,
    setAnimationPrompt,
    setStoryText,
    setGeneratedPrompts,
    setGenerationSettings,
    setShotNote,
    setGlobalPromptPrefix,
    setGlobalPromptSuffix,
  } = useStoryboardStore()

  const { balance, fetchBalance } = useCreditsStore()
  const [regeneratingShots, setRegeneratingShots] = useState<Set<number>>(new Set())
  const [isRegeneratingFailed, setIsRegeneratingFailed] = useState(false)
  const [animatingShots, setAnimatingShots] = useState<Set<number>>(new Set())
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)
  const [generatingBRollId, setGeneratingBRollId] = useState<number | null>(null)
  const importFileRef = useRef<HTMLInputElement>(null)

  // ── Export / Import JSON ──────────────────────────
  const handleExportJSON = useCallback(() => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      storyText,
      generatedPrompts,
      generationSettings,
      selectedDirectorId,
      shotNotes,
      globalPromptPrefix,
      globalPromptSuffix,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `storyboard-export-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Storyboard exported as JSON')
  }, [storyText, generatedPrompts, generationSettings, selectedDirectorId, shotNotes, globalPromptPrefix, globalPromptSuffix])

  const handleImportJSON = useCallback(() => {
    importFileRef.current?.click()
  }, [])

  const handleImportFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!data.version) {
          toast.error('Invalid storyboard file', { description: 'Missing version field.' })
          return
        }
        if (data.storyText) setStoryText(data.storyText)
        if (data.generatedPrompts) setGeneratedPrompts(data.generatedPrompts)
        if (data.generationSettings) setGenerationSettings(data.generationSettings)
        if (data.shotNotes) {
          for (const [seq, note] of Object.entries(data.shotNotes)) {
            setShotNote(Number(seq), note as string)
          }
        }
        if (data.globalPromptPrefix != null) setGlobalPromptPrefix(data.globalPromptPrefix)
        if (data.globalPromptSuffix != null) setGlobalPromptSuffix(data.globalPromptSuffix)

        toast.success('Storyboard imported', {
          description: `Loaded ${data.generatedPrompts?.length ?? 0} prompts.`
        })
      } catch {
        toast.error('Failed to parse JSON file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [setStoryText, setGeneratedPrompts, setGenerationSettings, setShotNote, setGlobalPromptPrefix, setGlobalPromptSuffix])

  // ── Download All (ZIP) ──────────────────────────
  const handleDownloadAll = useCallback(async () => {
    const completedImages = Object.entries(generatedImages)
      .filter(([, img]) => img.status === 'completed' && img.imageUrl)
      .map(([seq, img]) => ({ sequence: Number(seq), url: img.imageUrl! }))

    if (completedImages.length === 0) {
      toast.info('No completed images to download')
      return
    }

    setIsDownloadingAll(true)
    try {
      const zip = new JSZip()
      let skipped = 0
      for (const { sequence, url } of completedImages) {
        try {
          const response = await fetch(url)
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const blob = await response.blob()
          const ext = blob.type.includes('png') ? 'png' : 'jpg'
          zip.file(`shot-${sequence}.${ext}`, blob)
        } catch {
          skipped++
        }
      }
      if (skipped > 0) {
        toast.warning(`${skipped} image(s) failed to download and were skipped`)
      }
      const added = completedImages.length - skipped
      if (added === 0) {
        toast.error('No images could be downloaded')
        return
      }
      const content = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(content)
      link.download = 'storyboard-shots.zip'
      link.click()
      URL.revokeObjectURL(link.href)
      toast.success(`Downloaded ${added} shots as ZIP`)
    } catch (error) {
      logger.storyboard.error('ZIP download error', { error: error instanceof Error ? error.message : String(error) })
      toast.error('Failed to create ZIP download')
    } finally {
      setIsDownloadingAll(false)
    }
  }, [generatedImages])

  // ── Contact Sheet ──────────────────────────
  const handleOpenContactSheet = useCallback((sequence: number) => {
    const shot = generatedPrompts.find(p => p.sequence === sequence)
    return shot || null
  }, [generatedPrompts])

  // ── B-Roll Grid ──────────────────────────
  const handleGenerateBRollGrid = useCallback(async (imageUrl: string, sequence: number) => {
    if (generatingBRollId !== null) return

    setGeneratingBRollId(sequence)
    toast.info('Generating B-Roll Grid...', { description: 'Creating 9 complementary B-roll shots.' })

    try {
      const brollPrompt = `A 3x3 grid collage of 9 different B-roll shots that complement and extend the provided reference image.

IMPORTANT: Use the provided reference image to match the exact color palette, lighting conditions, and visual setting. All 9 cells should feel like they belong to the same scene.

The grid layout is:
TOP ROW (Environment): establishing wide shot with no people, foreground detail close-up, background element with depth
MIDDLE ROW (Details): key object/prop extreme close-up, texture/material macro shot, hands or action insert
BOTTOM ROW (Atmosphere): ambient background activity, symbolic/thematic element, architectural framing element

Each cell shows a different element from the same visual world - not different angles of the same subject, but different subjects that share the same look and feel. Clear separation between cells with thin borders. Professional cinematography B-roll reference sheet style.

The color temperature, lighting direction, and overall mood must match across all 9 cells, creating a cohesive visual palette.`

      const response = await fetch('/api/generation/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: generationSettings.imageModel || 'nano-banana-pro',
          prompt: brollPrompt,
          referenceImages: [{ url: imageUrl, weight: 0.8 }],
          modelSettings: {
            aspectRatio: '16:9',
            resolution: '2K'
          },
          extraMetadata: {
            source: 'storyboard',
            assetType: 'b-roll-grid',
            isGrid: true,
            gridType: 'broll',
          },
        })
      })

      const result = await safeJsonParse(response)

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate B-roll grid')
      }

      toast.success('B-Roll Grid Generated!', { description: "Use 'Extract to Gallery' to split into individual shots." })
    } catch (error) {
      logger.storyboard.error('B-Roll grid generation error', { error: error instanceof Error ? error.message : String(error) })
      toast.error('Generation Failed', { description: error instanceof Error ? error.message : 'An error occurred' })
    } finally {
      setGeneratingBRollId(null)
    }
  }, [generatingBRollId, generationSettings.imageModel])

  // ── Animate Shot ──────────────────────────
  const handleAnimateShot = useCallback(async (sequence: number) => {
    const imageData = generatedImages[sequence]
    const shotPrompt = generatedPrompts.find(p => p.sequence === sequence)
    if (!imageData?.imageUrl || !shotPrompt) return

    if (animatingShots.has(sequence)) return

    const director = selectedDirectorId
      ? DIRECTORS.find(d => d.id === selectedDirectorId)
      : undefined

    const animPrompt = ShotAnimationService.buildAnimationPrompt(
      shotPrompt.originalText,
      shotPrompt.prompt,
      shotPrompt.shotType,
      director
    )

    setAnimatingShots(prev => new Set(prev).add(sequence))
    setAnimationPrompt(sequence, animPrompt)
    setVideoStatus(sequence, 'generating')

    try {
      const result = await ShotAnimationService.animateShot({
        sequence,
        imageUrl: imageData.imageUrl,
        animationPrompt: animPrompt,
        model: 'seedance-lite',
        duration: 5,
      })

      setGeneratedImage(sequence, {
        ...generatedImages[sequence],
        videoPredictionId: result.predictionId,
        videoStatus: 'generating',
        animationPrompt: animPrompt,
      })
      toast.success(`Shot ${sequence} animation started`, {
        description: 'Video will appear when rendering completes.'
      })
    } catch (error) {
      setVideoStatus(sequence, 'failed', undefined, error instanceof Error ? error.message : 'Animation failed')
      toast.error(`Animation failed for shot ${sequence}`, {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setAnimatingShots(prev => {
        const next = new Set(prev)
        next.delete(sequence)
        return next
      })
    }
  }, [generatedImages, generatedPrompts, animatingShots, selectedDirectorId, setAnimationPrompt, setVideoStatus, setGeneratedImage])

  // ── Regenerate Single ──────────────────────────
  const handleRegenerateSingleShot = useCallback(async (sequence: number) => {
    const shot = generatedPrompts.find(p => p.sequence === sequence)
    if (!shot) return

    try { await fetchBalance() } catch { /* continue */ }

    const costPerImage = getImageCostTokens(generationSettings.imageModel, generationSettings.resolution)
    if (balance < costPerImage) {
      toast.error(`Insufficient credits. Need ${costPerImage} tokens.`)
      return
    }

    setRegeneratingShots(prev => new Set(prev).add(sequence))
    setGeneratedImage(sequence, { ...generatedImages[sequence], status: 'generating', error: undefined })

    try {
      const results = await storyboardGenerationService.generateShotsFromPrompts(
        [shot],
        {
          model: generationSettings.imageModel || 'nano-banana-pro',
          aspectRatio: generationSettings.aspectRatio,
          resolution: generationSettings.resolution
        },
        currentStyleGuide || undefined,
        characters,
        locations
      )

      const result = results[0]
      if (result) {
        setGeneratedImage(sequence, {
          predictionId: result.predictionId,
          imageUrl: result.imageUrl,
          status: result.error ? 'failed' : 'completed',
          error: result.error,
          generationTimestamp: new Date().toISOString()
        })
        if (!result.error) toast.success(`Shot ${sequence} regenerated successfully`)
      }
    } catch (error) {
      setGeneratedImage(sequence, {
        ...generatedImages[sequence],
        status: 'failed',
        error: error instanceof Error ? error.message : 'Regeneration failed'
      })
      toast.error(`Failed to regenerate shot ${sequence}`)
    } finally {
      setRegeneratingShots(prev => { const next = new Set(prev); next.delete(sequence); return next })
    }
  }, [generatedPrompts, generatedImages, generationSettings, currentStyleGuide, characters, locations, balance, fetchBalance, setGeneratedImage])

  // ── Regenerate With Prompt ──────────────────────────
  const handleRegenerateWithPrompt = useCallback(async (sequence: number, prompt: string) => {
    const shot = generatedPrompts.find(p => p.sequence === sequence)
    if (!shot) return

    try { await fetchBalance() } catch { /* continue */ }

    const costPerImage = getImageCostTokens(generationSettings.imageModel, generationSettings.resolution)
    if (balance < costPerImage) {
      toast.error(`Insufficient credits. Need ${costPerImage} tokens.`)
      return
    }

    setRegeneratingShots(prev => new Set(prev).add(sequence))
    setGeneratedImage(sequence, { ...generatedImages[sequence], status: 'generating', error: undefined })

    try {
      const modifiedShot = { ...shot, prompt }
      const results = await storyboardGenerationService.generateShotsFromPrompts(
        [modifiedShot],
        {
          model: generationSettings.imageModel || 'nano-banana-pro',
          aspectRatio: generationSettings.aspectRatio,
          resolution: generationSettings.resolution
        },
        currentStyleGuide || undefined,
        characters,
        locations
      )

      const result = results[0]
      if (result) {
        setGeneratedImage(sequence, {
          predictionId: result.predictionId,
          imageUrl: result.imageUrl,
          status: result.error ? 'failed' : 'completed',
          error: result.error,
          generationTimestamp: new Date().toISOString()
        })
        if (!result.error) toast.success(`Shot ${sequence} regenerated with updated prompt`)
      }
    } catch (error) {
      setGeneratedImage(sequence, {
        ...generatedImages[sequence],
        status: 'failed',
        error: error instanceof Error ? error.message : 'Regeneration failed'
      })
      toast.error(`Failed to regenerate shot ${sequence}`)
    } finally {
      setRegeneratingShots(prev => { const next = new Set(prev); next.delete(sequence); return next })
    }
  }, [generatedPrompts, generatedImages, generationSettings, currentStyleGuide, characters, locations, balance, fetchBalance, setGeneratedImage])

  // ── Regenerate Failed ──────────────────────────
  const handleRegenerateFailedShots = useCallback(async () => {
    const failedShots = generatedPrompts.filter(
      p => generatedImages[p.sequence]?.status === 'failed'
    )

    if (failedShots.length === 0) {
      toast.info('No failed shots to regenerate')
      return
    }

    const costPerImg = getImageCostTokens(generationSettings.imageModel, generationSettings.resolution)
    const totalCost = failedShots.length * costPerImg
    try { await fetchBalance() } catch { /* continue */ }

    if (balance < totalCost) {
      toast.error(`Insufficient credits. Need ${totalCost} tokens for ${failedShots.length} shots.`)
      return
    }

    const confirmed = confirm(
      `Regenerate ${failedShots.length} failed shots for approximately ${totalCost} tokens?`
    )
    if (!confirmed) return

    setIsRegeneratingFailed(true)

    for (const shot of failedShots) {
      setGeneratedImage(shot.sequence, { ...generatedImages[shot.sequence], status: 'generating', error: undefined })

      try {
        const results = await storyboardGenerationService.generateShotsFromPrompts(
          [shot],
          {
            model: generationSettings.imageModel || 'nano-banana-pro',
            aspectRatio: generationSettings.aspectRatio,
            resolution: generationSettings.resolution
          },
          currentStyleGuide || undefined,
          characters,
          locations
        )

        const result = results[0]
        if (result) {
          setGeneratedImage(shot.sequence, {
            predictionId: result.predictionId,
            imageUrl: result.imageUrl,
            status: result.error ? 'failed' : 'completed',
            error: result.error,
            generationTimestamp: new Date().toISOString()
          })
        }
      } catch (error) {
        setGeneratedImage(shot.sequence, {
          ...generatedImages[shot.sequence],
          status: 'failed',
          error: error instanceof Error ? error.message : 'Regeneration failed'
        })
      }
    }

    setIsRegeneratingFailed(false)

    const stillFailed = Object.values(generatedImages).filter(img => img.status === 'failed').length
    if (stillFailed === 0) {
      toast.success('All shots regenerated successfully!')
    } else {
      toast.warning(`${stillFailed} shots still failed`)
    }
  }, [generatedPrompts, generatedImages, generationSettings, currentStyleGuide, characters, locations, balance, fetchBalance, setGeneratedImage])

  // ── Download Single ──────────────────────────
  const handleDownloadSingleShot = useCallback((sequence: number) => {
    const img = generatedImages[sequence]
    if (!img?.imageUrl) return
    const link = document.createElement('a')
    link.href = img.imageUrl
    link.download = `shot-${sequence}.png`
    link.click()
  }, [generatedImages])

  return {
    // State
    regeneratingShots,
    isRegeneratingFailed,
    animatingShots,
    isDownloadingAll,
    generatingBRollId,
    importFileRef,
    // Handlers
    handleExportJSON,
    handleImportJSON,
    handleImportFileChange,
    handleDownloadAll,
    handleOpenContactSheet,
    handleGenerateBRollGrid,
    handleAnimateShot,
    handleRegenerateSingleShot,
    handleRegenerateWithPrompt,
    handleRegenerateFailedShots,
    handleDownloadSingleShot,
  }
}
