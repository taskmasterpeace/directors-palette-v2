'use client'

import React, { useCallback, useMemo, useState } from 'react'
import {
  Video,
  ArrowRight,
  ArrowLeft,
  Coins,
  Sparkles,
  User,
  Mic,
  Settings2,
} from 'lucide-react'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

import { useAdhubStore } from '../../store/adhub.store'
import {
  AvatarImageUploader,
  AudioInputSection,
  LipSyncCostPreview,
} from '@/features/lip-sync/components'
import {
  getAllLipSyncModels,
  calculateLipSyncCost,
} from '@/features/lip-sync/config/lip-sync-models.config'
import { formatCost } from '@/features/lip-sync/services/lip-sync-generation.service'
import type { AdhubLipSyncModel, AdhubLipSyncResolution } from '../../types/adhub.types'

export function MakeItTalkStep() {
  const [isGeneratingTts, setIsGeneratingTts] = useState(false)

  const {
    videoAdConfig,
    setVideoAdEnabled,
    setSpokespersonImage,
    setVideoAudioSource,
    setUploadedAudio,
    setTtsScript,
    setTtsVoiceId,
    setGeneratedTtsAudio,
    setLipSyncModel,
    setLipSyncResolution,
    nextStep,
    previousStep,
  } = useAdhubStore()

  const models = getAllLipSyncModels()

  // Calculate cost
  const estimatedCost = useMemo(() => {
    if (!videoAdConfig.enabled || !videoAdConfig.audioDurationSeconds) {
      return 0
    }
    return calculateLipSyncCost(
      videoAdConfig.modelSettings.model,
      videoAdConfig.audioDurationSeconds,
      videoAdConfig.modelSettings.resolution
    )
  }, [
    videoAdConfig.enabled,
    videoAdConfig.audioDurationSeconds,
    videoAdConfig.modelSettings.model,
    videoAdConfig.modelSettings.resolution,
  ])

  // Get effective audio URL based on source
  const effectiveAudioUrl = useMemo(() => {
    if (videoAdConfig.audioSource === 'tts') {
      return videoAdConfig.generatedTtsAudioUrl
    }
    return videoAdConfig.uploadedAudioUrl
  }, [
    videoAdConfig.audioSource,
    videoAdConfig.generatedTtsAudioUrl,
    videoAdConfig.uploadedAudioUrl,
  ])

  // Check if ready to proceed
  const canProceed = useMemo(() => {
    if (!videoAdConfig.enabled) return true // Can skip

    return (
      videoAdConfig.spokespersonImageUrl &&
      effectiveAudioUrl &&
      videoAdConfig.audioDurationSeconds &&
      videoAdConfig.audioDurationSeconds > 0
    )
  }, [
    videoAdConfig.enabled,
    videoAdConfig.spokespersonImageUrl,
    effectiveAudioUrl,
    videoAdConfig.audioDurationSeconds,
  ])

  // Handle TTS generation
  const handleGenerateTts = useCallback(async () => {
    if (!videoAdConfig.ttsScript.trim()) {
      toast.error('Please enter a script')
      return
    }

    setIsGeneratingTts(true)

    try {
      const response = await fetch('/api/storybook/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: videoAdConfig.ttsScript,
          voiceId: videoAdConfig.ttsVoiceId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate audio')
      }

      const result = await response.json()
      setGeneratedTtsAudio(result.audioUrl, result.durationSeconds)
      toast.success('Audio generated successfully!')
    } catch (error) {
      console.error('TTS generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate audio')
    } finally {
      setIsGeneratingTts(false)
    }
  }, [videoAdConfig.ttsScript, videoAdConfig.ttsVoiceId, setGeneratedTtsAudio])

  // Handle audio change from uploader
  const handleAudioChange = useCallback((url: string | null, duration: number | null, file?: File) => {
    setUploadedAudio(url, duration, file)
  }, [setUploadedAudio])

  return (
    <div className="p-6 space-y-6">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <Video className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Make It Talk</h2>
            <p className="text-sm text-muted-foreground">
              Add a video spokesperson to your ad
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={() => setVideoAdEnabled(!videoAdConfig.enabled)}
          className={cn(
            'relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            videoAdConfig.enabled ? 'bg-amber-500' : 'bg-muted'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out',
              videoAdConfig.enabled ? 'translate-x-7' : 'translate-x-1'
            )}
          />
        </button>
      </div>

      {/* Skip notice when disabled */}
      {!videoAdConfig.enabled && (
        <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center">
          <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-medium text-muted-foreground mb-2">Video Ad Disabled</h3>
          <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">
            Toggle the switch above to add a talking spokesperson video to your ad.
            Your static image ad will still be generated.
          </p>
        </div>
      )}

      {/* Main Content when enabled */}
      {videoAdConfig.enabled && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Spokesperson Image */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Spokesperson
              </h3>
            </div>

            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <AvatarImageUploader
                imageUrl={videoAdConfig.spokespersonImageUrl}
                onImageChange={(url, file) => setSpokespersonImage(url, file)}
                model={videoAdConfig.modelSettings.model}
              />
            </div>
          </div>

          {/* Right Column: Audio + Settings */}
          <div className="space-y-4">
            {/* Audio Section */}
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-amber-400" />
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Audio
              </h3>
            </div>

            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <AudioInputSection
                audioSource={videoAdConfig.audioSource}
                onAudioSourceChange={setVideoAudioSource}
                audioUrl={effectiveAudioUrl}
                onAudioChange={handleAudioChange}
                ttsScript={videoAdConfig.ttsScript}
                onTtsScriptChange={setTtsScript}
                ttsVoiceId={videoAdConfig.ttsVoiceId}
                onTtsVoiceChange={setTtsVoiceId}
                audioDuration={videoAdConfig.audioDurationSeconds}
                isGeneratingTts={isGeneratingTts}
                onGenerateTts={handleGenerateTts}
              />
            </div>

            {/* Model Settings */}
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-amber-400" />
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Quality Settings
              </h3>
            </div>

            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lip-sync-model" className="text-xs text-muted-foreground">
                    Model
                  </Label>
                  <Select
                    value={videoAdConfig.modelSettings.model}
                    onValueChange={(v) => setLipSyncModel(v as AdhubLipSyncModel)}
                  >
                    <SelectTrigger id="lip-sync-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>{m.displayName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lip-sync-resolution" className="text-xs text-muted-foreground">
                    Resolution
                  </Label>
                  <Select
                    value={videoAdConfig.modelSettings.resolution}
                    onValueChange={(v) => setLipSyncResolution(v as AdhubLipSyncResolution)}
                  >
                    <SelectTrigger id="lip-sync-resolution">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="720p">720p Standard</SelectItem>
                      <SelectItem value="1080p">1080p HD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Cost Preview */}
            <LipSyncCostPreview
              model={videoAdConfig.modelSettings.model}
              resolution={videoAdConfig.modelSettings.resolution}
              durationSeconds={videoAdConfig.audioDurationSeconds}
              showBreakdown
            />
          </div>
        </div>
      )}

      {/* Validation message */}
      {!canProceed && videoAdConfig.enabled && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-amber-200 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {!videoAdConfig.spokespersonImageUrl && 'Upload a spokesperson image'}
            {videoAdConfig.spokespersonImageUrl && !effectiveAudioUrl && 'Generate or upload audio'}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <Button
          variant="outline"
          onClick={previousStep}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="flex items-center gap-4">
          {videoAdConfig.enabled && estimatedCost > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">{formatCost(estimatedCost)}</span>
              <span className="text-xs text-muted-foreground">for video</span>
            </div>
          )}

          <Button
            onClick={nextStep}
            disabled={!canProceed}
            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900 font-semibold px-6"
          >
            {videoAdConfig.enabled ? (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Ad
              </>
            ) : (
              'Skip to Generate'
            )}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
