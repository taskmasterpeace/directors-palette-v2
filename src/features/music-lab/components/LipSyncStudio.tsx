'use client'

import React, { useCallback, useMemo, useState } from 'react'
import {
  Video,
  User,
  AudioLines,
  Settings2,
  Sparkles,
  CheckSquare,
  Square,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

import {
  useLipSyncStore,
  selectSelectedSections,
  selectTotalDuration,
} from '../store/lip-sync.store'
import { useMusicLabStore } from '../store/music-lab.store'
import {
  LipSyncCostPreview,
  AvatarImageUploader,
} from '@/features/lip-sync/components'
import {
  calculateLipSyncCost,
  getAllLipSyncModels,
} from '@/features/lip-sync/config/lip-sync-models.config'
import { formatDuration, formatCost } from '@/features/lip-sync/services/lip-sync-generation.service'
import type { LipSyncModel, LipSyncResolution } from '@/features/lip-sync/types/lip-sync.types'
import { logger } from '@/lib/logger'

interface LipSyncStudioProps {
  className?: string
}

export function LipSyncStudio({ className }: LipSyncStudioProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  // Music Lab store - for Identity Lock and song sections
  const referenceSheets = useMusicLabStore((s) => s.referenceSheets)
  const songAnalysis = useMusicLabStore((s) => s.project.songAnalysis)
  const project = useMusicLabStore((s) => s.project)

  // Lip Sync store
  const {
    avatarSource,
    customAvatarUrl,
    audioSource,
    customAudioUrl,
    sections,
    modelSettings,
    setAvatarSource,
    setCustomAvatar,
    setAudioSource,
    setCustomAudio,
    initializeSections,
    toggleSectionSelection,
    selectAllSections,
    deselectAllSections,
    updateSectionStatus,
    setModel,
    setResolution,
  } = useLipSyncStore()

  const selectedSections = useLipSyncStore(selectSelectedSections)
  const totalDuration = useLipSyncStore(selectTotalDuration)

  // Initialize sections from song analysis if needed
  React.useEffect(() => {
    if (songAnalysis?.confirmedSections && sections.length === 0) {
      initializeSections(
        songAnalysis.confirmedSections.map((s) => ({
          sectionId: s.id,
          sectionName: s.customName || s.type,
          startTime: s.startTime,
          endTime: s.endTime,
        }))
      )
    }
  }, [songAnalysis?.confirmedSections, sections.length, initializeSections])

  // Calculate total cost
  const totalCost = useMemo(() => {
    return calculateLipSyncCost(
      modelSettings.model,
      totalDuration,
      modelSettings.resolution
    )
  }, [modelSettings.model, modelSettings.resolution, totalDuration])

  // Get avatar URL based on source
  const avatarUrl = useMemo(() => {
    if (avatarSource === 'identity-lock') {
      return referenceSheets.identityLock.imageUrl
    }
    return customAvatarUrl
  }, [avatarSource, referenceSheets.identityLock.imageUrl, customAvatarUrl])

  // Get audio URL based on source
  const audioUrl = useMemo(() => {
    if (audioSource === 'isolated-vocals') {
      // TODO: Get isolated vocals URL from audio analysis
      return project.audioUrl // Fallback to original audio for now
    }
    return customAudioUrl
  }, [audioSource, project.audioUrl, customAudioUrl])

  // Check if ready to generate
  const canGenerate = useMemo(() => {
    return (
      avatarUrl &&
      audioUrl &&
      selectedSections.length > 0 &&
      !isGenerating
    )
  }, [avatarUrl, audioUrl, selectedSections.length, isGenerating])

  // Handle generation
  const handleGenerate = useCallback(async () => {
    if (!canGenerate || !avatarUrl || !audioUrl) return

    setIsGenerating(true)
    toast.info(`Starting lip-sync generation for ${selectedSections.length} sections...`, {
      description: `Estimated cost: ${formatCost(totalCost)}`,
    })

    try {
      // Process sections sequentially
      for (const section of selectedSections) {
        updateSectionStatus(section.sectionId, 'generating-video', { progress: 0 })

        const response = await fetch('/api/generation/lip-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            avatarImageUrl: avatarUrl,
            audioUrl: audioUrl,
            audioDurationSeconds: section.durationSeconds,
            modelSettings,
            metadata: {
              source: 'music-lab',
              sectionId: section.sectionId,
            },
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          updateSectionStatus(section.sectionId, 'failed', {
            error: error.error || 'Generation failed',
          })
          continue
        }

        const result = await response.json()
        updateSectionStatus(section.sectionId, 'generating-video', {
          progress: 50,
          predictionId: result.predictionId,
          galleryId: result.galleryId,
        })

        // Note: Actual completion will be handled by webhook polling or gallery updates
        // For now, mark as completed after API success
        updateSectionStatus(section.sectionId, 'completed', {
          progress: 100,
        })
      }

      toast.success('All lip-sync videos queued for generation!')
    } catch (error) {
      logger.musicLab.error('Lip-sync generation error', { error: error instanceof Error ? error.message : String(error) })
      toast.error('Failed to start lip-sync generation')
    } finally {
      setIsGenerating(false)
    }
  }, [
    canGenerate,
    avatarUrl,
    audioUrl,
    selectedSections,
    totalCost,
    modelSettings,
    updateSectionStatus,
  ])

  const models = getAllLipSyncModels()
  const identityLockReady = referenceSheets.identityLock.status === 'complete' &&
    referenceSheets.identityLock.imageUrl

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Video className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Lip Sync Studio</h2>
            <p className="text-sm text-muted-foreground">
              Create lip-synced videos from your character
            </p>
          </div>
        </div>

        <LipSyncCostPreview
          model={modelSettings.model}
          resolution={modelSettings.resolution}
          durationSeconds={totalDuration || null}
          className="hidden sm:flex"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Avatar & Audio */}
        <div className="space-y-4">
          {/* Avatar Source */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                Avatar Source
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={avatarSource}
                onValueChange={(v) => setAvatarSource(v as 'identity-lock' | 'custom-upload')}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem
                    value="identity-lock"
                    id="avatar-identity"
                    disabled={!identityLockReady}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="avatar-identity"
                      className={cn(
                        'font-medium cursor-pointer',
                        !identityLockReady && 'text-muted-foreground'
                      )}
                    >
                      Identity Lock Character
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {identityLockReady
                        ? 'Use your generated character'
                        : 'Generate Identity Lock first'}
                    </p>
                  </div>
                  {identityLockReady && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-700">
                      <img
                        src={referenceSheets.identityLock.imageUrl!}
                        alt="Identity Lock"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <RadioGroupItem value="custom-upload" id="avatar-custom" />
                  <div className="flex-1">
                    <Label htmlFor="avatar-custom" className="font-medium cursor-pointer">
                      Upload Custom Portrait
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Use your own front-facing image
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {avatarSource === 'custom-upload' && (
                <AvatarImageUploader
                  imageUrl={customAvatarUrl}
                  onImageChange={(url, file) => setCustomAvatar(url, file)}
                  model={modelSettings.model}
                  className="mt-4"
                />
              )}
            </CardContent>
          </Card>

          {/* Audio Source */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AudioLines className="w-4 h-4 text-amber-400" />
                Audio Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={audioSource}
                onValueChange={(v) => setAudioSource(v as 'isolated-vocals' | 'custom-upload')}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem
                    value="isolated-vocals"
                    id="audio-vocals"
                    disabled={!project.audioUrl}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="audio-vocals"
                      className={cn(
                        'font-medium cursor-pointer',
                        !project.audioUrl && 'text-muted-foreground'
                      )}
                    >
                      Isolated Vocals
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {project.audioUrl
                        ? 'Vocals extracted from your song'
                        : 'Upload audio in Audio tab first'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <RadioGroupItem value="custom-upload" id="audio-custom" />
                  <div className="flex-1">
                    <Label htmlFor="audio-custom" className="font-medium cursor-pointer">
                      Upload Custom Audio
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      MP3, WAV, M4A, AAC (max 5MB)
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {audioSource === 'custom-upload' && (
                <div className="mt-4">
                  {/* Simplified audio upload for custom */}
                  <input
                    type="file"
                    accept=".mp3,.wav,.m4a,.aac,audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const url = URL.createObjectURL(file)
                        setCustomAudio(url, file)
                      }
                    }}
                    className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-500/20 file:text-amber-400 file:font-medium hover:file:bg-amber-500/30"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Model Settings */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-amber-400" />
                Model Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Quality</Label>
                  <Select
                    value={modelSettings.model}
                    onValueChange={(v) => setModel(v as LipSyncModel)}
                  >
                    <SelectTrigger id="model" className="bg-slate-700/50 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="font-medium">{m.displayName}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resolution">Resolution</Label>
                  <Select
                    value={modelSettings.resolution}
                    onValueChange={(v) => setResolution(v as LipSyncResolution)}
                  >
                    <SelectTrigger id="resolution" className="bg-slate-700/50 border-slate-600">
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
        </div>

        {/* Right Column: Sections */}
        <div className="space-y-4">
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Sections to Generate</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllSections}
                    className="h-7 text-xs"
                  >
                    <CheckSquare className="w-3 h-3 mr-1" />
                    All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllSections}
                    className="h-7 text-xs"
                  >
                    <Square className="w-3 h-3 mr-1" />
                    None
                  </Button>
                </div>
              </div>
              <CardDescription>
                Select which song sections to create lip-sync videos for
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No sections available</p>
                  <p className="text-xs mt-1">
                    Complete song analysis to see sections
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {sections.map((section) => {
                    const sectionCost = calculateLipSyncCost(
                      modelSettings.model,
                      section.durationSeconds,
                      modelSettings.resolution
                    )
                    const statusIcon = section.generationState.status === 'completed' ? (
                      <Sparkles className="w-4 h-4 text-green-400" />
                    ) : section.generationState.status === 'generating-video' ? (
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                    ) : null

                    return (
                      <div
                        key={section.sectionId}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg transition-colors',
                          section.selected
                            ? 'bg-amber-500/10 border border-amber-500/20'
                            : 'bg-slate-700/30 border border-transparent'
                        )}
                      >
                        <Checkbox
                          checked={section.selected}
                          onCheckedChange={() => toggleSectionSelection(section.sectionId)}
                          disabled={isGenerating}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {section.sectionName}
                            </span>
                            {statusIcon}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(section.startTime)} - {formatDuration(section.endTime)}
                          </span>
                        </div>

                        <span className={cn(
                          'text-sm tabular-nums',
                          section.selected ? 'text-amber-400' : 'text-muted-foreground'
                        )}>
                          {formatCost(sectionCost)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile cost preview */}
          <div className="sm:hidden">
            <LipSyncCostPreview
              model={modelSettings.model}
              resolution={modelSettings.resolution}
              durationSeconds={totalDuration || null}
              showBreakdown
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900 font-semibold h-12"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Video className="w-5 h-5 mr-2" />
                Generate {selectedSections.length} Video{selectedSections.length !== 1 ? 's' : ''}
                {totalCost > 0 && ` • ${formatCost(totalCost)}`}
              </>
            )}
          </Button>

          {!canGenerate && !isGenerating && (
            <p className="text-xs text-center text-muted-foreground">
              {!avatarUrl && 'Select or upload an avatar image. '}
              {!audioUrl && 'Select or upload audio. '}
              {selectedSections.length === 0 && 'Select at least one section.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
