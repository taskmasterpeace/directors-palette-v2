'use client'

/**
 * Slot Machine Panel
 *
 * Inline panel for expanding {curly bracket} syntax to [variations].
 * Appears when {} is detected in prompt, similar to recipe panel.
 */

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { RefreshCw, Check, ChevronUp, ChevronDown, X } from 'lucide-react'
import { hasSlotMachineSyntax, expandSlotMachine, type SlotMachineSlot } from '../../services/slot-machine.service'

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
    const [isCollapsed, setIsCollapsed] = useState(false)

    // Check if prompt has slot machine syntax
    const hasSlots = hasSlotMachineSyntax(prompt)

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
            setResult(null) // Clear after applying
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
        <div className="space-y-2 bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🎰</span>
                    <span className="font-medium text-amber-400 text-sm">Slot Machine</span>
                    <span className="text-xs text-muted-foreground">
                        {'{}'} detected
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Variation counter */}
                    <div className="flex items-center gap-1 bg-background/50 rounded border border-border px-2 py-0.5">
                        <button
                            onClick={decrementCount}
                            disabled={variationCount <= 2 || isExpanding}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                        >
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-mono w-4 text-center">{variationCount}</span>
                        <button
                            onClick={incrementCount}
                            disabled={variationCount >= 5 || isExpanding}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                        >
                            <ChevronUp className="w-3 h-3" />
                        </button>
                    </div>

                    {/* Expand button */}
                    {!result && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleExpand}
                            disabled={isExpanding || disabled}
                            className="h-7 text-xs border-amber-500/30 hover:bg-amber-500/20"
                        >
                            {isExpanding ? (
                                <>
                                    <LoadingSpinner className="w-3 h-3 mr-1" />
                                    Expanding...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Expand
                                </>
                            )}
                        </Button>
                    )}

                    {/* Collapse toggle (when result exists) */}
                    {result && (
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="text-muted-foreground hover:text-foreground p-1"
                        >
                            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
                    {error}
                    <Button variant="link" size="sm" onClick={handleExpand} className="ml-2 h-auto p-0 text-red-400">
                        Try again
                    </Button>
                </div>
            )}

            {/* Result */}
            {result && !isCollapsed && (
                <div className="space-y-2">
                    {/* Expanded preview */}
                    <div className="bg-green-500/10 border border-green-500/30 rounded p-2">
                        <p className="text-xs text-green-400 mb-1">Expanded:</p>
                        <p className="text-sm break-words">{result.expandedPrompt}</p>
                    </div>

                    {/* Slots breakdown (compact) */}
                    {result.slots.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {result.slots.map((slot, i) => (
                                <div key={i} className="text-xs bg-muted/30 rounded px-2 py-1">
                                    <span className="font-mono text-amber-400">{`{${slot.seed}}`}</span>
                                    <span className="text-muted-foreground mx-1">→</span>
                                    <span className="font-mono text-green-400">[{slot.variations.length}]</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={handleApply}
                            className="h-7 text-xs bg-green-600 hover:bg-green-700"
                        >
                            <Check className="w-3 h-3 mr-1" />
                            Apply
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleExpand}
                            disabled={isExpanding}
                            className="h-7 text-xs"
                        >
                            <RefreshCw className={`w-3 h-3 mr-1 ${isExpanding ? 'animate-spin' : ''}`} />
                            Regenerate
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleClear}
                            className="h-7 text-xs"
                        >
                            <X className="w-3 h-3 mr-1" />
                            Clear
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
