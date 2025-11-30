'use client'

import React, { useRef, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Layout, PanelLeft, PanelLeftClose, PanelRightClose, RotateCcw, Save, Upload, Maximize, Minimize2, Grid3x3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { haptics } from "@/utils/haptics"
import {
    useCanvasOperations,
    useCanvasSettings,
    useImageImport,
    useIncomingImageSync
} from '../hooks'
import { useLayoutAnnotationStore } from "../store"
import { useToast } from "@/hooks/use-toast"
import { FabricCanvas, FabricCanvasRef } from "./canvas-board"
import { CanvasSettings, CanvasToolbar } from "./canvas-settings"
import { CanvasExporter } from "./canvas-export"
import { AspectRatioIconSelector } from "./AspectRatioIconSelector"
import { FrameExtractor } from "./frame-extractor"
import type { FrameExtractionResult } from "../types/frame-extractor.types"

interface LayoutAnnotationTabProps {
    className?: string
    setActiveTab?: (tab: string) => void
}

function LayoutAnnotationTab({ className, setActiveTab }: LayoutAnnotationTabProps) {
    const { toast } = useToast()
    const canvasRef = useRef<FabricCanvasRef | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const frameExtractorInputRef = useRef<HTMLInputElement>(null)

    // Frame Extractor state
    const [frameExtractorOpen, setFrameExtractorOpen] = useState(false)
    const [frameExtractorImage, setFrameExtractorImage] = useState<string | null>(null)

    // Custom hooks for business logic
    const { sidebarCollapsed, setSidebarCollapsed, rightSidebarCollapsed, setRightSidebarCollapsed, imageImportMode, setImageImportMode } = useLayoutAnnotationStore()
    const { canvasState, handleAspectRatioChange, updateCanvasState, updateDrawingProperties, updateCanvasSettings } = useCanvasSettings()
    const { handleUndo, handleClearCanvas, handleSaveCanvas } = useCanvasOperations({ canvasRef })
    const { handleImportClick, handleFileUpload } = useImageImport({ fileInputRef })
    useIncomingImageSync({ canvasRef })

    // Frame Extractor handlers
    const handleOpenFrameExtractor = useCallback(() => {
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

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Header */}
            <Card className="bg-gradient-to-r from-red-900/40 to-indigo-900/40 border-red-500/30 mb-2 sm:mb-4">
                <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                        <Layout className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                        <span className="hidden sm:inline">Layout & Annotation Canvas</span>
                        <span className="sm:hidden">Canvas</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
                        {/* Primary Actions Row */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                size="sm"
                                type="button"
                                onClick={() => {
                                    haptics.light()
                                    handleImportClick()
                                }}
                                className="flex-1 sm:flex-initial h-10 sm:h-8 min-h-[44px] sm:min-h-0 bg-red-600 hover:bg-red-700 text-white transition-all touch-manipulation"
                            >
                                <Upload className="w-4 h-4 sm:mr-1" />
                                <span className="ml-1">Import</span>
                            </Button>

                            <Button
                                size="sm"
                                type="button"
                                onClick={() => {
                                    haptics.light()
                                    setImageImportMode(imageImportMode === 'fit' ? 'fill' : 'fit')
                                }}
                                variant="outline"
                                className="h-10 sm:h-8 min-h-[44px] sm:min-h-0 border-red-500/30 text-red-200 hover:bg-red-600/20 touch-manipulation"
                                title={imageImportMode === 'fit' ? 'Switch to Fill mode' : 'Switch to Fit mode'}
                            >
                                {imageImportMode === 'fit' ? (
                                    <Minimize2 className="w-4 h-4" />
                                ) : (
                                    <Maximize className="w-4 h-4" />
                                )}
                                <span className="ml-1 hidden sm:inline">{imageImportMode === 'fit' ? 'Fit' : 'Fill'}</span>
                            </Button>

                            <Button
                                size="sm"
                                onClick={() => {
                                    haptics.success()
                                    handleSaveCanvas()
                                }}
                                className="flex-1 sm:flex-initial h-10 sm:h-8 min-h-[44px] sm:min-h-0 bg-indigo-600 hover:bg-indigo-700 text-white transition-all touch-manipulation"
                            >
                                <Save className="w-4 h-4 sm:mr-1" />
                                <span className="ml-1">Save</span>
                            </Button>

                            <Button
                                size="sm"
                                onClick={() => {
                                    haptics.medium()
                                    handleUndo()
                                }}
                                disabled={canvasState.historyIndex <= 0}
                                className="flex-1 sm:flex-initial h-10 sm:h-8 min-h-[44px] sm:min-h-0 bg-pink-600 hover:bg-pink-700 text-white disabled:opacity-50 transition-all touch-manipulation"
                            >
                                <RotateCcw className="w-4 h-4 sm:mr-1" />
                                <span className="ml-1">Undo</span>
                            </Button>

                            <Button
                                size="sm"
                                onClick={() => {
                                    haptics.warning()
                                    handleClearCanvas()
                                }}
                                variant="destructive"
                                className="flex-1 sm:flex-initial h-10 sm:h-8 min-h-[44px] sm:min-h-0 touch-manipulation"
                            >
                                <span>Clear</span>
                            </Button>

                            <Button
                                size="sm"
                                type="button"
                                onClick={() => {
                                    haptics.light()
                                    handleOpenFrameExtractor()
                                }}
                                className="flex-1 sm:flex-initial h-10 sm:h-8 min-h-[44px] sm:min-h-0 bg-cyan-600 hover:bg-cyan-700 text-white transition-all touch-manipulation"
                            >
                                <Grid3x3 className="w-4 h-4 sm:mr-1" />
                                <span className="ml-1">Extract</span>
                            </Button>
                        </div>

                        {/* Settings Row */}
                        <div className="flex items-center gap-2 sm:gap-3 text-sm text-red-200">
                            {/* Mobile: Icon Button */}
                            <AspectRatioIconSelector
                                value={canvasState.aspectRatio}
                                onChange={handleAspectRatioChange}
                            />

                            {/* Desktop: Keep existing Select */}
                            <Select
                                value={canvasState.aspectRatio}
                                onValueChange={handleAspectRatioChange}
                            >
                                <SelectTrigger className="bg-slate-800 border-red-500/30 text-white h-10 sm:h-7 w-full sm:w-28 touch-manipulation hidden sm:flex">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-red-500/30">
                                    <SelectItem value="16:9" className="text-white hover:bg-red-600/30 min-h-[44px] sm:min-h-0">16:9</SelectItem>
                                    <SelectItem value="9:16" className="text-white hover:bg-red-600/30 min-h-[44px] sm:min-h-0">9:16</SelectItem>
                                    <SelectItem value="1:1" className="text-white hover:bg-red-600/30 min-h-[44px] sm:min-h-0">1:1</SelectItem>
                                    <SelectItem value="4:3" className="text-white hover:bg-red-600/30 min-h-[44px] sm:min-h-0">4:3</SelectItem>
                                    <SelectItem value="21:9" className="text-white hover:bg-red-600/30 min-h-[44px] sm:min-h-0">21:9</SelectItem>
                                    <SelectItem value="custom" className="text-white hover:bg-red-600/30 min-h-[44px] sm:min-h-0">Custom</SelectItem>
                                </SelectContent>
                            </Select>
                            <span className="hidden sm:inline">Zoom: {Math.round(canvasState.zoom * 100)}%</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex-1 flex gap-2 sm:gap-4 min-h-0">
                {/* Left Sidebar - Tools & Settings - Bottom sheet on mobile */}
                <div className={`
                    ${sidebarCollapsed ? 'hidden sm:block sm:w-12' : 'block'}
                    sm:w-80 sm:relative
                    fixed bottom-0 left-0 right-0 sm:inset-auto
                    max-h-[60vh] sm:max-h-none
                    bg-slate-950/98 sm:bg-transparent
                    border-t sm:border-t-0 border-red-500/30
                    rounded-t-2xl sm:rounded-none
                    z-40 sm:z-auto
                    transition-all duration-300
                    ${sidebarCollapsed ? 'translate-y-full sm:translate-y-0' : 'translate-y-0'}
                    overflow-y-auto
                `}
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
                >
                    {/* Sidebar Toggle Button */}
                    <Button
                        size="sm"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="fixed sm:absolute left-2 sm:-right-3 top-20 sm:top-4 z-50 bg-red-700 hover:bg-red-600 text-white rounded-full p-2 sm:p-1 w-10 h-10 sm:w-6 sm:h-6 transition-all touch-manipulation"
                        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {sidebarCollapsed ? (
                            <PanelLeft className="w-5 h-5 sm:w-4 sm:h-4" />
                        ) : (
                            <PanelLeftClose className="w-5 h-5 sm:w-4 sm:h-4" />
                        )}
                    </Button>

                    {/* Mobile drag handle */}
                    <div className="sm:hidden flex justify-center py-2 border-b border-red-500/20 sticky top-0 bg-slate-950/95 backdrop-blur-sm z-10">
                        <div className="w-12 h-1 bg-red-500/50 rounded-full" />
                    </div>

                    {/* Sidebar Content */}
                    <div className="p-4 sm:p-0">
                        <CanvasSettings
                            aspectRatio={canvasState.aspectRatio}
                            canvasWidth={canvasState.canvasWidth}
                            canvasHeight={canvasState.canvasHeight}
                            backgroundColor={canvasState.backgroundColor}
                            onSettingsChange={updateCanvasSettings}
                        />

                        <CanvasToolbar
                            canvasState={canvasState}
                            onToolChange={(tool) => updateCanvasState({ tool })}
                            onPropertiesChange={updateDrawingProperties}
                        />
                    </div>
                </div>

                {/* Main Canvas Area */}
                <div className="flex-1 min-w-0 overflow-hidden">
                    <FabricCanvas
                        ref={canvasRef}
                        tool={canvasState.tool}
                        brushSize={canvasState.brushSize}
                        color={canvasState.color}
                        fillMode={canvasState.fillMode}
                        backgroundColor={canvasState.backgroundColor}
                        canvasWidth={canvasState.canvasWidth}
                        canvasHeight={canvasState.canvasHeight}
                        imageImportMode={imageImportMode}
                        onToolChange={(tool) => updateCanvasState({ tool })}
                        onObjectsChange={(count) => {
                            // Update the status display to show object count
                            console.log(`Canvas now has ${count} objects`)
                        }}
                    />
                </div>

                {/* Right Sidebar - Export - Bottom sheet on mobile */}
                <div className={`
                    ${rightSidebarCollapsed ? 'hidden sm:block sm:w-12' : 'block'}
                    sm:w-64 sm:relative
                    fixed bottom-0 left-0 right-0 sm:inset-auto
                    max-h-[60vh] sm:max-h-none
                    bg-slate-950/98 sm:bg-transparent
                    border-t sm:border-t-0 border-red-500/30
                    rounded-t-2xl sm:rounded-none
                    z-40 sm:z-auto
                    transition-all duration-300
                    ${rightSidebarCollapsed ? 'translate-y-full sm:translate-y-0' : 'translate-y-0'}
                    overflow-y-auto
                `}
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
                >
                    {/* Right Sidebar Toggle Button */}
                    <Button
                        size="sm"
                        onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
                        className="fixed sm:absolute right-2 sm:-left-3 top-20 sm:top-4 z-50 bg-red-700 hover:bg-red-600 text-white rounded-full p-2 sm:p-1 w-10 h-10 sm:w-6 sm:h-6 transition-all touch-manipulation"
                        title={rightSidebarCollapsed ? 'Expand export panel' : 'Collapse export panel'}
                    >
                        {rightSidebarCollapsed ? (
                            <PanelLeft className="w-5 h-5 sm:w-4 sm:h-4" />
                        ) : (
                            <PanelRightClose className="w-5 h-5 sm:w-4 sm:h-4" />
                        )}
                    </Button>

                    {/* Mobile drag handle */}
                    <div className="sm:hidden flex justify-center py-2 border-b border-red-500/20 sticky top-0 bg-slate-950/95 backdrop-blur-sm z-10">
                        <div className="w-12 h-1 bg-red-500/50 rounded-full" />
                    </div>

                    {/* Right Sidebar Content */}
                    <div className="p-4 sm:p-0">
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
                    </div>
                </div>
            </div>

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

            {frameExtractorOpen && frameExtractorImage && (
                <FrameExtractor
                    imageUrl={frameExtractorImage}
                    onClose={handleFrameExtractorClose}
                    onExtract={handleFramesExtracted}
                />
            )}
        </div>
    )
}

export default LayoutAnnotationTab