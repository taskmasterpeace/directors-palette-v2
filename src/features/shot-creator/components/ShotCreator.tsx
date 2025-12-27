'use client'

import React, { useEffect, useState } from 'react'
import { useShotCreatorStore } from "../store/shot-creator.store"
import { useShotCreatorSettings, useGalleryLoader } from "../hooks"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ModelSelector } from "./ModelSelector"
import { getModelConfig, ModelId } from "@/config/index"
import { CreatorReferenceManager } from "./creator-reference-manager"
import { UnifiedImageGallery } from "./unified-gallery/UnifiedImageGallery"
import { toast } from "@/hooks/use-toast"
import { useLayoutStore } from "@/store/layout.store"
import ShotReferenceLibrary from "./reference-library/ShotReferenceLibrary"
import { useUnifiedGalleryStore } from "../store/unified-gallery-store"
import CreatorPromptSettings from "./creator-prompt-settings"
import CategorySelectionDialog from "./CategorySelectDialog"
import FullscreenImageModal from "./FullscreenImageModal"
import { createReference } from "../services/reference-library.service"
import { useLibraryStore } from "../store/shot-library.store"
import { Button } from '@/components/ui/button'
import { PanelRightClose } from 'lucide-react'
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from '@/components/ui/resizable'

const ShotCreator = () => {
    const { setActiveTab } = useLayoutStore()
    const { settings: shotCreatorSettings, updateSettings } = useShotCreatorSettings()
    const { loadLibraryItems } = useLibraryStore()
    const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)
    const {
        onUseAsReference,
        onSendToShotAnimator,
        onSendToReferenceLibrary,
        fullscreenImage,
        setFullscreenImage,
        categoryDialogOpen,
        setCategoryDialogOpen,
        setPendingGeneration,
        pendingGeneration,
        shotCreatorReferenceImages,
        setShotCreatorReferenceImages,
    } = useShotCreatorStore()

    // Load gallery from Supabase on mount
    const { isLoading: isGalleryLoading } = useGalleryLoader()

    const modelConfig = getModelConfig((shotCreatorSettings.model || 'nano-banana') as ModelId)

    // Fix resolution mismatch on initial render
    useEffect(() => {
        const currentModel = shotCreatorSettings.model || 'nano-banana'
        const config = getModelConfig(currentModel as ModelId)
        const currentResolution = shotCreatorSettings.resolution

        // Check if current resolution is valid for the current model
        if (config.parameters.resolution) {
            const validOptions = config.parameters.resolution.options?.map(opt => opt.value) || []
            if (currentResolution && !validOptions.includes(currentResolution)) {
                // Set to default resolution for this model
                const defaultResolution = config.parameters.resolution.default as string
                updateSettings({ resolution: defaultResolution })
            } else if (!currentResolution) {
                // No resolution set, use default
                const defaultResolution = config.parameters.resolution.default as string
                updateSettings({ resolution: defaultResolution })
            }
        }
    }, [shotCreatorSettings.model, shotCreatorSettings.resolution, updateSettings])

    const onSendToImageEdit = (_imageUrl: string) => {
        // TODO: Implement send to image editor
    }

    const onSendToLayoutAnnotation = (imageUrl: string) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('directors-palette-layout-input', imageUrl)
        }
        setActiveTab('layout-annotation')
        toast({
            title: 'Sent to Layout & Annotation',
            description: 'Image has been loaded in the Layout & Annotation tab',
        })
    }

    const handleCategorySave = async (category: string, tags: string[]) => {
        if (pendingGeneration && pendingGeneration.galleryId) {
            try {
                // Create reference in Supabase
                const { error } = await createReference(
                    pendingGeneration.galleryId,
                    category,
                    tags
                )

                if (error) throw error

                // Clear pending generation
                setPendingGeneration(null)

                // Reload library to show new item
                await loadLibraryItems()

                toast({
                    title: "Saved to Library",
                    description: `Image saved to ${category} with ${tags.length} tags`
                })
            } catch (error) {
                toast({
                    title: "Save Failed",
                    description: error instanceof Error ? error.message : "Unknown error occurred",
                    variant: "destructive"
                })
            }
        } else {
            toast({
                title: "Save Failed",
                description: "Missing gallery ID. Please try again.",
                variant: "destructive"
            })
        }
    }

    const handleRemoveBackgroundFromFullscreen = async (imageUrl: string) => {
        toast({
            title: "Removing Background",
            description: "Processing image... (3 pts)"
        })

        try {
            const response = await fetch('/api/tools/remove-background', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl,
                    saveToGallery: true
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to remove background')
            }

            toast({
                title: "Background Removed!",
                description: "New image saved to gallery."
            })

            // Refresh gallery
            setTimeout(async () => {
                await useUnifiedGalleryStore.getState().refreshGallery()
            }, 500)
        } catch (error) {
            console.error('Background removal error:', error)
            toast({
                title: "Remove Background Failed",
                description: error instanceof Error ? error.message : "An error occurred",
                variant: "destructive"
            })
        }
    }

    const handleSaveToGalleryFromFullscreen = async (imageUrl: string) => {
        toast({
            title: "Saving to Gallery",
            description: "Uploading image..."
        })

        try {
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            const reader = new FileReader()

            const base64Data = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(blob)
            })

            const saveResponse = await fetch('/api/gallery/save-frame', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageData: base64Data,
                    metadata: {
                        aspectRatio: '16:9',
                        width: 1024,
                        height: 576,
                        row: 0,
                        col: 0
                    }
                })
            })

            const result = await saveResponse.json()

            if (!saveResponse.ok) {
                throw new Error(result.error || 'Failed to save to gallery')
            }

            toast({
                title: "Saved to Gallery!",
                description: "Reference image added to your gallery."
            })

            setTimeout(async () => {
                await useUnifiedGalleryStore.getState().refreshGallery()
            }, 500)
        } catch (error) {
            console.error('Save to gallery error:', error)
            toast({
                title: "Save Failed",
                description: error instanceof Error ? error.message : "An error occurred",
                variant: "destructive"
            })
        }
    }

    const handleDeleteFromFullscreen = (imageId: string) => {
        const currentImages = shotCreatorReferenceImages.filter(img => img.id !== imageId)
        setShotCreatorReferenceImages(currentImages)
        toast({ title: "Reference Removed", description: "Reference image removed" })
    }

    return (
        <div className="w-full h-full flex flex-col overflow-hidden">
            {/* Mobile: Vertical stack, Desktop: Resizable panels */}
            <div className="flex-1 overflow-hidden">
                {/* Mobile Layout (< lg) */}
                <div className="lg:hidden space-y-4">
                    {/* Reference Images */}
                    <div className="bg-background/30 p-0">
                        <CreatorReferenceManager
                            compact={true}
                            maxImages={modelConfig?.maxReferenceImages || 3}
                            modelSelector={
                                <ModelSelector
                                    selectedModel={shotCreatorSettings.model || 'nano-banana'}
                                    onModelChange={(model: string) => {
                                        const newModel = model as ModelId
                                        const newModelConfig = getModelConfig(newModel)
                                        const defaultResolution = newModelConfig.parameters.resolution?.default as string | undefined
                                        const updates: { model: ModelId; resolution?: string } = { model: newModel }
                                        if (defaultResolution) updates.resolution = defaultResolution
                                        updateSettings(updates)
                                    }}
                                    compact={true}
                                    showTooltips={false}
                                />
                            }
                        />
                    </div>

                    {/* Prompt */}
                    <div className="bg-background/30">
                        <CreatorPromptSettings compact={false} />
                    </div>

                    {/* Gallery */}
                    <div className="bg-background/30">
                        <Tabs defaultValue="generated" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="generated" className="text-xs">📸 Images</TabsTrigger>
                                <TabsTrigger value="library" className="text-xs">📚 Library</TabsTrigger>
                            </TabsList>
                            <TabsContent value="generated">
                                <UnifiedImageGallery
                                    currentTab="shot-creator"
                                    isLoading={isGalleryLoading}
                                    onSendToTab={(imageUrl, targetTab) => {
                                        if (targetTab === 'shot-editor' && onSendToImageEdit) {
                                            onSendToImageEdit(imageUrl)
                                        } else if (targetTab === 'layout-annotation' && onSendToLayoutAnnotation) {
                                            onSendToLayoutAnnotation(imageUrl)
                                        }
                                    }}
                                    onSendToLibrary={(imageUrl: string, galleryId: string) => {
                                        onSendToReferenceLibrary(imageUrl, galleryId);
                                    }}
                                    onSendToShotAnimator={(imageUrl) => {
                                        if (onSendToShotAnimator) {
                                            onSendToShotAnimator(imageUrl);
                                        }
                                    }}
                                    onUseAsReference={(imageUrl) => {
                                        if (onUseAsReference) {
                                            onUseAsReference(imageUrl);
                                        }
                                    }}
                                />
                            </TabsContent>
                            <TabsContent value="library">
                                <ShotReferenceLibrary />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                {/* Desktop Layout (>= lg) - Resizable */}
                <div className="hidden lg:flex h-full relative">
                    {/* Toggle Button - Always visible, positioned at top */}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                        className="absolute right-0 top-4 z-50 bg-primary/90 hover:bg-primary text-white rounded-l-lg p-1 w-6 h-10 flex items-center justify-center transition-all shadow-lg"
                        style={{ marginRight: rightPanelCollapsed ? '0' : 'calc(40% - 12px)' }}
                        title={rightPanelCollapsed ? 'Show gallery panel' : 'Hide gallery panel'}
                    >
                        {rightPanelCollapsed ? (
                            <PanelRightClose className="w-4 h-4 rotate-180" />
                        ) : (
                            <PanelRightClose className="w-4 h-4" />
                        )}
                    </Button>

                    <ResizablePanelGroup direction="horizontal" className="h-full">
                        {/* LEFT PANEL - Reference Images & Prompt */}
                        <ResizablePanel defaultSize={rightPanelCollapsed ? 100 : 60} minSize={30}>
                            <div className="h-full pr-3 space-y-4 overflow-y-auto">
                                {/* Reference Images */}
                                <div className="bg-background/30 rounded-lg border border-border/50 p-4">
                                    <CreatorReferenceManager
                                        compact={true}
                                        maxImages={modelConfig?.maxReferenceImages || 3}
                                        modelSelector={
                                            <ModelSelector
                                                selectedModel={shotCreatorSettings.model || 'nano-banana'}
                                                onModelChange={(model: string) => {
                                                    const newModel = model as ModelId
                                                    const newModelConfig = getModelConfig(newModel)
                                                    const defaultResolution = newModelConfig.parameters.resolution?.default as string | undefined
                                                    const updates: { model: ModelId; resolution?: string } = { model: newModel }
                                                    if (defaultResolution) updates.resolution = defaultResolution
                                                    updateSettings(updates)
                                                }}
                                                compact={true}
                                                showTooltips={false}
                                            />
                                        }
                                    />
                                </div>

                                {/* Prompt & Settings */}
                                <div className="bg-background/30 rounded-lg border border-border/50">
                                    <CreatorPromptSettings compact={false} />
                                </div>
                            </div>
                        </ResizablePanel>

                        {/* RESIZE HANDLE & RIGHT PANEL - Only show when not collapsed */}
                        {!rightPanelCollapsed && (
                            <>
                                <ResizableHandle withHandle />

                                {/* RIGHT PANEL - Generated Images & Library */}
                                <ResizablePanel defaultSize={40} minSize={25}>
                                    <div className="h-full pl-3">
                                        <div className="bg-background/30 rounded-lg border border-border/50 h-full">
                                            <Tabs defaultValue="generated" className="w-full h-full flex flex-col">
                                                <TabsList className="grid w-full grid-cols-2">
                                                    <TabsTrigger value="generated" className="text-sm">📸 Images</TabsTrigger>
                                                    <TabsTrigger value="library" className="text-sm">📚 Library</TabsTrigger>
                                                </TabsList>
                                                <TabsContent value="generated" className="flex-1 overflow-hidden">
                                                    <UnifiedImageGallery
                                                        currentTab="shot-creator"
                                                        isLoading={isGalleryLoading}
                                                        onSendToTab={(imageUrl, targetTab) => {
                                                            if (targetTab === 'shot-editor' && onSendToImageEdit) {
                                                                onSendToImageEdit(imageUrl)
                                                            } else if (targetTab === 'layout-annotation' && onSendToLayoutAnnotation) {
                                                                onSendToLayoutAnnotation(imageUrl)
                                                            }
                                                        }}
                                                        onSendToLibrary={(imageUrl: string, galleryId: string) => {
                                                            onSendToReferenceLibrary(imageUrl, galleryId);
                                                        }}
                                                        onSendToShotAnimator={(imageUrl) => {
                                                            if (onSendToShotAnimator) {
                                                                onSendToShotAnimator(imageUrl);
                                                            }
                                                        }}
                                                        onUseAsReference={(imageUrl) => {
                                                            if (onUseAsReference) {
                                                                onUseAsReference(imageUrl);
                                                            }
                                                        }}
                                                    />
                                                </TabsContent>
                                                <TabsContent value="library" className="flex-1 overflow-hidden">
                                                    <ShotReferenceLibrary />
                                                </TabsContent>
                                            </Tabs>
                                        </div>
                                    </div>
                                </ResizablePanel>
                            </>
                        )}
                    </ResizablePanelGroup>
                </div>

                {/* Category Selection Dialog */}
                <CategorySelectionDialog
                    open={categoryDialogOpen}
                    onOpenChange={setCategoryDialogOpen}
                    onSave={handleCategorySave}
                    initialTags={[]}
                    imageUrl={pendingGeneration?.imageUrl}
                />
                {/* Fullscreen Image Modal */}
                <FullscreenImageModal
                    open={!!fullscreenImage}
                    onOpenChange={(open) => {
                        if (!open) setFullscreenImage(null)
                    }}
                    onSendToAnimator={onSendToShotAnimator}
                    onSendToLayout={onSendToLayoutAnnotation}
                    onRemoveBackground={handleRemoveBackgroundFromFullscreen}
                    onSaveToGallery={handleSaveToGalleryFromFullscreen}
                    onDelete={handleDeleteFromFullscreen}
                />
            </div>
        </div>
    )
}

export default ShotCreator