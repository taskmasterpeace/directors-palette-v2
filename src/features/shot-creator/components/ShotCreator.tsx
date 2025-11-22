'use client'

import React, { useEffect } from 'react'
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
import CreatorPromptSettings from "./creator-prompt-settings"
import CategorySelectionDialog from "./CategorySelectDialog"
import FullscreenImageModal from "./FullscreenImageModal"
import { createReference } from "../services/reference-library.service"
import { useLibraryStore } from "../store/shot-library.store"
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from '@/components/ui/resizable'

const ShotCreator = () => {
    const { setActiveTab } = useLayoutStore()
    const { settings: shotCreatorSettings, updateSettings } = useShotCreatorSettings()
    const { loadLibraryItems } = useLibraryStore()
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
    } = useShotCreatorStore()

    // Load gallery from Supabase on mount
    const { isLoading: isGalleryLoading } = useGalleryLoader()

    const isEditingMode = shotCreatorSettings.model === 'qwen-image-edit'
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

    const onSendToImageEdit = (imageUrl: string) => {
        console.log('🎞️ Sending video frame to image editor:', imageUrl)
    }

    const onSendToLayoutAnnotation = (imageUrl: string) => {
        localStorage.setItem('directors-palette-layout-input', imageUrl)
        setActiveTab('layout-annotation')
        toast({
            title: 'Sent to Layout & Annotation',
            description: 'Image has been loaded in the Layout & Annotation tab',
        })
    }

    const handleCategorySave = async (category: string, tags: string[]) => {
        console.log('🔍 handleCategorySave called with category:', category, 'tags:', tags)
        console.log('🔍 pendingGeneration:', pendingGeneration)

        if (pendingGeneration && pendingGeneration.galleryId) {
            try {
                // Create reference in Supabase
                const { data, error } = await createReference(
                    pendingGeneration.galleryId,
                    category,
                    tags
                )

                if (error) throw error

                console.log('✅ Reference created with ID:', data?.id)

                // Clear pending generation
                setPendingGeneration(null)

                // Reload library to show new item
                await loadLibraryItems()

                toast({
                    title: "Saved to Library",
                    description: `Image saved to ${category} with ${tags.length} tags`
                })
            } catch (error) {
                console.error('🔴 Error in handleCategorySave:', error)
                toast({
                    title: "Save Failed",
                    description: error instanceof Error ? error.message : "Unknown error occurred",
                    variant: "destructive"
                })
            }
        } else {
            console.log('❌ No pendingGeneration or galleryId found!')
            toast({
                title: "Save Failed",
                description: "Missing gallery ID. Please try again.",
                variant: "destructive"
            })
        }
    }

    return (
        <div className="w-full h-full">
            {/* Mobile: Vertical stack, Desktop: Resizable panels */}
            <div className="pb-4 pt-2">
                {/* Mobile Layout (< lg) */}
                <div className="lg:hidden space-y-4">
                    {/* Reference Images */}
                    <div className="bg-slate-900/30 p-0">
                        <div className="flex items-center justify-between mb-3 px-2 pt-3">
                            <span className="text-sm text-slate-300">
                                {isEditingMode ? 'Input Image' : `References (Max ${modelConfig?.maxReferenceImages || 3})`}
                            </span>
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
                        </div>
                        <CreatorReferenceManager
                            compact={false}
                            maxImages={isEditingMode ? 1 : (modelConfig?.maxReferenceImages || 3)}
                            editingMode={isEditingMode}
                        />
                    </div>

                    {/* Prompt */}
                    <div className="bg-slate-900/30">
                        <CreatorPromptSettings compact={false} />
                    </div>

                    {/* Gallery */}
                    <div className="bg-slate-900/30">
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
                <div className="hidden lg:block h-[calc(100vh-120px)]">
                    <ResizablePanelGroup direction="horizontal" className="h-full">
                        {/* LEFT PANEL - Reference Images & Prompt */}
                        <ResizablePanel defaultSize={60} minSize={30}>
                            <div className="h-full pr-3 space-y-4 overflow-y-auto">
                                {/* Reference Images */}
                                <div className="bg-slate-900/30 rounded-lg border border-slate-700/50 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm text-slate-300">
                                            {isEditingMode ? 'Input Image' : `References (Max ${modelConfig?.maxReferenceImages || 3})`}
                                        </span>
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
                                    </div>
                                    <CreatorReferenceManager
                                        compact={false}
                                        maxImages={isEditingMode ? 1 : (modelConfig?.maxReferenceImages || 3)}
                                        editingMode={isEditingMode}
                                    />
                                </div>

                                {/* Prompt & Settings */}
                                <div className="bg-slate-900/30 rounded-lg border border-slate-700/50">
                                    <CreatorPromptSettings compact={false} />
                                </div>
                            </div>
                        </ResizablePanel>

                        {/* RESIZE HANDLE */}
                        <ResizableHandle withHandle />

                        {/* RIGHT PANEL - Generated Images & Library */}
                        <ResizablePanel defaultSize={40} minSize={25}>
                            <div className="h-full pl-3">
                                <div className="bg-slate-900/30 rounded-lg border border-slate-700/50 h-full">
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
                />
            </div>
        </div>
    )
}

export default ShotCreator