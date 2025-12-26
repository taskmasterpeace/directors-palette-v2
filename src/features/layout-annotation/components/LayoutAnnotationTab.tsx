'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { PanelLeft, PanelLeftClose, PanelRightClose, RotateCcw, Upload, Maximize, Minimize2, X, ChevronDown, ChevronUp, Image as ImageIcon, Palette, Download, Layers } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { DropZone } from "@/components/ui/drop-zone"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { haptics } from "@/utils/haptics"
import { MODEL_CONFIGS, ModelId } from "@/config/index"
import {
    useCanvasOperations,
    useCanvasSettings,
    useImageImport,
    useIncomingImageSync
} from '../hooks'
import { useLayoutAnnotationStore } from "../store"
import { useToast } from "@/hooks/use-toast"
import { FabricCanvas, FabricCanvasRef } from "./canvas-board"
import { CanvasExporter } from "./canvas-export"
import { FrameExtractor } from "./frame-extractor"
import type { FrameExtractionResult } from "../types/frame-extractor.types"

// Accepted image types for canvas import
const IMAGE_ACCEPT = {
    'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif']
}

interface LayoutAnnotationTabProps {
    className?: string
    setActiveTab?: (tab: string) => void
}

interface QueuedResult {
    id: string
    imageUrl: string      // Data URL
    prompt: string        // Prompt used to generate
    timestamp: number     // When generated
    model: string         // Which model was used
}

function LayoutAnnotationTab({ className, setActiveTab: _setActiveTab }: LayoutAnnotationTabProps) {
    const { toast } = useToast()
    const canvasRef = useRef<FabricCanvasRef | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const frameExtractorInputRef = useRef<HTMLInputElement>(null)

    // Default system prompt (same as used in API)
    const DEFAULT_SYSTEM_PROMPT = `ANNOTATION INTERPRETATION INSTRUCTIONS:

The user has marked this image with visual annotations in CYAN color (#00d2d3). Each annotation type has a specific meaning:

1. CYAN BRUSH/MASK AREAS: These are painted regions that indicate areas to be edited. Apply the user's requested changes ONLY to these masked areas.

2. CYAN ARROWS: These point to specific objects or regions. The arrow indicates "this is the target" - apply changes to the object the arrow is pointing at.

3. CYAN TEXT LABELS: These provide specific instructions or descriptions. Read the text and apply those exact changes to the nearby/indicated area.

4. OVERLAID REFERENCE IMAGES: These show what the user wants to add or replace. Use these images as visual references for style, appearance, or objects to insert into the scene.

5. CYAN FREEHAND DRAWINGS: These highlight or circle areas of interest. Apply changes to the regions enclosed or highlighted by these drawings.

YOUR TASK:
- Carefully analyze all cyan annotations to understand what the user wants to change
- Apply the user's requested edits precisely to the indicated areas
- After making the edits, remove ALL cyan annotations, text labels, arrows, and overlaid elements
- Preserve all unmarked areas of the image exactly as they are
- Ensure the final result is clean, seamless, and photorealistic with no visible annotation artifacts

The final image should look natural as if the edits were always part of the original photo.`

    // Frame Extractor state
    const [frameExtractorOpen, setFrameExtractorOpen] = useState(false)
    const [frameExtractorImage, setFrameExtractorImage] = useState<string | null>(null)
    const [nanoBananaModel, setNanoBananaModel] = useState<ModelId>('nano-banana')
    const [_annotationText, _setAnnotationText] = useState('')
    const [nanoBananaPrompt, setNanoBananaPrompt] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [resultsQueue, setResultsQueue] = useState<QueuedResult[]>([])
    const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
    const [systemPromptExpanded, setSystemPromptExpanded] = useState(false)
    const [drawingToolsExpanded, setDrawingToolsExpanded] = useState(true)
    const [exportPanelExpanded, _setExportPanelExpanded] = useState(true)
    const [canvasMode, setCanvasMode] = useState<'canvas' | 'photo'>('canvas')
    const [backgroundImage, _setBackgroundImage] = useState<string | null>(null)
    const [isDragOverCanvas, setIsDragOverCanvas] = useState(false)
    const canvasContainerRef = useRef<HTMLDivElement>(null)

    // Load system prompt from localStorage on mount
    React.useEffect(() => {
        const saved = localStorage.getItem('layout-nano-banana-system-prompt')
        // Only use saved if it's not empty - otherwise use default
        if (saved && saved.trim().length > 0) {
            setSystemPrompt(saved)
        } else {
            // Clear any empty/invalid saved value and use default
            localStorage.removeItem('layout-nano-banana-system-prompt')
            setSystemPrompt(DEFAULT_SYSTEM_PROMPT)
        }
    }, [])

    // Save system prompt to localStorage when it changes (but not if empty)
    React.useEffect(() => {
        if (systemPrompt && systemPrompt.trim().length > 0) {
            localStorage.setItem('layout-nano-banana-system-prompt', systemPrompt)
        }
    }, [systemPrompt])

    // Custom hooks for business logic
    const { sidebarCollapsed, setSidebarCollapsed, rightSidebarCollapsed, setRightSidebarCollapsed, imageImportMode, setImageImportMode } = useLayoutAnnotationStore()
    const { canvasState, handleAspectRatioChange: _handleAspectRatioChange, updateCanvasState: _updateCanvasState, updateDrawingProperties: _updateDrawingProperties, updateCanvasSettings: _updateCanvasSettings } = useCanvasSettings()
    const { handleUndo, handleClearCanvas, handleSaveCanvas: _handleSaveCanvas } = useCanvasOperations({ canvasRef })
    const { handleImportClick, handleFileUpload, handleReceiveImage } = useImageImport({ fileInputRef })
    useIncomingImageSync({ canvasRef })

    // Frame Extractor handlers
    const _handleOpenFrameExtractor = useCallback(() => {
        const node = frameExtractorInputRef.current
        if (!node) return
        if (typeof node.showPicker === 'function') {
            node.showPicker()
        } else {
            node.click()
        }
    }, [])

    const handleFrameExtractorFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const url = URL.createObjectURL(file)
        setFrameExtractorImage(url)
        setFrameExtractorOpen(true)
        event.target.value = ''
    }, [])

    const handleFrameExtractorClose = useCallback(() => {
        if (frameExtractorImage) {
            URL.revokeObjectURL(frameExtractorImage)
        }
        setFrameExtractorImage(null)
        setFrameExtractorOpen(false)
    }, [frameExtractorImage])

    const handleFramesExtracted = useCallback(async (frames: FrameExtractionResult[]) => {
        // Check if frames have dataUrl (download mode) or were saved to gallery
        const isDownloadMode = frames.length > 0 && frames[0].dataUrl

        if (isDownloadMode) {
            // Download mode: save frames as individual files
            for (const frame of frames) {
                const link = document.createElement('a')
                link.href = frame.dataUrl
                link.download = `frame_r${frame.row + 1}_c${frame.col + 1}.png`
                link.click()
            }
            toast({
                title: 'Frames Downloaded',
                description: `Successfully downloaded ${frames.length} frames`
            })
        } else {
            // Gallery mode: frames were already saved via API
            toast({
                title: 'Frames Saved to Gallery',
                description: `Successfully saved ${frames.length} frames to your gallery`
            })
        }

        handleFrameExtractorClose()
    }, [toast, handleFrameExtractorClose])

    // Nano Banana generation handler
    const handleNanoBananaGenerate = useCallback(async () => {
        // Check for blank canvas
        const isBlank = canvasRef.current?.isEmpty ? canvasRef.current.isEmpty() : false

        if (!nanoBananaPrompt.trim()) {
            toast({
                title: "Missing Prompt",
                description: "Enter a description for your shot",
                variant: "destructive"
            })
            return
        }

        // Need either canvas content OR prompt (if blank, we do T2I)
        if (!isBlank && !canvasRef.current?.exportCanvas) {
            toast({
                title: "Canvas Error",
                description: "Could not access canvas content",
                variant: "destructive"
            })
            return
        }

        setIsProcessing(true)

        try {
            let response: Response

            if (isBlank) {
                // Text-to-Image Generation (Blank Canvas)
                response = await fetch("/api/generation/image", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: nanoBananaModel,
                        prompt: nanoBananaPrompt,
                        modelSettings: {
                            aspectRatio: canvasState.aspectRatio,
                            outputFormat: "png"
                        }
                    })
                })
            } else {
                // Inpainting / Image-to-Image (Existing)
                const canvasImage = canvasRef.current!.exportCanvas('png')
                response = await fetch("/api/generation/inpaint", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        image: canvasImage,
                        prompt: nanoBananaPrompt,
                        model: nanoBananaModel,
                        systemPrompt: systemPrompt
                    })
                })
            }

            if (!response.ok) {
                const err = await response.json().catch(() => ({}))
                throw new Error(err.error || "Generation failed")
            }

            const result = await response.json()

            // Push to results queue instead of directly importing
            if (result.imageUrl) {
                const queuedResult: QueuedResult = {
                    id: crypto.randomUUID(),
                    imageUrl: result.imageUrl,
                    prompt: nanoBananaPrompt,
                    timestamp: Date.now(),
                    model: nanoBananaModel
                }
                setResultsQueue(prev => [...prev, queuedResult])
                toast({
                    title: "Result Ready! ✨",
                    description: isBlank ? "New image generated from scratch." : "Edits applied successfully."
                })
            }
        } catch (error) {
            console.error("Nano Banana error:", error)
            toast({
                title: "Generation Failed",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "destructive"
            })
        } finally {
            setIsProcessing(false)
        }
    }, [canvasRef, nanoBananaPrompt, nanoBananaModel, systemPrompt, toast, canvasState.aspectRatio])

    // Results Queue handlers
    const handleUseResult = useCallback((result: QueuedResult) => {
        if (canvasRef.current?.importImage) {
            canvasRef.current.importImage(result.imageUrl)
            toast({
                title: "Image Loaded",
                description: "Result loaded to canvas for further editing"
            })
        }
        // Remove from queue after using
        setResultsQueue(prev => prev.filter(r => r.id !== result.id))
    }, [toast])

    const handleDismissResult = useCallback((resultId: string) => {
        setResultsQueue(prev => prev.filter(r => r.id !== resultId))
    }, [])

    const handleSaveResult = useCallback(async (result: QueuedResult) => {
        try {
            const response = await fetch("/api/gallery/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageUrl: result.imageUrl,
                    source: "layout-nano-banana",
                    metadata: { prompt: result.prompt, model: result.model }
                })
            })
            if (response.ok) {
                toast({ title: "Saved to Gallery", description: "Image saved successfully" })
            }
        } catch {
            toast({ title: "Save Failed", variant: "destructive" })
        }
    }, [toast])

    // Canvas drag-and-drop handlers for file import
    const handleCanvasDropAccepted = useCallback((files: File[]) => {
        const file = files[0]
        if (!file) return

        const url = URL.createObjectURL(file)
        handleReceiveImage(url)
        // Give enough time for image to be loaded to canvas before revoking
        setTimeout(() => URL.revokeObjectURL(url), 30000)
    }, [handleReceiveImage])

    // Track drag events over the canvas container for overlay visibility
    useEffect(() => {
        const container = canvasContainerRef.current
        if (!container) return

        let dragCounter = 0

        const handleDragEnter = (e: DragEvent) => {
            e.preventDefault()
            dragCounter++
            if (e.dataTransfer?.types.includes('Files')) {
                setIsDragOverCanvas(true)
            }
        }

        const handleDragLeave = (e: DragEvent) => {
            e.preventDefault()
            dragCounter--
            if (dragCounter === 0) {
                setIsDragOverCanvas(false)
            }
        }

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault()
        }

        const handleDrop = (e: DragEvent) => {
            e.preventDefault()
            dragCounter = 0
            setIsDragOverCanvas(false)
        }

        container.addEventListener('dragenter', handleDragEnter)
        container.addEventListener('dragleave', handleDragLeave)
        container.addEventListener('dragover', handleDragOver)
        container.addEventListener('drop', handleDrop)

        return () => {
            container.removeEventListener('dragenter', handleDragEnter)
            container.removeEventListener('dragleave', handleDragLeave)
            container.removeEventListener('dragover', handleDragOver)
            container.removeEventListener('drop', handleDrop)
        }
    }, [])

    // Toolbar controls to be rendered in FabricCanvas header
    const toolbarContent = (
        <>
            <Button
                size="sm"
                type="button"
                onClick={() => {
                    haptics.light()
                    handleImportClick()
                }}
                className="h-7 bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-2"
            >
                <Upload className="w-3 h-3 sm:mr-1" />
                <span className="hidden sm:inline">Import</span>
            </Button>

            <div className="flex items-center border border-primary/30 rounded-md">
                <Button
                    size="sm"
                    type="button"
                    onClick={() => {
                        haptics.light()
                        setCanvasMode('canvas')
                    }}
                    variant="ghost"
                    className={`h-7 w-7 p-0 rounded-r-none ${canvasMode === 'canvas' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                    title="Canvas Mode"
                >
                    <Layers className="w-4 h-4" />
                </Button>
                <Button
                    size="sm"
                    type="button"
                    onClick={() => {
                        haptics.light()
                        setCanvasMode('photo')
                    }}
                    variant="ghost"
                    className={`h-7 w-7 p-0 rounded-l-none ${canvasMode === 'photo' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                    title="Photo Mode"
                >
                    <ImageIcon className="w-4 h-4" />
                </Button>
            </div>

            {canvasMode === 'canvas' && (
                <Button
                    size="sm"
                    type="button"
                    onClick={() => {
                        haptics.light()
                        setImageImportMode(imageImportMode === 'fit' ? 'fill' : 'fit')
                    }}
                    variant="outline"
                    className="h-7 w-7 border-primary/30 text-primary hover:bg-primary/20"
                    title={imageImportMode === 'fit' ? 'Switch to Fill Mode' : 'Switch to Fit Mode'}
                >
                    {imageImportMode === 'fit' ? (
                        <Maximize className="w-3 h-3" />
                    ) : (
                        <Minimize2 className="w-3 h-3" />
                    )}
                </Button>
            )}

            {canvasMode === 'canvas' && (
                <Button
                    size="sm"
                    type="button"
                    onClick={() => {
                        haptics.light()
                        handleClearCanvas()
                    }}
                    variant="outline"
                    className="h-7 px-2 text-xs border-primary/30 text-primary hover:bg-primary/20"
                >
                    <RotateCcw className="w-3 h-3 sm:mr-1" />
                    <span className="hidden sm:inline">Clear</span>
                </Button>
            )}

            {canvasMode === 'canvas' && (
                <Button
                    size="sm"
                    type="button"
                    onClick={() => {
                        haptics.light()
                        handleUndo()
                    }}
                    variant="outline"
                    className="h-7 w-7 p-0 border-primary/30 text-primary hover:bg-primary/20"
                    title="Undo"
                >
                    <RotateCcw className="w-3 h-3" />
                </Button>
            )}
        </>
    )

    return (
        <div className={`flex h-full bg-background ${className}`}>
            {/* Left Sidebar */}
            <div
                className={`transition-all duration-300 border-r border-border flex flex-col bg-background ${
                    sidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-[280px] opacity-100'
                }`}
            >
                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                    {/* Nano Banana Generator */}
                    <Card className="border-primary/30 bg-primary/5">
                        <CardContent className="p-3 space-y-2">
                            <h3 className="text-xs font-semibold text-primary flex items-center gap-2">
                                <Palette className="w-3 h-3" />
                                Nano Banana AI
                            </h3>
                            <Textarea
                                placeholder="Describe what you want to create or change..."
                                value={nanoBananaPrompt}
                                onChange={(e) => setNanoBananaPrompt(e.target.value)}
                                className="min-h-[60px] text-xs resize-none"
                                disabled={isProcessing}
                            />
                            <div className="flex gap-2">
                                <Select value={nanoBananaModel} onValueChange={(value) => setNanoBananaModel(value as ModelId)}>
                                    <SelectTrigger className="h-7 text-xs border-primary/30">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(MODEL_CONFIGS).map(([key, config]) => (
                                            <SelectItem key={key} value={key}>
                                                {config.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                onClick={handleNanoBananaGenerate}
                                disabled={isProcessing || !nanoBananaPrompt.trim()}
                                className="w-full h-7 text-xs"
                                size="sm"
                            >
                                {isProcessing ? (
                                    <>
                                        <LoadingSpinner className="w-3 h-3 mr-2" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Palette className="w-3 h-3 mr-1" />
                                        Generate
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Results Queue Display */}
                    {resultsQueue.length > 0 && (
                        <Card className="border-green-500/30 bg-green-500/5">
                            <CardContent className="p-3 space-y-2">
                                <h3 className="text-xs font-semibold text-green-600 dark:text-green-400">Results ({resultsQueue.length})</h3>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {resultsQueue.map((result) => (
                                        <div key={result.id} className="flex gap-2">
                                            <div className="flex-1 min-w-0">
                                                <img
                                                    src={result.imageUrl}
                                                    alt="Result"
                                                    className="w-full h-16 object-cover rounded border border-green-500/20"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1 justify-between">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-6 w-6 p-0 text-green-600 dark:text-green-400 border-green-500/30"
                                                    onClick={() => handleUseResult(result)}
                                                    title="Use this result"
                                                >
                                                    ✓
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-6 w-6 p-0 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                                    onClick={() => handleSaveResult(result)}
                                                    title="Save to gallery"
                                                >
                                                    <Download className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-6 w-6 p-0 text-destructive border-destructive/30"
                                                    onClick={() => handleDismissResult(result.id)}
                                                    title="Dismiss"
                                                >
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* System Prompt */}
                    <Card className="border-border">
                        <CardContent className="p-3 space-y-2">
                            <button
                                onClick={() => setSystemPromptExpanded(!systemPromptExpanded)}
                                className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-2 w-full"
                            >
                                System Prompt
                                {systemPromptExpanded ? (
                                    <ChevronUp className="w-3 h-3" />
                                ) : (
                                    <ChevronDown className="w-3 h-3" />
                                )}
                            </button>
                            {systemPromptExpanded && (
                                <Textarea
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    className="min-h-[100px] text-xs resize-none"
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* Drawing Tools */}
                    <Card className="border-border">
                        <CardContent className="p-3 space-y-2">
                            <button
                                onClick={() => setDrawingToolsExpanded(!drawingToolsExpanded)}
                                className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-2 w-full"
                            >
                                Drawing Tools
                                {drawingToolsExpanded ? (
                                    <ChevronUp className="w-3 h-3" />
                                ) : (
                                    <ChevronDown className="w-3 h-3" />
                                )}
                            </button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 flex flex-col min-w-0 relative" ref={canvasContainerRef}>
                {/* Canvas Drop Zone Feedback */}
                {isDragOverCanvas && (
                    <DropZone
                        onDropAccepted={handleCanvasDropAccepted}
                        accept={IMAGE_ACCEPT}
                        maxSize={50 * 1024 * 1024}
                        multiple={false}
                    />
                )}

                {/* Fabric Canvas */}
                <FabricCanvas
                    ref={canvasRef}
                    backgroundImageUrl={backgroundImage}
                    canvasMode={canvasMode}
                    headerContent={toolbarContent}
                    tool="select"
                    brushSize={5}
                    color="#000000"
                />

                {/* Export Panel */}
                <div
                    className={`transition-all duration-300 border-t border-border flex flex-col ${
                        exportPanelExpanded ? 'h-[200px] opacity-100' : 'h-0 opacity-0 overflow-hidden'
                    }`}
                >
                    <CanvasExporter canvasRef={canvasRef} />
                </div>
            </div>

            {/* Right Sidebar */}
            <div
                className={`transition-all duration-300 border-l border-border flex flex-col bg-background overflow-hidden ${
                    rightSidebarCollapsed ? 'w-0 opacity-0' : 'w-[280px] opacity-100'
                }`}
            >
                {frameExtractorOpen && frameExtractorImage && (
                    <FrameExtractor
                        imageUrl={frameExtractorImage}
                        onClose={handleFrameExtractorClose}
                        onExtract={handleFramesExtracted}
                    />
                )}
            </div>

            {/* Sidebar Toggle Buttons */}
            <div className="absolute left-0 top-4 z-50 flex gap-2">
                <Button
                    size="sm"
                    type="button"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    variant="outline"
                    className="h-8 w-8 p-0"
                    title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                >
                    {sidebarCollapsed ? (
                        <PanelLeft className="w-4 h-4" />
                    ) : (
                        <PanelLeftClose className="w-4 h-4" />
                    )}
                </Button>
            </div>

            <div className="absolute right-0 top-4 z-50">
                <Button
                    size="sm"
                    type="button"
                    onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
                    variant="outline"
                    className="h-8 w-8 p-0"
                    title={rightSidebarCollapsed ? 'Show frame extractor' : 'Hide frame extractor'}
                >
                    {rightSidebarCollapsed ? (
                        <PanelRightClose className="w-4 h-4" />
                    ) : (
                        <PanelRightClose className="w-4 h-4" />
                    )}
                </Button>
            </div>

            {/* Hidden file inputs */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
            />
            <input
                ref={frameExtractorInputRef}
                type="file"
                accept="image/*"
                onChange={handleFrameExtractorFileSelect}
                className="hidden"
            />
        </div>
    )
}

export default LayoutAnnotationTab