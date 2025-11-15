'use client'

import React, { useEffect } from 'react'
import { useShotCreatorStore } from "../store/shot-creator.store"
import { useShotCreatorSettings, useGalleryLoader } from "../hooks"
import { Sparkles } from 'lucide-react'
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
            {/* Mobile-Optimized Header */}
            <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between px-2 lg:px-4 py-3 bg-slate-900/50 border-b border-slate-700 lg:rounded-t-lg">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h2 className="text-lg lg:text-xl font-semibold text-white">Shot Creator</h2>
                </div>
                <div className="w-full lg:w-auto">
                    <ModelSelector
                        selectedModel={shotCreatorSettings.model || 'nano-banana'}
                        onModelChange={(model: string) => {
                            const newModel = model as ModelId
                            const newModelConfig = getModelConfig(newModel)

                            // Get default resolution for the new model
                            const defaultResolution = newModelConfig.parameters.resolution?.default as string | undefined

                            // Update settings with new model and its default resolution if it supports resolution
                            const updates: {
                                model: ModelId
                                resolution?: string
                            } = { model: newModel }
                            if (defaultResolution) {
                                updates.resolution = defaultResolution
                            }

                            updateSettings(updates)
                        }}
                        compact={true}
                        showTooltips={false}
                    />
                </div>
            </div>

            {/* Full-Width Mobile Layout */}
            <div className="space-y-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0 pb-4">

                {/* LEFT COLUMN - Reference Images & Prompt */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Reference Images Management / Input Image for Editing */}
                    <div className="bg-slate-900/30 lg:rounded-lg lg:border border-slate-700/50 p-0 lg:p-6">
                        <div className="mb-4 px-2 pt-4 lg:px-0 lg:pt-0">
                            <h3 className="text-white font-medium">
                                {isEditingMode ? 'Input Image to Edit' : `Reference Images (Max ${modelConfig.maxReferenceImages || 3})`}
                            </h3>
                            {isEditingMode && (
                                <p className="text-slate-400 text-sm mt-1">
                                    Upload the image you want to edit with AI instructions
                                </p>
                            )}
                        </div>
                        <CreatorReferenceManager
                            compact={false}
                            maxImages={isEditingMode ? 1 : (modelConfig.maxReferenceImages || 3)}
                            editingMode={isEditingMode}
                        />
                    </div>

                    {/* Prompt & Settings */}
                    <div className="bg-slate-900/30 lg:rounded-lg lg:border border-slate-700/50">
                        <CreatorPromptSettings compact={false} />
                    </div>
                </div>

                {/* RIGHT COLUMN - Generated Images & Library */}
                <div className="space-y-6">
                    {/* Single Gallery - Generated Images + Reference Library */}
                    <div className="bg-slate-900/30 lg:rounded-lg lg:border border-slate-700/50">
                        <Tabs defaultValue="generated" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="generated" className="text-xs lg:text-sm">📸 Images</TabsTrigger>
                                <TabsTrigger value="library" className="text-xs lg:text-sm">📚 Library</TabsTrigger>
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
        </div>
    )
}

export default ShotCreator