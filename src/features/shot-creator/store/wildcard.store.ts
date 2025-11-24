import { create } from "zustand";
import { WildCard } from "../helpers/wildcard/parser";
import * as WildCardService from "../services/wildcard.service";
import { toast } from "@/hooks/use-toast";

export interface WildCardStore {
    // ---- State ----
    wildcards: WildCard[];
    isLoading: boolean;
    selectedWildCard: WildCard | null;
    dialogOpen: boolean;

    // ---- Actions ----
    loadWildCards: () => Promise<void>;
    createWildCard: (input: WildCardService.CreateWildCardInput) => Promise<{ success: boolean; wildcard?: WildCard }>;
    updateWildCard: (id: string, input: WildCardService.UpdateWildCardInput) => Promise<{ success: boolean }>;
    deleteWildCard: (id: string) => Promise<{ success: boolean }>;
    setSelectedWildCard: (wildcard: WildCard | null) => void;
    setDialogOpen: (open: boolean) => void;
    getWildCardByName: (name: string) => WildCard | undefined;
}

export const useWildCardStore = create<WildCardStore>()((set, get) => ({
    // ---- Initial State ----
    wildcards: [],
    isLoading: false,
    selectedWildCard: null,
    dialogOpen: false,

    // ---- Actions ----
    loadWildCards: async () => {
        set({ isLoading: true });
        try {
            const { data, error } = await WildCardService.getWildCards();

            if (error) {
                console.error('Error loading wildcards:', error);
                toast({
                    title: "Error Loading Wildcards",
                    description: error.message,
                    variant: "destructive"
                });
                set({ wildcards: [], isLoading: false });
                return;
            }

            set({ wildcards: data || [], isLoading: false });
        } catch (error) {
            console.error('Error loading wildcards:', error);
            toast({
                title: "Error Loading Wildcards",
                description: "Failed to load wildcards",
                variant: "destructive"
            });
            set({ wildcards: [], isLoading: false });
        }
    },

    createWildCard: async (input: WildCardService.CreateWildCardInput) => {
        try {
            // Check if name already exists
            const existing = get().wildcards.find(wc => wc.name === input.name);
            if (existing) {
                toast({
                    title: "Wildcard Already Exists",
                    description: `A wildcard named "_${input.name}_" already exists`,
                    variant: "destructive"
                });
                return { success: false };
            }

            const { data, error } = await WildCardService.createWildCard(input);

            if (error) {
                console.error('Error creating wildcard:', error);
                toast({
                    title: "Error Creating Wildcard",
                    description: error.message,
                    variant: "destructive"
                });
                return { success: false };
            }

            // Add to store
            set(state => ({
                wildcards: [data!, ...state.wildcards]
            }));

            toast({
                title: "Wildcard Created",
                description: `"_${input.name}_" has been created successfully`
            });

            return { success: true, wildcard: data! };
        } catch (error) {
            console.error('Error creating wildcard:', error);
            toast({
                title: "Error Creating Wildcard",
                description: "Failed to create wildcard",
                variant: "destructive"
            });
            return { success: false };
        }
    },

    updateWildCard: async (id: string, input: WildCardService.UpdateWildCardInput) => {
        try {
            const { data, error } = await WildCardService.updateWildCard(id, input);

            if (error) {
                console.error('Error updating wildcard:', error);
                toast({
                    title: "Error Updating Wildcard",
                    description: error.message,
                    variant: "destructive"
                });
                return { success: false };
            }

            // Update in store
            set(state => ({
                wildcards: state.wildcards.map(wc => wc.id === id ? data! : wc)
            }));

            toast({
                title: "Wildcard Updated",
                description: "Wildcard has been updated successfully"
            });

            return { success: true };
        } catch (error) {
            console.error('Error updating wildcard:', error);
            toast({
                title: "Error Updating Wildcard",
                description: "Failed to update wildcard",
                variant: "destructive"
            });
            return { success: false };
        }
    },

    deleteWildCard: async (id: string) => {
        try {
            const { error } = await WildCardService.deleteWildCard(id);

            if (error) {
                console.error('Error deleting wildcard:', error);
                toast({
                    title: "Error Deleting Wildcard",
                    description: error.message,
                    variant: "destructive"
                });
                return { success: false };
            }

            // Remove from store
            set(state => ({
                wildcards: state.wildcards.filter(wc => wc.id !== id)
            }));

            toast({
                title: "Wildcard Deleted",
                description: "Wildcard has been deleted successfully"
            });

            return { success: true };
        } catch (error) {
            console.error('Error deleting wildcard:', error);
            toast({
                title: "Error Deleting Wildcard",
                description: "Failed to delete wildcard",
                variant: "destructive"
            });
            return { success: false };
        }
    },

    setSelectedWildCard: (wildcard: WildCard | null) => {
        set({ selectedWildCard: wildcard });
    },

    setDialogOpen: (open: boolean) => {
        set({ dialogOpen: open });
    },

    getWildCardByName: (name: string) => {
        return get().wildcards.find(wc => wc.name === name);
    }
}));
