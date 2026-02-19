/**
 * Tokenizes a prompt string into typed segments for syntax highlighting.
 * Handles all prompt language syntax elements:
 * - [a, b, c] brackets (batch variations)
 * - pipe | separators (separate scenes)
 * - _wildcard_ (random picks)
 * - {seed text} (slot machine / AI expansion)
 * - @! (anchor transform)
 * - @reference (image tag references)
 */

export type TokenType =
    | 'text'
    | 'bracket'
    | 'bracketDelimiter'
    | 'pipe'
    | 'wildcard'
    | 'slotMachine'
    | 'slotMachineDelimiter'
    | 'anchor'
    | 'reference'

export interface SyntaxToken {
    type: TokenType
    content: string
}

/**
 * Tokenizes a prompt string into an array of typed segments.
 * Order of matching follows the prompt language's order of operations.
 */
export function tokenizePrompt(prompt: string): SyntaxToken[] {
    if (!prompt) return []

    const tokens: SyntaxToken[] = []
    const remaining = prompt
    let pos = 0

    while (pos < remaining.length) {
        // Try to match each pattern at current position
        const char = remaining[pos]
        const rest = remaining.slice(pos)

        // 1. Anchor transform: @! at start or end (or standalone)
        if (char === '@' && rest[1] === '!') {
            // Match @! followed by space or end of string
            tokens.push({ type: 'anchor', content: '@!' })
            pos += 2
            continue
        }

        // 2. @reference tags: @ followed by word characters (but not @!)
        if (char === '@' && rest[1] && /[a-zA-Z]/.test(rest[1])) {
            const match = rest.match(/^@([a-zA-Z][a-zA-Z0-9_-]*)/)
            if (match) {
                tokens.push({ type: 'reference', content: match[0] })
                pos += match[0].length
                continue
            }
        }

        // 3. Brackets: [content]
        if (char === '[') {
            const closingIndex = findMatchingBracket(remaining, pos, '[', ']')
            if (closingIndex !== -1) {
                // Opening bracket
                tokens.push({ type: 'bracketDelimiter', content: '[' })
                // Content inside brackets - tokenize the comma-separated options
                const inner = remaining.slice(pos + 1, closingIndex)
                tokenizeBracketContent(inner, tokens)
                // Closing bracket
                tokens.push({ type: 'bracketDelimiter', content: ']' })
                pos = closingIndex + 1
                continue
            }
        }

        // 4. Curly braces: {content}
        if (char === '{') {
            const closingIndex = findMatchingBracket(remaining, pos, '{', '}')
            if (closingIndex !== -1) {
                tokens.push({ type: 'slotMachineDelimiter', content: '{' })
                const inner = remaining.slice(pos + 1, closingIndex)
                tokens.push({ type: 'slotMachine', content: inner })
                tokens.push({ type: 'slotMachineDelimiter', content: '}' })
                pos = closingIndex + 1
                continue
            }
        }

        // 5. Wildcard: _name_ (word-boundary aware)
        if (char === '_') {
            const match = rest.match(/^_([a-zA-Z0-9][a-zA-Z0-9_]*)_/)
            if (match) {
                // Check word boundary before: previous char should not be alphanumeric
                const prevChar = pos > 0 ? remaining[pos - 1] : ''
                if (!prevChar || !/[a-zA-Z0-9]/.test(prevChar)) {
                    // Check word boundary after: next char should not be alphanumeric
                    const afterPos = pos + match[0].length
                    const nextChar = afterPos < remaining.length ? remaining[afterPos] : ''
                    if (!nextChar || !/[a-zA-Z0-9]/.test(nextChar)) {
                        tokens.push({ type: 'wildcard', content: match[0] })
                        pos += match[0].length
                        continue
                    }
                }
            }
        }

        // 6. Pipe separator
        if (char === '|') {
            tokens.push({ type: 'pipe', content: '|' })
            pos += 1
            continue
        }

        // 7. Plain text - consume until next special character
        const nextSpecial = findNextSpecial(remaining, pos + 1)
        const textEnd = nextSpecial === -1 ? remaining.length : nextSpecial
        const textContent = remaining.slice(pos, textEnd)
        if (textContent) {
            // Merge with previous text token if possible
            const lastToken = tokens[tokens.length - 1]
            if (lastToken && lastToken.type === 'text') {
                lastToken.content += textContent
            } else {
                tokens.push({ type: 'text', content: textContent })
            }
        }
        pos = textEnd
    }

    return tokens
}

/**
 * Find the index of the next special character starting from pos.
 */
function findNextSpecial(str: string, startPos: number): number {
    for (let i = startPos; i < str.length; i++) {
        const ch = str[i]
        if (ch === '@' || ch === '[' || ch === '{' || ch === '_' || ch === '|') {
            return i
        }
    }
    return -1
}

/**
 * Find matching closing bracket/brace, handling nesting.
 */
function findMatchingBracket(str: string, openPos: number, openChar: string, closeChar: string): number {
    let depth = 0
    for (let i = openPos; i < str.length; i++) {
        if (str[i] === openChar) depth++
        else if (str[i] === closeChar) {
            depth--
            if (depth === 0) return i
        }
    }
    return -1 // No matching close found
}

/**
 * Tokenize the content inside brackets, splitting by commas.
 * Each comma becomes a bracketDelimiter token, each option is a bracket token.
 */
function tokenizeBracketContent(content: string, tokens: SyntaxToken[]) {
    const parts = content.split(',')
    parts.forEach((part, index) => {
        if (index > 0) {
            tokens.push({ type: 'bracketDelimiter', content: ',' })
        }
        if (part) {
            tokens.push({ type: 'bracket', content: part })
        }
    })
}
