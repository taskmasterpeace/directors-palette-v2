/**
 * Recipe Tools Types
 * Defines tool stages for recipes (remove background, grids, etc.)
 */

// Tool output type
export type RecipeToolOutputType = 'single' | 'multi';

// Available tools that can be used in recipe stages
export const RECIPE_TOOLS = {
  'remove-background': {
    id: 'remove-background',
    name: 'Remove Background',
    description: 'Removes background from image, outputs PNG with transparency',
    icon: '✂️',
    cost: 3,  // points
    endpoint: '/api/tools/remove-background',
    outputType: 'single' as RecipeToolOutputType,
  },
  'cinematic-grid': {
    id: 'cinematic-grid',
    name: 'Cinematic Grid',
    description: 'Generates 3x3 grid with 9 cinematic camera angles from reference image',
    icon: '🎬',
    cost: 20,  // Same as nano-banana-pro (uses it internally)
    endpoint: '/api/tools/cinematic-grid',
    outputType: 'single' as RecipeToolOutputType,
  },
  'grid-split': {
    id: 'grid-split',
    name: 'Grid Split (3x3)',
    description: 'Splits a 3x3 grid image into 9 separate images',
    icon: '🔲',
    cost: 0,  // Server-side processing only, no API cost
    endpoint: '/api/tools/grid-split',
    outputType: 'multi' as RecipeToolOutputType,
    outputCount: 9,
  },
  'before-after-grid': {
    id: 'before-after-grid',
    name: 'Before/After Grid',
    description: 'Generates 3x3 grid showing same location in 9 different states/time periods',
    icon: '🔄',
    cost: 20,  // Same as nano-banana-pro (uses it internally)
    endpoint: '/api/tools/before-after-grid',
    outputType: 'single' as RecipeToolOutputType,
  },
  'style-guide-grid': {
    id: 'style-guide-grid',
    name: 'Style Guide Grid',
    description: 'Generates 3x3 visual style guide with diverse examples (characters, environments, objects)',
    icon: '🎨',
    cost: 20,  // Same as nano-banana-pro (uses it internally)
    endpoint: '/api/tools/style-guide-grid',
    outputType: 'single' as RecipeToolOutputType,
  },
} as const;

export type RecipeToolId = keyof typeof RECIPE_TOOLS;
