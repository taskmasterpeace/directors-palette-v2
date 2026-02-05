'use client'

import { useRef, useState, useCallback } from 'react'
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
    Trash2
} from 'lucide-react'
import { FabricCanvas, FabricCanvasRef } from '@/features/layout-annotation/components/canvas-board'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/utils/utils'
import { haptics } from '@/utils/haptics'

type SketchTool = 'select' | 'brush' | 'rectangle' | 'circle' | 'arrow' | 'text'

interface MotionSketchProps {
    /** Optional background image URL to sketch over */
    backgroundImageUrl?: string
    /** Callback when sketch is exported */
    onExport?: (dataUrl: string) => void
    /** Callback to close the sketch panel */
    onClose?: () => void
    /** Canvas dimensions */
    width?: number
    height?: number
}

const TOOLS = [
    { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
    { id: 'brush', icon: Pencil, label: 'Draw', shortcut: 'P' },
    { id: 'circle', icon: Circle, label: 'Circle', shortcut: 'O' },
    { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'R' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow', shortcut: 'A' },
    { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
] as const

const COLORS = [
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFFFFF', // White
    '#000000', // Black
]

export function MotionSketch({
    backgroundImageUrl,
    onExport,
    onClose,
    width = 1200,
    height = 675
}: MotionSketchProps) {
    const canvasRef = useRef<FabricCanvasRef>(null)
    const { toast } = useToast()

    const [tool, setTool] = useState<SketchTool>('brush')
    const [color, setColor] = useState('#FF0000')
    const [brushSize, setBrushSize] = useState(4)
    const [isPanning, setIsPanning] = useState(false)

    const handleToolChange = useCallback((newTool: SketchTool) => {
        haptics.light()
        setTool(newTool)
        setIsPanning(false)
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
        toast({
            title: "Canvas Cleared",
            description: "All drawings have been removed"
        })
    }, [toast])

    const handleExport = useCallback(() => {
        if (!canvasRef.current) return

        haptics.success()
        const dataUrl = canvasRef.current.exportCanvas('png')

        if (onExport) {
            onExport(dataUrl)
        } else {
            // Default: download the image
            const link = document.createElement('a')
            link.href = dataUrl
            link.download = `motion-sketch-${Date.now()}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }

        toast({
            title: "Sketch Exported",
            description: "Your motion sketch has been saved"
        })
    }, [onExport, toast])

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
                            onClick={() => handleToolChange(id as SketchTool)}
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
                        Export Sketch
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
                <div className="w-12 flex flex-col items-center py-3 gap-2 border-r border-zinc-700 bg-zinc-800/30">
                    {/* Color Swatches */}
                    <div className="flex flex-col gap-1">
                        {COLORS.map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={cn(
                                    "w-6 h-6 rounded-sm border-2 transition-all",
                                    color === c
                                        ? "border-white scale-110"
                                        : "border-transparent hover:border-zinc-500"
                                )}
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>

                    {/* Separator */}
                    <div className="w-6 h-px bg-zinc-600 my-2" />

                    {/* Brush Size Buttons */}
                    <div className="flex flex-col gap-1">
                        {[2, 4, 8, 16].map((size) => (
                            <button
                                key={size}
                                onClick={() => setBrushSize(size)}
                                className={cn(
                                    "w-6 h-6 rounded-sm flex items-center justify-center transition-all",
                                    brushSize === size
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                                )}
                                title={`${size}px`}
                            >
                                <div
                                    className="rounded-full bg-current"
                                    style={{
                                        width: Math.min(size, 12),
                                        height: Math.min(size, 12)
                                    }}
                                />
                            </button>
                        ))}
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
                        backgroundColor="#1a1a1a"
                        canvasWidth={width}
                        canvasHeight={height}
                        canvasMode="canvas"
                        backgroundImageUrl={backgroundImageUrl}
                        onToolChange={(newTool) => {
                            if (newTool !== 'select') {
                                setTool(newTool as SketchTool)
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    )
}

export default MotionSketch
