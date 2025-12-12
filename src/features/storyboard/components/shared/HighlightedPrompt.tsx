'use client'

import { useMemo } from 'react'

interface HighlightedPromptProps {
    text: string
    className?: string
}

/**
 * Renders prompt text with wildcards (_variableName_) visually highlighted
 */
export function HighlightedPrompt({ text, className = '' }: HighlightedPromptProps) {
    const parts = useMemo(() => {
        // Match _variableName_ pattern (underscores with text between)
        const wildcardRegex = /_([a-zA-Z0-9_]+)_/g
        const result: Array<{ type: 'text' | 'wildcard'; content: string }> = []
        let lastIndex = 0
        let match

        while ((match = wildcardRegex.exec(text)) !== null) {
            // Add text before the wildcard
            if (match.index > lastIndex) {
                result.push({
                    type: 'text',
                    content: text.slice(lastIndex, match.index)
                })
            }

            // Add the wildcard
            result.push({
                type: 'wildcard',
                content: match[0] // Full match including underscores
            })

            lastIndex = match.index + match[0].length
        }

        // Add remaining text
        if (lastIndex < text.length) {
            result.push({
                type: 'text',
                content: text.slice(lastIndex)
            })
        }

        return result.length > 0 ? result : [{ type: 'text' as const, content: text }]
    }, [text])

    return (
        <span className={className}>
            {parts.map((part, index) => (
                part.type === 'wildcard' ? (
                    <span
                        key={index}
                        className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-amber-500/20 text-amber-500 font-mono text-[0.9em] border border-amber-500/30"
                        title="Wildcard variable - will be replaced with random value"
                    >
                        {part.content}
                    </span>
                ) : (
                    <span key={index}>{part.content}</span>
                )
            ))}
        </span>
    )
}

/**
 * Simple inline component for smaller contexts
 */
export function WildcardBadge({ name }: { name: string }) {
    return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-500 font-mono text-xs border border-amber-500/30">
            _{name}_
        </span>
    )
}
