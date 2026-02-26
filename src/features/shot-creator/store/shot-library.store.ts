import { create } from "zustand";
import { toast } from "@/hooks/use-toast";
import { LibraryImageReference } from "../types/shot-library.types";
import {
    updateReferenceCategory,
    deleteReference,
    updateReferenceTags,
    getReferencesPaginated
} from "../services/reference-library.service";
import { Category } from "../components/CategorySelectDialog";
import { logger } from '@/lib/logger'

export type LibraryCategory = 'all' | 'people' | 'places' | 'props' | 'unorganized';
export interface ShotLibraryStore {
    // ---- State ----
    libraryCategory: LibraryCategory;
    libraryItems: LibraryImageReference[];
    libraryLoading: boolean;
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;

    setLibraryCategory: (category: LibraryCategory) => void;
    setLibraryItems: (items: LibraryImageReference[]) => void;
    setLibraryLoading: (loading: boolean) => void;
    setCurrentPage: (page: number) => void;
    loadLibraryItems: (page?: number) => Promise<void>;
    updateItemCategory: (itemId: string, newCategory: string) => Promise<void>;
    deleteItem: (itemId: string) => Promise<void>;
    updateItemTags: (itemId: string, tags: string[]) => Promise<void>;
}

export const useLibraryStore = create<ShotLibraryStore>()((set, get) => ({
    libraryCategory: 'all',
    libraryItems: [],
    libraryLoading: false,
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    pageSize: 30,

    // ---- Actions ----
    setLibraryCategory: (category: LibraryCategory) => {
        set({ libraryCategory: category, currentPage: 1 })
        // Reload with new category
        get().loadLibraryItems(1)
    },
    setLibraryItems: (items: LibraryImageReference[]) => set({ libraryItems: items }),
    setLibraryLoading: (loading: boolean) => set({ libraryLoading: loading }),
    setCurrentPage: (page: number) => {
        set({ currentPage: page })
        get().loadLibraryItems(page)
    },

    loadLibraryItems: async (page?: number) => {
        const state = get()
        if (state.libraryLoading) return
        set({ libraryLoading: true })
        try {
            const currentPage = page || state.currentPage
            const category = state.libraryCategory

            // Use paginated service method
            const { data: references, total, totalPages, error } = await getReferencesPaginated(
                currentPage,
                state.pageSize,
                category
            )

            if (error) throw error

            // Transform to LibraryImageReference format with optimized mapping
            const items: LibraryImageReference[] = (references || []).map((ref) => {
                const metadata = ref.gallery?.metadata as { prompt?: string } | undefined
                return {
                    id: ref.id,
                    imageData: ref.gallery?.public_url || '',
                    preview: ref.gallery?.public_url || '',
                    tags: ref.tags || [],
                    category: ref.category as Category,
                    prompt: metadata?.prompt || '',
                    createdAt: new Date(ref.created_at),
                    source: 'generated' as const,
                    settings: metadata as LibraryImageReference['settings'],
                }
            })

            set({
                libraryItems: items,
                currentPage,
                totalPages,
                totalItems: total
            })
        } catch (error) {
            logger.shotCreator.error('Failed to load library', { error: error instanceof Error ? error.message : String(error) })
            toast({
                title: "Library Error",
                description: "Failed to load reference library",
                variant: "destructive"
            })
        } finally {
            set({ libraryLoading: false })
        }
    },

    updateItemCategory: async (itemId: string, newCategory: string) => {
        try {
            const { error } = await updateReferenceCategory(itemId, newCategory)

            if (error) throw error

            // Update local state
            set((state) => ({
                libraryItems: state.libraryItems.map(item =>
                    item.id === itemId
                        ? { ...item, category: newCategory as Category }
                        : item
                )
            }))

            toast({
                title: "Category Updated",
                description: `Item moved to ${newCategory}`
            })
        } catch (error) {
            logger.shotCreator.error('Failed to update category', { error: error instanceof Error ? error.message : String(error) })
            toast({
                title: "Update Failed",
                description: "Failed to update category",
                variant: "destructive"
            })
        }
    },

    deleteItem: async (itemId: string) => {
        try {
            const { error } = await deleteReference(itemId)

            if (error) throw error

            // Update local state
            set((state) => ({
                libraryItems: state.libraryItems.filter(item => item.id !== itemId)
            }))

            toast({
                title: "Deleted",
                description: "Reference removed from library"
            })
        } catch (error) {
            logger.shotCreator.error('Failed to delete item', { error: error instanceof Error ? error.message : String(error) })
            toast({
                title: "Delete Failed",
                description: "Failed to remove reference",
                variant: "destructive"
            })
        }
    },

    updateItemTags: async (itemId: string, tags: string[]) => {
        try {
            const { error } = await updateReferenceTags(itemId, tags)

            if (error) throw error

            // Update local state
            set((state) => ({
                libraryItems: state.libraryItems.map(item =>
                    item.id === itemId
                        ? { ...item, tags }
                        : item
                )
            }))

            toast({
                title: "Tags Updated",
                description: "Reference tags have been updated"
            })
        } catch (error) {
            logger.shotCreator.error('Failed to update tags', { error: error instanceof Error ? error.message : String(error) })
            toast({
                title: "Update Failed",
                description: "Failed to update tags",
                variant: "destructive"
            })
        }
    },

}));
