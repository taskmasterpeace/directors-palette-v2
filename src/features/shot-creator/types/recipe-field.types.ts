/**
 * Recipe Field Types
 * Defines field types for recipe form inputs
 */

// Field types for recipe forms
export type RecipeFieldType = 'name' | 'text' | 'select' | 'wildcard';

// A single field definition parsed from the recipe template
export interface RecipeField {
  id: string;                    // Unique field ID
  name: string;                  // Field name from template (e.g., "CHARACTER_NAME")
  label: string;                 // Display label (e.g., "Character Name")
  type: RecipeFieldType;         // Field type
  required: boolean;             // Whether field must be filled (marked with !)
  options?: string[];            // For 'select' type - dropdown options
  wildcardName?: string;         // For 'wildcard' type - which wildcard to pull entries from
  wildcardMode?: 'browse' | 'random'; // For 'wildcard' type - default mode set by recipe creator
  placeholder: string;           // Placeholder text (includes ! if required)
  row?: number;                  // Layout hint: group fields with same row number into a 2-column row
  collapsed?: boolean;           // Layout hint: render inside a collapsible "Optional details" section
}

// User's filled-in values for a recipe
export interface RecipeFieldValues {
  [fieldId: string]: string;
}
