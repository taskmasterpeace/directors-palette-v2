'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    MousePointer2,
    Pencil,
    Circle,
    Square,
    Type,
    ArrowRight,
    Hand,
    Undo2,
    Redo2,
    Download,
    X,
    Trash2,
    Eraser
} from 'lucide-react'
import { FabricCanvas, FabricCanvasRef } from '@/features/layout-annotation/components/canvas-board'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/utils/utils'
import { haptics } from '@/utils/haptics'

type EditorTool = 'select' | 'brush' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'eraser'

/**
 * Color definitions with semantic meaning for annotations
 */
const ANNOTATION_COLORS = [
    { hex: '#FF0000', name: 'Red', meaning: 'motion direction and movement paths' },
    { hex: '#FFFFFF', name: 'White', meaning: 'text labels and instructions' },
    { hex: '#000000', name: 'Black', meaning: 'outlines and emphasis' },
] as const

type AnnotationColorHex = typeof ANNOTATION_COLORS[number]['hex']

export interface ReferenceEditorExport {
    /** Base64 data URL of the annotated image */
    imageDataUrl: string
    /** Context string describing annotations for the prompt */
    annotationContext: string
    /** Whether any annotations were made */
    hasAnnotations: boolean
}

interface ReferenceEditorProps {
    /** Background image URL to annotate */
    backgroundImageUrl?: string
    /** Callback when export is clicked - returns image + context */
    onExport?: (result: ReferenceEditorExport) => void
    /** Callback to close the editor */
    onClose?: () => void
    /** Canvas dimensions */
    width?: number
    height?: number
}

const TOOLS = [
    { id: 'select', icon: MousePointer2, label: 'Select & Move', shortcut: 'V' },
    { id: 'brush', icon: Pencil, label: 'Draw', shortcut: 'P' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow', shortcut: 'A' },
    { id: 'circle', icon: Circle, label: 'Circle', shortcut: 'O' },
    { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'R' },
    { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
    { id: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
] as const

export function ReferenceEditor({
    backgroundImageUrl,
    onExport,
    onClose,
}: ReferenceEditorProps) {
    const canvasRef = useRef<FabricCanvasRef>(null)
    const { toast } = useToast()

    const [tool, setTool] = useState<EditorTool>('arrow') // Default to arrow
    const [color, setColor] = useState<AnnotationColorHex>('#FF0000') // Red = motion
    const [brushSize, setBrushSize] = useState(4)
    const [isPanning, setIsPanning] = useState(false)

    // Canvas dimensions - start with viewport size, will adjust to image
    const [canvasWidth, setCanvasWidth] = useState(window.innerWidth - 60)
    const [canvasHeight, setCanvasHeight] = useState(window.innerHeight - 60)

    // Track which colors have been used for context generation
    const [usedColors, setUsedColors] = useState<Set<AnnotationColorHex>>(new Set())

    // Load background image when provided
    useEffect(() => {
        if (backgroundImageUrl && canvasRef.current) {
            canvasRef.current.importImage(backgroundImageUrl)
        }
    }, [backgroundImageUrl])

    // Handle canvas size change when image is loaded
    const handleCanvasSizeChange = useCallback((width: number, height: number) => {
        setCanvasWidth(width)
        setCanvasHeight(height)
    }, [])

    const handleToolChange = useCallback((newTool: EditorTool) => {
        haptics.light()
        setTool(newTool)
        setIsPanning(false)
    }, [])

    const handleColorChange = useCallback((newColor: AnnotationColorHex) => {
        haptics.light()
        setColor(newColor)
        setUsedColors(prev => new Set(prev).add(newColor))
    }, [])

    const handlePanToggle = useCallback(() => {
        haptics.light()
        setIsPanning(!isPanning)
    }, [isPanning])

    const handleUndo = useCallback(() => {
        haptics.light()
        canvasRef.current?.undo()
    }, [])

    const handleRedo = useCallback(() => {
        haptics.light()
        canvasRef.current?.redo()
    }, [])

    const handleClear = useCallback(() => {
        haptics.medium()
        canvasRef.current?.clear()
        setUsedColors(new Set())
        toast({
            title: "Canvas Cleared",
            description: "All drawings have been removed"
        })
    }, [toast])

    /**
     * Build context string based on colors used
     */
    const buildAnnotationContext = useCallback((): string => {
        if (usedColors.size === 0) return ''

        const colorDescriptions: string[] = []

        usedColors.forEach(colorHex => {
            const colorInfo = ANNOTATION_COLORS.find(c => c.hex === colorHex)
            if (colorInfo) {
                colorDescriptions.push(`${colorInfo.name} annotations indicate ${colorInfo.meaning}`)
            }
        })

        if (colorDescriptions.length === 0) return ''

        return `ANNOTATION GUIDANCE:
The image contains visual annotations that indicate desired changes:
${colorDescriptions.map(d => `- ${d}`).join('\n')}

IMPORTANT: After applying the indicated changes, REMOVE all colored annotations from the final output. The result should be clean with no visible annotation marks.`
    }, [usedColors])

    const handleExport = useCallback(() => {
        if (!canvasRef.current) return

        haptics.success()
        const dataUrl = canvasRef.current.exportCanvas('png')
        const isEmpty = canvasRef.current.isEmpty()
        const annotationContext = buildAnnotationContext()

        const result: ReferenceEditorExport = {
            imageDataUrl: dataUrl,
            annotationContext,
            hasAnnotations: !isEmpty && usedColors.size > 0
        }

        if (onExport) {
            onExport(result)
        } else {
            // Default: download the image
            const link = document.createElement('a')
            link.href = dataUrl
            link.download = `annotated-reference-${Date.now()}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }

        toast({
            title: "Export Complete",
            description: result.hasAnnotations
                ? "Annotations will be added to prompt"
                : "Image exported (no annotations)"
        })
    }, [onExport, toast, buildAnnotationContext, usedColors])

    // Track when user draws with current color
    const handleCanvasChange = useCallback(() => {
        setUsedColors(prev => new Set(prev).add(color))
    }, [color])

    return (
        <div className="flex flex-col h-full bg-zinc-900 rounded-lg overflow-hidden border border-zinc-700">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700 bg-zinc-800/50">
                {/* Left: Tool Buttons */}
                <div className="flex items-center gap-1">
                    {TOOLS.map(({ id, icon: Icon, label }) => (
                        <Button
                            key={id}
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToolChange(id as EditorTool)}
                            className={cn(
                                "h-8 w-8 p-0",
                                tool === id && !isPanning
                                    ? "bg-primary text-primary-foreground"
                                    : "text-zinc-400 hover:text-white hover:bg-zinc-700"
                            )}
                            title={label}
                        >
                            <Icon className="w-4 h-4" />
                        </Button>
                    ))}

                    {/* Separator */}
                    <div className="w-px h-6 bg-zinc-600 mx-1" />

                    {/* Pan Tool */}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handlePanToggle}
                        className={cn(
                            "h-8 w-8 p-0",
                            isPanning
                                ? "bg-primary text-primary-foreground"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-700"
                        )}
                        title="Pan (Space + Drag)"
                    >
                        <Hand className="w-4 h-4" />
                    </Button>
                </div>

                {/* Center: Undo/Redo */}
                <div className="flex items-center gap-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleUndo}
                        className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo2 className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleRedo}
                        className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo2 className="w-4 h-4" />
                    </Button>
                </div>

                {/* Right: Export & Close */}
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleClear}
                        className="h-8 px-2 text-zinc-400 hover:text-white hover:bg-zinc-700"
                        title="Clear Canvas"
                    >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Clear
                    </Button>

                    <Button
                        size="sm"
                        onClick={handleExport}
                        className="h-8 px-3 bg-primary hover:bg-primary/90"
                    >
                        <Download className="w-4 h-4 mr-1" />
                        Apply
                    </Button>

                    {onClose && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onClose}
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Left Side Panel: Colors & Brush Size */}
            <div className="flex flex-1 min-h-0">
                <div className="w-14 flex flex-col items-center py-3 gap-3 border-r border-zinc-700 bg-zinc-800/30">
                    {/* Color Swatches */}
                    <div className="flex flex-col gap-2">
                        {ANNOTATION_COLORS.map((c) => (
                            <button
                                key={c.hex}
                                onClick={() => handleColorChange(c.hex)}
                                className={cn(
                                    "w-8 h-8 rounded-md border-2 transition-all flex items-center justify-center",
                                    color === c.hex
                                        ? "border-white scale-110 ring-2 ring-primary"
                                        : "border-zinc-600 hover:border-zinc-400",
                                    c.hex === '#FFFFFF' && "border-zinc-500"
                                )}
                                style={{ backgroundColor: c.hex }}
                                title={`${c.name}: ${c.meaning}`}
                            >
                                {usedColors.has(c.hex) && (
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        c.hex === '#FFFFFF' ? "bg-black" : "bg-white"
                                    )} />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Separator */}
                    <div className="w-8 h-px bg-zinc-600" />

                    {/* Brush Size Buttons */}
                    <div className="flex flex-col gap-1">
                        {[2, 4, 8, 16].map((size) => (
                            <button
                                key={size}
                                onClick={() => setBrushSize(size)}
                                className={cn(
                                    "w-8 h-8 rounded-md flex items-center justify-center transition-all",
                                    brushSize === size
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                                )}
                                title={`${size}px`}
                            >
                                <div
                                    className="rounded-full bg-current"
                                    style={{
                                        width: Math.min(size, 14),
                                        height: Math.min(size, 14)
                                    }}
                                />
                            </button>
                        ))}
                    </div>

                    {/* Color Legend */}
                    <div className="mt-auto px-1 text-[8px] text-zinc-500 text-center leading-tight">
                        <div className="text-red-400">Red = Motion</div>
                        <div className="text-white">White = Text</div>
                        <div className="text-zinc-400">Black = Outline</div>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 min-w-0 relative">
                    <FabricCanvas
                        ref={canvasRef}
                        tool={isPanning ? 'select' : tool}
                        brushSize={brushSize}
                        color={color}
                        fillMode={false}
                        backgroundColor="transparent"
                        canvasWidth={canvasWidth}
                        canvasHeight={canvasHeight}
                        canvasMode="photo"
                        onCanvasSizeChange={handleCanvasSizeChange}
                        onObjectsChange={handleCanvasChange}
                        onToolChange={(newTool) => {
                            if (newTool !== 'select') {
                                setTool(newTool as EditorTool)
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    )
}

export default ReferenceEditor
