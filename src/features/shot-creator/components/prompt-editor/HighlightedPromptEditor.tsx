'use client'

import React, { useRef, useCallback, useEffect, useState } from 'react'
import { cn } from '@/utils/utils'
import { tokenizePrompt, type SyntaxToken, type TokenType } from '../../helpers/prompt-syntax-tokenizer'

/**
 * Color mapping for each syntax token type.
 * Colors are used for text in the backdrop layer.
 * Background highlights are subtle overlays behind the colored text.
 */
const TOKEN_STYLES: Record<TokenType, { color: string; bg: string } | null> = {
    text: null, // uses default text color
    bracket: { color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.12)' },           // blue-400
    bracketDelimiter: { color: '#93c5fd', bg: 'transparent' },                // blue-300 (delimiters)
    pipe: { color: '#c084fc', bg: 'rgba(168, 85, 247, 0.12)' },              // purple-400
    wildcard: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.12)' },          // amber-400
    slotMachine: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.12)' },       // emerald-400
    slotMachineDelimiter: { color: '#6ee7b7', bg: 'transparent' },            // emerald-300
    anchor: { color: '#fb7185', bg: 'rgba(244, 63, 94, 0.12)' },             // rose-400
    reference: { color: '#22d3ee', bg: 'rgba(6, 182, 212, 0.12)' },          // cyan-400
}

// Default text color for non-syntax text (matches typical dark theme foreground)
const DEFAULT_TEXT_COLOR = '#e2e8f0' // slate-200

interface HighlightedPromptEditorProps {
    id?: string
    value: string
    onChange: (value: string) => void
    onKeyUp?: React.KeyboardEventHandler<HTMLTextAreaElement>
    onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>
    onMouseUp?: React.MouseEventHandler<HTMLTextAreaElement>
    onTouchEnd?: React.TouchEventHandler<HTMLTextAreaElement>
    placeholder?: string
    className?: string
    textareaRef?: React.RefObject<HTMLTextAreaElement | null>
}

export function HighlightedPromptEditor({
    id,
    value,
    onChange,
    onKeyUp,
    onKeyDown,
    onMouseUp,
    onTouchEnd,
    placeholder,
    className,
    textareaRef: externalRef,
}: HighlightedPromptEditorProps) {
    const internalRef = useRef<HTMLTextAreaElement>(null)
    const backdropRef = useRef<HTMLDivElement>(null)
    const textareaRef = externalRef || internalRef
    const [tokens, setTokens] = useState<SyntaxToken[]>([])

    // Tokenize the prompt on value change
    useEffect(() => {
        setTokens(tokenizePrompt(value))
    }, [value])

    // Sync scroll position between textarea and backdrop
    const syncScroll = useCallback(() => {
        if (textareaRef.current && backdropRef.current) {
            backdropRef.current.scrollTop = textareaRef.current.scrollTop
            backdropRef.current.scrollLeft = textareaRef.current.scrollLeft
        }
    }, [textareaRef])

    // Attach scroll listener
    useEffect(() => {
        const textarea = textareaRef.current
        if (!textarea) return
        textarea.addEventListener('scroll', syncScroll)
        return () => textarea.removeEventListener('scroll', syncScroll)
    }, [textareaRef, syncScroll])

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value)
    }, [onChange])

    // Only activate highlighting when there's actual syntax present
    const hasSyntax = tokens.some(t => t.type !== 'text')

    return (
        <div className="relative w-full">
            {/* Highlighted backdrop — renders colored text behind the transparent textarea */}
            {hasSyntax && (
                <div
                    ref={backdropRef}
                    className={cn(
                        // Match textarea base styles exactly
                        "absolute inset-0 w-full rounded-md border border-transparent px-3 py-2 text-sm",
                        "overflow-hidden whitespace-pre-wrap break-words pointer-events-none z-0",
                        className,
                    )}
                    aria-hidden="true"
                >
                    {tokens.map((token, i) => {
                        const style = TOKEN_STYLES[token.type]
                        if (!style) {
                            return (
                                <span key={i} style={{ color: DEFAULT_TEXT_COLOR }}>
                                    {token.content}
                                </span>
                            )
                        }
                        return (
                            <span
                                key={i}
                                style={{
                                    color: style.color,
                                    backgroundColor: style.bg,
                                    borderRadius: '3px',
                                    fontWeight: token.type === 'bracketDelimiter' || token.type === 'slotMachineDelimiter' || token.type === 'pipe' ? 600 : undefined,
                                }}
                            >
                                {token.content}
                            </span>
                        )
                    })}
                </div>
            )}

            {/* Actual textarea — transparent text when syntax highlighting is active */}
            <textarea
                id={id}
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyUp={onKeyUp}
                onKeyDown={onKeyDown}
                onMouseUp={onMouseUp}
                onTouchEnd={onTouchEnd}
                onScroll={syncScroll}
                placeholder={placeholder}
                className={cn(
                    // Base textarea styles (matching Textarea component)
                    "flex w-full rounded-md border border-input px-3 py-2 text-sm",
                    "ring-offset-background placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "whitespace-pre-wrap break-words relative z-[1]",
                    className,
                )}
                style={hasSyntax ? {
                    color: 'transparent',
                    caretColor: DEFAULT_TEXT_COLOR,
                    backgroundColor: 'hsl(var(--background))',
                } : {
                    backgroundColor: 'hsl(var(--background))',
                }}
            />
        </div>
    )
}
