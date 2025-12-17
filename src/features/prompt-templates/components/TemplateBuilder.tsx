"use client"

/**
 * TemplateBuilder Component
 *
 * Drop zone for arranging tokens into a template.
 * Supports drag-and-drop reordering and slot configuration.
 */

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  Settings2,
  Copy,
  Trash2,
  Save,
} from 'lucide-react'
import { SortableTokenCard, TokenCard } from './TokenCard'
import type {
  Token,
  PromptTemplate,
  TemplateSlot,
} from '../types/prompt-template.types'
import { cn } from '@/utils/utils'

interface TemplateBuilderProps {
  template: PromptTemplate | null
  tokens: Token[]
  onAddSlot: (templateId: string, slot: TemplateSlot) => void
  onRemoveSlot: (templateId: string, slotId: string) => void
  onReorderSlots: (templateId: string, sourceIndex: number, destIndex: number) => void
  onUpdateSlot: (templateId: string, slotId: string, updates: Partial<TemplateSlot>) => void
  onUpdateTemplate: (templateId: string, updates: Partial<PromptTemplate>) => void
  onDuplicateTemplate: (templateId: string) => void
  onDeleteTemplate: (templateId: string) => void
  onSave: () => void
  hasUnsavedChanges: boolean
}

// Empty drop zone component
function EmptyDropZone() {
  const { isOver, setNodeRef } = useDroppable({
    id: 'template-dropzone',
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200',
        isOver
          ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10 scale-[1.02]'
          : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/30'
      )}
    >
      <div className={cn(
        'w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center transition-colors',
        isOver ? 'bg-amber-500/20' : 'bg-zinc-800'
      )}>
        <Plus className={cn(
          'w-6 h-6 transition-colors',
          isOver ? 'text-amber-400' : 'text-zinc-600'
        )} />
      </div>
      <p className={cn(
        'text-sm font-medium transition-colors',
        isOver ? 'text-amber-400' : 'text-zinc-400'
      )}>
        Drag tokens here to build your template
      </p>
      <p className="text-zinc-600 text-xs mt-1">
        Or click a token to add it
      </p>
    </div>
  )
}

export function TemplateBuilder({
  template,
  tokens,
  onAddSlot,
  onRemoveSlot,
  onReorderSlots,
  onUpdateSlot,
  onUpdateTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onSave,
  hasUnsavedChanges,
}: TemplateBuilderProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingSlot, setEditingSlot] = useState<TemplateSlot | null>(null)
  const [slotDialogOpen, setSlotDialogOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const tokensMap = new Map(tokens.map(t => [t.id, t]))

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!template || !over) return

    // If dropping a new token from library
    if (active.data.current?.type === 'token') {
      const token = active.data.current.token as Token
      const newSlot: TemplateSlot = {
        id: crypto.randomUUID(),
        tokenId: token.id,
        prefix: '',
        suffix: ', ',
      }
      onAddSlot(template.id, newSlot)
      return
    }

    // If reordering within template
    if (active.id !== over.id) {
      const oldIndex = template.slots.findIndex(s => s.id === active.id)
      const newIndex = template.slots.findIndex(s => s.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderSlots(template.id, oldIndex, newIndex)
      }
    }
  }

  const handleDragOver = (_event: DragOverEvent) => {
    // Handle drag over logic if needed
  }

  const handleEditSlot = (slot: TemplateSlot) => {
    setEditingSlot({ ...slot })
    setSlotDialogOpen(true)
  }

  const handleSaveSlot = () => {
    if (!editingSlot || !template) return
    onUpdateSlot(template.id, editingSlot.id, editingSlot)
    setSlotDialogOpen(false)
    setEditingSlot(null)
  }

  const handleRemoveSlot = (slotId: string) => {
    if (!template) return
    onRemoveSlot(template.id, slotId)
  }

  const activeToken = activeId ? tokensMap.get(activeId) : null

  if (!template) {
    return (
      <Card className="bg-zinc-900 border-zinc-800 h-full flex flex-col">
        <CardHeader className="border-b border-zinc-800">
          <CardTitle className="text-white text-sm">Template Builder</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center">
              <Settings2 className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-zinc-500 text-sm">Select a template to edit</p>
            <p className="text-zinc-600 text-xs mt-1">Choose from the dropdown above</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-white text-sm font-semibold">Template Builder</CardTitle>
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-amber-400 border-amber-500/50 bg-amber-500/10 text-[10px] animate-pulse">
                Unsaved
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 hover:bg-zinc-800 text-zinc-400 hover:text-white"
              onClick={() => onDuplicateTemplate(template.id)}
              title="Duplicate template"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 hover:bg-red-500/20 text-zinc-400 hover:text-red-400"
              onClick={() => {
                if (confirm('Delete this template?')) {
                  onDeleteTemplate(template.id)
                }
              }}
              title="Delete template"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs ml-2 border-green-500/50 text-green-400 hover:bg-green-500/10 hover:border-green-400/60 disabled:opacity-40"
              onClick={onSave}
              disabled={!hasUnsavedChanges}
            >
              <Save className="w-3 h-3 mr-1.5" />
              Save
            </Button>
          </div>
        </div>

        {/* Template name edit */}
        <div className="flex items-center gap-2 mt-3">
          <Input
            value={template.name}
            onChange={(e) => onUpdateTemplate(template.id, { name: e.target.value })}
            className="h-9 bg-zinc-800 border-zinc-700 text-sm focus:border-amber-500/50 focus:ring-amber-500/20"
            placeholder="Template name"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          {template.slots.length === 0 ? (
            <EmptyDropZone />
          ) : (
            <div className="space-y-2">
              <SortableContext
                items={template.slots.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {template.slots.map((slot) => {
                  const token = tokensMap.get(slot.tokenId)
                  if (!token) return null

                  return (
                    <div key={slot.id} className="flex items-center gap-2">
                      <SortableTokenCard
                        id={slot.id}
                        token={token}
                        isInTemplate
                        onRemoveFromTemplate={() => handleRemoveSlot(slot.id)}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:bg-zinc-800 flex-shrink-0"
                        onClick={() => handleEditSlot(slot)}
                        title="Edit slot settings"
                      >
                        <Settings2 className="w-3.5 h-3.5 text-zinc-400" />
                      </Button>
                    </div>
                  )
                })}
              </SortableContext>

              {/* Add slot button */}
              <Button
                variant="outline"
                className="w-full h-10 border-dashed border-zinc-700 hover:border-amber-500/50 hover:bg-amber-500/5 text-zinc-500 hover:text-amber-400 transition-all duration-200"
                onClick={() => {
                  // Open a dialog to select a token to add
                  // For now, show the first available token
                  const firstToken = tokens[0]
                  if (firstToken) {
                    const newSlot: TemplateSlot = {
                      id: crypto.randomUUID(),
                      tokenId: firstToken.id,
                      prefix: '',
                      suffix: ', ',
                    }
                    onAddSlot(template.id, newSlot)
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Token Slot
              </Button>
            </div>
          )}

          <DragOverlay>
            {activeToken && (
              <TokenCard token={activeToken} isDragging />
            )}
          </DragOverlay>
        </DndContext>

        {/* Format string preview */}
        <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-zinc-800/80 to-zinc-800/40 border border-zinc-700/50">
          <Label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 block font-semibold">Format String Preview</Label>
          <code className="text-xs text-amber-400/90 break-all leading-relaxed font-mono">
            {template.slots.length === 0 ? (
              <span className="text-zinc-600 italic">No tokens added yet</span>
            ) : (
              template.slots.map(slot => {
                const token = tokensMap.get(slot.tokenId)
                if (!token) return ''
                const prefix = slot.prefix || ''
                const suffix = slot.suffix || ''
                return `${prefix}${token.placeholder}${suffix}`
              }).join('')
            )}
          </code>
        </div>
      </CardContent>

      {/* Slot edit dialog */}
      <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Slot Settings</DialogTitle>
            <DialogDescription>
              Configure prefix and suffix text for this slot
            </DialogDescription>
          </DialogHeader>

          {editingSlot && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="slot-prefix">Prefix Text</Label>
                <Input
                  id="slot-prefix"
                  value={editingSlot.prefix || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, prefix: e.target.value })}
                  placeholder="Text before value (e.g., ', ' or ' of ')"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slot-suffix">Suffix Text</Label>
                <Input
                  id="slot-suffix"
                  value={editingSlot.suffix || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, suffix: e.target.value })}
                  placeholder="Text after value (e.g., ', ' or ' in background')"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slot-conditional">Conditional Prefix</Label>
                <Input
                  id="slot-conditional"
                  value={editingSlot.conditionalPrefix || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, conditionalPrefix: e.target.value })}
                  placeholder="Only added if value exists"
                  className="bg-zinc-800 border-zinc-700"
                />
                <p className="text-xs text-zinc-500">
                  Used instead of prefix when the token has a value
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSlotDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSlot}
              className="bg-amber-500 text-black hover:bg-amber-600"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
