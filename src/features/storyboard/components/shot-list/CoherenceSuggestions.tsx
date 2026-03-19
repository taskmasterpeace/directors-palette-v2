'use client'

import { useStoryboardStore } from '../../store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Sparkles, PenLine, Plus } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export function CoherenceSuggestions() {
    const {
        coherenceSuggestions,
        isRunningCoherencePass,
        toggleCoherenceSuggestion,
        applyCoherenceSuggestions,
    } = useStoryboardStore()

    if (isRunningCoherencePass) {
        return (
            <Card className="border-cyan-500/30 bg-cyan-950/20">
                <CardContent className="flex items-center gap-3 py-4">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-cyan-300">Running coherence review...</span>
                </CardContent>
            </Card>
        )
    }

    if (coherenceSuggestions.length === 0) return null

    const acceptedCount = coherenceSuggestions.filter(s => s.accepted).length

    return (
        <Card className="border-cyan-500/30 bg-cyan-950/20">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        Coherence Suggestions ({coherenceSuggestions.length})
                    </CardTitle>
                    {acceptedCount > 0 && (
                        <Button
                            size="sm"
                            onClick={applyCoherenceSuggestions}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white"
                        >
                            <Check className="w-3 h-3 mr-1" />
                            Apply {acceptedCount} selected
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {coherenceSuggestions.map(suggestion => (
                    <div
                        key={suggestion.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            suggestion.accepted
                                ? 'border-cyan-500/50 bg-cyan-950/40'
                                : 'border-zinc-700/50 bg-zinc-900/40 hover:border-zinc-600/50'
                        }`}
                        onClick={() => toggleCoherenceSuggestion(suggestion.id)}
                    >
                        <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            suggestion.accepted
                                ? 'border-cyan-500 bg-cyan-500'
                                : 'border-zinc-600'
                        }`}>
                            {suggestion.accepted && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge
                                    variant="outline"
                                    className={suggestion.type === 'edit'
                                        ? 'border-amber-500/50 text-amber-400'
                                        : 'border-green-500/50 text-green-400'
                                    }
                                >
                                    {suggestion.type === 'edit'
                                        ? <><PenLine className="w-3 h-3 mr-1" />Edit</>
                                        : <><Plus className="w-3 h-3 mr-1" />Insert</>
                                    }
                                </Badge>
                                <span className="text-xs text-zinc-500">
                                    Shot {suggestion.targetSequence}
                                </span>
                            </div>
                            <p className="text-sm text-zinc-300">{suggestion.description}</p>
                            {suggestion.newPrompt && (
                                <p className="text-xs text-zinc-500 mt-1 truncate">
                                    New prompt: {suggestion.newPrompt}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
