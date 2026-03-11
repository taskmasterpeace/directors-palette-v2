'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Box, Loader2, RotateCcw, Download, AlertCircle, Sparkles,
  Image as ImageIcon, Package, Truck, ChevronRight, Palette,
  Layers, ArrowRight, CheckCircle2, Trash2, Printer,
  FileBox, ChevronDown, Clock, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFigurineStore } from '../hooks/useFigurineStore'
import { figurineService } from '../services/figurine.service'
import { ModelViewer } from './ModelViewer'
import { OrderPrintModal } from './OrderPrintModal'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { cn } from '@/utils/utils'

const GENERATION_COST = 25

// Pipeline step component
function PipelineStep({ step, label, icon: Icon, active, completed, delay }: {
  step: number
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  completed: boolean
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="flex items-center gap-2"
    >
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500',
        completed
          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
          : active
            ? 'bg-cyan-500/20 border-2 border-cyan-400 text-cyan-400 animate-pulse'
            : 'bg-card/40 border border-border/40 text-muted-foreground/50',
      )}>
        {completed ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
      </div>
      <div className="hidden sm:block">
        <p className={cn(
          'text-[10px] font-semibold uppercase tracking-wider transition-colors',
          completed ? 'text-cyan-400' : active ? 'text-foreground/80' : 'text-muted-foreground/40',
        )}>
          Step {step}
        </p>
        <p className={cn(
          'text-xs transition-colors',
          completed || active ? 'text-foreground/70' : 'text-muted-foreground/30',
        )}>
          {label}
        </p>
      </div>
    </motion.div>
  )
}

// Real material cards for the showcase
const SHOWCASE_MATERIALS = [
  { name: 'PLA Basic', gradient: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 50%, #cccccc 100%)', price: '~780 pts' },
  { name: 'Nylon White', gradient: 'linear-gradient(135deg, #fafafa 0%, #eeeeee 50%, #e0e0e0 100%)', price: '~4,290 pts' },
  { name: 'Full Color Standard', gradient: 'linear-gradient(135deg, #e8d5b7 0%, #d4c4a8 30%, #c9b896 60%, #bfad85 100%)', price: '~15,990 pts', popular: true },
  { name: 'Full Color Smooth', gradient: 'linear-gradient(135deg, #f0e6d3 0%, #e8dcc8 30%, #dfd2bc 60%, #d6c8b0 100%)', price: '~18,200 pts' },
]

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  in_production: { label: 'In Production', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  shipped: { label: 'Shipped', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

const BG_PRESETS = [
  { label: 'Dark', value: '#09090b' },
  { label: 'Gray', value: '#3f3f46' },
  { label: 'White', value: '#ffffff' },
  { label: 'Blue', value: '#1e3a5f' },
  { label: 'Green', value: '#14532d' },
  { label: 'Purple', value: '#3b0764' },
  { label: 'Warm', value: '#451a03' },
  { label: 'Red', value: '#7f1d1d' },
]

export function FigurineStudio() {
  const [dragOver, setDragOver] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bgColor, setBgColor] = useState('#09090b')
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const [isConvertingObj, setIsConvertingObj] = useState(false)
  const [orders, setOrders] = useState<Array<{
    id: string; shapeways_order_id: string; material_name: string;
    size_cm: number; our_price_pts: number; status: string; created_at: string;
  }>>([])
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const downloadMenuRef = useRef<HTMLDivElement>(null)
  const { balance } = useCreditsStore()

  const {
    models,
    activeModelId,
    isGenerating,
    preSelectedImageUrl,
    savedLoaded,
    startGeneration,
    setGenerationComplete,
    setGenerationFailed,
    setActiveModel,
    removeModel,
    setPreSelectedImage,
    loadSavedModels,
  } = useFigurineStore()

  // Consume pre-selected image from gallery "Make Figurine" action
  useEffect(() => {
    if (preSelectedImageUrl) {
      setSelectedImage(preSelectedImageUrl)
      setPreSelectedImage(null)
    }
  }, [preSelectedImageUrl, setPreSelectedImage])

  // Load saved figurines from DB on mount
  useEffect(() => {
    if (savedLoaded) return
    figurineService.listSaved().then((saved) => {
      if (saved.length > 0) {
        loadSavedModels(saved)
      } else {
        // Mark as loaded even if empty
        loadSavedModels([])
      }
    })
  }, [savedLoaded, loadSavedModels])

  const activeModel = models.find((m) => m.id === activeModelId)

  // Derive pipeline state
  const pipelineStep = activeModel?.status === 'ready' ? 3
    : activeModel?.status === 'generating' ? 2
    : selectedImage ? 1
    : 0

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

  // Load print orders
  useEffect(() => {
    if (ordersLoaded) return
    figurineService.listOrders().then((loaded) => {
      setOrders(loaded)
      setOrdersLoaded(true)
    })
  }, [ordersLoaded])

  // Close download menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false)
      }
    }
    if (showDownloadMenu) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [showDownloadMenu])

  const handleDeleteSaved = useCallback(async (modelId: string, savedId?: string) => {
    if (savedId) {
      await figurineService.deleteSaved(savedId)
    }
    removeModel(modelId)
  }, [removeModel])

  const handleDownloadObj = useCallback(async () => {
    if (!activeModel?.glbUrl) return
    setIsConvertingObj(true)
    setShowDownloadMenu(false)
    try {
      const blob = await figurineService.convertToObj(activeModel.glbUrl)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'figurine-obj.zip'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Failed to convert model to OBJ')
    } finally {
      setIsConvertingObj(false)
    }
  }, [activeModel?.glbUrl])

  return (
    <div className="flex-1 h-full overflow-y-auto">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 via-background to-violet-950/20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 right-1/6 w-64 h-64 bg-amber-500/3 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Pipeline Progress Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-2 sm:gap-4"
        >
          <PipelineStep step={1} label="Upload Image" icon={ImageIcon} active={pipelineStep >= 1} completed={pipelineStep > 1} delay={0.2} />
          <ArrowRight className={cn('w-4 h-4 transition-colors hidden sm:block', pipelineStep >= 2 ? 'text-cyan-400' : 'text-muted-foreground/20')} />
          <ChevronRight className={cn('w-4 h-4 transition-colors sm:hidden', pipelineStep >= 2 ? 'text-cyan-400' : 'text-muted-foreground/20')} />
          <PipelineStep step={2} label="Generate 3D" icon={Layers} active={pipelineStep >= 2} completed={pipelineStep > 2} delay={0.3} />
          <ArrowRight className={cn('w-4 h-4 transition-colors hidden sm:block', pipelineStep >= 3 ? 'text-cyan-400' : 'text-muted-foreground/20')} />
          <ChevronRight className={cn('w-4 h-4 transition-colors sm:hidden', pipelineStep >= 3 ? 'text-cyan-400' : 'text-muted-foreground/20')} />
          <PipelineStep step={3} label="Order Physical" icon={Package} active={pipelineStep >= 3} completed={false} delay={0.4} />
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
                {GENERATION_COST} pts per model
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
                    <p className="text-xs mt-1">or click to browse &middot; or use &quot;Make Figurine&quot; from your gallery</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 max-w-xs">
                    Best results: clean character on a solid or removed background. Front-facing, well-lit.
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
                  Generate 3D Model &mdash; {GENERATION_COST} pts
                </span>
              )}
            </Button>

            {balance !== null && balance < GENERATION_COST && (
              <p className="text-xs text-amber-400 text-center">
                Insufficient pts. You have {balance}, need {GENERATION_COST}.
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
                <div className="relative" ref={downloadMenuRef}>
                  <button
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showDownloadMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 py-1 rounded-lg border border-border/40 bg-background/95 backdrop-blur-sm shadow-xl z-20">
                      <a
                        href={activeModel.glbUrl}
                        download="figurine.glb"
                        onClick={() => setShowDownloadMenu(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-foreground/80 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
                      >
                        <Box className="w-3.5 h-3.5" />
                        Download GLB
                      </a>
                      <button
                        onClick={handleDownloadObj}
                        disabled={isConvertingObj}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-foreground/80 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors w-full text-left disabled:opacity-50"
                      >
                        {isConvertingObj ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileBox className="w-3.5 h-3.5" />
                        )}
                        {isConvertingObj ? 'Converting...' : 'Download OBJ (Print-Ready)'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3D Viewer Area */}
            <div
              className={cn(
                'relative rounded-xl overflow-hidden aspect-square',
                'border border-border/30',
                'shadow-inner transition-colors duration-300',
              )}
              style={{ backgroundColor: bgColor }}
            >
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
                    <p className="text-xs text-muted-foreground mt-1">This takes about 2-3 minutes...</p>
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
                  backgroundColor={bgColor}
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

            {/* Background Color Controls */}
            {(activeModel?.status === 'ready' || activeModel?.status === 'generating') && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider shrink-0">BG</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {BG_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setBgColor(preset.value)}
                      title={preset.label}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 transition-all hover:scale-110',
                        bgColor === preset.value
                          ? 'border-cyan-400 ring-2 ring-cyan-400/30 scale-110'
                          : 'border-border/40 hover:border-border/80',
                      )}
                      style={{ backgroundColor: preset.value }}
                    />
                  ))}
                  <label className="relative cursor-pointer" title="Custom color">
                    <div className={cn(
                      'w-6 h-6 rounded-full border-2 border-dashed border-border/40 hover:border-border/80 transition-all flex items-center justify-center',
                      !BG_PRESETS.some(p => p.value === bgColor) && 'border-cyan-400 ring-2 ring-cyan-400/30',
                    )}
                      style={{ backgroundColor: !BG_PRESETS.some(p => p.value === bgColor) ? bgColor : undefined }}
                    >
                      <Palette className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Model Ready Panel with Physical Order Teaser */}
            {activeModel?.status === 'ready' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {/* Download & Export */}
                <div className="p-4 rounded-xl bg-card/40 border border-border/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Model Ready</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(activeModel.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Drag to rotate, scroll to zoom. Download the GLB file for Blender, Unity, or 3D printing.
                  </p>
                </div>

                {/* Physical Figurine CTA */}
                <div className="p-4 rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 via-card/30 to-cyan-500/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Order Physical Figurine</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Turn this 3D model into a real figurine. Choose from 5 materials — from affordable PLA to full-color premium.
                  </p>
                  <Button
                    onClick={() => setShowPrintModal(true)}
                    className={cn(
                      'w-full h-10 rounded-lg font-semibold text-xs transition-all',
                      'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400',
                      'text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5" />
                      Order Print &mdash; From 780 pts
                    </span>
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Physical Figurine Showcase Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="pt-6 border-t border-border/20"
        >
          <div className="text-center space-y-2 mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-medium tracking-wider uppercase">
              <Printer className="w-3.5 h-3.5" />
              Physical Prints
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground/90">
              From Screen to Shelf
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Generate a 3D model, choose a material and size. We print and ship worldwide.
            </p>
          </div>

          {/* Material Preview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
            {SHOWCASE_MATERIALS.map((mat) => (
              <div
                key={mat.name}
                className={cn(
                  'relative p-3 rounded-xl border transition-all',
                  mat.popular
                    ? 'border-cyan-500/40 bg-cyan-500/5'
                    : 'border-border/30 bg-card/20',
                )}
              >
                {mat.popular && (
                  <div className="absolute -top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-cyan-500 text-[9px] font-bold text-white uppercase tracking-wider">
                    Popular
                  </div>
                )}
                <div
                  className="w-full aspect-square rounded-lg mb-2 border border-border/20"
                  style={{ background: mat.gradient }}
                />
                <p className="text-xs font-medium text-foreground/80">{mat.name}</p>
                <p className="text-[10px] text-muted-foreground">From {mat.price}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: Palette, title: 'Choose Material', desc: '5 curated materials from PLA to full-color nylon' },
              { icon: Package, title: 'We Print It', desc: 'Professional 3D printing with quality checks and full-color support' },
              { icon: Truck, title: 'Ships To You', desc: 'Delivered worldwide with tracking. Typical delivery in 10-14 business days' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="p-4 rounded-xl bg-card/20 border border-border/20 text-center space-y-2"
              >
                <div className="w-10 h-10 mx-auto rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-sm font-semibold text-foreground/80">{item.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Order History */}
        {orders.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3 pt-4 border-t border-border/20"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                My Print Orders
              </h3>
              <button
                onClick={() => { setOrdersLoaded(false) }}
                className="text-[10px] text-muted-foreground hover:text-cyan-400 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>
            <div className="space-y-2">
              {orders.map((order) => {
                const badge = STATUS_BADGES[order.status] || STATUS_BADGES.pending
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-card/30 border border-border/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <Package className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground/80">
                          {order.material_name} &middot; {order.size_cm}cm
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-cyan-400 tabular-nums">
                        {order.our_price_pts.toLocaleString()} pts
                      </span>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                        badge.color,
                      )}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Saved & Previous Figurines */}
        {models.filter(m => m.id !== activeModelId).length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3 pt-4 border-t border-border/20"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Your Figurines
              </h3>
              <span className="text-[10px] text-muted-foreground">
                {models.filter(m => m.status === 'ready').length} / 5 saved
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {models.filter(m => m.id !== activeModelId).map((model) => (
                <div key={model.id} className="relative group">
                  <button
                    onClick={() => setActiveModel(model.id)}
                    className={cn(
                      'relative rounded-xl overflow-hidden aspect-square border transition-all w-full',
                      'hover:scale-[1.03] hover:shadow-lg',
                      activeModelId === model.id
                        ? 'border-cyan-400 ring-2 ring-cyan-400/30'
                        : model.status === 'ready'
                          ? 'border-border/30 hover:border-cyan-500/50'
                          : 'border-red-500/30',
                    )}
                  >
                    <img
                      src={model.sourceImageUrl}
                      alt="Source"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                      {model.status === 'ready' ? (
                        <div className="w-5 h-5 rounded-full bg-cyan-500/80 flex items-center justify-center">
                          <Box className="w-3 h-3 text-white" />
                        </div>
                      ) : model.status === 'generating' ? (
                        <div className="w-5 h-5 rounded-full bg-amber-500/80 flex items-center justify-center">
                          <Loader2 className="w-3 h-3 text-white animate-spin" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center">
                          <AlertCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    {model.savedId && (
                      <div className="absolute top-1.5 left-1.5">
                        <div className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[9px] text-white/70 font-medium">
                          Saved
                        </div>
                      </div>
                    )}
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteSaved(model.id, model.savedId) }}
                    className={cn(
                      'absolute top-1.5 right-1.5 w-6 h-6 rounded-full',
                      'bg-black/60 hover:bg-red-500/80 backdrop-blur-sm',
                      'flex items-center justify-center transition-all',
                      'opacity-0 group-hover:opacity-100',
                    )}
                    title="Remove"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Print Order Modal */}
      {activeModel?.glbUrl && (
        <OrderPrintModal
          isOpen={showPrintModal}
          onClose={() => {
            setShowPrintModal(false)
            // Refresh orders after closing in case an order was placed
            setOrdersLoaded(false)
          }}
          glbUrl={activeModel.glbUrl}
          figurineId={activeModel.savedId}
        />
      )}
    </div>
  )
}
