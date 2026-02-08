'use client'

import React, { useCallback, useState, useRef, useEffect } from 'react'
import { Upload, Mic, Play, Pause, AlertCircle, Loader2, Volume2 } from 'lucide-react'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ELEVENLABS_VOICES, isAudioFormatSupported, getSupportedAudioFormatsDisplay } from '../config/lip-sync-models.config'
import { LipSyncGenerationService, formatDuration, getAudioDuration } from '../services/lip-sync-generation.service'
import type { AdhubAudioSource } from '../types/lip-sync.types'

interface AudioInputSectionProps {
  audioSource: AdhubAudioSource
  onAudioSourceChange: (source: AdhubAudioSource) => void
  audioUrl: string | null
  onAudioChange: (url: string | null, duration: number | null, file?: File) => void
  ttsScript: string
  onTtsScriptChange: (script: string) => void
  ttsVoiceId: string
  onTtsVoiceChange: (voiceId: string) => void
  audioDuration: number | null
  isGeneratingTts?: boolean
  onGenerateTts?: () => void
  className?: string
  disabled?: boolean
}

export function AudioInputSection({
  audioSource,
  onAudioSourceChange,
  audioUrl,
  onAudioChange,
  ttsScript,
  onTtsScriptChange,
  ttsVoiceId,
  onTtsVoiceChange,
  audioDuration,
  isGeneratingTts = false,
  onGenerateTts,
  className,
  disabled = false,
}: AudioInputSectionProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Handle audio playback state
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleEnded = () => setIsPlaying(false)
    const handleError = () => {
      setIsPlaying(false)
      console.error('Audio playback error')
    }

    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [])

  const validateAndProcessAudio = useCallback(async (file: File): Promise<{
    valid: boolean
    duration: number | null
    error: string | null
  }> => {
    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    if (!isAudioFormatSupported(extension)) {
      return {
        valid: false,
        duration: null,
        error: `Unsupported format. Use: ${getSupportedAudioFormatsDisplay()}`,
      }
    }

    // Check file size (5MB max)
    const sizeMB = file.size / (1024 * 1024)
    const validation = LipSyncGenerationService.validateAudio(extension, sizeMB, null)
    if (!validation.valid) {
      return {
        valid: false,
        duration: null,
        error: validation.errors[0],
      }
    }

    // Get duration
    try {
      const localUrl = URL.createObjectURL(file)
      const duration = await getAudioDuration(localUrl)
      return { valid: true, duration, error: null }
    } catch {
      return {
        valid: false,
        duration: null,
        error: 'Failed to read audio duration',
      }
    }
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setUploadError(null)

    const result = await validateAndProcessAudio(file)
    if (!result.valid) {
      setUploadError(result.error)
      return
    }

    const localUrl = URL.createObjectURL(file)
    onAudioChange(localUrl, result.duration, file)
  }, [validateAndProcessAudio, onAudioChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled) return

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [disabled, handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return

    try {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
      } else {
        audio.src = audioUrl
        await audio.play()
        setIsPlaying(true)
      }
    } catch (error) {
      console.error('Audio playback failed:', error)
      setIsPlaying(false)
    }
  }, [audioUrl, isPlaying])

  return (
    <div className={cn('space-y-4', className)}>
      <audio ref={audioRef} crossOrigin="anonymous" preload="auto" />

      <Tabs
        value={audioSource}
        onValueChange={(v) => onAudioSourceChange(v as AdhubAudioSource)}
      >
        <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
          <TabsTrigger
            value="tts"
            disabled={disabled}
            className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
          >
            <Mic className="w-4 h-4 mr-2" />
            Text-to-Speech
          </TabsTrigger>
          <TabsTrigger
            value="upload"
            disabled={disabled}
            className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Audio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tts" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="tts-script">Script</Label>
            <Textarea
              id="tts-script"
              placeholder="Enter the script for your spokesperson to say..."
              value={ttsScript}
              onChange={(e) => onTtsScriptChange(e.target.value)}
              disabled={disabled || isGeneratingTts}
              className="min-h-[120px] bg-slate-800/50 border-slate-700"
            />
            <p className="text-xs text-muted-foreground">
              {ttsScript.length} characters
            </p>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="tts-voice">Voice</Label>
              <Select
                value={ttsVoiceId}
                onValueChange={onTtsVoiceChange}
                disabled={disabled || isGeneratingTts}
              >
                <SelectTrigger id="tts-voice" className="bg-slate-800/50 border-slate-700">
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  {ELEVENLABS_VOICES.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <span className="font-medium">{voice.name}</span>
                      <span className="text-muted-foreground ml-2">- {voice.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={onGenerateTts}
              disabled={disabled || isGeneratingTts || !ttsScript.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900"
            >
              {isGeneratingTts ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 mr-2" />
                  Generate Audio
                </>
              )}
            </Button>
          </div>

          {/* Audio preview for TTS */}
          {audioUrl && audioSource === 'tts' && (
            <AudioPreview
              duration={audioDuration}
              isPlaying={isPlaying}
              onTogglePlay={togglePlayback}
            />
          )}
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <div
            className={cn(
              'relative rounded-lg border-2 border-dashed p-8 transition-colors',
              isDragOver ? 'border-amber-500 bg-amber-500/10' : 'border-slate-700 bg-slate-800/50',
              disabled && 'opacity-50 cursor-not-allowed',
              !disabled && !audioUrl && 'cursor-pointer hover:border-slate-600',
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {audioUrl && audioSource === 'upload' ? (
              <AudioPreview
                duration={audioDuration}
                isPlaying={isPlaying}
                onTogglePlay={togglePlayback}
                onClear={() => onAudioChange(null, null)}
                showClear
              />
            ) : (
              <label className={cn(
                'flex flex-col items-center justify-center cursor-pointer',
                disabled && 'pointer-events-none'
              )}>
                <input
                  type="file"
                  accept=".mp3,.wav,.m4a,.aac,audio/*"
                  onChange={handleFileInput}
                  className="hidden"
                  disabled={disabled}
                />
                <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Upload Audio
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  Drag & drop or click to browse
                  <br />
                  {getSupportedAudioFormatsDisplay()} (max 5MB)
                </p>
              </label>
            )}
          </div>

          {uploadError && (
            <div className="mt-2 p-2 rounded-md bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                {uploadError}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface AudioPreviewProps {
  duration: number | null
  isPlaying: boolean
  onTogglePlay: () => void
  onClear?: () => void
  showClear?: boolean
}

function AudioPreview({
  duration,
  isPlaying,
  onTogglePlay,
  onClear,
  showClear = false,
}: AudioPreviewProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full bg-amber-500/20 hover:bg-amber-500/30"
        onClick={onTogglePlay}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-amber-400" />
        ) : (
          <Play className="w-5 h-5 text-amber-400 ml-0.5" />
        )}
      </Button>

      <div className="flex-1 min-w-0">
        <div className="h-8 bg-slate-600/50 rounded flex items-center px-2">
          {/* Simple waveform visualization placeholder */}
          <div className="flex items-center gap-0.5 h-full w-full">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 bg-amber-500/60 rounded-sm transition-all',
                  isPlaying && 'animate-pulse'
                )}
                style={{
                  height: `${Math.random() * 60 + 20}%`,
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {duration !== null && (
          <span className="text-sm font-medium text-amber-400 tabular-nums">
            {formatDuration(duration)}
          </span>
        )}
        {showClear && onClear && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={onClear}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  )
}
