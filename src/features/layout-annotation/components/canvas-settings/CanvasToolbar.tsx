'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
    MousePointer2,
    Brush,
    Square,
    ArrowRight,
    Type,
    Eraser,
    Palette,
    Crop
} from 'lucide-react'
import { haptics } from '@/utils/haptics'
import { CanvasState, DrawingProperties } from "../../types"

interface CanvasToolbarProps {
    canvasState: CanvasState
    onToolChange: (tool: CanvasState['tool']) => void
    onPropertiesChange: (properties: Partial<DrawingProperties>) => void
    hideHeader?: boolean
}

const FONT_FAMILIES = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Tahoma'
]

export function CanvasToolbar({
    canvasState,
    onToolChange,
    onPropertiesChange,
    hideHeader = false
}: CanvasToolbarProps) {
    const [fillMode, setFillMode] = useState(canvasState.fillMode || false)

    const tools = [
        { id: 'select', icon: MousePointer2, label: 'Select' },
        { id: 'brush', icon: Brush, label: 'Mask' },
        { id: 'rectangle', icon: Square, label: 'Rectangle' },
        { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
        { id: 'text', icon: Type, label: 'Text' },
        { id: 'eraser', icon: Eraser, label: 'Eraser' },
        { id: 'crop', icon: Crop, label: 'Crop' }
    ] as const

    const handleColorChange = (color: string) => {
        onPropertiesChange({ color })
    }

    const handleFillModeChange = (checked: boolean) => {
        setFillMode(checked)
        onPropertiesChange({ fillMode: checked })
    }

    const isShapeTool = ['rectangle', 'circle'].includes(canvasState.tool)

    // When hideHeader is true, render without Card wrapper
    const content = (
        <div className="space-y-4">
            {/* Tool Selection */}
            {/* Tool Selection */}
            <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Tools</Label>
                <div className="grid grid-cols-2 gap-1">
                    {tools.map((tool) => {
                        const IconComponent = tool.icon
                        const isActive = canvasState.tool === tool.id

                        return (
                            <Button
                                key={tool.id}
                                size="sm"
                                onClick={() => {
                                    haptics.light()
                                    onToolChange(tool.id as CanvasState['tool'])
                                }}
                                className={`flex items-center gap-2 justify-start text-left
                                        min-h-[44px] h-auto sm:h-8
                                        min-w-[44px] sm:min-w-0
                                        px-3 py-2
                                        touch-manipulation
                                        ${isActive
                                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                                        : 'bg-secondary hover:bg-muted text-foreground'
                                    }`}
                            >
                                <IconComponent className="w-5 h-5" />
                                <span className="text-xs sm:text-sm">{tool.label}</span>
                            </Button>
                        )
                    })}
                </div>
            </div>

            {/* Color Selection - Drawing, Background & Opacity */}
            <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Colors & Opacity</Label>
                <div className="flex items-end gap-3">
                    <div className="flex flex-col items-center gap-1">
                        <input
                            type="color"
                            value={canvasState.color}
                            onChange={(e) => handleColorChange(e.target.value)}
                            className="w-10 h-8 rounded border-2 border-border cursor-pointer bg-secondary touch-manipulation"
                            aria-label="Drawing color"
                        />
                        <span className="text-[10px] text-muted-foreground">Draw</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <input
                            type="color"
                            value={canvasState.backgroundColor || '#ffffff'}
                            onChange={(e) => onPropertiesChange({ backgroundColor: e.target.value })}
                            className="w-10 h-8 rounded border-2 border-border cursor-pointer bg-secondary touch-manipulation"
                            aria-label="Background color"
                        />
                        <span className="text-[10px] text-muted-foreground">BG</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                        <Slider
                            value={[canvasState.opacity * 100]}
                            onValueChange={([value]) => onPropertiesChange({ opacity: value / 100 })}
                            min={10}
                            max={100}
                            step={5}
                            className="w-full"
                        />
                        <span className="text-[10px] text-muted-foreground text-center">{Math.round(canvasState.opacity * 100)}% opacity</span>
                    </div>
                </div>
            </div>

            {/* Fill Mode for Shapes */}
            {isShapeTool && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-foreground">Fill Shape</Label>
                        <Switch
                            checked={fillMode}
                            onCheckedChange={handleFillModeChange}
                            className="data-[state=checked]:bg-primary"
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {fillMode ? 'Shape will be filled' : 'Shape will be hollow'}
                    </p>
                </div>
            )}

            {/* Unified Size/Thickness Control */}
            {canvasState.tool !== 'select' && canvasState.tool !== 'crop' && (
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                        {canvasState.tool === 'text' ? 'Text Size' :
                            ['rectangle', 'circle'].includes(canvasState.tool) ? 'Border Thickness' :
                                'Brush Size'}: {canvasState.tool === 'text' ? (canvasState.fontSize || 20) : canvasState.brushSize}px
                    </Label>
                    <Slider
                        value={[canvasState.tool === 'text' ? (canvasState.fontSize || 20) : canvasState.brushSize]}
                        onValueChange={([value]) => {
                            if (canvasState.tool === 'text') {
                                onPropertiesChange({ fontSize: value })
                            } else {
                                onPropertiesChange({ brushSize: value })
                            }
                        }}
                        min={canvasState.tool === 'text' ? 12 : 1}
                        max={canvasState.tool === 'text' ? 100 : 200}
                        step={1}
                        className="w-full"
                    />
                </div>
            )}

            {/* Text Properties (only show when text tool is selected) */}
            {canvasState.tool === 'text' && (
                <div className="space-y-3 border-t border-border pt-3">
                    <Label className="text-sm font-medium text-foreground">Text Properties</Label>

                    {/* Font Family */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Font Family</Label>
                        <Select
                            value={canvasState.fontFamily}
                            onValueChange={(value) => onPropertiesChange({ fontFamily: value })}
                        >
                            <SelectTrigger className="bg-secondary border-border text-white h-8 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-secondary border-border">
                                {FONT_FAMILIES.map((font) => (
                                    <SelectItem
                                        key={font}
                                        value={font}
                                        className="text-white hover:bg-muted"
                                        style={{ fontFamily: font }}
                                    >
                                        {font}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>


                </div>
            )}
        </div>
    )

    // Conditionally wrap in Card
    if (hideHeader) {
        return content
    }

    return (
        <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    Drawing Tools
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {content}
            </CardContent>
        </Card>
    )
}