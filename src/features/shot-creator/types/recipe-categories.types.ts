/**
 * Recipe Categories Types
 * Defines categories for organizing recipes
 */

// Recipe categories
export interface RecipeCategory {
  id: string;
  name: string;
  icon: string;
  isDefault?: boolean;           // Built-in categories can't be deleted
  isSystemOnly?: boolean;        // If true, only visible to admin users
}

// Default recipe categories
export const DEFAULT_RECIPE_CATEGORIES: RecipeCategory[] = [
  { id: 'characters', name: 'Characters', icon: '👤', isDefault: true },
  { id: 'scenes', name: 'Scenes', icon: '🎬', isDefault: true },
  { id: 'environments', name: 'Environments', icon: '🏛️', isDefault: true },
  { id: 'narrative', name: 'Narrative', icon: '📚', isDefault: true },
  { id: 'styles', name: 'Style Transfers', icon: '🎨', isDefault: true },
  { id: 'products', name: 'Products', icon: '📦', isDefault: true },
  { id: 'artists', name: 'Artists', icon: '🎤', isDefault: true },
  { id: 'custom', name: 'Custom', icon: '✨', isDefault: true },
  // System-only categories (visible only to admin users)
  { id: 'storybook', name: 'Storybook', icon: '📖', isDefault: true, isSystemOnly: true },
  { id: 'storyboard', name: 'Storyboard', icon: '🎬', isDefault: true, isSystemOnly: true },
];

// Common select options for convenience
export const COMMON_SELECT_OPTIONS = {
  shotType: ['ECU', 'BCU', 'CU', 'MCU', 'MS', 'MCS', 'MWS', 'WS', 'EWS', 'EST'],
  cameraAngle: ['eye-level', 'low-angle', 'high-angle', 'dutch', 'birds-eye', 'worms-eye', 'POV', 'OTS'],
  lighting: ['natural', 'golden-hour', 'dramatic', 'soft', 'rim', 'silhouette', 'high-key', 'low-key'],
  mood: ['dramatic', 'peaceful', 'tense', 'joyful', 'mysterious', 'romantic', 'energetic'],
};
