/**
 * Recipe Reference Image Types
 * Defines reference images attached to recipe stages
 */

// Reference image attached to a recipe stage
export interface RecipeReferenceImage {
  id: string;
  url: string;                   // Image URL (can be data URL or public URL)
  name?: string;                 // Display name
  aspectRatio?: string;          // Detected aspect ratio
  isStatic?: boolean;            // Static reference images are always included
}
