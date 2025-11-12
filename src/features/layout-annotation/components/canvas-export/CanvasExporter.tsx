'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
    Download,
    Copy,
    Sparkles,
    Film,
    Images
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { FabricCanvasRef } from "../canvas-board"
import { ShotCreatorReferenceImage } from "@/features/shot-creator"
import { EXPORT_FORMATS, SCALE_PRESETS } from "../../constants"
import { clipboardManager } from '@/utils/clipboard-manager'

interface CanvasExporterProps {
    canvasRef: React.RefObject<FabricCanvasRef | null>
    onExport?: (format: string, dataUrl: string) => void
    setActiveTab?: (tab: string) => void
}

interface ExportSettings {
    format: 'png' | 'jpg'
    quality: number
    scale: number
    backgroundColor: string
    includeTransparency: boolean
}

export function CanvasExporter({ canvasRef, onExport, setActiveTab }: CanvasExporterProps) {
    const { toast } = useToast()
    const [isExporting, setIsExporting] = useState(false)
    const [exportSettings, setExportSettings] = useState<ExportSettings>({
        format: 'png',
        quality: 0.9,
        scale: 1,
        backgroundColor: '#ffffff',
        includeTransparency: true
    })

    const downloadLinkRef = useRef<HTMLAnchorElement>(null)

    const updateExportSettings = (updates: Partial<ExportSettings>) => {
        setExportSettings(prev => ({ ...prev, ...updates }))
    }

    const exportCanvas = async () => {
        if (!canvasRef.current?.exportCanvas) {
            toast({
                title: "Export Failed",
                description: "Canvas is not ready for export",
                variant: "destructive"
            })
            return
        }

        setIsExporting(true)

        try {
            // Get canvas data
            const dataUrl = canvasRef.current.exportCanvas(exportSettings.format)

            if (onExport) {
                onExport(exportSettings.format, dataUrl)
            }

            // Trigger download
            if (downloadLinkRef.current) {
                downloadLinkRef.current.href = dataUrl
                downloadLinkRef.current.download = `canvas-export-${Date.now()}.${exportSettings.format}`
                downloadLinkRef.current.click()
            }

            toast({
                title: "Export Successful",
                description: `Canvas exported as ${exportSettings.format.toUpperCase()}`
            })
        } catch (error) {
            console.error('Export failed:', error)
            toast({
                title: "Export Failed",
                description: "Failed to export canvas",
                variant: "destructive"
            })
        } finally {
            setIsExporting(false)
        }
    }

    const copyCanvasToClipboard = async () => {
        if (!canvasRef.current?.exportCanvas) {
            toast({
                title: "Copy Failed",
                description: "Canvas is not ready",
                variant: "destructive"
            })
            return
        }

        try {
            const dataUrl = canvasRef.current.exportCanvas('png')

            // Copy to clipboard using clipboardManager
            await clipboardManager.writeImage(dataUrl)

            toast({
                title: "Copied to Clipboard",
                description: "Canvas image copied successfully"
            })
        } catch (error) {
            console.error('Copy failed:', error)
            toast({
                title: "Copy Failed",
                description: "Failed to copy canvas to clipboard",
                variant: "destructive"
            })
        }
    }

    const sendToGallery = async () => {
        if (!canvasRef.current?.exportCanvas) return

        try {
            const dataUrl = canvasRef.current.exportCanvas('png')
            console.log("dataUrl", dataUrl)
            // Add to unified gallery store
            // const addImage = useUnifiedGalleryStore.getState().addImage
            // addImage({
            //     url: dataUrl,
            //     prompt: 'Canvas annotation export',
            //     source: 'layout-annotation',
            //     model: 'canvas-export',
            //     reference: `@canvas_${Date.now()}`,
            //     settings: {
            //         aspectRatio: '16:9',
            //         resolution: `${canvasRef.current?.getCanvasWidth?.() || 1200}x${canvasRef.current?.getCanvasHeight?.() || 675}`
            //     },
            //     tags: ['canvas', 'annotation', 'export'],
            //     creditsUsed: 0,
            //     isPermanent: false,
            //     persistence: {
            //         isPermanent: false
            //     }
            // })

            toast({
                title: "Sent to Gallery",
                description: "Canvas added to image gallery successfully"
            })
        } catch (error) {
            console.error('Send to gallery failed:', error)
            toast({
                title: "Failed to Send",
                description: "Could not send canvas to gallery",
                variant: "destructive"
            })
        }
    }

    const sendToTab = async (targetTab: string) => {
        if (!canvasRef.current?.exportCanvas) return

        try {
            const dataUrl = canvasRef.current.exportCanvas('png')

            if (targetTab === 'Shot Creator') {
                // Dynamically import the shot-creator store
                const { useShotCreatorStore } = await import('@/features/shot-creator/store')

                const response = await fetch(dataUrl)
                const blob = await response.blob()
                const file = new File([blob], `canvas-${Date.now()}.png`, { type: 'image/png' })
                const preview = URL.createObjectURL(blob)

                // Get image dimensions to detect aspect ratio
                const img = new Image()
                img.src = preview
                await new Promise((resolve) => { img.onload = resolve })

                const aspectRatio = img.width / img.height
                let detectedAspectRatio = '1:1'
                if (Math.abs(aspectRatio - 16/9) < 0.1) detectedAspectRatio = '16:9'
                else if (Math.abs(aspectRatio - 9/16) < 0.1) detectedAspectRatio = '9:16'
                else if (Math.abs(aspectRatio - 4/3) < 0.1) detectedAspectRatio = '4:3'

                const referenceImage: ShotCreatorReferenceImage = {
                    id: `canvas_${Date.now()}`,
                    file: file,
                    preview: preview,
                    tags: ['canvas-export'],
                    detectedAspectRatio,
                }

                // Add to shot creator store
                useShotCreatorStore.getState().setShotCreatorReferenceImages((prev) => [...prev, referenceImage])

                if (onExport) {
                    onExport('png', dataUrl)
                }

                // Switch to Shot Creator tab
                if (setActiveTab) {
                    setTimeout(() => setActiveTab('shot-creator'), 100)
                }

                toast({
                    title: "Sent to Shot Creator",
                    description: "Canvas image added to Shot Creator references"
                })
            }
            else if (targetTab === 'Shot Animator') {
                // Dynamically import the shot-animator store
                const { useShotAnimatorStore } = await import('@/features/shot-animator/store')

                const shotConfig = {
                    id: `shot-${Date.now()}-${Math.random()}`,
                    imageUrl: dataUrl,
                    imageName: `Canvas Export ${Date.now()}`,
                    prompt: "",
                    referenceImages: [],
                    includeInBatch: true,
                    generatedVideos: []
                }

                // Add to shot animator store
                useShotAnimatorStore.getState().addShotConfig(shotConfig)

                if (onExport) {
                    onExport('png', dataUrl);
                }

                // Switch to Shot Animator tab
                if (setActiveTab) {
                    setTimeout(() => setActiveTab('shot-animator'), 100)
                }

                toast({
                    title: "Sent to Shot Animator",
                    description: "Canvas image added to Shot Animator"
                });
            } else {
                if (onExport) {
                    onExport('png', dataUrl)
                }
                toast({
                    title: `Sent to ${targetTab}`,
                    description: "Canvas ready for use in target tab"
                })
            }
        } catch (error) {
            console.error('Send to tab failed:', error)
            toast({
                title: "Failed to Send",
                description: `Could not send canvas to ${targetTab}`,
                variant: "destructive"
            })
        }
    }

    const getEstimatedFileSize = () => {
        // Rough estimation based on format and scale
        const baseSize = 800 * 600 // base canvas dimensions
        const scaledSize = baseSize * (exportSettings.scale ** 2)

        let bytesPerPixel = 4 // RGBA
        if (exportSettings.format === 'jpg') {
            bytesPerPixel = 3 * exportSettings.quality
        }

        const estimatedBytes = scaledSize * bytesPerPixel

        if (estimatedBytes < 1024) {
            return `~${Math.round(estimatedBytes)} B`
        } else if (estimatedBytes < 1024 * 1024) {
            return `~${Math.round(estimatedBytes / 1024)} KB`
        } else {
            return `~${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`
        }
    }

    return (
        <Card className="bg-slate-900/90 border-purple-500/30 h-fit">
            <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Download className="w-5 h-5 text-purple-400" />
                    Export & Share
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Export Format */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-300">Export Format</Label>
                    <Select
                        value={exportSettings.format}
                        onValueChange={(value: ExportSettings['format']) =>
                            updateExportSettings({ format: value })
                        }
                    >
                        <SelectTrigger className="bg-slate-800 border-purple-500/30 text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-purple-500/30">
                            {EXPORT_FORMATS.map((format) => (
                                <SelectItem
                                    key={format.value}
                                    value={format.value}
                                    className="text-white hover:bg-purple-600/30"
                                >
                                    <div>
                                        <div className="font-medium">{format.label}</div>
                                        <div className="text-xs text-slate-400">{format.description}</div>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Quality Settings (for JPEG) */}
                {exportSettings.format === 'jpg' && (
                    <div className="space-y-3">
                        <Label className="text-sm font-medium text-slate-300">
                            Quality: {Math.round(exportSettings.quality * 100)}%
                        </Label>
                        <Slider
                            value={[exportSettings.quality * 100]}
                            onValueChange={([value]) => updateExportSettings({ quality: value / 100 })}
                            min={30}
                            max={100}
                            step={10}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>30%</span>
                            <span>100%</span>
                        </div>
                    </div>
                )}

                {/* Scale Settings */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-300">
                        Scale: {exportSettings.scale}x
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                        {SCALE_PRESETS.map((preset) => (
                            <Button
                                key={preset.value}
                                size="sm"
                                onClick={() => updateExportSettings({ scale: preset.value })}
                                className={`text-xs ${exportSettings.scale === preset.value
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                    }`}
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Transparency (for PNG) */}
                {exportSettings.format === 'png' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-slate-300">
                                Include Transparency
                            </Label>
                            <Switch
                                checked={exportSettings.includeTransparency}
                                onCheckedChange={(checked) =>
                                    updateExportSettings({ includeTransparency: checked })
                                }
                            />
                        </div>
                    </div>
                )}

                {/* Background Color (if no transparency) */}
                {(!exportSettings.includeTransparency || exportSettings.format === 'jpg') && (
                    <div className="space-y-3">
                        <Label className="text-sm font-medium text-slate-300">Background Color</Label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={exportSettings.backgroundColor}
                                onChange={(e) => updateExportSettings({ backgroundColor: e.target.value })}
                                className="w-12 h-8 rounded border border-slate-600 cursor-pointer"
                            />
                            <div className="text-sm text-slate-400">
                                {exportSettings.backgroundColor}
                            </div>
                        </div>
                    </div>
                )}

                {/* File Size Estimate */}
                <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-500/20">
                    <div className="text-sm text-slate-300 mb-1">Estimated File Size</div>
                    <div className="text-lg font-medium text-purple-400">
                        {getEstimatedFileSize()}
                    </div>
                </div>

                {/* Export Actions */}
                <div className="space-y-3">
                    <Button
                        onClick={exportCanvas}
                        disabled={isExporting}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white transition-all"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {isExporting ? 'Exporting...' : 'Download Canvas'}
                    </Button>

                    <Button
                        onClick={copyCanvasToClipboard}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white transition-all"
                    >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy to Clipboard
                    </Button>

                    <Button
                        onClick={sendToGallery}
                        className="w-full bg-pink-600 hover:bg-pink-700 text-white transition-all"
                    >
                        <Images className="w-4 h-4 mr-2" />
                        Save to Gallery
                    </Button>
                </div>

                {/* Send to Other Tabs */}
                <div className="space-y-3 border-t border-purple-500/30 pt-4">
                    <Label className="text-sm font-medium text-slate-300">Send to Tab</Label>

                    <div className="grid grid-cols-1 gap-2">
                        <Button
                            size="sm"
                            onClick={() => sendToTab('Shot Creator')}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            <Sparkles className="w-3 h-3 mr-1" />
                            Shot Creator
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => sendToTab('Shot Animator')}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            <Film className="w-3 h-3 mr-1" />
                            Shot Animator
                        </Button>
                    </div>
                </div>

                {/* Export Tips */}
                <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-500/20">
                    <h4 className="text-xs font-medium text-purple-300 mb-2">Export Tips</h4>
                    <ul className="text-xs text-purple-200/70 space-y-1">
                        <li>• PNG: Best for images with transparency</li>
                        <li>• JPEG: Smaller files, good for photos</li>
                        <li>• 2x scale for high resolution displays</li>
                    </ul>
                </div>
            </CardContent>

            {/* Hidden download link */}
            <a ref={downloadLinkRef} className="hidden" />
        </Card>
    )
}