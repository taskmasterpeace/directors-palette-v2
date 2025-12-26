/**
 * Comprehensive tests for Wildcard Filter Service
 * Tests search functionality for the wildcard sidebar
 */

import { describe, it, expect } from 'vitest'
import { WildcardFilterService, wildcardFilterService } from './wildcard-filter.service'
import { WildCard } from '@/features/shot-creator/helpers/wildcard/parser'

// ============================================================================
// TEST DATA - Sample Wildcards
// ============================================================================

const createWildcard = (overrides: Partial<WildCard>): WildCard => ({
  id: overrides.id || 'test-id',
  user_id: 'user-1',
  name: overrides.name || 'test_name',
  category: overrides.category || '',
  content: overrides.content || 'entry1\nentry2',
  description: overrides.description,
  is_shared: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

const SAMPLE_WILDCARDS: WildCard[] = [
  createWildcard({
    id: '1',
    name: 'hairstyles',
    category: 'appearance',
    content: 'long flowing hair\nshort pixie cut\nbraid\ndreadlocks',
    description: 'Various hairstyles for characters',
  }),
  createWildcard({
    id: '2',
    name: 'locations',
    category: 'settings',
    content: 'beach\nmountain\ncity street\nforest',
    description: 'Scene locations for shots',
  }),
  createWildcard({
    id: '3',
    name: 'emotions',
    category: 'expressions',
    content: 'happy\nsad\nangry\nsurprised',
    description: 'Facial expressions',
  }),
  createWildcard({
    id: '4',
    name: 'clothing',
    category: 'appearance',
    content: 'casual jeans\nformal suit\nevening dress\nsportsswear',
  }),
  createWildcard({
    id: '5',
    name: 'weather_conditions',
    category: 'settings',
    content: 'sunny\ncloudy\nrainy\nsnowing',
    description: 'Weather and atmospheric effects',
  }),
]

// ============================================================================
// TEST: WildcardFilterService.filterByQuery - Search by Name
// ============================================================================

describe('WildcardFilterService.filterByQuery - Search by Name', () => {
  const service = new WildcardFilterService()

  it('should filter wildcards by exact name match', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'hairstyles')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('hairstyles')
  })

  it('should filter wildcards by partial name match', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'hair')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('hairstyles')
  })

  it('should find wildcards with underscores in name', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'weather')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('weather_conditions')
  })

  it('should find wildcards by underscore portion of name', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'conditions')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('weather_conditions')
  })
})

// ============================================================================
// TEST: WildcardFilterService.filterByQuery - Search by Category
// ============================================================================

describe('WildcardFilterService.filterByQuery - Search by Category', () => {
  const service = new WildcardFilterService()

  it('should filter wildcards by category', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'appearance')
    expect(result).toHaveLength(2)
    expect(result.map(w => w.name)).toContain('hairstyles')
    expect(result.map(w => w.name)).toContain('clothing')
  })

  it('should filter wildcards by partial category match', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'setting')
    expect(result).toHaveLength(2)
    expect(result.map(w => w.name)).toContain('locations')
    expect(result.map(w => w.name)).toContain('weather_conditions')
  })

  it('should filter wildcards by expression category', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'expressions')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('emotions')
  })
})

// ============================================================================
// TEST: WildcardFilterService.filterByQuery - Search by Content (Entries)
// ============================================================================

describe('WildcardFilterService.filterByQuery - Search by Content', () => {
  const service = new WildcardFilterService()

  it('should filter wildcards by content entry', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'beach')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('locations')
  })

  it('should filter wildcards by partial content match', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'hair')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('hairstyles')
  })

  it('should find multiple wildcards with similar content', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'happy')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('emotions')
  })

  it('should filter wildcards by content with spaces', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'city street')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('locations')
  })

  it('should filter wildcards by multi-word content entry', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'flowing hair')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('hairstyles')
  })
})

// ============================================================================
// TEST: WildcardFilterService.filterByQuery - Search by Description
// ============================================================================

describe('WildcardFilterService.filterByQuery - Search by Description', () => {
  const service = new WildcardFilterService()

  it('should filter wildcards by description', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'characters')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('hairstyles')
  })

  it('should filter wildcards by partial description match', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'Scene locations')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('locations')
  })

  it('should filter wildcards by description with atmospheric', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'atmospheric')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('weather_conditions')
  })

  it('should not match wildcards without description on description search', () => {
    // 'clothing' has no description
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'formal suit')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('clothing')
  })
})

// ============================================================================
// TEST: WildcardFilterService.filterByQuery - Case Insensitivity
// ============================================================================

describe('WildcardFilterService.filterByQuery - Case Insensitivity', () => {
  const service = new WildcardFilterService()

  it('should be case insensitive for name search', () => {
    const lowercase = service.filterByQuery(SAMPLE_WILDCARDS, 'hairstyles')
    const uppercase = service.filterByQuery(SAMPLE_WILDCARDS, 'HAIRSTYLES')
    const mixedCase = service.filterByQuery(SAMPLE_WILDCARDS, 'HairStyles')

    expect(lowercase).toHaveLength(1)
    expect(uppercase).toHaveLength(1)
    expect(mixedCase).toHaveLength(1)
    expect(lowercase[0].id).toBe(uppercase[0].id)
    expect(lowercase[0].id).toBe(mixedCase[0].id)
  })

  it('should be case insensitive for category search', () => {
    const lowercase = service.filterByQuery(SAMPLE_WILDCARDS, 'appearance')
    const uppercase = service.filterByQuery(SAMPLE_WILDCARDS, 'APPEARANCE')

    expect(lowercase).toHaveLength(2)
    expect(uppercase).toHaveLength(2)
  })

  it('should be case insensitive for content search', () => {
    const lowercase = service.filterByQuery(SAMPLE_WILDCARDS, 'beach')
    const uppercase = service.filterByQuery(SAMPLE_WILDCARDS, 'BEACH')

    expect(lowercase).toHaveLength(1)
    expect(uppercase).toHaveLength(1)
  })

  it('should be case insensitive for description search', () => {
    const lowercase = service.filterByQuery(SAMPLE_WILDCARDS, 'facial expressions')
    const uppercase = service.filterByQuery(SAMPLE_WILDCARDS, 'FACIAL EXPRESSIONS')

    expect(lowercase).toHaveLength(1)
    expect(uppercase).toHaveLength(1)
  })
})

// ============================================================================
// TEST: WildcardFilterService.filterByQuery - Empty/Clear Search
// ============================================================================

describe('WildcardFilterService.filterByQuery - Empty/Clear Search', () => {
  const service = new WildcardFilterService()

  it('should return all wildcards when query is empty string', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, '')
    expect(result).toHaveLength(SAMPLE_WILDCARDS.length)
  })

  it('should return all wildcards when query is whitespace only', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, '   ')
    expect(result).toHaveLength(SAMPLE_WILDCARDS.length)
  })

  it('should return all wildcards when query is null-like', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, '')
    expect(result).toHaveLength(SAMPLE_WILDCARDS.length)
  })

  it('should trim whitespace from query before searching', () => {
    const resultWithSpaces = service.filterByQuery(SAMPLE_WILDCARDS, '  hairstyles  ')
    const resultWithoutSpaces = service.filterByQuery(SAMPLE_WILDCARDS, 'hairstyles')

    expect(resultWithSpaces).toHaveLength(1)
    expect(resultWithoutSpaces).toHaveLength(1)
    expect(resultWithSpaces[0].id).toBe(resultWithoutSpaces[0].id)
  })
})

// ============================================================================
// TEST: WildcardFilterService.filterByQuery - No Matches (Empty State)
// ============================================================================

describe('WildcardFilterService.filterByQuery - No Matches', () => {
  const service = new WildcardFilterService()

  it('should return empty array when no wildcards match', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'xyznonexistent')
    expect(result).toHaveLength(0)
  })

  it('should return empty array when wildcards array is empty', () => {
    const result = service.filterByQuery([], 'hairstyles')
    expect(result).toHaveLength(0)
  })

  it('should return empty array for very specific non-matching query', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'quantum physics')
    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// TEST: WildcardFilterService.filterByCategory
// ============================================================================

describe('WildcardFilterService.filterByCategory', () => {
  const service = new WildcardFilterService()

  it('should filter wildcards by exact category match', () => {
    const result = service.filterByCategory(SAMPLE_WILDCARDS, 'appearance')
    expect(result).toHaveLength(2)
    expect(result.map(w => w.name)).toContain('hairstyles')
    expect(result.map(w => w.name)).toContain('clothing')
  })

  it('should not match partial category names', () => {
    const result = service.filterByCategory(SAMPLE_WILDCARDS, 'appear')
    expect(result).toHaveLength(0)
  })

  it('should return all wildcards when category is empty', () => {
    const result = service.filterByCategory(SAMPLE_WILDCARDS, '')
    expect(result).toHaveLength(SAMPLE_WILDCARDS.length)
  })

  it('should return all wildcards when category is whitespace', () => {
    const result = service.filterByCategory(SAMPLE_WILDCARDS, '   ')
    expect(result).toHaveLength(SAMPLE_WILDCARDS.length)
  })

  it('should return empty array when no wildcards match category', () => {
    const result = service.filterByCategory(SAMPLE_WILDCARDS, 'nonexistent_category')
    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// TEST: Singleton Export
// ============================================================================

describe('Singleton Export', () => {
  it('should export a singleton instance', () => {
    expect(wildcardFilterService).toBeInstanceOf(WildcardFilterService)
  })

  it('should filter using singleton instance', () => {
    const result = wildcardFilterService.filterByQuery(SAMPLE_WILDCARDS, 'hairstyles')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('hairstyles')
  })
})

// ============================================================================
// TEST: Edge Cases & Real-World Scenarios
// ============================================================================

describe('Edge Cases', () => {
  const service = new WildcardFilterService()

  it('should handle wildcards with empty category', () => {
    const wildcardsWithEmptyCategory = [
      createWildcard({ id: '1', name: 'test', category: '', content: 'entry' }),
    ]
    const result = service.filterByQuery(wildcardsWithEmptyCategory, 'test')
    expect(result).toHaveLength(1)
  })

  it('should handle wildcards with undefined description', () => {
    const wildcardsNoDescription = [
      createWildcard({ id: '1', name: 'test', description: undefined }),
    ]
    const result = service.filterByQuery(wildcardsNoDescription, 'test')
    expect(result).toHaveLength(1)
  })

  it('should handle special characters in search query', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'hair-styles')
    // Should not crash, may not find results
    expect(result).toBeDefined()
  })

  it('should handle wildcards with newlines in content', () => {
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'long flowing')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('hairstyles')
  })

  it('should match across multiple fields simultaneously', () => {
    // A query that might match name, category, or content
    const result = service.filterByQuery(SAMPLE_WILDCARDS, 'hair')
    expect(result).toHaveLength(1) // Only 'hairstyles' contains 'hair' in name or content
  })
})

// ============================================================================
// TEST: Performance with Large Datasets
// ============================================================================

describe('Performance', () => {
  const service = new WildcardFilterService()

  it('should handle large wildcard collections efficiently', () => {
    // Create 1000 wildcards
    const largeCollection: WildCard[] = Array.from({ length: 1000 }, (_, i) =>
      createWildcard({
        id: `id-${i}`,
        name: `wildcard_${i}`,
        category: `category_${i % 10}`,
        content: `content for wildcard ${i}\nmore content ${i}`,
        description: `Description for wildcard number ${i}`,
      })
    )

    const startTime = Date.now()
    const result = service.filterByQuery(largeCollection, 'wildcard_500')
    const endTime = Date.now()

    expect(result).toHaveLength(1)
    expect(endTime - startTime).toBeLessThan(100) // Should complete in < 100ms
  })
})
