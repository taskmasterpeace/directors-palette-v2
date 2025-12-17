"use client"

import { useEffect, useRef, useState } from "react"
import * as fabric from "fabric" // Fabric 6.x
import { Button } from "@/components/ui/button"
import { Trash2, Layout, Users, Box, Wand2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { GeneratedShotPrompt } from "../../types/storyboard.types"

interface BlockingCanvasProps {
    shot: GeneratedShotPrompt
    onUpdate: (updatedShot: GeneratedShotPrompt) => void
}

export function BlockingCanvas({ shot, onUpdate }: BlockingCanvasProps) {
    const { toast } = useToast()
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Colors
    const ACTOR_COLOR = "#a855f7" // Purple 500
    const PROP_COLOR = "#eab308" // Yellow 500

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return

        // Initialize Fabric Canvas
        // Note: In Fabric 6, use Canvas not canvas usually, but imports vary. 
        // Assuming strict ESM:
        const canvas = new fabric.Canvas(canvasRef.current, {
            width: containerRef.current.clientWidth - 48, // Padding
            height: 400,
            backgroundColor: "#1e1e1e", // Dark background
            selection: true
        })

        // Load existing layout if available
        if (shot.metadata?.layoutData) {
            canvas.loadFromJSON(shot.metadata.layoutData, () => {
                canvas.renderAll()
            })
        }

        setFabricCanvas(canvas)

        // Resize handler
        const resizeObserver = new ResizeObserver(() => {
            if (containerRef.current) {
                canvas.setDimensions({
                    width: containerRef.current.clientWidth - 48,
                    height: 400
                })
            }
        })
        resizeObserver.observe(containerRef.current)

        // Cleanup
        return () => {
            resizeObserver.disconnect()
            canvas.dispose()
        }
    }, [])

    const addActor = () => {
        if (!fabricCanvas) return
        const circle = new fabric.Circle({
            radius: 30,
            fill: ACTOR_COLOR,
            left: 100,
            top: 100,
            originX: 'center',
            originY: 'center',
            stroke: '#fff',
            strokeWidth: 2
        })
        // Add text label
        const text = new fabric.Text('Actor', {
            fontSize: 14,
            fill: '#fff',
            originX: 'center',
            originY: 'center',
            top: 0
        })
        const group = new fabric.Group([circle, text], {
            left: 100,
            top: 100,
            hasControls: true,
            hasBorders: true
        })

        fabricCanvas.add(group)
        fabricCanvas.setActiveObject(group)
        fabricCanvas.renderAll()
    }

    const addProp = () => {
        if (!fabricCanvas) return
        const rect = new fabric.Rect({
            width: 60,
            height: 60,
            fill: PROP_COLOR,
            originX: 'center',
            originY: 'center',
            stroke: '#fff',
            strokeWidth: 2
        })
        const text = new fabric.Text('Prop', {
            fontSize: 14,
            fill: '#000',
            originX: 'center',
            originY: 'center'
        })
        const group = new fabric.Group([rect, text], {
            left: 200,
            top: 100,
            hasControls: true
        })

        fabricCanvas.add(group)
        fabricCanvas.setActiveObject(group)
        fabricCanvas.renderAll()
    }

    const clearCanvas = () => {
        fabricCanvas?.clear()
        if (fabricCanvas) {
            fabricCanvas.backgroundColor = "#1e1e1e"
            fabricCanvas.renderAll()
        }
    }

    const generateDescription = () => {
        if (!fabricCanvas) return

        const objects = fabricCanvas.getObjects()
        let description = "Layout: "

        objects.forEach((obj) => {
            if (obj.left === undefined || obj.top === undefined) return
            const x = obj.left
            const width = fabricCanvas.width || 800

            // Simple spatial logic
            let position = "center"
            if (x < width / 3) position = "left"
            else if (x > (width * 2) / 3) position = "right"

            if (obj.type === 'group') {
                // In a real app, we'd check the type of object inside
                description += `An element on the ${position}. `
            }
        })

        // Update shot prompt AND save layout data
        // Update shot prompt AND save layout data
        // Remove existing layout description to prevent duplication
        const basePrompt = shot.prompt.replace(/\[Layout:.*?\]/g, '').trim()
        const newPrompt = `${basePrompt} [${description}]`
        const layoutData = fabricCanvas.toJSON()

        onUpdate({
            ...shot,
            prompt: newPrompt,
            metadata: {
                ...shot.metadata,
                layoutData
            }
        })

        toast({
            title: "Prompt Updated",
            description: "Layout description added to shot prompt",
        })
    }

    return (
        <div className="flex bg-background h-full border rounded-md overflow-hidden" ref={containerRef}>
            {/* Sidebar Toolbox */}
            <div className="w-16 border-r flex flex-col items-center py-4 gap-4 bg-muted/20">
                <Button
                    variant="ghost"
                    size="icon"
                    title="Add Actor"
                    onClick={addActor}
                    className="hover:bg-purple-500/20 hover:text-purple-400"
                >
                    <Users className="w-6 h-6" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    title="Add Prop"
                    onClick={addProp}
                    className="hover:bg-yellow-500/20 hover:text-yellow-400"
                >
                    <Box className="w-6 h-6" />
                </Button>
                <div className="flex-1" />
                <Button
                    variant="ghost"
                    size="icon"
                    title="Clear"
                    onClick={clearCanvas}
                    className="text-destructive hover:bg-destructive/10"
                >
                    <Trash2 className="w-5 h-5" />
                </Button>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center bg-black/50 relative">
                <h3 className="absolute top-2 left-6 text-xs font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Layout className="w-3 h-3" /> Blocking Stage
                </h3>

                <div className="border border-white/10 shadow-2xl rounded-sm overflow-hidden bg-[#1e1e1e]">
                    <canvas ref={canvasRef} />
                </div>

                <div className="mt-4 flex gap-2">
                    <Button onClick={generateDescription} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate Prompt from Layout
                    </Button>
                </div>
            </div>
        </div>
    )
}
