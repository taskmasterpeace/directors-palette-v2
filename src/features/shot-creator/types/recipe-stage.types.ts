/**
 * Recipe Stage Types
 * Defines stages within a multi-stage recipe
 */

import type { RecipeField } from './recipe-field.types';
import type { RecipeReferenceImage } from './recipe-reference-image.types';
import type { RecipeAnalysisId } from './recipe-analysis.types';
import type { RecipeToolId } from './recipe-tools.types';

// Stage type - generation (default), tool, or analysis
export type RecipeStageType = 'generation' | 'tool' | 'analysis';

// A single stage in a multi-pipe recipe
export interface RecipeStage {
  id: string;
  order: number;                 // Stage order (0, 1, 2...)
  type?: RecipeStageType;        // 'generation' (default), 'tool', or 'analysis'
  template: string;              // The prompt template for this stage (empty for tool/analysis stages)
  toolId?: RecipeToolId;         // For tool stages: which tool to use
  analysisId?: RecipeAnalysisId; // For analysis stages: which analysis to perform
  fields: RecipeField[];         // Parsed fields from this stage's template
  referenceImages: RecipeReferenceImage[];  // Fixed reference images for this stage
}
