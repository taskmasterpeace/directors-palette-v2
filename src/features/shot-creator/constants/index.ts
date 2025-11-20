/**
 * Shot Creator Constants
 */

import { PromptCategory } from "../store"

// Quick preset prompts for different styles
export const quickPresets = [
    { name: 'Cinematic', prompt: 'cinematic shot, dramatic lighting, professional photography' },
    { name: 'Portrait', prompt: 'professional portrait, soft lighting, shallow depth of field' },
    { name: 'Landscape', prompt: 'stunning landscape, golden hour lighting, wide angle view' },
    { name: 'Abstract', prompt: 'abstract composition, vibrant colors, artistic interpretation' },
    { name: 'Street', prompt: 'street photography, candid moment, urban environment' },
    { name: 'Macro', prompt: 'macro photography, extreme close-up, fine details' }
]

// Model-specific aspect ratios
export const aspectRatios = [
    { value: '1:1', label: 'Square (1:1)' },
    { value: '16:9', label: 'Widescreen (16:9)' },
    { value: '9:16', label: 'Portrait (9:16)' },
    { value: '4:3', label: 'Standard (4:3)' },
    { value: '3:2', label: 'Photo (3:2)' },
    { value: '21:9', label: 'Ultra-wide (21:9)' }
]

// Resolution options
export const resolutions = [
    { value: 'SD', label: 'SD (512x512)' },
    { value: 'HD', label: 'HD (1024x1024)' },
    { value: 'FHD', label: 'Full HD (1920x1080)' },
    { value: 'custom', label: 'Custom' }
]

// Default categories - matching nano-banana prompts 
export const DEFAULT_CATEGORIES: PromptCategory[] = [
    { id: 'cinematic', name: 'Cinematic Shots', icon: '🎬', color: 'blue', order: 1, isEditable: false },
    { id: 'characters', name: 'Character Styles', icon: '👤', color: 'red', order: 2, isEditable: false },
    { id: 'lighting', name: 'Lighting Setups', icon: '💡', color: 'yellow', order: 3, isEditable: false },
    { id: 'environments', name: 'Environments', icon: '🏞️', color: 'green', order: 4, isEditable: false },
    { id: 'effects', name: 'Special Effects', icon: '✨', color: 'orange', order: 5, isEditable: false },
    { id: 'moods', name: 'Moods & Atmosphere', icon: '🎭', color: 'indigo', order: 6, isEditable: false },
    { id: 'camera', name: 'Camera Angles', icon: '📷', color: 'pink', order: 7, isEditable: false },
    { id: 'styles', name: 'Art Styles', icon: '🎨', color: 'red', order: 8, isEditable: false },
    { id: 'custom', name: 'Custom', icon: '📁', color: 'gray', order: 99, isEditable: false }
]

// Prompt library presets
export * from './prompt-library-presets'

export const categories = [
    { value: 'people', label: 'People', description: 'Characters, portraits, persons' },
    { value: 'places', label: 'Places', description: 'Locations, environments, settings' },
    { value: 'props', label: 'Props', description: 'Objects, items, things' },
    { value: 'unorganized', label: 'Unorganized', description: 'General or uncategorized' }
]

export const suggestedTags = {
    people: ['portrait', 'character', 'person', 'face', 'human'],
    places: ['landscape', 'environment', 'location', 'scene', 'background'],
    props: ['object', 'item', 'thing', 'prop', 'accessory'],
    unorganized: ['generated', 'art', 'design', 'concept', 'abstract']
}

// Model icons
export * from './model-icons'