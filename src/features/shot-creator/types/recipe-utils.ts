/**
 * Recipe Utility Functions
 * Functions for parsing, building, and validating recipes
 */

import type { RecipeField, RecipeFieldType, RecipeFieldValues } from './recipe-field.types';
import type { RecipeStage } from './recipe-stage.types';
import { RECIPE_TOOLS, type RecipeToolId } from './recipe-tools.types';

// Server-safe UUID generator (crypto.randomUUID() is not available on server during SSR)
let uuidCounter = 0;
export function generateStageId(): string {
  // Use crypto.randomUUID if available (client-side), otherwise use a counter-based ID
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `stage-${Date.now()}-${++uuidCounter}`;
}

/**
 * Parse a single stage template and extract fields
 *
 * Syntax: <<FIELD_NAME:type[!][:annotation1][:annotation2]>>
 * - ! at end of type means required
 * - type can be: name, text, select(opt1,opt2), wildcard(name,browse|random)
 * - Optional layout annotations (appended after type with colons):
 *   - :rowN   — group this field with other fields sharing the same N into a 2-column row
 *   - :collapsed — render inside a collapsible "Optional details" section
 * Examples:
 *   <<WHO:name!:row1>>
 *   <<ARTIST_NAME:text!:row1>>
 *   <<TAGLINE:text:collapsed>>
 *   <<SUPPORTING_1:name:collapsed:row2>>
 */
export function parseStageTemplate(template: string, stageIndex: number): RecipeField[] {
  const fieldRegex = /<<([A-Z_0-9]+):([^>]+)>>/g;
  const fields: RecipeField[] = [];
  let match;
  let fieldIndex = 0;

  while ((match = fieldRegex.exec(template)) !== null) {
    const [, name, typeSpec] = match;

    // Split typeSpec into base type + annotations on `:`
    // (base types select(...) and wildcard(...) contain commas but no colons, so this is safe)
    const segments = typeSpec.split(':');
    const baseTypeSpec = segments[0];
    const annotations = segments.slice(1);

    // Check if required (base type ends with !)
    const required = baseTypeSpec.endsWith('!');
    const cleanTypeSpec = required ? baseTypeSpec.slice(0, -1) : baseTypeSpec;

    // Parse layout annotations
    let row: number | undefined;
    let collapsed = false;
    for (const ann of annotations) {
      if (ann === 'collapsed') {
        collapsed = true;
      } else {
        const rowMatch = ann.match(/^row(\d+)$/);
        if (rowMatch) row = parseInt(rowMatch[1], 10);
      }
    }

    let type: RecipeFieldType = 'text';
    let options: string[] | undefined;
    let wildcardName: string | undefined;
    let wildcardMode: 'browse' | 'random' | undefined;

    // Parse type
    if (cleanTypeSpec === 'name') {
      type = 'name';
    } else if (cleanTypeSpec === 'text') {
      type = 'text';
    } else if (cleanTypeSpec.startsWith('select(')) {
      type = 'select';
      const optionsMatch = cleanTypeSpec.match(/select\(([^)]+)\)/);
      if (optionsMatch) {
        options = optionsMatch[1].split(',').map(o => o.trim());
      }
    } else if (cleanTypeSpec.startsWith('wildcard(')) {
      type = 'wildcard' as RecipeFieldType;
      const wildcardMatch = cleanTypeSpec.match(/^wildcard\(([a-z0-9_]+),\s*(browse|random)\)$/);
      if (wildcardMatch) {
        wildcardName = wildcardMatch[1];
        wildcardMode = wildcardMatch[2] as 'browse' | 'random';
      }
    }

    // Convert FIELD_NAME to "Field Name" label
    const label = name
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');

    // Create placeholder with ! if required
    const placeholder = required ? `${label}!` : label;

    fields.push({
      id: `stage${stageIndex}_field${fieldIndex}_${name.toLowerCase()}`,
      name,
      label,
      type,
      required,
      options,
      wildcardName,
      wildcardMode,
      placeholder,
      row,
      collapsed: collapsed || undefined,
    });

    fieldIndex++;
  }

  return fields;
}

/**
 * Parse a full recipe template (may contain pipes) into stages
 */
export function parseRecipeTemplate(fullTemplate: string): RecipeStage[] {
  // Split by pipe
  const stageParts = fullTemplate.split('|').map(s => s.trim());

  return stageParts.map((template, index) => ({
    id: `stage_${index}`,
    order: index,
    template,
    fields: parseStageTemplate(template, index),
    referenceImages: [],
  }));
}

/**
 * Get all fields from all stages, deduplicated by name
 * If the same field name appears multiple times, only return it once
 * (first occurrence wins, keeps required status if any instance is required)
 */
export function getAllFields(stages: RecipeStage[]): RecipeField[] {
  const allFields = stages.flatMap(stage => stage.fields);
  const uniqueByName = new Map<string, RecipeField>();

  for (const field of allFields) {
    const existing = uniqueByName.get(field.name);
    if (existing) {
      // If this instance is required, update the existing to be required
      if (field.required && !existing.required) {
        uniqueByName.set(field.name, { ...existing, required: true });
      }
    } else {
      uniqueByName.set(field.name, field);
    }
  }

  return Array.from(uniqueByName.values());
}

/**
 * Get deduplicated fields for the form (user only fills each unique field once)
 */
export function getUniqueFieldsForForm(stages: RecipeStage[]): RecipeField[] {
  return getAllFields(stages);
}

/**
 * Build a prompt from a stage template and field values
 * - Looks up values by field NAME (for variable reuse)
 * - Optional fields with empty values are omitted entirely
 * - Cleans up orphaned punctuation and extra spaces
 */
export function buildStagePrompt(
  template: string,
  fields: RecipeField[],
  values: RecipeFieldValues,
  allUniqueFields?: RecipeField[],
  wildcardEntries?: Record<string, string[]>
): string {
  let result = template;

  // Build a map of field name -> value (using unique fields for lookup)
  const fieldsToUse = allUniqueFields || fields;
  const valueByName = new Map<string, { value: string; required: boolean }>();

  for (const field of fieldsToUse) {
    // Try to find value by field ID first, then by name-based lookup
    let value = values[field.id] || '';

    // Also check by field name directly (API v2 sends values keyed by name)
    if (!value) {
      value = values[field.name] || '';
    }

    // Fallback: check if any key contains the field name (legacy compat)
    if (!value) {
      for (const [id, val] of Object.entries(values)) {
        if (id.toLowerCase().includes(field.name.toLowerCase()) && val) {
          value = val;
          break;
        }
      }
    }

    valueByName.set(field.name, { value, required: field.required });
  }

  // Replace each field placeholder
  const fieldRegex = /<<([A-Z_0-9]+):([^>]+)>>/g;
  result = result.replace(fieldRegex, (_match, name, typeSpec, offset: number, fullStr: string) => {
    const fieldData = valueByName.get(name);
    let value = fieldData?.value || '';
    // Strip layout annotations (:rowN, :collapsed) — these are form-layout hints,
    // not meant for the prompt itself
    const baseTypeSpec = typeSpec.split(':')[0];
    const isRequired = baseTypeSpec.endsWith('!');
    const cleanType = isRequired ? baseTypeSpec.slice(0, -1) : baseTypeSpec;

    // If no user value and this is a wildcard field, pick a random entry
    if (!value && cleanType.startsWith('wildcard(') && wildcardEntries) {
      const wcMatch = cleanType.match(/^wildcard\(([a-z0-9_]+),\s*(browse|random)\)$/);
      if (wcMatch) {
        const entries = wildcardEntries[wcMatch[1]];
        if (entries && entries.length > 0) {
          value = entries[Math.floor(Math.random() * entries.length)];
        }
      }
    }

    // If optional and empty, return empty string to remove placeholder
    if (!value && !isRequired) {
      return '';
    }

    // WR 002 Bug 1: strip leading @ from name-type values when the template
    // already hardcodes @ immediately before the placeholder. Without this,
    // template "@<<PERSON_A:name!>>" + user value "@king" produces "@@king",
    // which matches no gallery tag and breaks character reference resolution.
    if (cleanType === 'name' && value.startsWith('@') && offset > 0 && fullStr[offset - 1] === '@') {
      value = value.slice(1);
    }

    return value;
  });

  // WR 002 Bug 2: remove "bare label" lines left behind when an optional
  // field is unset. Templates like "PERSON A OUTFIT: <<OUTFIT_A:text>>" leave
  // "PERSON A OUTFIT:" with no value, which reads as noise or ambiguity to the
  // model and in the Battle Rap case gave the model nothing to bind identity
  // to. Match "LABEL:" (one or more ALL-CAPS words) followed only by whitespace
  // or trailing punctuation up to a newline or end-of-string.
  result = result
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      return !/^[A-Z][A-Z0-9 _]*:\s*[.,;]*\s*$/.test(trimmed);
    })
    .join('\n');

  // Clean up orphaned punctuation and extra spaces
  // Remove ", ," patterns
  result = result.replace(/,\s*,/g, ',');
  // Remove ", ." or ". ," patterns
  result = result.replace(/[,\s]+\./g, '.');
  result = result.replace(/\.\s*,/g, '.');
  // Remove leading/trailing commas in sentences
  result = result.replace(/,\s*$/g, '');
  result = result.replace(/^\s*,\s*/g, '');
  // Remove multiple spaces
  result = result.replace(/\s+/g, ' ');
  // Clean up spaces around punctuation
  result = result.replace(/\s+,/g, ',');
  result = result.replace(/\s+\./g, '.');

  return result.trim();
}

/**
 * Result of building recipe prompts - includes both prompts and reference images
 */
export interface RecipePromptResult {
  prompts: string[];
  referenceImages: string[];           // All refs flattened (backward compat)
  stageReferenceImages: string[][];    // Per-stage refs indexed by stage order
}

/**
 * Build all stage prompts from a recipe
 * Uses deduplicated fields so same field name = same value across stages
 * Also collects all reference images from all stages
 */
export function buildRecipePrompts(
  stages: RecipeStage[],
  values: RecipeFieldValues,
  wildcardEntries?: Record<string, string[]>
): RecipePromptResult {
  const uniqueFields = getAllFields(stages);
  const prompts = stages.map(stage => buildStagePrompt(stage.template, stage.fields, values, uniqueFields, wildcardEntries));

  // Collect all reference images from all stages (deduplicated) for backward compatibility
  const referenceImages: string[] = [];
  for (const stage of stages) {
    for (const ref of stage.referenceImages || []) {
      if (ref.url && !referenceImages.includes(ref.url)) {
        referenceImages.push(ref.url);
      }
    }
  }

  // Collect reference images per stage (indexed by stage order) for pipe chaining
  const stageReferenceImages: string[][] = stages.map(stage =>
    (stage.referenceImages || [])
      .map(ref => ref.url)
      .filter((url): url is string => Boolean(url))
  );

  return { prompts, referenceImages, stageReferenceImages };
}

/**
 * Calculate the total cost of a recipe based on its tool stages
 * Returns 0 if no tool stages (cost determined by selected model)
 */
export function calculateRecipeCost(stages: RecipeStage[]): number {
  return stages.reduce((total, stage) => {
    if (stage.type === 'tool' && stage.toolId) {
      const tool = RECIPE_TOOLS[stage.toolId as RecipeToolId];
      if (tool) return total + tool.cost;
    }
    return total;
  }, 0);
}

/**
 * Validation result for a recipe
 */
export interface RecipeValidation {
  isValid: boolean;
  missingFields: string[];       // Names of required fields not filled
  errors: string[];              // Error messages
}

/**
 * Validate that all required fields are filled
 * Uses deduplicated fields so same field name = validated once
 */
export function validateRecipe(
  stages: RecipeStage[],
  values: RecipeFieldValues
): RecipeValidation {
  const missingFields: string[] = [];
  const errors: string[] = [];

  // Use deduplicated fields for validation
  const uniqueFields = getAllFields(stages);

  for (const field of uniqueFields) {
    if (field.required) {
      // Check by field ID first, then by field name (API v2)
      let value = values[field.id] || values[field.name];

      // Fallback: check by field name pattern
      if (!value) {
        for (const [id, val] of Object.entries(values)) {
          if (id.includes(field.name.toLowerCase()) && val) {
            value = val;
            break;
          }
        }
      }

      if (!value || value.trim() === '') {
        missingFields.push(field.label);
        errors.push(`${field.label} is required`);
      }
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    errors,
  };
}
