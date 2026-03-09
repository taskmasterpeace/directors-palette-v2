'use client'

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Box, Loader2, RotateCcw, Download, AlertCircle, Sparkles, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFigurineStore } from '../hooks/useFigurineStore'
import { figurineService } from '../services/figurine.service'
import { ModelViewer } from './ModelViewer'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { cn } from '@/utils/utils'

const GENERATION_COST = 25

export function FigurineStudio() {
  const [dragOver, setDragOver] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { balance } = useCreditsStore()

  const {
    models,
    activeModelId,
    isGenerating,
    startGeneration,
    setGenerationComplete,
    setGenerationFailed,
    setActiveModel,
    removeModel,
  } = useFigurineStore()

  const activeModel = models.find((m) => m.id === activeModelId)

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, WebP)')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string)
      setError(null)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleGenerate = useCallback(async () => {
    if (!selectedImage) return
    setError(null)

    const id = startGeneration(selectedImage)

    try {
      const result = await figurineService.generate3D(selectedImage)
      if (result.success && result.glbUrl) {
        setGenerationComplete(id, result.glbUrl)
      } else {
        setGenerationFailed(id, result.error || 'Generation failed')
        setError(result.error || 'Failed to generate 3D model')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setGenerationFailed(id, message)
      setError(message)
    }
  }, [selectedImage, startGeneration, setGenerationComplete, setGenerationFailed])

  const handleImageFromUrl = useCallback((url: string) => {
    setSelectedImage(url)
    setError(null)
  }, [])

  return (
    <div className="flex-1 h-full overflow-y-auto">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 via-background to-violet-950/20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-medium tracking-wider uppercase">
            <Box className="w-3.5 h-3.5" />
            3D Model Generation
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-transparent">
            Figurine Studio
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Upload a character image, generate a 3D model, and bring it to life as a physical figurine.
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Image Upload */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Source Image
              </h2>
              <span className="text-xs text-muted-foreground">
                {GENERATION_COST} credits per model
              </span>
            </div>

            {/* Drop zone / Preview */}
            <div
              className={cn(
                'relative rounded-xl border-2 border-dashed transition-all duration-300 overflow-hidden',
                'aspect-square flex items-center justify-center cursor-pointer',
                dragOver
                  ? 'border-cyan-400 bg-cyan-500/10 scale-[1.02]'
                  : selectedImage
                    ? 'border-transparent bg-black/40'
                    : 'border-border/50 bg-card/30 hover:border-cyan-500/40 hover:bg-cyan-500/5',
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !selectedImage && fileInputRef.current?.click()}
            >
              {selectedImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedImage}
                    alt="Character to convert"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-lg"
                      onClick={(e) => { e.stopPropagation(); setSelectedImage(null) }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground/80">Drop a character image here</p>
                    <p className="text-xs mt-1">or click to browse</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 max-w-xs">
                    Best results: clean subject on solid/removed background. Front-facing, well-lit character.
                  </p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelect(file)
              }}
            />

            {/* URL Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Or paste an image URL..."
                className="w-full h-10 px-4 pr-10 rounded-lg border border-border/50 bg-card/30 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const url = (e.target as HTMLInputElement).value.trim()
                    if (url) handleImageFromUrl(url)
                  }
                }}
              />
              <ImageIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!selectedImage || isGenerating || (balance !== null && balance < GENERATION_COST)}
              className={cn(
                'w-full h-12 rounded-xl font-semibold text-sm transition-all',
                'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400',
                'text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40',
                'disabled:opacity-40 disabled:shadow-none',
              )}
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating 3D Model...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate 3D Model — {GENERATION_COST} credits
                </span>
              )}
            </Button>

            {balance !== null && balance < GENERATION_COST && (
              <p className="text-xs text-amber-400 text-center">
                Insufficient credits. You have {balance}, need {GENERATION_COST}.
              </p>
            )}

            {/* Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right: 3D Viewer */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                3D Preview
              </h2>
              {activeModel?.glbUrl && (
                <a
                  href={activeModel.glbUrl}
                  download="figurine.glb"
                  className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download GLB
                </a>
              )}
            </div>

            {/* 3D Viewer Area */}
            <div className={cn(
              'relative rounded-xl overflow-hidden aspect-square',
              'bg-gradient-to-br from-zinc-900 via-zinc-950 to-black',
              'border border-border/30',
              'shadow-inner',
            )}>
              {/* Grid floor pattern */}
              <div className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px',
                  backgroundPosition: 'center center',
                  perspective: '500px',
                  transform: 'rotateX(60deg) scale(2)',
                  transformOrigin: 'center bottom',
                }}
              />

              {activeModel?.status === 'generating' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-2 border-cyan-500/30 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full border-2 border-t-cyan-400 border-r-cyan-400 border-b-transparent border-l-transparent animate-spin" />
                    </div>
                    <Box className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground/80">Generating 3D Model</p>
                    <p className="text-xs text-muted-foreground mt-1">This takes about 30-45 seconds...</p>
                  </div>
                  {/* Animated progress dots */}
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeModel?.status === 'ready' && activeModel.glbUrl && (
                <ModelViewer
                  src={activeModel.glbUrl}
                  alt="Generated 3D figurine"
                  className="w-full h-full"
                  autoRotate
                  cameraControls
                />
              )}

              {activeModel?.status === 'failed' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-red-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-red-400">Generation Failed</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">{activeModel.error}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => removeModel(activeModel.id)}
                  >
                    Try Again
                  </Button>
                </div>
              )}

              {!activeModel && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-border/10 border border-border/20 flex items-center justify-center">
                    <Box className="w-7 h-7 text-muted-foreground/30" />
                  </div>
                  <p className="text-xs text-muted-foreground/40">
                    Your 3D model will appear here
                  </p>
                </div>
              )}
            </div>

            {/* Info panel under viewer */}
            {activeModel?.status === 'ready' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-card/40 border border-border/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Model Ready</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(activeModel.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your 3D model is ready. Drag to rotate, scroll to zoom. Download the GLB file to use in Blender, Unity, or any 3D application.
                </p>
                <div className="pt-2 border-t border-border/20">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-medium">
                    Physical printing coming soon
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Previous Generations */}
        {models.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3 pt-4 border-t border-border/20"
          >
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Previous Models
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {models.filter(m => m.id !== activeModelId).map((model) => (
                <button
                  key={model.id}
                  onClick={() => setActiveModel(model.id)}
                  className={cn(
                    'relative rounded-lg overflow-hidden aspect-square border transition-all',
                    'hover:scale-105 hover:border-cyan-500/50',
                    model.status === 'ready' ? 'border-border/30' : 'border-red-500/30',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={model.sourceImageUrl}
                    alt="Source"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent" />
                  <div className="absolute bottom-1 left-1">
                    {model.status === 'ready' ? (
                      <div className="w-4 h-4 rounded-full bg-cyan-500/80 flex items-center justify-center">
                        <Box className="w-2.5 h-2.5 text-white" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-red-500/80 flex items-center justify-center">
                        <AlertCircle className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
