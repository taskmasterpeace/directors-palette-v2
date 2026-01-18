/**
 * Validation utilities for Storybook wizard
 */

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validates a character description
 * @param description - The description to validate
 * @returns Validation result with error message if invalid
 */
export function validateCharacterDescription(
  description: string
): ValidationResult {
  const trimmed = description.trim()

  if (!trimmed) {
    return {
      isValid: false,
      error: 'Description cannot be empty',
    }
  }

  if (trimmed.length < 10) {
    return {
      isValid: false,
      error: 'Description must be at least 10 characters',
    }
  }

  if (trimmed.length > 500) {
    return {
      isValid: false,
      error: 'Description must be 500 characters or less',
    }
  }

  return { isValid: true }
}

/**
 * Validates a character name
 * @param name - The name to validate
 * @returns Validation result with error message if invalid
 */
export function validateCharacterName(name: string): ValidationResult {
  const trimmed = name.trim()

  if (!trimmed) {
    return {
      isValid: false,
      error: 'Name cannot be empty',
    }
  }

  if (trimmed.length < 2) {
    return {
      isValid: false,
      error: 'Name must be at least 2 characters',
    }
  }

  if (trimmed.length > 50) {
    return {
      isValid: false,
      error: 'Name must be 50 characters or less',
    }
  }

  return { isValid: true }
}

/**
 * Validates multiple character descriptions at once
 * @param descriptions - Object mapping character IDs to descriptions
 * @returns Object mapping character IDs to validation errors (if any)
 */
export function validateCharacterDescriptions(
  descriptions: Record<string, string>
): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const [id, description] of Object.entries(descriptions)) {
    const result = validateCharacterDescription(description)
    if (!result.isValid && result.error) {
      errors[id] = result.error
    }
  }

  return errors
}
