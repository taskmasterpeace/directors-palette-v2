'use client'

/**
 * Slot Machine Panel
 *
 * Inline panel for expanding {curly bracket} syntax to [variations].
 * Appears when {} is detected in prompt, similar to recipe panel.
 */

import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Sparkles, Check, Plus, Minus, X, RotateCcw } from 'lucide-react'
import { hasSlotMachineSyntax, expandSlotMachine, detectSlotMachineSyntax, type SlotMachineSlot } from '../../services/slot-machine.service'

interface SlotMachinePanelProps {
    prompt: string
    onApply: (expandedPrompt: string) => void
    disabled?: boolean
}

export function SlotMachinePanel({ prompt, onApply, disabled }: SlotMachinePanelProps) {
    const [isExpanding, setIsExpanding] = useState(false)
    const [variationCount, setVariationCount] = useState(3)
    const [result, setResult] = useState<{
        expandedPrompt: string
        slots: SlotMachineSlot[]
        originalPrompt: string
    } | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Check if prompt has slot machine syntax
    const hasSlots = hasSlotMachineSyntax(prompt)

    // Get detected seeds for display
    const detectedSeeds = useMemo(() => {
        if (!hasSlots) return []
        return detectSlotMachineSyntax(prompt)
    }, [prompt, hasSlots])

    // All hooks must be called before any conditional returns
    const handleExpand = useCallback(async () => {
        setIsExpanding(true)
        setError(null)

        try {
            const expandResult = await expandSlotMachine(prompt, variationCount)
            if (expandResult.success) {
                setResult({
                    expandedPrompt: expandResult.expandedPrompt,
                    slots: expandResult.slots,
                    originalPrompt: expandResult.originalPrompt
                })
            } else {
                setError(expandResult.error || 'Failed to expand')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to expand')
        } finally {
            setIsExpanding(false)
        }
    }, [prompt, variationCount])

    const handleApply = useCallback(() => {
        if (result) {
            onApply(result.expandedPrompt)
            setResult(null)
        }
    }, [result, onApply])

    const handleClear = useCallback(() => {
        setResult(null)
        setError(null)
    }, [])

    const incrementCount = useCallback(() => setVariationCount(prev => Math.min(5, prev + 1)), [])
    const decrementCount = useCallback(() => setVariationCount(prev => Math.max(2, prev - 1)), [])

    // Don't render if no slots detected (after all hooks)
    if (!hasSlots) return null

    return (
        <div className="bg-amber-950/30 border border-amber-500/20 rounded-lg overflow-hidden">
            {/* Compact header */}
            <div className="flex items-center justify-between px-3 py-2 bg-amber-500/10">
                <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-sm">🎰</span>
                    <span className="font-medium text-amber-300 text-sm">Slot Machine</span>
                    {detectedSeeds.length > 0 && (
                        <span className="text-xs text-amber-400/60">
                            {detectedSeeds.length} slot{detectedSeeds.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Variation counter - always visible */}
                    <div className="flex items-center bg-black/20 rounded">
                        <button
                            onClick={decrementCount}
                            disabled={variationCount <= 2 || isExpanding}
                            className="px-1.5 py-1 text-amber-400/60 hover:text-amber-400 disabled:opacity-30 transition-colors"
                            title="Fewer variations"
                        >
                            <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-mono text-amber-300 w-5 text-center">{variationCount}</span>
                        <button
                            onClick={incrementCount}
                            disabled={variationCount >= 5 || isExpanding}
                            className="px-1.5 py-1 text-amber-400/60 hover:text-amber-400 disabled:opacity-30 transition-colors"
                            title="More variations"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>

                    {/* Expand/Regenerate button */}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleExpand}
                        disabled={isExpanding || disabled}
                        className="h-7 text-xs text-amber-300 hover:text-amber-100 hover:bg-amber-500/20"
                    >
                        {isExpanding ? (
                            <>
                                <LoadingSpinner className="w-3 h-3 mr-1" />
                                <span className="hidden sm:inline">Expanding...</span>
                            </>
                        ) : result ? (
                            <>
                                <RotateCcw className="w-3 h-3 mr-1" />
                                <span className="hidden sm:inline">Regenerate</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-3 h-3 mr-1" />
                                <span>Expand</span>
                            </>
                        )}
                    </Button>

                    {/* Clear button (when result exists) */}
                    {result && (
                        <button
                            onClick={handleClear}
                            className="text-amber-400/40 hover:text-amber-400 p-1 transition-colors"
                            title="Clear result"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div className="px-3 py-2 text-sm text-red-400 bg-red-500/10 border-t border-red-500/20">
                    {error}
                </div>
            )}

            {/* Result */}
            {result && (
                <div className="px-3 py-2 space-y-2 border-t border-amber-500/20">
                    {/* Expanded preview */}
                    <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
                        <p className="text-sm break-words text-green-100">{result.expandedPrompt}</p>
                    </div>

                    {/* Slots breakdown - show actual variations */}
                    {result.slots.length > 0 && (
                        <div className="space-y-1">
                            {result.slots.map((slot, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs">
                                    <span className="font-mono text-amber-400 shrink-0">{`{${slot.seed}}`}</span>
                                    <span className="text-muted-foreground shrink-0">→</span>
                                    <span className="font-mono text-green-400 break-words">
                                        [{slot.variations.join(', ')}]
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Apply button */}
                    <Button
                        size="sm"
                        onClick={handleApply}
                        className="w-full h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                    >
                        <Check className="w-3 h-3 mr-1" />
                        Apply to Prompt
                    </Button>
                </div>
            )}

            {/* Show detected seeds when no result yet */}
            {!result && !error && detectedSeeds.length > 0 && (
                <div className="px-3 py-2 border-t border-amber-500/10">
                    <div className="flex flex-wrap gap-1">
                        {detectedSeeds.map((seed, i) => (
                            <span key={i} className="text-xs font-mono bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded">
                                {`{${seed}}`}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
