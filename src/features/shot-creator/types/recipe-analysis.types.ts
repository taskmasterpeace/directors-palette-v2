/**
 * Recipe Analysis Types
 * Defines analysis stage types for recipes (style, character, scene analysis)
 */

// Analysis types - what kind of analysis to perform
export type RecipeAnalysisType = 'style' | 'character' | 'scene';

// Available analysis endpoints
export const RECIPE_ANALYSIS = {
  'style': {
    id: 'style',
    name: 'Style Analysis',
    description: 'Analyzes image(s) to extract visual style characteristics using GPT-4 Vision',
    icon: '🎨',
    cost: 1,  // OpenRouter API cost (minimal)
    endpoint: '/api/styles/analyze',
    // Output variables that will be available for subsequent stages
    outputVariables: ['ANALYZED_STYLE_NAME', 'ANALYZED_STYLE_DESCRIPTION', 'ANALYZED_STYLE_PROMPT'],
  },
  'character': {
    id: 'character',
    name: 'Character Analysis',
    description: 'Analyzes image(s) to extract character visual descriptions',
    icon: '👤',
    cost: 1,
    endpoint: '/api/storybook/extract-character-description',
    outputVariables: ['ANALYZED_CHARACTER_DESCRIPTION'],
  },
  'scene': {
    id: 'scene',
    name: 'Scene Analysis',
    description: 'Analyzes image(s) to extract scene elements and composition',
    icon: '🏞️',
    cost: 1,
    endpoint: '/api/storybook/extract-elements',
    outputVariables: ['ANALYZED_SCENE_ELEMENTS'],
  },
} as const;

export type RecipeAnalysisId = keyof typeof RECIPE_ANALYSIS;
