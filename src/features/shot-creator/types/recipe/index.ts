/**
 * Recipe Types - Barrel Export
 *
 * This module re-exports all recipe-related types and utilities.
 * Import from here for clean, organized imports:
 *
 * import { Recipe, RecipeStage, SAMPLE_RECIPES } from '@/features/shot-creator/types/recipe';
 */

// Field types
export type { RecipeFieldType, RecipeField, RecipeFieldValues } from '../recipe-field.types';

// Reference image types
export type { RecipeReferenceImage } from '../recipe-reference-image.types';

// Analysis types
export type { RecipeAnalysisType, RecipeAnalysisId } from '../recipe-analysis.types';
export { RECIPE_ANALYSIS } from '../recipe-analysis.types';

// Tool types
export type { RecipeToolOutputType, RecipeToolId } from '../recipe-tools.types';
export { RECIPE_TOOLS } from '../recipe-tools.types';

// Stage types
export type { RecipeStageType, RecipeStage } from '../recipe-stage.types';

// Core recipe types
export type { Recipe, QuickAccessItem } from '../recipe-core.types';

// Category types
export type { RecipeCategory } from '../recipe-categories.types';
export { DEFAULT_RECIPE_CATEGORIES, COMMON_SELECT_OPTIONS } from '../recipe-categories.types';

// Constants
export { FRAME_TYPE_OPTIONS, HOLIDAY_OPTIONS, SYSTEM_TEMPLATE_URLS } from '../recipe-constants';

// Utility functions
export {
  generateStageId,
  parseStageTemplate,
  parseRecipeTemplate,
  getAllFields,
  getUniqueFieldsForForm,
  buildStagePrompt,
  buildRecipePrompts,
  calculateRecipeCost,
  validateRecipe,
} from '../recipe-utils';
export type { RecipePromptResult, RecipeValidation } from '../recipe-utils';

// Sample recipes
export { SAMPLE_RECIPES } from '../../constants/recipe-samples';
