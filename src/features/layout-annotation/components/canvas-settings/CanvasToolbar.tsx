'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
    MousePointer2,
    Brush,
    Square,
    Circle,
    Minus,
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
}

const FONT_FAMILIES = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Tahoma'
]

export function CanvasToolbar({
    canvasState,
    onToolChange,
    onPropertiesChange
}: CanvasToolbarProps) {
    const [fillMode, setFillMode] = useState(canvasState.fillMode || false)

    const tools = [
        { id: 'select', icon: MousePointer2, label: 'Select' },
        { id: 'brush', icon: Brush, label: 'Brush' },
        { id: 'rectangle', icon: Square, label: 'Rectangle' },
        { id: 'circle', icon: Circle, label: 'Circle' },
        { id: 'line', icon: Minus, label: 'Line' },
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

    return (
        <Card className="bg-slate-800/50 border-slate-600">
            <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Palette className="w-5 h-5 text-green-400" />
                    Drawing Tools
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Tool Selection */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-300">Tools</Label>
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
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                        }`}
                                >
                                    <IconComponent className="w-5 h-5" />
                                    <span className="text-xs sm:text-sm">{tool.label}</span>
                                </Button>
                            )
                        })}
                    </div>
                </div>

                {/* Color Selection - Simplified */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-300">Color</Label>
                    <div className="flex items-center gap-2 sm:gap-2">
                        <input
                            type="color"
                            value={canvasState.color}
                            onChange={(e) => handleColorChange(e.target.value)}
                            className="w-14 sm:w-12 h-12 sm:h-10 rounded border-2 border-slate-600 cursor-pointer bg-slate-700 touch-manipulation flex-shrink-0"
                            aria-label="Select color"
                        />
                        <Input
                            type="text"
                            value={canvasState.color}
                            onChange={(e) => handleColorChange(e.target.value)}
                            className="flex-1 bg-slate-700 border-slate-600 text-white text-sm min-h-[44px] h-12 sm:h-10 font-mono touch-manipulation"
                            placeholder="#FF0000"
                            aria-label="Color hex code"
                        />
                    </div>
                </div>

                {/* Fill Mode for Shapes */}
                {isShapeTool && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-slate-300">Fill Shape</Label>
                            <Switch
                                checked={fillMode}
                                onCheckedChange={handleFillModeChange}
                                className="data-[state=checked]:bg-green-600"
                            />
                        </div>
                        <p className="text-xs text-slate-400">
                            {fillMode ? 'Shape will be filled' : 'Shape will be hollow'}
                        </p>
                    </div>
                )}

                {/* Brush Size - Only show for brush, line, arrow, eraser tools */}
                {!isShapeTool && canvasState.tool !== 'select' && canvasState.tool !== 'text' && (
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-300">
                            Brush Size: {canvasState.brushSize}px
                        </Label>
                        <Slider
                            value={[canvasState.brushSize]}
                            onValueChange={([value]) => onPropertiesChange({ brushSize: value })}
                            min={1}
                            max={50}
                            step={1}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>1px</span>
                            <span>50px</span>
                        </div>
                    </div>
                )}

                {/* Opacity */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-300">
                        Opacity: {Math.round(canvasState.opacity * 100)}%
                    </Label>
                    <Slider
                        value={[canvasState.opacity * 100]}
                        onValueChange={([value]) => onPropertiesChange({ opacity: value / 100 })}
                        min={10}
                        max={100}
                        step={5}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>10%</span>
                        <span>100%</span>
                    </div>
                </div>

                {/* Text Properties (only show when text tool is selected) */}
                {canvasState.tool === 'text' && (
                    <div className="space-y-3 border-t border-slate-600 pt-3">
                        <Label className="text-sm font-medium text-slate-300">Text Properties</Label>

                        {/* Font Family */}
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-400">Font Family</Label>
                            <Select
                                value={canvasState.fontFamily}
                                onValueChange={(value) => onPropertiesChange({ fontFamily: value })}
                            >
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-8 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                    {FONT_FAMILIES.map((font) => (
                                        <SelectItem
                                            key={font}
                                            value={font}
                                            className="text-white hover:bg-slate-600"
                                            style={{ fontFamily: font }}
                                        >
                                            {font}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Font Size */}
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-400">
                                Font Size: {canvasState.fontSize}px
                            </Label>
                            <Slider
                                value={[canvasState.fontSize]}
                                onValueChange={([value]) => onPropertiesChange({ fontSize: value })}
                                min={8}
                                max={72}
                                step={1}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>8px</span>
                                <span>72px</span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}