'use client'

import React, { useRef, useState, useCallback } from 'react'
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PanelLeft, PanelLeftClose, PanelRightClose, RotateCcw, Upload, Maximize, Minimize2, X, Loader2, ChevronDown, ChevronUp, RotateCw, Image as ImageIcon, Palette, Download, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { CanvasToolbar } from "./canvas-settings"
import { CanvasExporter } from "./canvas-export"
import { FrameExtractor } from "./frame-extractor"
import type { FrameExtractionResult } from "../types/frame-extractor.types"

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

function LayoutAnnotationTab({ className, setActiveTab }: LayoutAnnotationTabProps) {
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
    const [exportPanelExpanded, setExportPanelExpanded] = useState(true)
    const [canvasMode, setCanvasMode] = useState<'canvas' | 'photo'>('canvas')
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null)

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
    const { canvasState, handleAspectRatioChange, updateCanvasState, updateDrawingProperties, updateCanvasSettings: _updateCanvasSettings } = useCanvasSettings()
    const { handleUndo, handleClearCanvas, handleSaveCanvas: _handleSaveCanvas } = useCanvasOperations({ canvasRef })
    const { handleImportClick, handleFileUpload } = useImageImport({ fileInputRef })
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
                    title={imageImportMode === 'fit' ? 'Switch to Fill mode' : 'Switch to Fit mode'}
                >
                    {imageImportMode === 'fit' ? <Minimize2 className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </Button>
            )}

            <Button
                size="sm"
                onClick={() => {
                    haptics.medium()
                    handleUndo()
                }}
                disabled={canvasState.historyIndex <= 0}
                variant="outline"
                className="h-7 w-7 border-primary/30 text-primary hover:bg-primary/20 disabled:opacity-50"
                title="Undo"
            >
                <RotateCcw className="w-4 h-4" />
            </Button>

            <Button
                size="sm"
                onClick={() => {
                    haptics.warning()
                    handleClearCanvas()
                }}
                variant="destructive"
                className="h-7 w-7"
                title="Clear"
            >
                <X className="w-4 h-4" />
            </Button>

            <div className="h-4 w-px bg-border mx-1" />

            <div className="h-4 w-px bg-border mx-1" />



            {canvasMode === 'canvas' && (
                <Select
                    value={canvasState.aspectRatio}
                    onValueChange={handleAspectRatioChange}
                >
                    <SelectTrigger className="bg-card border-primary/30 text-white h-7 w-20 text-[10px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-primary/30">
                        <SelectItem value="16:9">16:9</SelectItem>
                        <SelectItem value="9:16">9:16</SelectItem>
                        <SelectItem value="1:1">1:1</SelectItem>
                        <SelectItem value="4:3">4:3</SelectItem>
                        <SelectItem value="21:9">21:9</SelectItem>
                    </SelectContent>
                </Select>
            )
            }

            {
                canvasMode === 'photo' && backgroundImage && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/20"
                        onClick={() => {
                            canvasRef.current?.clearBackground()
                            setBackgroundImage(null)
                            setCanvasMode('canvas')
                        }}
                    >
                        Remove BG
                    </Button>
                )
            }
        </>
    )

    const selectedModelConfig = MODEL_CONFIGS[nanoBananaModel]

    const centerToolbarContent = (
        <Select
            value={nanoBananaModel}
            onValueChange={(val) => setNanoBananaModel(val as ModelId)}
        >
            <SelectTrigger className="bg-card border-primary/30 text-white h-7 min-w-[140px] px-2 text-[10px] font-medium justify-between gap-2 shadow-none focus:ring-0 focus:ring-offset-0">
                <SelectValue>
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm">{selectedModelConfig.icon}</span>
                        <span className="font-medium">{selectedModelConfig.displayName}</span>
                        <Badge
                            variant="secondary"
                            className={`h-4 px-1 text-[9px] border-0 pointer-events-none ${selectedModelConfig.badgeColor} ${selectedModelConfig.textColor}`}
                        >
                            {selectedModelConfig.badge}
                        </Badge>
                    </div>
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-card border-primary/30 min-w-[200px]">
                {Object.values(MODEL_CONFIGS).map((model) => (
                    <SelectItem key={model.id} value={model.id} className="py-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{model.icon}</span>
                            <div className="flex flex-col text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{model.displayName}</span>
                                    <Badge
                                        variant="secondary"
                                        className={`h-4 px-1 text-[9px] border-0 ${model.badgeColor} ${model.textColor}`}
                                    >
                                        {model.badge}
                                    </Badge>
                                </div>
                                <span className="text-[9px] text-muted-foreground">
                                    {Math.round(model.costPerImage * 100)} pts
                                </span>
                            </div>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )

    return (
        <div className={`flex flex-col h-full ${className}`}>


            <div className="flex-1 flex gap-2 sm:gap-4 min-h-0">
                {/* Left Sidebar Toggle - Always visible */}
                <Button
                    size="sm"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-50 bg-primary hover:bg-primary/90 text-white rounded-r-lg p-1 w-6 h-12 items-center justify-center transition-all"
                    style={{ marginLeft: sidebarCollapsed ? '0' : '318px' }}
                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {sidebarCollapsed ? (
                        <PanelLeft className="w-4 h-4" />
                    ) : (
                        <PanelLeftClose className="w-4 h-4" />
                    )}
                </Button>

                {/* Left Sidebar - Tools & Settings - Bottom sheet on mobile */}
                <div className={`
                    ${sidebarCollapsed ? 'hidden sm:hidden' : 'block'}
                    sm:w-80 sm:relative
                    fixed bottom-0 left-0 right-0 sm:inset-auto
                    max-h-[60vh] sm:max-h-none
                    bg-background/98 sm:bg-transparent
                    border-t sm:border-t-0 border-primary/30
                    rounded-t-2xl sm:rounded-none
                    z-40 sm:z-auto
                    transition-all duration-300
                    overflow-y-auto
                `}
                    style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
                >
                    {/* Mobile drag handle */}
                    <div className="sm:hidden flex justify-center py-2 border-b border-primary/20 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                        <div className="w-12 h-1 bg-primary/50 rounded-full" />
                    </div>

                    {/* Sidebar Content */}
                    <div className="p-4 sm:p-0 space-y-4">


                        {/* Crop Settings (Only visible in Crop Mode) */}
                        {canvasState.tool === 'crop' && (
                            <Card className="bg-card/50 border-border">
                                <CardContent className="p-3 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-foreground">Crop Aspect Ratio</label>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-5 text-[10px] text-muted-foreground"
                                            onClick={() => updateCanvasState({ tool: 'select' })}
                                        >
                                            Done
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['16:9', '9:16', '4:3', '3:4', '1:1', '21:9'].map((ratio) => (
                                            <Button
                                                key={ratio}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    // Implement setCropAspectRatio logic
                                                    const [w, h] = ratio.split(':').map(Number)
                                                    canvasRef.current?.setCropAspectRatio(w / h)
                                                    toast({ description: `Aspect ratio set to ${ratio}` })
                                                }}
                                                className="text-xs h-8"
                                            >
                                                {ratio}
                                            </Button>
                                        ))}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                canvasRef.current?.setCropAspectRatio(null)
                                                toast({ description: "Freeform crop" })
                                            }}
                                            className="text-xs h-8 col-span-3"
                                        >
                                            Free / Custom
                                        </Button>
                                    </div>
                                    <Button className="w-full h-7 text-xs" onClick={() => {
                                        canvasRef.current?.applyCrop().then(() => {
                                            updateCanvasState({ tool: 'select' })
                                            toast({ title: 'Image Cropped' })
                                        })
                                    }}>
                                        Apply Crop
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Drawing Tools - Collapsible */}
                        <Card className="bg-card/50 border-border">
                            <button
                                onClick={() => setDrawingToolsExpanded(!drawingToolsExpanded)}
                                className="w-full p-2 flex items-center justify-between text-xs hover:bg-primary/10 transition-colors"
                            >
                                <span className="font-medium text-foreground flex items-center gap-2">
                                    <Palette className="w-4 h-4 text-primary" />
                                    {!drawingToolsExpanded && 'Drawing Tools'}
                                </span>
                                {drawingToolsExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                )}
                            </button>
                            {drawingToolsExpanded && (
                                <CardContent className="p-2 pt-0">
                                    <CanvasToolbar
                                        canvasState={canvasState}
                                        onToolChange={(tool) => {
                                            const annotationTools = ['brush', 'arrow', 'text', 'line', 'rectangle', 'circle']
                                            if (annotationTools.includes(tool)) {
                                                updateCanvasState({ tool, color: '#00d2d3' })
                                            } else {
                                                updateCanvasState({ tool })
                                            }
                                        }}
                                        onPropertiesChange={updateDrawingProperties}
                                        hideHeader={true}
                                    />
                                </CardContent>
                            )}
                        </Card>

                        {/* System Prompt Editor */}
                        <Card className="bg-card/50 border-muted-foreground/20">
                            <button
                                onClick={() => setSystemPromptExpanded(!systemPromptExpanded)}
                                className="w-full p-2 flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <span className="font-medium">System Prompt (Advanced)</span>
                                {systemPromptExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                ) : (
                                    <ChevronDown className="w-4 h-4" />
                                )}
                            </button>
                            {systemPromptExpanded && (
                                <CardContent className="p-2 pt-0 space-y-2">
                                    <Textarea
                                        value={systemPrompt}
                                        onChange={(e) => setSystemPrompt(e.target.value)}
                                        className="bg-secondary/50 border-muted-foreground/20 text-[10px] font-mono min-h-[150px] max-h-[300px] resize-y"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 h-7 text-[10px]"
                                            onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                                        >
                                            <RotateCw className="w-3 h-3 mr-1" />
                                            Reset to Default
                                        </Button>
                                    </div>
                                    <p className="text-[9px] text-muted-foreground">
                                        This prompt instructs the AI how to interpret your annotations. Edit for testing.
                                    </p>
                                </CardContent>
                            )}
                        </Card>

                        {/* AI Edit Input (Moved Below Drawing Tools) */}
                        <div className="space-y-2 pt-2 border-t border-border/50">
                            <label className="text-xs font-medium text-foreground">AI Instruction</label>
                            <Textarea
                                value={nanoBananaPrompt}
                                onChange={(e) => setNanoBananaPrompt(e.target.value)}
                                placeholder="Describe your shot or edits..."
                                className="bg-secondary/50 border-primary/20 focus:border-primary/50 min-h-[60px] max-h-[120px] resize-none text-xs"
                            />
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-muted-foreground ml-1">
                                    {Math.round(MODEL_CONFIGS[nanoBananaModel].costPerImage * 100)} tokens
                                </span>
                                <Button
                                    size="sm"
                                    onClick={handleNanoBananaGenerate}
                                    disabled={!nanoBananaPrompt.trim() || isProcessing}
                                    className="h-7 bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>Generate ({Math.round(MODEL_CONFIGS[nanoBananaModel].costPerImage * 100)} pts)</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Canvas Area */}
                <div className="flex-1 min-w-0 overflow-hidden">
                    <FabricCanvas
                        ref={canvasRef}
                        tool={canvasState.tool}
                        brushSize={canvasState.brushSize}
                        fontSize={canvasState.fontSize}
                        color={canvasState.color}
                        fillMode={canvasState.fillMode}
                        backgroundColor={canvasState.backgroundColor}
                        canvasWidth={canvasState.canvasWidth}
                        canvasHeight={canvasState.canvasHeight}
                        imageImportMode={imageImportMode}
                        canvasMode={canvasMode}
                        backgroundImageUrl={backgroundImage}
                        headerContent={toolbarContent}
                        centerContent={centerToolbarContent}
                        onCanvasSizeChange={(width, height) => {
                            updateCanvasState({ canvasWidth: width, canvasHeight: height })
                            setBackgroundImage('set') // Mark as having background
                        }}
                        onToolChange={(tool) => {
                            // Enforce Cyan color for annotation tools to match API requirements
                            const annotationTools = ['brush', 'arrow', 'text', 'line', 'rectangle', 'circle']
                            if (annotationTools.includes(tool)) {
                                updateCanvasState({ tool, color: '#00d2d3' })
                            } else {
                                updateCanvasState({ tool })
                            }
                        }}
                        onObjectsChange={(count) => {
                            console.log(`Canvas now has ${count} objects`)
                        }}
                    />
                </div>

                {/* Right Sidebar Toggle - Always visible */}
                <Button
                    size="sm"
                    onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
                    className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-50 bg-primary hover:bg-primary/90 text-white rounded-l-lg p-1 w-6 h-12 items-center justify-center transition-all"
                    style={{ marginRight: rightSidebarCollapsed ? '0' : '254px' }}
                    title={rightSidebarCollapsed ? 'Expand export panel' : 'Collapse export panel'}
                >
                    {rightSidebarCollapsed ? (
                        <PanelRightClose className="w-4 h-4 rotate-180" />
                    ) : (
                        <PanelRightClose className="w-4 h-4" />
                    )}
                </Button>

                {/* Right Sidebar - Export - Bottom sheet on mobile */}
                <div className={`
                    ${rightSidebarCollapsed ? 'hidden sm:hidden' : 'block'}
                    sm:w-64 sm:relative
                    fixed bottom-0 left-0 right-0 sm:inset-auto
                    max-h-[60vh] sm:max-h-none
                    bg-background/98 sm:bg-transparent
                    border-t sm:border-t-0 border-primary/30
                    rounded-t-2xl sm:rounded-none
                    z-40 sm:z-auto
                    transition-all duration-300
                    overflow-y-auto
                `}
                    style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
                >
                    {/* Mobile drag handle */}
                    <div className="sm:hidden flex justify-center py-2 border-b border-primary/20 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                        <div className="w-12 h-1 bg-primary/50 rounded-full" />
                    </div>

                    {/* Right Sidebar Content - Export & Share - Collapsible */}
                    <div className="p-4 sm:p-0">
                        <Card className="bg-card/50 border-border">
                            <button
                                onClick={() => setExportPanelExpanded(!exportPanelExpanded)}
                                className="w-full p-2 flex items-center justify-between text-xs hover:bg-primary/10 transition-colors"
                            >
                                <span className="font-medium text-foreground flex items-center gap-2">
                                    <Download className="w-4 h-4 text-primary" />
                                    {!exportPanelExpanded && 'Export & Share'}
                                </span>
                                {exportPanelExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                )}
                            </button>
                            {exportPanelExpanded && (
                                <CardContent className="p-2 pt-0">
                                    <CanvasExporter
                                        canvasRef={canvasRef}
                                        setActiveTab={setActiveTab}
                                        onExport={(format, _dataUrl) => {
                                            toast({
                                                title: `Exported as ${format.toUpperCase()}`,
                                                description: "Canvas exported successfully"
                                            })
                                        }}
                                    />
                                </CardContent>
                            )}
                        </Card>
                    </div>
                </div>
            </div>

            {/* Results Queue Strip */}
            {resultsQueue.length > 0 && (
                <div className="mt-2 p-3 bg-card border border-primary/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-primary">
                            Results Queue ({resultsQueue.length})
                        </span>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs text-muted-foreground"
                            onClick={() => setResultsQueue([])}
                        >
                            Clear All
                        </Button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {resultsQueue.map((result) => (
                            <div key={result.id} className="flex-shrink-0 flex flex-col items-center gap-1">
                                <div
                                    className="w-20 h-20 rounded border border-primary/30 overflow-hidden cursor-pointer hover:border-primary transition-colors"
                                    onClick={() => handleUseResult(result)}
                                >
                                    <img
                                        src={result.imageUrl}
                                        alt="Generated result"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-[10px]"
                                        onClick={() => handleUseResult(result)}
                                    >
                                        Use
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-[10px]"
                                        onClick={() => handleSaveResult(result)}
                                    >
                                        Save
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-1 text-[10px] text-destructive"
                                        onClick={() => handleDismissResult(result.id)}
                                    >
                                        ✕
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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

            {
                frameExtractorOpen && frameExtractorImage && (
                    <FrameExtractor
                        imageUrl={frameExtractorImage}
                        onClose={handleFrameExtractorClose}
                        onExtract={handleFramesExtracted}
                    />
                )
            }
        </div >
    )
}

export default LayoutAnnotationTab