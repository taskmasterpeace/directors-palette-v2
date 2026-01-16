import { create } from "zustand";
import { ShotCreatorGeneration, ShotCreatorReferenceImage, ShotCreatorSettings } from "../types";
import { toast } from "@/hooks/use-toast";
import { getImageDimensions } from "@/features/shot-creator/helpers/short-creator.helper";
import { LibraryImageReference } from "../types/shot-library.types";

export const DEFAULT_SETTINGS: ShotCreatorSettings = {
    aspectRatio: "16:9",
    resolution: "2K",
    seed: undefined,
    model: "nano-banana",
    rawPromptMode: false, // Default: process brackets/pipes/wildcards normally
    disablePipeSyntax: false,
    disableBracketSyntax: false,
    disableWildcardSyntax: false,
    enableAnchorTransform: false, // Default: Anchor Transform off
};
export interface ShotCreatorStore {
    // ---- State ----
    shotCreatorReferenceImages: ShotCreatorReferenceImage[];
    stageReferenceImages: string[][];  // Per-stage refs for recipe pipe chaining
    shotCreatorPrompt: string;
    settings: ShotCreatorSettings;
    shotCreatorGenerations: ShotCreatorGeneration[];
    shotCreatorProcessing: boolean;
    fullscreenImage: LibraryImageReference | null;
    categoryDialogOpen: boolean;
    pendingGeneration: {
        imageUrl: string
        prompt: string
        settings: ShotCreatorSettings
        referenceTags?: string[]
        galleryId?: string
    } | null;
    generatedShotIds: Set<string>;
    useNativeAspectRatio: boolean;

    // ---- Actions ----
    setSettings: (updater: ShotCreatorSettings | ((prev: ShotCreatorSettings) => ShotCreatorSettings)) => void
    setShotCreatorReferenceImages: (images: ShotCreatorReferenceImage[] | ((prev: ShotCreatorReferenceImage[]) => ShotCreatorReferenceImage[])) => void;
    setStageReferenceImages: (refs: string[][]) => void;
    setShotCreatorPrompt: (prompt: string) => void;
    setShotCreatorGenerations: (generations: ShotCreatorGeneration[]) => void;
    setShotCreatorProcessing: (processing: boolean) => void;
    setGeneratedShotIds: (ids: Set<string>) => void;
    setCategoryDialogOpen: (open: boolean) => void;
    setPendingGeneration: (generation: {
        imageUrl: string
        prompt: string
        settings: ShotCreatorSettings
        referenceTags?: string[]
        galleryId?: string
    } | null) => void;

    // full screen
    setFullscreenImage: (image: LibraryImageReference | null) => void;
    setUseNativeAspectRatio: (value: boolean) => void;
    resetStore: () => void;

    // functions
    onSendToReferenceLibrary: (imageUrl: string, galleryId?: string) => void;
    onUseAsReference: (imageUrl: string) => Promise<void>;
    onSendToShotAnimator: (imageUrl: string) => Promise<void>;
}

export const useShotCreatorStore = create<ShotCreatorStore>()((set) => ({
    shotCreatorReferenceImages: [],
    stageReferenceImages: [],
    shotCreatorPrompt: "",
    shotCreatorGenerations: [],
    shotCreatorProcessing: false,
    fullscreenImage: null,
    categoryDialogOpen: false,
    pendingGeneration: null,
    generatedShotIds: new Set(),
    settings: DEFAULT_SETTINGS,
    useNativeAspectRatio: false,
    // ---- Actions ----
    setSettings: (updater) => set((state) => ({
        settings: typeof updater === 'function' ? updater(state.settings) : updater
    })),
    setShotCreatorReferenceImages: (images) =>
        set((state) => ({
            shotCreatorReferenceImages: typeof images === 'function' ? images(state.shotCreatorReferenceImages) : images
        })),
    setStageReferenceImages: (refs) => set({ stageReferenceImages: refs }),
    setGeneratedShotIds: (ids) => set({ generatedShotIds: ids }),
    setShotCreatorPrompt: (prompt) => set({ shotCreatorPrompt: prompt }),
    setShotCreatorGenerations: (generations) => set({ shotCreatorGenerations: generations }),
    setShotCreatorProcessing: (processing) => set({ shotCreatorProcessing: processing }),
    setFullscreenImage: (image) => set({ fullscreenImage: image }),
    setUseNativeAspectRatio: (value) => set({ useNativeAspectRatio: value }),
    setCategoryDialogOpen: (open) => set({ categoryDialogOpen: open }),
    setPendingGeneration: (generation) => set({ pendingGeneration: generation }),
    resetStore: () =>
        set({
            shotCreatorReferenceImages: [],
            stageReferenceImages: [],
            shotCreatorPrompt: "",
            shotCreatorGenerations: [],
            shotCreatorProcessing: false,
            fullscreenImage: null,
            categoryDialogOpen: false,
            pendingGeneration: null,
        }),

    onSendToReferenceLibrary: async (imageUrl: string, galleryId?: string) => {
        try {
            const settings = useShotCreatorStore.getState().settings;
            // Store pending generation with gallery ID for later category selection
            const pendingGen = {
                imageUrl,
                prompt: 'Generated image',
                settings,
                referenceTags: [],
                galleryId // Store gallery ID for creating reference
            }
            set(() => ({ pendingGeneration: pendingGen }))
            set(() => ({ categoryDialogOpen: true }))

            toast({
                title: 'Opening Save Dialog',
                description: 'Select a category for this reference',
            })
        } catch {
            toast({
                title: 'Save Failed',
                description: 'Failed to save to reference library',
                variant: 'destructive'
            })
        }
    },

    onUseAsReference: async (imageUrl: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'reference-image.png', { type: blob.type });
            const preview = URL.createObjectURL(blob);
            const dimensions = await getImageDimensions(file);

            const newImage: ShotCreatorReferenceImage = {
                id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                file,
                preview,
                tags: [],
                detectedAspectRatio: dimensions.aspectRatio,
            };

            set((state) => ({
                shotCreatorReferenceImages: [...state.shotCreatorReferenceImages, newImage],
            }));

            toast({
                title: "Reference Added",
                description: "Image added to reference slots"
            });
        } catch (error) {
            console.error('Error adding reference image:', error);
            toast({
                title: "Error",
                description: "Failed to add image as reference",
                variant: "destructive"
            });
        }
    },

    onSendToShotAnimator: async (imageUrl: string) => {
        if (!imageUrl) return;

        try {
            // Dynamically import the shot-animator store to avoid circular dependencies
            const { useShotAnimatorStore } = await import('@/features/shot-animator/store')

            // Create shot config
            const shotConfig = {
                id: `shot-${Date.now()}-${Math.random()}`,
                imageUrl: imageUrl,
                imageName: `Image ${Date.now()}`,
                prompt: "",
                referenceImages: [],
                includeInBatch: true,
                generatedVideos: []
            };

            // Add to shot animator store
            useShotAnimatorStore.getState().addShotConfig(shotConfig)

            toast({
                title: "Image Sent to Animator",
                description: "The image has been added to the Shot Animator",
            });
        } catch (error) {
            console.error('Failed to save animator reference:', error);
            toast({
                title: "Error",
                description: "Failed to send image to Shot Animator",
                variant: "destructive",
            });
        }
    }
}));
