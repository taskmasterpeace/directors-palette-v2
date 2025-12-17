/**
 * Prompt Builder Service
 *
 * Assembles prompts from templates and token selections.
 * Handles inclusion rules, banned terms filtering, and style separation.
 */

import type {
  Token,
  TokenSelection,
  PromptTemplate,
  BuiltPrompt,
  InclusionRule,
} from '../types/prompt-template.types'
import { DEFAULT_TOKENS, BANNED_TERMS } from '../data/default-tokens'

export class PromptBuilderService {
  private tokens: Map<string, Token>
  private bannedTerms: string[]

  constructor(tokens: Token[] = DEFAULT_TOKENS, bannedTerms: string[] = BANNED_TERMS) {
    this.tokens = new Map(tokens.map(t => [t.id, t]))
    this.bannedTerms = bannedTerms.map(t => t.toLowerCase())
  }

  /**
   * Build a complete prompt from template and selections
   */
  buildPrompt(
    template: PromptTemplate,
    selections: TokenSelection[],
    hasStyle: boolean = false
  ): BuiltPrompt {
    const selectionsMap = new Map(selections.map(s => [s.tokenId, s]))
    const warnings: string[] = []

    // Separate style tokens
    const stylePrefix = this.getSelectionValue(selectionsMap, 'stylePrefix')
    const stylePrompt = this.getSelectionValue(selectionsMap, 'stylePrompt')
    const styleSuffix = this.getSelectionValue(selectionsMap, 'styleSuffix')

    // Separate motion tokens
    const cameraMovement = this.getSelectionValue(selectionsMap, 'cameraMovement')
    const subjectMotion = this.getSelectionValue(selectionsMap, 'subjectMotion')

    // Separate audio tokens
    const dialog = this.getSelectionValue(selectionsMap, 'dialog')
    const voiceover = this.getSelectionValue(selectionsMap, 'voiceover')
    const ambient = this.getSelectionValue(selectionsMap, 'ambient')
    const music = this.getSelectionValue(selectionsMap, 'music')

    // Build base prompt parts
    const parts: string[] = []

    for (const slot of template.slots) {
      const token = this.tokens.get(slot.tokenId)
      if (!token) continue

      const selection = selectionsMap.get(slot.tokenId)
      const value = selection?.customValue || selection?.value || token.defaultValue || ''

      // Check inclusion rule
      if (!this.shouldInclude(token.inclusionRule, hasStyle, value)) {
        continue
      }

      // Skip empty values
      if (!value || value === 'none') continue

      // Get display value (convert IDs to labels if needed)
      const displayValue = this.getDisplayValue(token, value)

      // Build slot string
      let slotString = ''
      if (value && slot.conditionalPrefix) {
        slotString += slot.conditionalPrefix
      } else if (slot.prefix) {
        slotString += slot.prefix
      }
      slotString += displayValue
      if (slot.suffix) {
        slotString += slot.suffix
      }

      parts.push(slotString)
    }

    // Assemble base prompt
    let basePrompt = parts.join('').trim()

    // Clean up extra commas and spaces
    basePrompt = this.cleanPrompt(basePrompt)

    // Filter banned terms
    const { cleaned, removed } = this.filterBannedTerms(basePrompt)
    basePrompt = cleaned
    if (removed.length > 0) {
      warnings.push(`Removed banned terms: ${removed.join(', ')}`)
    }

    // Build full prompt with style if present
    let fullPrompt = basePrompt
    if (hasStyle && (stylePrefix || stylePrompt || styleSuffix)) {
      const styleParts: string[] = []
      if (stylePrefix) styleParts.push(stylePrefix)
      styleParts.push(basePrompt)
      if (stylePrompt) styleParts.push(stylePrompt)
      if (styleSuffix) styleParts.push(styleSuffix)
      fullPrompt = styleParts.join(' ').trim()
    }

    return {
      full: fullPrompt,
      base: basePrompt,
      style: {
        prefix: stylePrefix,
        suffix: styleSuffix,
        stylePrompt: stylePrompt,
      },
      motion: cameraMovement && cameraMovement !== 'static' ? {
        cameraMovement,
        subjectMotion: subjectMotion !== 'static' ? subjectMotion : undefined,
      } : undefined,
      audio: (dialog || voiceover || ambient || music) ? {
        dialog: dialog !== 'none' ? dialog : undefined,
        voiceover: voiceover !== 'none' ? voiceover : undefined,
        ambient: ambient !== 'silence' ? ambient : undefined,
        music: music !== 'none' ? music : undefined,
      } : undefined,
      warnings,
    }
  }

  /**
   * Build a prompt with motion layer (for animation)
   */
  buildMotionPrompt(basePrompt: string, motion: BuiltPrompt['motion']): string {
    if (!motion || !motion.cameraMovement || motion.cameraMovement === 'static') {
      return basePrompt
    }

    let motionPrompt = `${motion.cameraMovement}: ${basePrompt}`
    if (motion.subjectMotion && motion.subjectMotion !== 'static') {
      motionPrompt += `, ${motion.subjectMotion}`
    }

    return motionPrompt
  }

  /**
   * Build a preview prompt with sample values
   */
  buildPreview(template: PromptTemplate, hasStyle: boolean = false): string {
    const sampleSelections: TokenSelection[] = template.slots.map(slot => {
      const token = this.tokens.get(slot.tokenId)
      if (!token) return { tokenId: slot.tokenId, value: '' }

      // Use default or first option as sample
      const sampleValue = token.defaultValue ||
        (token.options.length > 0 ? token.options[0].value : '')

      return {
        tokenId: slot.tokenId,
        value: sampleValue,
      }
    })

    const result = this.buildPrompt(template, sampleSelections, hasStyle)
    return result.full
  }

  /**
   * Validate selections against template
   */
  validateSelections(
    template: PromptTemplate,
    selections: TokenSelection[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const selectionsMap = new Map(selections.map(s => [s.tokenId, s]))

    for (const slot of template.slots) {
      const token = this.tokens.get(slot.tokenId)
      if (!token) continue

      if (token.required) {
        const selection = selectionsMap.get(slot.tokenId)
        if (!selection || (!selection.value && !selection.customValue)) {
          errors.push(`${token.label} is required`)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Get token by ID
   */
  getToken(tokenId: string): Token | undefined {
    return this.tokens.get(tokenId)
  }

  /**
   * Get all tokens
   */
  getAllTokens(): Token[] {
    return Array.from(this.tokens.values())
  }

  /**
   * Update banned terms list
   */
  setBannedTerms(terms: string[]): void {
    this.bannedTerms = terms.map(t => t.toLowerCase())
  }

  // Private helper methods

  private shouldInclude(rule: InclusionRule, hasStyle: boolean, value: string): boolean {
    switch (rule) {
      case 'always':
        return true
      case 'conditionalOnNoStyle':
        return !hasStyle
      case 'separate':
        return false // Handled separately
      case 'additive':
        return false // Handled separately
      case 'optional':
        return !!value && value !== 'none'
      default:
        return true
    }
  }

  private getSelectionValue(
    selectionsMap: Map<string, TokenSelection>,
    tokenId: string
  ): string {
    const selection = selectionsMap.get(tokenId)
    return selection?.customValue || selection?.value || ''
  }

  private getDisplayValue(token: Token, value: string): string {
    // Check if value is in options
    const option = token.options.find(o => o.value === value)
    if (option) {
      // For some tokens, use the value directly (like shot sizes)
      // For others, use a more descriptive form
      if (['shotSize', 'cameraAngle'].includes(token.id)) {
        return this.formatShotSize(value)
      }
      return value.replace(/-/g, ' ')
    }
    return value
  }

  private formatShotSize(value: string): string {
    // Convert abbreviations to full descriptions for better AI understanding
    const shotSizeMap: Record<string, string> = {
      'ECU': 'extreme close-up',
      'BCU': 'big close-up',
      'CU': 'close-up',
      'MCU': 'medium close-up',
      'MS': 'medium shot',
      'MCS': 'medium cowboy shot',
      'KNEE': 'knee shot',
      'MWS': 'medium wide shot',
      'FS': 'full shot',
      'WS': 'wide shot',
      'EWS': 'extreme wide shot',
      'EST': 'establishing shot',
      'OTS': 'over-the-shoulder shot',
      'TWO': 'two shot',
    }
    return shotSizeMap[value] || value.toLowerCase().replace(/-/g, ' ')
  }

  private cleanPrompt(prompt: string): string {
    return prompt
      .replace(/,\s*,/g, ',')           // Remove double commas
      .replace(/\s+/g, ' ')             // Normalize spaces
      .replace(/,\s*$/g, '')            // Remove trailing comma
      .replace(/^\s*,/g, '')            // Remove leading comma
      .trim()
  }

  private filterBannedTerms(prompt: string): { cleaned: string; removed: string[] } {
    const removed: string[] = []
    let cleaned = prompt

    for (const term of this.bannedTerms) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi')
      if (regex.test(cleaned)) {
        removed.push(term)
        cleaned = cleaned.replace(regex, '')
      }
    }

    return {
      cleaned: this.cleanPrompt(cleaned),
      removed,
    }
  }
}

// Export singleton instance
export const promptBuilder = new PromptBuilderService()
