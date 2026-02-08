/**
 * Recipe Field Types
 * Defines field types for recipe form inputs
 */

// Field types for recipe forms
export type RecipeFieldType = 'name' | 'text' | 'select';

// A single field definition parsed from the recipe template
export interface RecipeField {
  id: string;                    // Unique field ID
  name: string;                  // Field name from template (e.g., "CHARACTER_NAME")
  label: string;                 // Display label (e.g., "Character Name")
  type: RecipeFieldType;         // Field type
  required: boolean;             // Whether field must be filled (marked with !)
  options?: string[];            // For 'select' type - dropdown options
  placeholder: string;           // Placeholder text (includes ! if required)
}

// User's filled-in values for a recipe
export interface RecipeFieldValues {
  [fieldId: string]: string;
}
