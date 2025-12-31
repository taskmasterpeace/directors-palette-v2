"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Mic2,
} from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
// import { cn } from "@/utils/utils"

// Voice options
const VOICES = [
  { id: 'rachel', name: 'Rachel', description: 'Warm, nurturing' },
  { id: 'adam', name: 'Adam', description: 'Friendly' },
  { id: 'charlotte', name: 'Charlotte', description: 'Expressive' },
  { id: 'dorothy', name: 'Dorothy', description: 'Pleasant' },
] as const

interface AudioPlayerProps {
  pages: Array<{ id: string; text: string; audioUrl?: string }>
  currentPageIndex: number
  onPageChange?: (index: number) => void
  projectId?: string
  autoAdvance?: boolean
  onAudioGenerated?: (pageId: string, audioUrl: string) => void
}

export function AudioPlayer({
  pages,
  currentPageIndex,
  onPageChange,
  projectId,
  autoAdvance = true,
  onAudioGenerated,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const wasPlayingRef = useRef(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(80)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [selectedVoice, setSelectedVoice] = useState('rachel')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingPageId, setGeneratingPageId] = useState<string | null>(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  const currentPage = pages[currentPageIndex]

  // Track playing state in ref to avoid race conditions
  useEffect(() => {
    wasPlayingRef.current = isPlaying
  }, [isPlaying])

  // Reset audio when page changes
  useEffect(() => {
    const playAudio = async () => {
      if (audioRef.current && currentPage?.audioUrl) {
        audioRef.current.src = currentPage.audioUrl
        audioRef.current.load()
        // Use ref to check if we should continue playing (avoids dependency loop)
        if (wasPlayingRef.current) {
          try {
            await audioRef.current.play()
          } catch (error) {
            console.error('Audio playback failed on page change:', error)
            setIsPlaying(false)
          }
        }
      }
      setCurrentTime(0)
    }
    playAudio()
  }, [currentPageIndex, currentPage?.audioUrl])

  // Handle audio time update
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleEnded = () => {
      if (autoAdvance && currentPageIndex < pages.length - 1) {
        onPageChange?.(currentPageIndex + 1)
      } else {
        setIsPlaying(false)
      }
    }

    const handleError = (e: Event) => {
      const target = e.target as HTMLAudioElement
      console.error('Audio error:', target.error?.message || 'Unknown audio error')
      setIsPlaying(false)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [autoAdvance, currentPageIndex, onPageChange, pages.length])

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100
    }
  }, [volume, isMuted])

  // Handle playback speed changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  const togglePlayback = async () => {
    if (!audioRef.current || !currentPage?.audioUrl) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      try {
        await audioRef.current.play()
        setIsPlaying(true)
      } catch (error) {
        console.error('Audio playback failed:', error)
        setIsPlaying(false)
      }
    }
  }

  const handlePrevious = () => {
    if (currentPageIndex > 0) {
      onPageChange?.(currentPageIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentPageIndex < pages.length - 1) {
      onPageChange?.(currentPageIndex + 1)
    }
  }

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const generateNarration = async () => {
    if (!currentPage?.text) return

    setIsGenerating(true)
    setGeneratingPageId(currentPage.id)

    try {
      const response = await fetch('/api/storybook/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentPage.text,
          voiceId: selectedVoice,
          projectId,
          pageNumber: currentPageIndex + 1,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate narration')
      }

      const data = await response.json()
      onAudioGenerated?.(currentPage.id, data.audioUrl)

      // Play the generated audio
      if (audioRef.current) {
        audioRef.current.src = data.audioUrl
        audioRef.current.load()
        try {
          await audioRef.current.play()
          setIsPlaying(true)
        } catch (playError) {
          console.error('Audio playback failed:', playError)
          // Still mark as ready even if autoplay fails
          setIsPlaying(false)
        }
      }
    } catch (error) {
      console.error('Error generating narration:', error)
    } finally {
      setIsGenerating(false)
      setGeneratingPageId(null)
    }
  }

  const generateAllNarration = async () => {
    setIsGenerating(true)

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      if (page.audioUrl) continue // Skip if already has audio

      setGeneratingPageId(page.id)

      try {
        const response = await fetch('/api/storybook/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: page.text,
            voiceId: selectedVoice,
            projectId,
            pageNumber: i + 1,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          onAudioGenerated?.(page.id, data.audioUrl)
        }
      } catch (error) {
        console.error(`Error generating narration for page ${i + 1}:`, error)
      }
    }

    setIsGenerating(false)
    setGeneratingPageId(null)
  }

  const hasAudio = !!currentPage?.audioUrl
  const allPagesHaveAudio = pages.every(p => p.audioUrl)

  return (
    <div className="space-y-4">
      {/* Hidden audio element */}
      <audio ref={audioRef} crossOrigin="anonymous" preload="auto" />

      {/* Voice Selection and Generate Button */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Mic2 className="w-4 h-4 text-zinc-400" />
          <Select value={selectedVoice} onValueChange={setSelectedVoice}>
            <SelectTrigger className="w-[140px] bg-zinc-800/50 border-zinc-700">
              <SelectValue placeholder="Select voice" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {VOICES.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  {voice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!hasAudio && (
          <Button
            onClick={generateNarration}
            disabled={isGenerating}
            size="sm"
            className="gap-2 bg-amber-500 hover:bg-amber-600 text-black"
          >
            {isGenerating && generatingPageId === currentPage?.id ? (
              <>
                <LoadingSpinner size="sm" color="current" />
                Generating...
              </>
            ) : (
              <>
                <Mic2 className="w-4 h-4" />
                Generate Narration
              </>
            )}
          </Button>
        )}

        {!allPagesHaveAudio && (
          <Button
            onClick={generateAllNarration}
            disabled={isGenerating}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner size="sm" color="current" />
                Generating All...
              </>
            ) : (
              'Generate All Pages'
            )}
          </Button>
        )}
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          disabled={currentPageIndex === 0}
        >
          <SkipBack className="w-5 h-5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="w-12 h-12"
          onClick={togglePlayback}
          disabled={!hasAudio}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          disabled={currentPageIndex >= pages.length - 1}
        >
          <SkipForward className="w-5 h-5" />
        </Button>

        {/* Progress Bar */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-zinc-400 w-10">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            disabled={!hasAudio}
            className="flex-1"
          />
          <span className="text-xs text-zinc-400 w-10">
            {formatTime(duration)}
          </span>
        </div>

        {/* Volume Control */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </Button>

        <div className="w-20">
          <Slider
            value={[isMuted ? 0 : volume]}
            max={100}
            step={1}
            onValueChange={(value) => {
              setVolume(value[0])
              setIsMuted(false)
            }}
          />
        </div>

        {/* Speed Control */}
        <Select
          value={playbackSpeed.toString()}
          onValueChange={(v) => setPlaybackSpeed(parseFloat(v))}
        >
          <SelectTrigger className="w-[80px] bg-zinc-800/50 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="0.75">0.75x</SelectItem>
            <SelectItem value="1">1x</SelectItem>
            <SelectItem value="1.25">1.25x</SelectItem>
            <SelectItem value="1.5">1.5x</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Page indicator */}
      <div className="text-center text-sm text-zinc-500">
        Page {currentPageIndex + 1} of {pages.length}
        {hasAudio && " • Audio ready"}
      </div>
    </div>
  )
}
