import { useRef, useState, useEffect } from "react"
import { useFloating, offset, shift, autoUpdate } from "@floating-ui/react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { GeneratedShotPrompt } from "../../types/storyboard.types"
import { Eraser, Paintbrush, Undo2, Sparkles, Wand2 } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface VfxBayProps {
    shot: GeneratedShotPrompt
    onUpdate: (updatedShot: GeneratedShotPrompt) => void
}

export function VfxBay({ shot, onUpdate: _onUpdate }: VfxBayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [brushSize, setBrushSize] = useState(20)
    const [mode, setMode] = useState<"paint" | "erase">("paint")
    const [instruction, setInstruction] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)

    // Floating UI for Toolbar
    const { refs, floatingStyles } = useFloating({
        placement: "top",
        middleware: [offset(10), shift()],
        whileElementsMounted: autoUpdate,
    })

    // Simulated Image URL (Replace with actual generated image check)
    const imageUrl = shot.imageUrl || "/placeholder-shot.jpg"

    // Initialize Canvas
    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        // Set canvas size to match container/image
        // In a real implementation, we'd wait for image load
        canvas.width = container.clientWidth
        canvas.height = container.clientHeight

        const ctx = canvas.getContext("2d")
        if (ctx) {
            ctx.lineCap = "round"
            ctx.lineJoin = "round"
        }
    }, [])

    const startDrawing = (e: React.MouseEvent) => {
        setIsDrawing(true)
        draw(e)
    }

    const stopDrawing = () => {
        setIsDrawing(false)
        const ctx = canvasRef.current?.getContext("2d")
        ctx?.beginPath() // Reset path
    }

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        ctx.lineWidth = brushSize
        ctx.strokeStyle = mode === "paint" ? "rgba(255, 0, 255, 0.5)" : "rgba(0,0,0,0)"
        ctx.globalCompositeOperation = mode === "paint" ? "source-over" : "destination-out"

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
        }
    }

    const handleGenerate = async () => {
        setIsProcessing(true)
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsProcessing(false)
        // Here we would call onUpdate with new image URL
        alert("Simulated: Image regenerated from mask!")
    }

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar (Floating) */}
            <div
                ref={refs.setFloating}
                style={floatingStyles}
                className="z-50 bg-background/95 backdrop-blur-md border border-purple-500/30 rounded-full px-4 py-2 shadow-[0_0_15px_-3px_rgba(168,85,247,0.3)] flex items-center gap-4 transition-all duration-300 hover:shadow-purple-500/20"
            >
                <div className="flex items-center gap-2 border-r pr-3 border-white/10 mr-1">
                    <Wand2 className="w-4 h-4 text-purple-400" />
                    <span className="text-[10px] font-bold text-purple-100/70 uppercase tracking-widest hidden sm:block">VFX Bay</span>
                </div>

                <div className="flex items-center gap-1 border-r pr-4 border-border/50">
                    <Button
                        variant={mode === "paint" ? "default" : "ghost"}
                        size="icon"
                        className="rounded-full w-8 h-8 data-[state=active]:bg-purple-600"
                        onClick={() => setMode("paint")}
                    >
                        <Paintbrush className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={mode === "erase" ? "default" : "ghost"}
                        size="icon"
                        className="rounded-full w-8 h-8"
                        onClick={() => setMode("erase")}
                    >
                        <Eraser className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-2 min-w-[100px]">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Size</span>
                    <Slider
                        value={[brushSize]}
                        onValueChange={([v]) => setBrushSize(v)}
                        max={100}
                        step={1}
                        className="w-24"
                    />
                </div>

                <div className="border-l pl-4 border-border/50">
                    <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 text-muted-foreground hover:text-white" onClick={handleClearMask}>
                        <Undo2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Main Canvas Area */}
            <div
                ref={(node) => {
                    containerRef.current = node
                    refs.setReference(node)
                }}
                className="flex-1 relative bg-zinc-900/50 flex items-center justify-center overflow-hidden"
            >
                {/* Background Image */}
                
                <img
                    src={imageUrl}
                    alt="Shot Preview"
                    className="max-h-full max-w-full object-contain pointer-events-none select-none"
                    style={{ opacity: 0.8 }}
                />

                {/* Masking Layer */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onMouseMove={draw}
                />
            </div>

            {/* Prompt Bar */}
            <div className="h-20 border-t border-zinc-800 bg-background/95 p-4 flex items-center justify-center gap-4">
                <div className="max-w-3xl w-full flex gap-2">
                    <div className="relative flex-1">
                        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500" />
                        <Input
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            placeholder="Describe what to change in the masked area (e.g., 'Make the shoes red')"
                            className="pl-9 bg-muted/50 border-transparent focus:bg-background transition-all"
                        />
                    </div>
                    <Button
                        onClick={handleGenerate}
                        disabled={isProcessing || !instruction}
                        className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]"
                    >
                        {isProcessing ? <LoadingSpinner size="sm" color="current" className="mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                        Generate
                    </Button>
                </div>
            </div>
        </div>
    )
}
