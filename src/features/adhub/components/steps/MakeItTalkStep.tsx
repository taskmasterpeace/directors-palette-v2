'use client'

import React, { useCallback, useMemo, useState } from 'react'
import {
  Video,
  ToggleLeft,
  ToggleRight,
  ArrowRight,
  ArrowLeft,
  Coins,
} from 'lucide-react'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    <div className="space-y-6">
      {/* Header with Toggle */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Video className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <CardTitle>Make It Talk</CardTitle>
                <CardDescription>
                  Turn your ad into a video with a spokesperson
                </CardDescription>
              </div>
            </div>

            <Button
              variant="ghost"
              size="lg"
              onClick={() => setVideoAdEnabled(!videoAdConfig.enabled)}
              className={cn(
                'gap-2 px-4',
                videoAdConfig.enabled ? 'text-amber-400' : 'text-muted-foreground'
              )}
            >
              {videoAdConfig.enabled ? (
                <>
                  <ToggleRight className="w-6 h-6" />
                  <span>Enabled</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-6 h-6" />
                  <span>Skip Video</span>
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {videoAdConfig.enabled && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column: Spokesperson Image */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Spokesperson Image</CardTitle>
              <CardDescription>
                Upload a front-facing portrait (300px minimum)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AvatarImageUploader
                imageUrl={videoAdConfig.spokespersonImageUrl}
                onImageChange={(url, file) => setSpokespersonImage(url, file)}
                model={videoAdConfig.modelSettings.model}
              />
            </CardContent>
          </Card>

          {/* Right Column: Audio + Settings */}
          <div className="space-y-4">
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Audio</CardTitle>
                <CardDescription>
                  Create audio for your spokesperson
                </CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Model Settings */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lip-sync-model">Quality</Label>
                    <Select
                      value={videoAdConfig.modelSettings.model}
                      onValueChange={(v) => setLipSyncModel(v as AdhubLipSyncModel)}
                    >
                      <SelectTrigger id="lip-sync-model" className="bg-slate-700/50 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lip-sync-resolution">Resolution</Label>
                    <Select
                      value={videoAdConfig.modelSettings.resolution}
                      onValueChange={(v) => setLipSyncResolution(v as AdhubLipSyncResolution)}
                    >
                      <SelectTrigger id="lip-sync-resolution" className="bg-slate-700/50 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="720p">720p (Standard)</SelectItem>
                        <SelectItem value="1080p">1080p (HD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

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

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>Video: <span className="text-amber-400 font-medium">{formatCost(estimatedCost)}</span></span>
            </div>
          )}

          <Button
            onClick={nextStep}
            disabled={!canProceed}
            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900"
          >
            {videoAdConfig.enabled ? 'Generate Ad' : 'Skip to Generate'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!canProceed && videoAdConfig.enabled && (
        <p className="text-xs text-center text-muted-foreground">
          {!videoAdConfig.spokespersonImageUrl && 'Upload a spokesperson image. '}
          {!effectiveAudioUrl && 'Generate or upload audio. '}
        </p>
      )}
    </div>
  )
}
