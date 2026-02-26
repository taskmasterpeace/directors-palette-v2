'use client'

/**
 * Mask Editor Tab
 * 
 * Draw-to-edit with Nano Banana (Gemini 2.5 Flash Image)
 * Uses the discovered prompt template: annotated image + user prompt + system instructions
 */

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
    Paintbrush, Eraser, Upload, Sparkles,
    Download, Undo2, ArrowRight, Type,
    ZoomIn, ZoomOut, Maximize
} from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { createLogger } from '@/lib/logger'


const log = createLogger('Layout')
type ModelType = 'nano-banana-2'
type ToolType = 'mask' | 'draw' | 'arrow' | 'text' | 'image'

interface QueuedResult {
    id: string
    imageUrl: string      // Data URL
    prompt: string        // Prompt used to generate
    timestamp: number     // When generated
    model: string         // Which model was used
}

interface MaskEditorTabProps {
    className?: string
}

export function MaskEditorTab({ className }: MaskEditorTabProps) {
    const { toast } = useToast()
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const imageCanvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // State
    const [image, setImage] = useState<HTMLImageElement | null>(null)
    const [_imageUrl, setImageUrl] = useState<string | null>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [brushSize, setBrushSize] = useState(30)
    const [tool, setTool] = useState<ToolType>('mask')
    const [mode, setMode] = useState<"paint" | "erase">("paint")
    const [color, _setColor] = useState("#00d2d3") // Cyan color for all annotations
    const [prompt, setPrompt] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)
    const [model, setModel] = useState<ModelType>('nano-banana-2')
    const [_canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
    const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null)
    const [scale, setScale] = useState(1)

    // Results Queue - stores generated images without overwriting canvas
    const [resultsQueue, setResultsQueue] = useState<QueuedResult[]>([])
    const [previewResult, setPreviewResult] = useState<QueuedResult | null>(null)

    // Initialize canvases when image loads
    useEffect(() => {
        if (!image || !canvasRef.current || !imageCanvasRef.current || !containerRef.current) return

        const container = containerRef.current
        const maskCanvas = canvasRef.current
        const imgCanvas = imageCanvasRef.current

        // Calculate display size (fit within container while maintaining aspect ratio)
        // Use effective dimensions: if container is collapsed (small), assume a reasonable workspace size (e.g. 1200x800)
        // This prevents the "really small image" bug when container height is not yet established
        const containerW = container.clientWidth > 100 ? container.clientWidth * 0.9 : 1200
        const containerH = container.clientHeight > 100 ? container.clientHeight * 0.9 : 800

        const scale = Math.min(containerW / image.width, containerH / image.height)

        // Maintain aspect ratio - no forced minimum sizes
        const _displayW = Math.round(image.width * scale)
        const _displayH = Math.round(image.height * scale)

        // Set canvas sizes to NATIVE resolution for maximum quality
        maskCanvas.width = image.width
        maskCanvas.height = image.height
        imgCanvas.width = image.width
        imgCanvas.height = image.height

        setCanvasSize({ width: image.width, height: image.height })

        // Draw image at native resolution for maximum quality
        const imgCtx = imgCanvas.getContext("2d")
        if (imgCtx) {
            imgCtx.imageSmoothingEnabled = true
            imgCtx.imageSmoothingQuality = "high"
            imgCtx.drawImage(image, 0, 0, image.width, image.height)
        }

        // Setup mask canvas
        const maskCtx = maskCanvas.getContext("2d")
        if (maskCtx) {
            maskCtx.lineCap = "round"
            maskCtx.lineJoin = "round"
        }
    }, [image])

    // Handle image upload
    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Use FileReader to load as data URL to avoid canvas taint
        const reader = new FileReader()
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string
            if (!dataUrl) return

            const img = new Image()
            img.onload = () => {
                setImage(img)
                setImageUrl(dataUrl)
                // Clear mask when new image loads
                if (canvasRef.current) {
                    const ctx = canvasRef.current.getContext("2d")
                    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
                }
            }
            img.src = dataUrl
        }
        reader.readAsDataURL(file)
        e.target.value = ""
    }, [])

    // Zoom handlers
    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 4))
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.25))
    const handleResetZoom = () => setScale(1)

    // Drawing functions
    const getCanvasCoords = (e: React.MouseEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }
        const rect = canvas.getBoundingClientRect()
        // Adjust for scale
        return {
            x: (e.clientX - rect.left) / scale,
            y: (e.clientY - rect.top) / scale
        }
    }

    const startDrawing = (e: React.MouseEvent) => {
        const { x, y } = getCanvasCoords(e)

        if (tool === "text") {
            // For text tool, prompt for text input
            const text = window.prompt("Enter text:")
            if (text) {
                const canvas = canvasRef.current
                const ctx = canvas?.getContext("2d")
                if (canvas && ctx) {
                    ctx.font = `${brushSize}px Arial`
                    ctx.fillStyle = color
                    ctx.fillText(text, x, y)
                }
            }
            return
        }

        if (tool === "arrow") {
            // For arrow, save start point
            setStartPoint({ x, y })
            setIsDrawing(true)
            return
        }

        // For mask tool
        setIsDrawing(true)
        draw(e)
    }

    const stopDrawing = (e: React.MouseEvent) => {
        if (!isDrawing) return

        if (tool === "arrow" && startPoint) {
            // Draw arrow from start to end
            const { x, y } = getCanvasCoords(e)
            const canvas = canvasRef.current
            const ctx = canvas?.getContext("2d")
            if (canvas && ctx) {
                ctx.strokeStyle = color
                ctx.fillStyle = color
                ctx.lineWidth = brushSize / 3

                // Draw line
                ctx.beginPath()
                ctx.moveTo(startPoint.x, startPoint.y)
                ctx.lineTo(x, y)
                ctx.stroke()

                // Draw arrowhead
                const angle = Math.atan2(y - startPoint.y, x - startPoint.x)
                const headLength = brushSize
                ctx.beginPath()
                ctx.moveTo(x, y)
                ctx.lineTo(
                    x - headLength * Math.cos(angle - Math.PI / 6),
                    y - headLength * Math.sin(angle - Math.PI / 6)
                )
                ctx.lineTo(
                    x - headLength * Math.cos(angle + Math.PI / 6),
                    y - headLength * Math.sin(angle + Math.PI / 6)
                )
                ctx.closePath()
                ctx.fill()
            }
            setStartPoint(null)
        }

        setIsDrawing(false)
        const ctx = canvasRef.current?.getContext("2d")
        ctx?.beginPath()
    }

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing || tool !== "mask") return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const { x, y } = getCanvasCoords(e)

        ctx.lineWidth = brushSize

        if (mode === "paint") {
            // Use cyan color for mask - matches instruction prompt
            ctx.strokeStyle = "rgba(0, 210, 211, 0.6)" // Cyan #00d2d3
            ctx.globalCompositeOperation = "source-over"
        } else {
            ctx.globalCompositeOperation = "destination-out"
        }

        ctx.lineTo(x, y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(x, y)
    }

    const handleClearMask = () => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            // Reset the path so drawing works again
            ctx.beginPath()
        }
    }

    // Create composited image (image with mask burned in)
    const createCompositedImage = (): string | null => {
        if (!imageCanvasRef.current || !canvasRef.current) return null

        const composite = document.createElement("canvas")
        composite.width = imageCanvasRef.current.width
        composite.height = imageCanvasRef.current.height
        const ctx = composite.getContext("2d")
        if (!ctx) return null

        // Draw base image
        ctx.drawImage(imageCanvasRef.current, 0, 0)

        // Draw mask on top (visible annotations)
        ctx.drawImage(canvasRef.current, 0, 0)

        return composite.toDataURL("image/png")
    }

    // Generate with Nano Banana
    const handleGenerate = async () => {
        if (!image || !prompt.trim()) {
            toast({
                title: "Missing Data",
                description: "Upload an image and enter a prompt",
                variant: "destructive"
            })
            return
        }

        setIsProcessing(true)

        try {
            // Create composited image with mask burned in
            const compositedImage = createCompositedImage()
            if (!compositedImage) throw new Error("Failed to create composited image")

            // Call our API with the Nano Banana system prompt
            const response = await fetch("/api/generation/inpaint", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image: compositedImage,
                    prompt: prompt,
                    model: model
                })
            })

            if (!response.ok) {
                const err = await response.json().catch(() => ({}))
                throw new Error(err.error || "Inpaint failed")
            }

            const result = await response.json()

            // Convert the result URL to data URL to avoid canvas taint on re-edit
            const resultImg = new Image()
            resultImg.crossOrigin = "anonymous"
            resultImg.onload = () => {
                // Convert to data URL
                const tempCanvas = document.createElement("canvas")
                tempCanvas.width = resultImg.width
                tempCanvas.height = resultImg.height
                const tempCtx = tempCanvas.getContext("2d")
                if (tempCtx) {
                    tempCtx.drawImage(resultImg, 0, 0)
                    const dataUrl = tempCanvas.toDataURL("image/png")

                    // Push to results queue instead of overwriting canvas
                    const queuedResult: QueuedResult = {
                        id: crypto.randomUUID(),
                        imageUrl: dataUrl,
                        prompt: prompt,
                        timestamp: Date.now(),
                        model: model
                    }
                    setResultsQueue(prev => [...prev, queuedResult])
                    handleClearMask()
                    toast({
                        title: "Result Ready! ✨",
                        description: `Image added to queue. Review it below.`
                    })
                }
            }
            resultImg.onerror = () => {
                throw new Error("Failed to load generated image")
            }
            resultImg.src = result.url

        } catch (error: unknown) {
            log.error('Inpaint error', { error: error })
            const message = error instanceof Error ? error.message : 'Unknown error'
            toast({
                title: "Generation Failed",
                description: message,
                variant: "destructive"
            })
        } finally {
            setIsProcessing(false)
        }
    }

    // Download result
    const handleDownload = () => {
        if (!imageCanvasRef.current) return
        const link = document.createElement("a")
        link.href = imageCanvasRef.current.toDataURL("image/png")
        link.download = "nano-banana-2-edit.png"
        link.click()
    }

    // Queue Actions
    const handleUseResult = (result: QueuedResult) => {
        // Load the queued result to canvas for further editing
        const img = new Image()
        img.onload = () => {
            setImage(img)
            setImageUrl(result.imageUrl)
            handleClearMask()
            toast({
                title: "Image Loaded",
                description: "Result loaded to canvas for further editing"
            })
        }
        img.src = result.imageUrl
    }

    const handleDismissResult = (resultId: string) => {
        setResultsQueue(prev => prev.filter(r => r.id !== resultId))
    }

    const handleSaveToGallery = async (result: QueuedResult) => {
        // TODO: Implement gallery save functionality
        // For now, just download the image
        const link = document.createElement("a")
        link.href = result.imageUrl
        link.download = `nano-banana-2-${result.id.slice(0, 8)}.png`
        link.click()
        toast({
            title: "Image Saved",
            description: "Image downloaded. Gallery save coming soon!"
        })
        // Remove from queue after saving
        handleDismissResult(result.id)
    }

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Header - No title, just controls */}
            <Card className="bg-card border-primary/30 mb-2 sm:mb-4">
                <CardContent className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Upload */}
                        <Button
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            <Upload className="w-4 h-4 mr-1" />
                            Upload
                        </Button>

                        {/* Model Selector */}
                        <Select value={model} onValueChange={(v) => setModel(v as ModelType)}>
                            <SelectTrigger className="w-[160px] h-8 bg-card border-primary/30">
                                <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-primary/30">
                                <SelectItem value="nano-banana-2" className="text-foreground hover:bg-primary/20">
                                    Nano Banana 2
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Tool Selector */}
                        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
                            <Button
                                variant={tool === "mask" ? "default" : "ghost"}
                                size="icon"
                                className={`w-8 h-8 ${tool === "mask" ? "bg-primary text-primary-foreground" : ""}`}
                                onClick={() => setTool("mask")}
                                title="Mask/Brush"
                            >
                                <Paintbrush className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={tool === "arrow" ? "default" : "ghost"}
                                size="icon"
                                className={`w-8 h-8 ${tool === "arrow" ? "bg-primary text-primary-foreground" : ""}`}
                                onClick={() => setTool("arrow")}
                                title="Arrow"
                            >
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={tool === "text" ? "default" : "ghost"}
                                size="icon"
                                className={`w-8 h-8 ${tool === "text" ? "bg-primary text-primary-foreground" : ""}`}
                                onClick={() => setTool("text")}
                                title="Text"
                            >
                                <Type className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Brush/Eraser Toggle - only show for mask tool */}
                        {tool === "mask" && (
                            <div className="flex items-center gap-1 bg-secondary rounded-full p-1">
                                <Button
                                    variant={mode === "paint" ? "default" : "ghost"}
                                    size="icon"
                                    className={`rounded-full w-8 h-8 ${mode === "paint" ? "bg-primary text-primary-foreground" : ""}`}
                                    onClick={() => setMode("paint")}
                                    title="Paint mask"
                                >
                                    <Paintbrush className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant={mode === "erase" ? "default" : "ghost"}
                                    size="icon"
                                    className={`rounded-full w-8 h-8 ${mode === "erase" ? "bg-primary text-primary-foreground" : ""}`}
                                    onClick={() => setMode("erase")}
                                    title="Erase mask"
                                >
                                    <Eraser className="w-4 h-4" />
                                </Button>
                            </div>
                        )}

                        {/* Brush Size - show for mask and arrow tools */}
                        {(tool === "mask" || tool === "arrow") && (
                            <div className="flex items-center gap-2 min-w-[140px]">
                                <span className="text-xs text-primary">Size</span>
                                <Slider
                                    value={[brushSize]}
                                    onValueChange={([v]) => setBrushSize(v)}
                                    min={5}
                                    max={100}
                                    step={1}
                                    className="w-20"
                                />
                                <span className="text-xs text-muted-foreground w-6">{brushSize}</span>
                            </div>
                        )}

                        {/* Actions */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearMask}
                            className="border-primary/30 hover:bg-primary/20"
                        >
                            <Undo2 className="w-4 h-4 mr-1" />
                            Clear
                        </Button>


                        {image && (
                            <>
                                <div className="h-8 w-px bg-border mx-1" />
                                <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8"
                                        onClick={handleZoomOut}
                                        title="Zoom Out"
                                    >
                                        <ZoomOut className="w-4 h-4" />
                                    </Button>
                                    <span className="text-xs w-8 text-center">{Math.round(scale * 100)}%</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8"
                                        onClick={handleZoomIn}
                                        title="Zoom In"
                                    >
                                        <ZoomIn className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8"
                                        onClick={handleResetZoom}
                                        title="Reset Zoom"
                                    >
                                        <Maximize className="w-4 h-4" />
                                    </Button>
                                </div>
                            </>
                        )}

                        {image && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                                className="border-accent/30 hover:bg-accent/20"
                            >
                                <Download className="w-4 h-4 mr-1" />
                                Save
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Canvas Area */}
            <div
                ref={containerRef}
                className="flex-1 relative bg-secondary/50 rounded-lg overflow-auto flex items-center justify-center p-4 min-h-0"
            >
                {!image ? (
                    <div
                        className="flex flex-col items-center justify-center gap-4 cursor-pointer p-8 border-2 border-dashed border-primary/30 rounded-xl hover:border-primary/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                            <Upload className="w-10 h-10 text-primary" />
                        </div>
                        <p className="text-muted-foreground text-center">
                            Click to upload an image
                        </p>
                        <p className="text-xs text-muted-foreground/60">
                            Draw on the image to mark areas for editing
                        </p>
                    </div>
                ) : (
                    <div className="relative inline-block origin-center transition-transform duration-200" style={{ transform: `scale(${scale})` }}>
                        {/* Base Image Layer */}
                        <canvas
                            ref={imageCanvasRef}
                            className="pointer-events-none rounded-lg shadow-lg"
                        />
                        {/* Mask Layer - positioned to exactly match image canvas */}
                        <canvas
                            ref={canvasRef}
                            className="absolute inset-0 cursor-crosshair touch-none rounded-lg"
                            onMouseDown={startDrawing}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onMouseMove={draw}
                        />
                    </div>
                )}
            </div>

            {/* Prompt Bar */}
            <div className="mt-4 p-4 bg-card border border-border rounded-lg">
                <div className="flex gap-3 items-end">
                    <div className="flex-1">
                        <label className="text-xs text-primary mb-1 block font-medium">
                            Describe what you want to change
                        </label>
                        <Textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Examples: 'change this ring to green' • 'remove all rings' • 'add this ring to the finger' • 'replace with blue bottle'"
                            className="bg-secondary/50 border-primary/20 focus:border-primary/50 min-h-[60px] resize-none"
                        />
                    </div>
                    <Button
                        onClick={handleGenerate}
                        disabled={isProcessing || !image || !prompt.trim()}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px] h-[60px]"
                    >
                        {isProcessing ? (
                            <>
                                <LoadingSpinner size="sm" color="current" className="mr-2" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5 mr-2" />
                                Generate
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Results Queue Strip */}
            {resultsQueue.length > 0 && (
                <div className="mt-4 p-3 bg-card border border-primary/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-primary font-medium">
                            Results Queue ({resultsQueue.length})
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setResultsQueue([])}
                            className="text-xs h-6 px-2"
                        >
                            Clear All
                        </Button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {resultsQueue.map((result) => (
                            <div
                                key={result.id}
                                className="relative flex-shrink-0"
                            >
                                {/* Thumbnail - clickable for preview */}
                                <div
                                    className="w-20 h-20 rounded-lg overflow-hidden border-2 border-primary/30 hover:border-primary transition-colors cursor-pointer"
                                    onClick={() => setPreviewResult(result)}
                                >
                                    <img
                                        src={result.imageUrl}
                                        alt={result.prompt}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {/* Action buttons below thumbnail */}
                                <div className="flex gap-0.5 mt-1 justify-center">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-5 px-1.5 text-[10px]"
                                        onClick={() => setPreviewResult(result)}
                                        title="View Large"
                                    >
                                        🔍
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-5 px-1.5 text-[10px] bg-primary hover:bg-primary/90"
                                        onClick={() => handleUseResult(result)}
                                        title="Use in Editor"
                                    >
                                        Use
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-5 px-1.5 text-[10px] text-destructive"
                                        onClick={() => handleDismissResult(result.id)}
                                        title="Delete"
                                    >
                                        ✕
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewResult && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setPreviewResult(null)}
                >
                    <div
                        className="relative max-w-[90vw] max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={previewResult.imageUrl}
                            alt={previewResult.prompt}
                            className="max-w-full max-h-[80vh] object-contain rounded-lg"
                        />
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                            <Button
                                onClick={() => {
                                    handleUseResult(previewResult)
                                    setPreviewResult(null)
                                }}
                                className="bg-primary hover:bg-primary/90"
                            >
                                Use This
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    handleSaveToGallery(previewResult)
                                    setPreviewResult(null)
                                }}
                            >
                                Save
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setPreviewResult(null)}
                            >
                                Close
                            </Button>
                        </div>
                        {/* Close button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 text-white hover:bg-white/20"
                            onClick={() => setPreviewResult(null)}
                        >
                            ✕
                        </Button>
                    </div>
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
            />
        </div>
    )
}

export default MaskEditorTab
