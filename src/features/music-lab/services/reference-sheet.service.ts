/**
 * Reference Sheet Service
 *
 * Generates Identity Lock, Wardrobe Sheet, and Location Sheet
 * using the recipe execution API.
 */

import type { WardrobeItem, LocationItem } from '../types/reference-sheet.types'

export interface ReferenceSheetResult {
    success: boolean
    imageUrl?: string
    error?: string
}

class ReferenceSheetService {
    private readonly baseUrl = '/api/recipes'

    // Recipe names as they appear in the database
    private readonly RECIPE_NAMES = {
        // Use "From Description" version when no reference image
        identityLockFromRef: 'Character Turnaround',
        identityLockFromDesc: 'Character Turnaround (From Description)',
        wardrobeSheet: 'Wardrobe Sheet',
        locationSheet: 'Location Sheet'
    } as const

    /**
     * Generate Identity Lock (Character Turnaround) sheet
     * Creates a 7-panel reference with 4 body views + 3 portraits
     *
     * Uses "Character Turnaround" if reference image provided,
     * otherwise uses "Character Turnaround (From Description)"
     */
    async generateIdentityLock(
        _artistName: string,
        artistDescription: string,
        referenceImageUrl?: string,
        style: string = 'photographic'
    ): Promise<ReferenceSheetResult> {
        try {
            // Choose recipe based on whether we have a reference image
            const hasReferenceImage = !!referenceImageUrl
            const recipeName = hasReferenceImage
                ? this.RECIPE_NAMES.identityLockFromRef
                : this.RECIPE_NAMES.identityLockFromDesc

            // Build field values based on recipe
            const fieldValues: Record<string, string> = {}

            if (hasReferenceImage) {
                // "Character Turnaround" recipe has STYLE field only
                fieldValues['stage0_field0_style'] = style
            } else {
                // "Character Turnaround (From Description)" has CHARACTER_DESCRIPTION and STYLE
                fieldValues['stage0_field0_character_description'] = artistDescription
                fieldValues['stage0_field1_style'] = style
            }

            const referenceImages: string[] = []
            if (referenceImageUrl) {
                referenceImages.push(referenceImageUrl)
            }

            const encodedName = encodeURIComponent(recipeName)
            const response = await fetch(`${this.baseUrl}/${encodedName}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fieldValues,
                    referenceImages,
                    modelSettings: {
                        aspectRatio: '16:9',
                        outputFormat: 'png',
                        model: 'nano-banana-2'
                    }
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                return {
                    success: false,
                    error: errorData.error || `HTTP ${response.status}`
                }
            }

            const data = await response.json()
            return {
                success: true,
                imageUrl: data.imageUrl
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error'
            }
        }
    }

    /**
     * Generate Wardrobe Sheet with labeled cells
     * Creates a 2x3 grid of wardrobe variations with labels
     *
     * Field mapping from template:
     * - Field 0: CHARACTER_NAME (header)
     * - Field 1: BACKGROUND_COLOR
     * - Fields 2-13: OUTFIT_N_NAME and OUTFIT_N_DESC pairs
     */
    async generateWardrobeSheet(
        characterName: string,
        wardrobes: WardrobeItem[],
        referenceImageUrl?: string,
        backgroundColor: string = 'white'
    ): Promise<ReferenceSheetResult> {
        try {
            // Build field values - matches template field order
            const fieldValues: Record<string, string> = {
                'stage0_field0_character_name': characterName,
                'stage0_field1_background_color': backgroundColor
            }

            // Map wardrobes to field values (up to 6)
            // Outfits start at field 2, each outfit has 2 fields (name, desc)
            wardrobes.slice(0, 6).forEach((wardrobe, index) => {
                const baseIndex = 2 + (index * 2) // 2, 4, 6, 8, 10, 12
                fieldValues[`stage0_field${baseIndex}_outfit_${index + 1}_name`] = wardrobe.name
                fieldValues[`stage0_field${baseIndex + 1}_outfit_${index + 1}_desc`] = wardrobe.description || ''
            })

            // Fill in remaining empty outfits if less than 6 provided
            for (let i = wardrobes.length; i < 6; i++) {
                const baseIndex = 2 + (i * 2)
                fieldValues[`stage0_field${baseIndex}_outfit_${i + 1}_name`] = `Look ${i + 1}`
                fieldValues[`stage0_field${baseIndex + 1}_outfit_${i + 1}_desc`] = ''
            }

            const referenceImages: string[] = []
            if (referenceImageUrl) {
                referenceImages.push(referenceImageUrl)
            }

            const encodedName = encodeURIComponent(this.RECIPE_NAMES.wardrobeSheet)
            const response = await fetch(`${this.baseUrl}/${encodedName}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fieldValues,
                    referenceImages,
                    modelSettings: {
                        aspectRatio: '16:9',
                        outputFormat: 'png',
                        model: 'nano-banana-2'
                    }
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                return {
                    success: false,
                    error: errorData.error || `HTTP ${response.status}`
                }
            }

            const data = await response.json()
            return {
                success: true,
                imageUrl: data.imageUrl
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error'
            }
        }
    }

    /**
     * Generate Location Sheet with labeled cells
     * Creates a 2x3 grid of location variations with labels
     *
     * Field mapping from template:
     * - Field 0: CHARACTER_NAME (header)
     * - Fields 1-12: LOCATION_N_NAME and LOCATION_N_DESC pairs
     * - Field 13: WARDROBE (optional, applies to all locations)
     */
    async generateLocationSheet(
        characterName: string,
        locations: LocationItem[],
        referenceImageUrl?: string,
        wardrobe?: string
    ): Promise<ReferenceSheetResult> {
        try {
            // Build field values - matches template field order
            const fieldValues: Record<string, string> = {
                'stage0_field0_character_name': characterName
            }

            // Map locations to field values (up to 6)
            // Locations start at field 1, each location has 2 fields (name, desc)
            locations.slice(0, 6).forEach((location, index) => {
                const baseIndex = 1 + (index * 2) // 1, 3, 5, 7, 9, 11
                fieldValues[`stage0_field${baseIndex}_location_${index + 1}_name`] = location.name
                fieldValues[`stage0_field${baseIndex + 1}_location_${index + 1}_desc`] = location.description || ''
            })

            // Fill in remaining empty locations if less than 6 provided
            for (let i = locations.length; i < 6; i++) {
                const baseIndex = 1 + (i * 2)
                fieldValues[`stage0_field${baseIndex}_location_${i + 1}_name`] = `Location ${i + 1}`
                fieldValues[`stage0_field${baseIndex + 1}_location_${i + 1}_desc`] = ''
            }

            // Add wardrobe field (field 13)
            if (wardrobe) {
                fieldValues['stage0_field13_wardrobe'] = wardrobe
            }

            const referenceImages: string[] = []
            if (referenceImageUrl) {
                referenceImages.push(referenceImageUrl)
            }

            const encodedName = encodeURIComponent(this.RECIPE_NAMES.locationSheet)
            const response = await fetch(`${this.baseUrl}/${encodedName}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fieldValues,
                    referenceImages,
                    modelSettings: {
                        aspectRatio: '16:9',
                        outputFormat: 'png',
                        model: 'nano-banana-2'
                    }
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                return {
                    success: false,
                    error: errorData.error || `HTTP ${response.status}`
                }
            }

            const data = await response.json()
            return {
                success: true,
                imageUrl: data.imageUrl
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error'
            }
        }
    }
}

export const referenceSheetService = new ReferenceSheetService()
