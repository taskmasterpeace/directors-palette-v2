/**
 * Recipe Core Types
 * Main Recipe interface and related types
 */

import type { RecipeStage } from './recipe-stage.types';

// A recipe template
export interface Recipe {
  id: string;
  name: string;                  // Recipe name (e.g., "Character Sheet Generator")
  description?: string;          // Optional description
  recipeNote?: string;           // Instructions shown when recipe is activated
                                 // e.g., "Please provide an image with a character"
  stages: RecipeStage[];         // Multi-stage support (separated by |)
  suggestedAspectRatio?: string; // Suggested aspect ratio (user can change)
  suggestedResolution?: string;  // Suggested resolution
  suggestedModel?: string;       // Suggested model (auto-selects when recipe applied)
  quickAccessLabel?: string;     // 1-word label for quick access bar
  isQuickAccess: boolean;        // Whether it's in quick access
  categoryId?: string;           // Optional category
  requiresImage?: boolean;       // Whether recipe requires reference images (default: true)
  isSystem?: boolean;            // System recipes are read-only, must be duplicated to edit
  isSystemOnly?: boolean;        // If true, only visible to admin users (hidden from regular users)
  source?: 'created' | 'catalog' | 'imported' | 'system';  // Track where recipe came from
  sourceCatalogId?: string;  // Points to community_items.id if added from catalog
  createdAt: number;
  updatedAt: number;
}

// Quick access item - recipes only now
export interface QuickAccessItem {
  id: string;
  type: 'recipe';
  label: string;                 // 1-word display label
  recipeId: string;              // Recipe ID
  order: number;                 // Display order (0-8)
}

// A recipe as it appears in the catalog (from community_items table)
export interface CatalogRecipe {
  id: string;                    // community_items.id
  name: string;
  description?: string;
  category: string;
  tags: string[];
  content: {                     // The actual recipe data stored as JSONB
    stages: RecipeStage[];
    recipeNote?: string;
    suggestedModel?: string;
    suggestedAspectRatio?: string;
    suggestedResolution?: string;
    requiresImage?: boolean;
    categoryId?: string;
  };
  submittedByName: string;
  isOfficial: boolean;
  isFeatured: boolean;
  addCount: number;
  bundledWildcards: Array<{
    name: string;
    category: string;
    content: string[];
    description?: string;
  }>;
  previewImageUrl?: string;      // From content JSONB or separate field
  isAdded?: boolean;             // Client-side: whether user already has this recipe
}
