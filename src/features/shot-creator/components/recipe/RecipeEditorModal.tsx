'use client'

import { useState, useCallback } from 'react'
import { Save, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import RecipeTemplateEditor from './RecipeTemplateEditor'
import { RecipeLivePreview } from './RecipeLivePreview'
import { useRecipeStore } from '../../store/recipe.store'
import type { RecipeStage } from '../../types/recipe-stage.types'
import type { RecipeToolId } from '../../types/recipe-tools.types'
import { generateStageId } from '../../types/recipe-utils'

interface RecipeEditorModalProps {
  isOpen: boolean
  recipeId?: string | null  // null = create new
  onClose: () => void
  onTestRecipe?: (recipeId: string) => void
}

export function RecipeEditorModal({ isOpen, recipeId, onClose, onTestRecipe }: RecipeEditorModalProps) {
  const { getRecipe, addRecipe, updateRecipe, deleteRecipe, isAdmin } = useRecipeStore()

  const existingRecipe = recipeId ? getRecipe(recipeId) : null

  // Local editor state
  const [name, setName] = useState(existingRecipe?.name || '')
  const [description, setDescription] = useState(existingRecipe?.description || '')
  const [recipeNote, setRecipeNote] = useState(existingRecipe?.recipeNote || '')
  const [suggestedModel, setSuggestedModel] = useState(existingRecipe?.suggestedModel || '')
  const [suggestedAspectRatio, setSuggestedAspectRatio] = useState(existingRecipe?.suggestedAspectRatio || '')
  const [suggestedResolution, setSuggestedResolution] = useState(existingRecipe?.suggestedResolution || '')
  const [categoryId, setCategoryId] = useState(existingRecipe?.categoryId || '')
  const [requiresImage, setRequiresImage] = useState(existingRecipe?.requiresImage ?? true)
  const [stages, setStages] = useState<RecipeStage[]>(
    existingRecipe?.stages || [{
      id: generateStageId(),
      order: 0,
      type: 'generation',
      template: '',
      fields: [],
      referenceImages: [],
    }]
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleMetadataChange = useCallback((field: string, value: string | boolean) => {
    switch (field) {
      case 'name': case 'recipeName': setName(value as string); break
      case 'description': case 'recipeDescription': setDescription(value as string); break
      case 'recipeNote': setRecipeNote(value as string); break
      case 'suggestedModel': setSuggestedModel(value as string); break
      case 'suggestedAspectRatio': setSuggestedAspectRatio(value as string); break
      case 'suggestedResolution': setSuggestedResolution(value as string); break
      case 'categoryId': setCategoryId(value as string); break
      case 'requiresImage': setRequiresImage(value as boolean); break
    }
  }, [])

  const handleStageTemplateChange = useCallback((stageId: string, template: string) => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, template } : s))
  }, [])

  const handleStageTypeChange = useCallback((stageId: string, type: 'generation' | 'tool' | 'analysis') => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, type } : s))
  }, [])

  const handleStageToolChange = useCallback((stageId: string, toolId: string) => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, toolId: toolId as RecipeToolId } : s))
  }, [])

  const handleAddStage = useCallback(() => {
    setStages(prev => [...prev, {
      id: generateStageId(),
      order: prev.length,
      type: 'generation' as const,
      template: '',
      fields: [],
      referenceImages: [],
    }])
  }, [])

  const handleRemoveStage = useCallback((stageId: string) => {
    setStages(prev => prev.filter(s => s.id !== stageId).map((s, i) => ({ ...s, order: i })))
  }, [])

  const handleMoveStage = useCallback((stageId: string, direction: 'up' | 'down') => {
    setStages(prev => {
      const idx = prev.findIndex(s => s.id === stageId)
      if (idx < 0) return prev
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
      return next.map((s, i) => ({ ...s, order: i }))
    })
  }, [])

  const handleSave = async () => {
    if (!name.trim()) return
    setIsSaving(true)

    const recipeData = {
      name: name.trim(),
      description: description.trim() || undefined,
      recipeNote: recipeNote.trim() || undefined,
      stages: stages.map(s => ({
        id: s.id,
        order: s.order,
        type: s.type || 'generation' as const,
        template: s.template,
        toolId: s.toolId,
        fields: [],
        referenceImages: s.referenceImages || [],
      })),
      suggestedModel: suggestedModel || undefined,
      suggestedAspectRatio: suggestedAspectRatio || undefined,
      suggestedResolution: suggestedResolution || undefined,
      categoryId: categoryId || undefined,
      requiresImage,
      isQuickAccess: false,
      source: 'created' as const,
    }

    if (existingRecipe) {
      await updateRecipe(existingRecipe.id, recipeData, existingRecipe.isSystem && isAdmin)
    } else {
      await addRecipe(recipeData)
    }

    setIsSaving(false)
    onClose()
  }

  const handleDelete = async () => {
    if (!existingRecipe || !confirm('Delete this recipe? This cannot be undone.')) return
    setIsDeleting(true)
    await deleteRecipe(existingRecipe.id)
    setIsDeleting(false)
    onClose()
  }

  const handleTest = async () => {
    if (!name.trim()) return
    await handleSave()
    if (existingRecipe && onTestRecipe) {
      onTestRecipe(existingRecipe.id)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/95">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white">
            {existingRecipe ? 'Edit Recipe' : 'Create Recipe'}
          </h1>
          {name && (
            <span className="text-sm text-muted-foreground">— {name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Template Editor */}
        <div className="w-1/2 border-r border-border overflow-hidden">
          <div className="h-full overflow-y-auto">
            <RecipeTemplateEditor
              stages={stages}
              recipeName={name}
              recipeDescription={description}
              recipeNote={recipeNote}
              suggestedModel={suggestedModel}
              suggestedAspectRatio={suggestedAspectRatio}
              suggestedResolution={suggestedResolution}
              categoryId={categoryId}
              requiresImage={requiresImage}
              onStageTemplateChange={handleStageTemplateChange}
              onStageTypeChange={handleStageTypeChange}
              onStageToolChange={handleStageToolChange}
              onAddStage={handleAddStage}
              onRemoveStage={handleRemoveStage}
              onMoveStage={handleMoveStage}
              onMetadataChange={handleMetadataChange}
            />
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="w-1/2 overflow-hidden">
          <RecipeLivePreview stages={stages} recipeName={name} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-card/95">
        <div>
          {existingRecipe && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {existingRecipe && onTestRecipe && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Test in Shot Creator
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
