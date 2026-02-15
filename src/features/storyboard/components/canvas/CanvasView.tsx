'use client'

import { useState, useCallback, useMemo } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    SortableContext,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { Upload } from 'lucide-react'
import { useStoryboardStore } from '../../store'
import { CanvasPanel } from './CanvasPanel'
import { CanvasToolbar } from './CanvasToolbar'
import { useCanvasDragDrop } from './useCanvasDragDrop'
import { useCanvasImport } from './useCanvasImport'
import { toast } from 'sonner'

export function CanvasView() {
    const {
        generatedPrompts,
        generatedImages,
        openShotLab,
        chapters,
        activeChapterIndex,
    } = useStoryboardStore()

    const [selectedSequences, setSelectedSequences] = useState<Set<number>>(new Set())
    const [isDragOver, setIsDragOver] = useState(false)

    const { handleDragStart, handleDragEnd, handleDragCancel } = useCanvasDragDrop()
    const { isImporting, handleFileDrop } = useCanvasImport()

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    // Filter prompts by active chapter
    const filteredPrompts = useMemo(() => {
        if (!chapters || chapters.length === 0 || activeChapterIndex < 0) {
            return generatedPrompts
        }
        const activeChapter = chapters[activeChapterIndex]
        if (!activeChapter) return generatedPrompts
        return generatedPrompts.filter(p =>
            activeChapter.segmentIndices.includes(p.sequence)
        )
    }, [generatedPrompts, chapters, activeChapterIndex])

    const sortableIds = useMemo(
        () => filteredPrompts.map(p => p.sequence),
        [filteredPrompts]
    )

    const toggleSelect = useCallback((sequence: number) => {
        setSelectedSequences(prev => {
            const next = new Set(prev)
            if (next.has(sequence)) {
                next.delete(sequence)
            } else {
                next.add(sequence)
            }
            return next
        })
    }, [])

    const selectAll = useCallback(() => {
        setSelectedSequences(new Set(filteredPrompts.map(p => p.sequence)))
    }, [filteredPrompts])

    const deselectAll = useCallback(() => {
        setSelectedSequences(new Set())
    }, [])

    const handleGenerateSelected = useCallback(() => {
        toast.info(`Generate ${selectedSequences.size} shots - use the Generation tab to execute`)
    }, [selectedSequences])

    const handleExport = useCallback(() => {
        toast.info('Export functionality - use the Gallery tab for downloads')
    }, [])

    const handleRegenerate = useCallback((sequence: number) => {
        toast.info(`Regenerate shot #${sequence} - use the Generation tab`)
    }, [])

    const onDrop = useCallback((e: React.DragEvent) => {
        setIsDragOver(false)
        // Check if this is a file drop from OS (not internal dnd-kit drag)
        if (e.dataTransfer.files.length > 0) {
            handleFileDrop(e)
        }
    }, [handleFileDrop])

    const onDragOver = useCallback((e: React.DragEvent) => {
        // Only show drop zone for file drops
        if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault()
            setIsDragOver(true)
        }
    }, [])

    const onDragLeave = useCallback(() => {
        setIsDragOver(false)
    }, [])

    if (filteredPrompts.length === 0) {
        return (
            <div
                className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground border-2 border-dashed rounded-lg"
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
            >
                <Upload className="w-10 h-10 mb-3 opacity-50" />
                <p className="text-sm font-medium">No shots yet</p>
                <p className="text-xs mt-1">Generate shots from the Shots tab, or drop images here to import</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3 h-full">
            <CanvasToolbar
                selectedCount={selectedSequences.size}
                totalCount={filteredPrompts.length}
                onSelectAll={selectAll}
                onDeselectAll={deselectAll}
                onGenerateSelected={handleGenerateSelected}
                onExport={handleExport}
                isImporting={isImporting}
            />

            <div
                className={`flex-1 overflow-auto relative rounded-lg ${isDragOver ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
            >
                {/* File drop overlay */}
                {isDragOver && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg">
                        <div className="text-center">
                            <Upload className="w-8 h-8 mx-auto mb-2 text-primary" />
                            <p className="text-sm font-medium text-primary">Drop image to import</p>
                        </div>
                    </div>
                )}

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                >
                    <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-1">
                            {filteredPrompts.map(shot => (
                                <CanvasPanel
                                    key={shot.sequence}
                                    shot={shot}
                                    imageData={generatedImages[shot.sequence]}
                                    isSelected={selectedSequences.has(shot.sequence)}
                                    onToggleSelect={toggleSelect}
                                    onRegenerate={handleRegenerate}
                                    onOpenShotLab={openShotLab}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    )
}
