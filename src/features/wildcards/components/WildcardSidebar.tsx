'use client'

import { useEffect } from 'react'
import { Plus, FileText, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useWildCardStore } from '@/features/shot-creator/store/wildcard.store'
import { useWildcardsBrowserStore } from '../store'
import { useWildcardFilters } from '../hooks/useWildcardFilters'
import { cn } from '@/utils/utils'

export function WildcardSidebar() {
    const { wildcards, loadWildCards, isLoading } = useWildCardStore()
    const {
        selectedWildcardId,
        setSelectedWildcardId,
        setIsCreatingNew,
        loadDraft,
        resetDraft,
        searchQuery,
        setSearchQuery,
    } = useWildcardsBrowserStore()
    const { filteredWildcards } = useWildcardFilters()

    // Load wildcards on mount
    useEffect(() => {
        loadWildCards()
    }, [loadWildCards])

    const handleSelectWildcard = (wildcard: typeof filteredWildcards[0]) => {
        setSelectedWildcardId(wildcard.id)
        setIsCreatingNew(false)
        loadDraft(
            wildcard.name,
            wildcard.content,
            wildcard.category || '',
            wildcard.description || ''
        )
    }

    const handleCreateNew = () => {
        resetDraft()
        setIsCreatingNew(true)
        setSelectedWildcardId(null)
    }

    return (
        <div className="flex flex-col h-full border-r border-border">
            {/* Header with Create Button */}
            <div className="p-3 border-b border-border">
                <Button
                    onClick={handleCreateNew}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    size="sm"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Wildcard
                </Button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-border">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search wildcards..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={cn("pl-9 h-9", searchQuery && "pr-9")}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Clear search"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Wildcard List */}
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <LoadingSpinner size="md" />
                        </div>
                    ) : filteredWildcards.length === 0 && wildcards.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No wildcards yet</p>
                            <p className="text-xs mt-1">Create your first one!</p>
                        </div>
                    ) : filteredWildcards.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No matches found</p>
                            <p className="text-xs mt-1">Try a different search term</p>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-xs text-primary hover:underline mt-2"
                            >
                                Clear search
                            </button>
                        </div>
                    ) : (
                        filteredWildcards.map((wildcard) => {
                            const lineCount = wildcard.content.split('\n').filter(l => l.trim()).length
                            return (
                                <button
                                    key={wildcard.id}
                                    onClick={() => handleSelectWildcard(wildcard)}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-lg transition-colors",
                                        "hover:bg-accent/10",
                                        selectedWildcardId === wildcard.id
                                            ? "bg-primary/20 border border-primary/30"
                                            : "border border-transparent"
                                    )}
                                >
                                    <div className="font-medium text-sm truncate">
                                        {wildcard.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                        <span>{lineCount} entries</span>
                                        {wildcard.category && (
                                            <>
                                                <span>•</span>
                                                <span className="truncate">{wildcard.category}</span>
                                            </>
                                        )}
                                    </div>
                                </button>
                            )
                        })
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}