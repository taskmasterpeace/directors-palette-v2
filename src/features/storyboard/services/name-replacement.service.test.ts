/**
 * Comprehensive tests for Name Replacement Service
 * Tests various edge cases for character name replacement in prompts
 */

import { describe, it, expect } from 'vitest'
import {
    buildTagReplacements,
    buildNameReplacements,
    replaceAtTags,
    replaceNames,
    replaceAllCharacterReferences,
    processPromptBatch,
    isCommonWord,
    CharacterReplacement
} from './name-replacement.service'

// ============================================================================
// TEST DATA - Various Character Sets
// ============================================================================

const BATTLE_RAP_CHARACTERS: CharacterReplacement[] = [
    { name: 'Marcus', description: 'Black man, 30s, average build, short curly hair, gold chain necklace, casual clothing' },
    { name: 'Tay Roc', description: 'Black man, mid-20s, muscular build, shaved head, wearing a hoodie and jeans' },
    { name: 'Sarah', description: 'White woman, 20s, long brown hair, casual outfit, holding a phone' },
    { name: 'Judge Mike', description: 'Caucasian man, 50s, graying hair, wearing glasses, dressed in a suit' },
]

const FANTASY_CHARACTERS: CharacterReplacement[] = [
    { name: 'Lord Blackwood', description: 'Tall elven man with silver hair, wearing ornate armor, piercing blue eyes' },
    { name: 'Black', description: 'Small goblin with green skin, tattered clothes, mischievous grin' },
    { name: "K'thara", description: 'Warrior woman with tribal markings, leather armor, twin swords' },
    { name: 'The Ancient One', description: 'Hooded figure, face obscured by shadow, glowing runes on robes' },
]

const EDGE_CASE_CHARACTERS: CharacterReplacement[] = [
    { name: 'Dr. Smith', description: 'Middle-aged doctor in white coat, stethoscope around neck' },
    { name: 'Mr. Jones', description: 'Elderly gentleman in three-piece suit, walking cane' },
    { name: 'Mary-Jane', description: 'Young redhead woman, freckles, green eyes, sundress' },
    { name: "O'Brien", description: 'Irish man, red beard, construction worker outfit' },
]

// Character with reference image (should NOT be replaced)
const MIXED_CHARACTERS: CharacterReplacement[] = [
    { name: 'Hero', description: 'Muscular man in cape', has_reference: false },
    { name: 'Villain', description: 'Dark figure with mask', has_reference: true }, // Should NOT replace
    { name: 'Sidekick', description: 'Young person in uniform', has_reference: false },
]

// ============================================================================
// TEST: buildTagReplacements
// ============================================================================

describe('buildTagReplacements', () => {
    it('should create @tags from character names', () => {
        const result = buildTagReplacements(BATTLE_RAP_CHARACTERS)

        expect(result['@marcus']).toBe('Black man, 30s, average build, short curly hair, gold chain necklace, casual clothing')
        expect(result['@tay_roc']).toBe('Black man, mid-20s, muscular build, shaved head, wearing a hoodie and jeans')
        expect(result['@sarah']).toBe('White woman, 20s, long brown hair, casual outfit, holding a phone')
        expect(result['@judge_mike']).toBe('Caucasian man, 50s, graying hair, wearing glasses, dressed in a suit')
    })

    it('should handle special characters in names', () => {
        const result = buildTagReplacements(EDGE_CASE_CHARACTERS)

        expect(result['@dr._smith']).toBeDefined()
        expect(result['@mr._jones']).toBeDefined()
        expect(result['@mary-jane']).toBeDefined()
        expect(result["@o'brien"]).toBeDefined()
    })

    it('should skip characters with reference images', () => {
        const result = buildTagReplacements(MIXED_CHARACTERS)

        expect(result['@hero']).toBeDefined()
        expect(result['@villain']).toBeUndefined() // Has reference
        expect(result['@sidekick']).toBeDefined()
    })

    it('should handle empty character list', () => {
        const result = buildTagReplacements([])
        expect(Object.keys(result)).toHaveLength(0)
    })

    it('should skip characters without descriptions', () => {
        const chars: CharacterReplacement[] = [
            { name: 'NoDesc', description: '' },
            { name: 'WithDesc', description: 'Has description' },
        ]
        const result = buildTagReplacements(chars)

        expect(result['@nodesc']).toBeUndefined()
        expect(result['@withdesc']).toBe('Has description')
    })
})

// ============================================================================
// TEST: buildNameReplacements
// ============================================================================

describe('buildNameReplacements', () => {
    it('should sort replacements by name length descending', () => {
        const result = buildNameReplacements(BATTLE_RAP_CHARACTERS)

        // Judge Mike (10) > Tay Roc (7) > Marcus (6) > Sarah (5)
        expect(result[0].name).toBe('Judge Mike')
        expect(result[1].name).toBe('Tay Roc')
        expect(result[2].name).toBe('Marcus')
        expect(result[3].name).toBe('Sarah')
    })

    it('should prevent partial name matches by sorting longer names first', () => {
        // "Lord Blackwood" (14 chars) should come before "Black" (5 chars)
        const result = buildNameReplacements(FANTASY_CHARACTERS)

        // Both "Lord Blackwood" and "The Ancient One" are 14 chars
        // Important thing is "Black" comes AFTER longer names
        const blackIndex = result.findIndex(r => r.name === 'Black')
        const lordBlackwoodIndex = result.findIndex(r => r.name === 'Lord Blackwood')

        expect(lordBlackwoodIndex).toBeLessThan(blackIndex)
    })

    it('should skip characters with reference images', () => {
        const result = buildNameReplacements(MIXED_CHARACTERS)

        expect(result.find(r => r.name === 'Villain')).toBeUndefined()
        expect(result.find(r => r.name === 'Hero')).toBeDefined()
    })
})

// ============================================================================
// TEST: replaceAtTags
// ============================================================================

describe('replaceAtTags', () => {
    const tagReplacements = buildTagReplacements(BATTLE_RAP_CHARACTERS)

    it('should replace @tags with descriptions', () => {
        const prompt = '@marcus stands in the warehouse'
        const result = replaceAtTags(prompt, tagReplacements)

        expect(result).toBe('Black man, 30s, average build, short curly hair, gold chain necklace, casual clothing stands in the warehouse')
    })

    it('should be case insensitive', () => {
        const prompt1 = '@MARCUS stands tall'
        const prompt2 = '@Marcus stands tall'
        const prompt3 = '@mArCuS stands tall'

        const results = [prompt1, prompt2, prompt3].map(p => replaceAtTags(p, tagReplacements))

        results.forEach(result => {
            expect(result).toContain('Black man, 30s')
        })
    })

    it('should replace multiple @tags in same prompt', () => {
        const prompt = '@marcus faces @tay_roc in the battle'
        const result = replaceAtTags(prompt, tagReplacements)

        expect(result).toContain('Black man, 30s, average build')
        expect(result).toContain('Black man, mid-20s, muscular build')
    })

    it('should handle @tags with underscores', () => {
        const prompt = '@judge_mike watches from the side'
        const result = replaceAtTags(prompt, tagReplacements)

        expect(result).toContain('Caucasian man, 50s')
    })

    it('should leave unmatched @tags unchanged', () => {
        const prompt = '@unknown_character enters'
        const result = replaceAtTags(prompt, tagReplacements)

        expect(result).toBe('@unknown_character enters')
    })
})

// ============================================================================
// TEST: replaceNames
// ============================================================================

describe('replaceNames', () => {
    const nameReplacements = buildNameReplacements(BATTLE_RAP_CHARACTERS)

    it('should replace plain character names', () => {
        const prompt = 'Marcus walks into the room'
        const result = replaceNames(prompt, nameReplacements)

        expect(result).toBe('Black man, 30s, average build, short curly hair, gold chain necklace, casual clothing walks into the room')
    })

    it('should be case insensitive', () => {
        const prompts = [
            'MARCUS enters',
            'marcus enters',
            'Marcus enters',
            'mArCuS enters',
        ]

        prompts.forEach(prompt => {
            const result = replaceNames(prompt, nameReplacements)
            expect(result).toContain('Black man, 30s')
        })
    })

    it('should handle possessive with apostrophe-s', () => {
        const prompt = "Marcus's expression shows determination"
        const result = replaceNames(prompt, nameReplacements)

        expect(result).toBe("Black man, 30s, average build, short curly hair, gold chain necklace, casual clothing's expression shows determination")
    })

    it('should handle possessive with just apostrophe', () => {
        const prompt = "Marcus' hands are clenched"
        const result = replaceNames(prompt, nameReplacements)

        expect(result).toBe("Black man, 30s, average build, short curly hair, gold chain necklace, casual clothing' hands are clenched")
    })

    it('should NOT replace partial name matches', () => {
        const prompt = 'Marcusville is a city' // "Marcus" inside another word
        const result = replaceNames(prompt, nameReplacements)

        // Should NOT replace because "Marcusville" is not "Marcus"
        expect(result).toBe('Marcusville is a city')
    })

    it('should handle names at sentence boundaries', () => {
        const prompt = 'The scene shows Marcus. Marcus is angry. Look at Marcus!'
        const result = replaceNames(prompt, nameReplacements)

        // All three instances should be replaced
        const occurrences = (result.match(/Black man, 30s/g) || []).length
        expect(occurrences).toBe(3)
    })

    it('should handle names with punctuation after', () => {
        const prompt = 'Marcus, Tay Roc, and Sarah are present.'
        const result = replaceNames(prompt, nameReplacements)

        expect(result).toContain('Black man, 30s')
        expect(result).toContain('muscular build')
        expect(result).toContain('long brown hair')
    })

    it('should handle multi-word names correctly', () => {
        const prompt = 'Judge Mike evaluates the battle'
        const result = replaceNames(prompt, nameReplacements)

        expect(result).toContain('Caucasian man, 50s')
    })

    it('should replace longer names first to avoid partial matches', () => {
        const fantasyReplacements = buildNameReplacements(FANTASY_CHARACTERS)
        const prompt = 'Lord Blackwood and Black enter the room'
        const result = replaceNames(prompt, fantasyReplacements)

        // Should replace "Lord Blackwood" fully, then "Black" separately
        expect(result).toContain('Tall elven man')
        expect(result).toContain('Small goblin')
    })
})

// ============================================================================
// TEST: replaceAllCharacterReferences
// ============================================================================

describe('replaceAllCharacterReferences', () => {
    it('should replace both @tags and plain names', () => {
        const prompt = '@marcus faces Tay Roc in the warehouse'
        const result = replaceAllCharacterReferences(prompt, BATTLE_RAP_CHARACTERS)

        expect(result).toContain('Black man, 30s')
        expect(result).toContain('muscular build')
    })

    it('should handle complex prompt with multiple references', () => {
        const prompt = "In the dim warehouse, Marcus stands ready. @tay_roc cracks his knuckles. Sarah records on her phone while Judge Mike observes."
        const result = replaceAllCharacterReferences(prompt, BATTLE_RAP_CHARACTERS)

        expect(result).toContain('gold chain necklace')
        expect(result).toContain('shaved head')
        expect(result).toContain('holding a phone')
        expect(result).toContain('dressed in a suit')
    })

    it('should skip characters with reference images', () => {
        const prompt = 'Hero and Villain face off, while Sidekick watches'
        const result = replaceAllCharacterReferences(prompt, MIXED_CHARACTERS)

        expect(result).toContain('Muscular man in cape')
        expect(result).toContain('Young person in uniform')
        expect(result).toContain('Villain') // Should NOT be replaced
    })
})

// ============================================================================
// TEST: processPromptBatch
// ============================================================================

describe('processPromptBatch', () => {
    it('should process multiple prompts', () => {
        const prompts = [
            'Marcus enters the warehouse',
            '@tay_roc cracks knuckles',
            'Sarah watches from the corner',
        ]

        const results = processPromptBatch(prompts, BATTLE_RAP_CHARACTERS)

        expect(results).toHaveLength(3)
        expect(results[0]).toContain('gold chain')
        expect(results[1]).toContain('shaved head')
        expect(results[2]).toContain('brown hair')
    })

    it('should handle empty prompt array', () => {
        const results = processPromptBatch([], BATTLE_RAP_CHARACTERS)
        expect(results).toHaveLength(0)
    })
})

// ============================================================================
// TEST: Edge Cases & Real-World Scenarios
// ============================================================================

describe('Edge Cases', () => {
    it('should handle empty prompt', () => {
        const result = replaceAllCharacterReferences('', BATTLE_RAP_CHARACTERS)
        expect(result).toBe('')
    })

    it('should handle prompt with no character mentions', () => {
        const prompt = 'A beautiful sunset over the ocean'
        const result = replaceAllCharacterReferences(prompt, BATTLE_RAP_CHARACTERS)
        expect(result).toBe(prompt)
    })

    it('should handle special regex characters in names', () => {
        const specialChars: CharacterReplacement[] = [
            { name: 'Dr. Strange', description: 'Wizard in cape' },
            { name: '$Money$', description: 'Rich character' },
            { name: 'Hero (Main)', description: 'Protagonist' },
        ]

        const prompt = 'Dr. Strange casts a spell'
        const result = replaceAllCharacterReferences(prompt, specialChars)
        expect(result).toBe('Wizard in cape casts a spell')
    })

    it('should handle names with apostrophes', () => {
        const prompt = "O'Brien walks in"
        const result = replaceAllCharacterReferences(prompt, EDGE_CASE_CHARACTERS)
        expect(result).toContain('Irish man')
    })

    it('should handle hyphenated names', () => {
        const prompt = 'Mary-Jane smiles'
        const result = replaceAllCharacterReferences(prompt, EDGE_CASE_CHARACTERS)
        expect(result).toContain('Young redhead')
    })

    it('should handle names with titles', () => {
        const prompt = 'Dr. Smith examines the patient'
        const result = replaceAllCharacterReferences(prompt, EDGE_CASE_CHARACTERS)
        expect(result).toContain('white coat')
    })

    it('should handle unicode characters', () => {
        const unicodeChars: CharacterReplacement[] = [
            { name: 'José', description: 'Hispanic man with mustache' },
            { name: 'Müller', description: 'German scientist in lab coat' },
        ]

        const prompt = 'José and Müller enter the lab'
        const result = replaceAllCharacterReferences(prompt, unicodeChars)
        expect(result).toContain('Hispanic man')
        expect(result).toContain('German scientist')
    })

    it('should handle very long descriptions', () => {
        const longDesc: CharacterReplacement[] = [
            {
                name: 'DetailedChar',
                description: 'A highly detailed character with intricate armor featuring golden filigree, ' +
                    'crimson cape flowing in the wind, battle-scarred face with a prominent scar across the left eye, ' +
                    'wielding a legendary sword that glows with ethereal blue light, standing in a heroic pose'
            },
        ]

        const prompt = 'DetailedChar stands ready for battle'
        const result = replaceAllCharacterReferences(prompt, longDesc)
        expect(result).toContain('golden filigree')
        expect(result).toContain('legendary sword')
    })

    it('should handle same name appearing multiple times', () => {
        const prompt = 'Marcus looked at Marcus in the mirror. Marcus was ready.'
        const result = replaceAllCharacterReferences(prompt, BATTLE_RAP_CHARACTERS)

        const occurrences = (result.match(/Black man, 30s/g) || []).length
        expect(occurrences).toBe(3)
    })
})

// ============================================================================
// TEST: Battle Rap Story Scenarios
// ============================================================================

describe('Battle Rap Story Scenarios', () => {
    it('should handle typical battle rap scene', () => {
        const prompt = "Medium shot of Marcus stepping forward, jaw set with determination, as Tay Roc watches from across the circle."
        const result = replaceAllCharacterReferences(prompt, BATTLE_RAP_CHARACTERS)

        expect(result).toContain('gold chain necklace')
        expect(result).toContain('shaved head')
        expect(result).not.toContain('Marcus')
        expect(result).not.toContain('Tay Roc')
    })

    it('should handle crowd and judges description', () => {
        const prompt = "Wide shot showing Sarah recording in the corner while Judge Mike raises his clipboard to score the round."
        const result = replaceAllCharacterReferences(prompt, BATTLE_RAP_CHARACTERS)

        expect(result).toContain('holding a phone')
        expect(result).toContain('dressed in a suit')
    })

    it('should handle action sequence', () => {
        const prompt = "Close-up on Marcus's face as he delivers his punchline. Tay Roc's reaction visible in the background."
        const result = replaceAllCharacterReferences(prompt, BATTLE_RAP_CHARACTERS)

        expect(result).toContain("'s face")
        expect(result).toContain("'s reaction")
    })
})

// ============================================================================
// TEST: Fantasy Story Scenarios
// ============================================================================

describe('Fantasy Story Scenarios', () => {
    it('should handle fantasy character introductions', () => {
        const prompt = "Lord Blackwood enters the throne room, followed by Black who skulks in the shadows."
        const result = replaceAllCharacterReferences(prompt, FANTASY_CHARACTERS)

        expect(result).toContain('silver hair')
        expect(result).toContain('green skin')
    })

    it('should handle characters with titles correctly', () => {
        const prompt = "The Ancient One speaks prophecy"
        const result = replaceAllCharacterReferences(prompt, FANTASY_CHARACTERS)

        expect(result).toContain('glowing runes')
    })

    it('should handle special character name formats', () => {
        const prompt = "K'thara draws her weapons"
        const result = replaceAllCharacterReferences(prompt, FANTASY_CHARACTERS)

        expect(result).toContain('twin swords')
    })
})

// ============================================================================
// TEST: Mixed @tag and Name Usage
// ============================================================================

describe('Mixed @tag and Plain Name Usage', () => {
    it('should handle prompt with both formats for same character', () => {
        const prompt = '@marcus enters. Marcus looks around. @marcus speaks.'
        const result = replaceAllCharacterReferences(prompt, BATTLE_RAP_CHARACTERS)

        const occurrences = (result.match(/gold chain/g) || []).length
        expect(occurrences).toBe(3)
    })

    it('should handle complex mixed prompt', () => {
        const prompt = `
            Scene 1: @marcus in the foreground.
            Scene 2: Marcus faces Tay Roc.
            Scene 3: @sarah records while @judge_mike scores.
        `
        const result = replaceAllCharacterReferences(prompt, BATTLE_RAP_CHARACTERS)

        expect(result).not.toContain('@marcus')
        expect(result).not.toContain('Marcus')
        expect(result).not.toContain('Tay Roc')
        expect(result).not.toContain('@sarah')
        expect(result).not.toContain('@judge_mike')
    })
})

// ============================================================================
// TEST: isCommonWord
// ============================================================================

describe('isCommonWord', () => {
    it('should identify color names as common words', () => {
        expect(isCommonWord('Black')).toBe(true)
        expect(isCommonWord('black')).toBe(true)
        expect(isCommonWord('WHITE')).toBe(true)
        expect(isCommonWord('Red')).toBe(true)
        expect(isCommonWord('Blue')).toBe(true)
        expect(isCommonWord('Green')).toBe(true)
        expect(isCommonWord('Gold')).toBe(true)
        expect(isCommonWord('Silver')).toBe(true)
    })

    it('should identify common nouns/adjectives as common words', () => {
        expect(isCommonWord('Shadow')).toBe(true)
        expect(isCommonWord('Storm')).toBe(true)
        expect(isCommonWord('Wolf')).toBe(true)
        expect(isCommonWord('Blade')).toBe(true)
        expect(isCommonWord('Knight')).toBe(true)
    })

    it('should NOT identify proper names as common words', () => {
        expect(isCommonWord('Marcus')).toBe(false)
        expect(isCommonWord('Sarah')).toBe(false)
        expect(isCommonWord('Blackwood')).toBe(false)
        expect(isCommonWord('Tay Roc')).toBe(false)
    })
})

// ============================================================================
// TEST: Common Word Case-Sensitive Matching (Critical Bug Fix)
// ============================================================================

describe('Common Word Case-Sensitive Matching', () => {
    const colorCharacters: CharacterReplacement[] = [
        { name: 'Black', description: 'Small goblin with green skin' },
        { name: 'Shadow', description: 'Mysterious cloaked figure' },
        { name: 'Rose', description: 'Young woman with red hair' },
    ]

    it('should replace capitalized common word names', () => {
        const prompt = 'Black enters the room'
        const result = replaceNames(prompt, buildNameReplacements(colorCharacters))

        expect(result).toBe('Small goblin with green skin enters the room')
    })

    it('should NOT replace lowercase common words used as adjectives', () => {
        // This is the critical bug fix: "black hair" should NOT be replaced
        const prompt = 'A warrior with black hair and shadow markings'
        const result = replaceNames(prompt, buildNameReplacements(colorCharacters))

        // "black" (lowercase) should remain as "black"
        // "shadow" (lowercase) should remain as "shadow"
        expect(result).toBe('A warrior with black hair and shadow markings')
    })

    it('should handle mixed case correctly - only replace exact case', () => {
        const prompt = 'Black wore a black cloak while Shadow cast a shadow'
        const result = replaceNames(prompt, buildNameReplacements(colorCharacters))

        // "Black" (capital) → goblin description
        // "black" (lowercase) → stays as "black"
        // "Shadow" (capital) → cloaked figure description
        // "shadow" (lowercase) → stays as "shadow"
        expect(result).toContain('Small goblin with green skin wore a black cloak')
        expect(result).toContain('Mysterious cloaked figure cast a shadow')
    })

    it('should handle character descriptions containing common words as adjectives', () => {
        // Scenario: K'thara has "long black hair" in description
        // "Black" is also a character name
        // When prompt contains "long black hair", it should NOT be replaced
        const characters: CharacterReplacement[] = [
            { name: 'Black', description: 'Goblin with green skin' },
            { name: "K'thara", description: 'Warrior woman with long black hair' },
        ]

        const prompt = "K'thara shows off her long black hair. Black watches from the corner."
        const result = replaceAllCharacterReferences(prompt, characters)

        // K'thara → warrior description (which includes "black hair")
        // "black hair" in K'thara's description should stay
        // Black → goblin description
        expect(result).toContain('long black hair')
        expect(result).toContain('Goblin with green skin watches')
    })

    it('should handle Rose as both name and color', () => {
        const prompt = 'Rose picked a rose from the garden'
        const result = replaceNames(prompt, buildNameReplacements(colorCharacters))

        // "Rose" (capital, name) → description
        // "rose" (lowercase, flower) → stays as "rose"
        expect(result).toBe('Young woman with red hair picked a rose from the garden')
    })

    it('should handle possessives with common word names', () => {
        const prompt = "Black's weapon gleamed"
        const result = replaceNames(prompt, buildNameReplacements(colorCharacters))

        expect(result).toBe("Small goblin with green skin's weapon gleamed")
    })

    it('should handle multiple common word characters in one prompt', () => {
        const prompt = 'Black and Shadow entered. The black shadows moved.'
        const result = replaceNames(prompt, buildNameReplacements(colorCharacters))

        // "Black" → goblin
        // "Shadow" → cloaked figure
        // "black shadows" → stays as is (lowercase)
        expect(result).toContain('Small goblin with green skin')
        expect(result).toContain('Mysterious cloaked figure')
        expect(result).toContain('black shadows')
    })

    it('should still work with non-common word names case-insensitively', () => {
        // Regular names should still be case-insensitive
        const regularChars: CharacterReplacement[] = [
            { name: 'Marcus', description: 'Tall man in armor' },
        ]

        const results = [
            replaceNames('MARCUS speaks', buildNameReplacements(regularChars)),
            replaceNames('marcus speaks', buildNameReplacements(regularChars)),
            replaceNames('Marcus speaks', buildNameReplacements(regularChars)),
        ]

        results.forEach(result => {
            expect(result).toBe('Tall man in armor speaks')
        })
    })
})
