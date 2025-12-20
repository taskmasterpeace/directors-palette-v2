'use client'

import React, { useMemo, useState, useRef } from 'react'
import { RefreshCw, Star, Sparkles, Database, Loader2, Plus, Trash2, ChevronDown, ChevronUp, Image as ImageIcon, X, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CommunityFilters } from './CommunityFilters'
import { CommunityGrid } from './CommunityGrid'
import { CommunityCard } from './CommunityCard'
import { useCommunity } from '../hooks/useCommunity'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth'
import type { CommunityItem, CommunityItemType, RecipeContent } from '../types/community.types'
import type { RecipeStage, RecipeReferenceImage } from '@/features/shot-creator/types/recipe.types'
import { parseStageTemplate } from '@/features/shot-creator/types/recipe.types'
import { cn } from '@/utils/utils'
// Store imports for refreshing after adding community items
import { useRecipeStore } from '@/features/shot-creator/store/recipe.store'
import { useWildCardStore } from '@/features/shot-creator/store/wildcard.store'
import { useDirectorStore } from '@/features/music-lab/store/director.store'

const TYPE_LABELS: Record<CommunityItemType, string> = {
  wildcard: 'Wildcard',
  recipe: 'Recipe',
  prompt: 'Prompt',
  director: 'Director',
}

export function CommunityPage() {
  const { toast } = useToast()
  const { isAdmin } = useAdminAuth()
  const {
    items,
    filters,
    isLoading,
    error,
    isInitialized,
    isInLibrary,
    getUserRating,
    addToLibrary,
    rateItem,
    refresh,
    setTypeFilter,
    setCategoryFilter,
    setSearchFilter,
    setSortBy,
    clearError,
  } = useCommunity()

  // Admin edit/delete state
  const [editingItem, setEditingItem] = useState<CommunityItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<CommunityItem | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    category: '',
    tags: [] as string[],
  })
  // Recipe-specific edit state
  const [recipeStages, setRecipeStages] = useState<RecipeStage[]>([])
  const [recipeNote, setRecipeNote] = useState('')
  const [suggestedAspectRatio, setSuggestedAspectRatio] = useState('')

  // Separate featured items by type
  const featuredByType = useMemo(() => {
    const featured = items.filter(item => item.isFeatured)
    return {
      wildcard: featured.find(i => i.type === 'wildcard'),
      recipe: featured.find(i => i.type === 'recipe'),
      prompt: featured.find(i => i.type === 'prompt'),
      director: featured.find(i => i.type === 'director'),
    }
  }, [items])

  const hasFeatured = Object.values(featuredByType).some(Boolean)

  // Non-featured items for the grid
  const regularItems = useMemo(() => {
    return items.filter(item => !item.isFeatured)
  }, [items])

  // Handle add to library
  const handleAdd = async (itemId: string): Promise<boolean> => {
    const success = await addToLibrary(itemId)
    if (success) {
      // Find item to refresh appropriate store
      const item = items.find(i => i.id === itemId)
      if (item) {
        try {
          switch (item.type) {
            case 'recipe':
              await useRecipeStore.getState().refreshRecipes()
              break
            case 'wildcard':
              await useWildCardStore.getState().loadWildCards()
              break
            case 'director':
              await useDirectorStore.getState().refreshDirectors()
              break
            // prompts use settings JSON - handled separately
          }
        } catch (e) {
          console.error('Failed to refresh store after add:', e)
        }
      }
      toast({
        title: 'Added to Library',
        description: 'Item has been added to your library.',
      })
    } else {
      toast({
        title: 'Error',
        description: 'Failed to add item to library.',
        variant: 'destructive',
      })
    }
    return success
  }

  // Handle rate item
  const handleRate = async (itemId: string, rating: number): Promise<boolean> => {
    const success = await rateItem(itemId, rating)
    if (success) {
      toast({
        title: 'Rating Saved',
        description: `You rated this item ${rating} star${rating > 1 ? 's' : ''}.`,
      })
    }
    return success
  }

  // Admin: Open edit dialog
  const handleOpenEdit = (item: CommunityItem) => {
    setEditingItem(item)
    setEditFormData({
      name: item.name,
      description: item.description || '',
      category: item.category,
      tags: item.tags || [],
    })

    // For recipes, also load recipe-specific data
    if (item.type === 'recipe') {
      const recipeContent = item.content as RecipeContent
      setRecipeStages(recipeContent.stages.map((stage, idx) => ({
        ...stage,
        id: stage.id || `stage_${idx}_${Date.now()}`,
        order: stage.order ?? idx,
        fields: parseStageTemplate(stage.template, idx),
        referenceImages: stage.referenceImages || [],
      })))
      setRecipeNote(recipeContent.recipeNote || '')
      setSuggestedAspectRatio(recipeContent.suggestedAspectRatio || '')
    } else {
      // Reset recipe state for non-recipes
      setRecipeStages([])
      setRecipeNote('')
      setSuggestedAspectRatio('')
    }
  }

  // Admin: Save edit
  const handleSaveEdit = async () => {
    if (!editingItem) return
    setActionLoading(true)
    try {
      // Build updates object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: any = { ...editFormData }

      // For recipes, include recipe content
      if (editingItem.type === 'recipe') {
        updates.content = {
          stages: recipeStages.map((stage, idx) => ({
            id: stage.id,
            order: idx,
            template: stage.template,
            fields: [], // Fields are parsed on read
            referenceImages: stage.referenceImages,
          })),
          recipeNote: recipeNote || undefined,
          suggestedAspectRatio: suggestedAspectRatio || undefined,
          referenceImages: [], // Top-level reference images (optional)
        } as RecipeContent
      }

      const res = await fetch('/api/admin/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          itemId: editingItem.id,
          updates,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save')
      }

      toast({
        title: 'Item Updated',
        description: 'Community item has been updated successfully.',
      })
      setEditingItem(null)
      refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update item',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Recipe stage management helpers
  const addRecipeStage = () => {
    const newIndex = recipeStages.length
    setRecipeStages([...recipeStages, {
      id: `stage_${newIndex}_${Date.now()}`,
      order: newIndex,
      template: '',
      fields: [],
      referenceImages: [],
    }])
  }

  const removeRecipeStage = (index: number) => {
    if (recipeStages.length <= 1) return
    setRecipeStages(recipeStages.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })))
  }

  const updateStageTemplate = (index: number, template: string) => {
    setRecipeStages(recipeStages.map((s, i) =>
      i === index ? { ...s, template, fields: parseStageTemplate(template, i) } : s
    ))
  }

  const addReferenceImage = (stageIndex: number, file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      const newImage: RecipeReferenceImage = {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: dataUrl,
        name: file.name,
      }
      setRecipeStages(recipeStages.map((s, i) =>
        i === stageIndex ? { ...s, referenceImages: [...s.referenceImages, newImage] } : s
      ))
    }
    reader.readAsDataURL(file)
  }

  const removeReferenceImage = (stageIndex: number, imageId: string) => {
    setRecipeStages(recipeStages.map((s, i) =>
      i === stageIndex ? { ...s, referenceImages: s.referenceImages.filter(img => img.id !== imageId) } : s
    ))
  }

  // Admin: Open delete confirmation
  const handleOpenDelete = (item: CommunityItem) => {
    setDeletingItem(item)
  }

  // Admin: Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingItem) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          itemId: deletingItem.id,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete')
      }

      toast({
        title: 'Item Deleted',
        description: 'Community item has been permanently deleted.',
      })
      setDeletingItem(null)
      refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete item',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Check if it's a schema cache error (tables not available)
  const isSchemaError = error?.includes('schema cache') || error?.includes('PGRST205')

  // Show error toast only for non-schema errors
  React.useEffect(() => {
    if (error && !isSchemaError) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      })
      clearError()
    }
  }, [error, toast, clearError, isSchemaError])

  if (!isInitialized) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Show schema error message if tables aren't available
  if (isSchemaError) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Setup Required Message */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md space-y-4">
            <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
              <Database className="h-5 w-5 text-amber-500" />
              <AlertTitle className="text-amber-400">Community Setup Required</AlertTitle>
              <AlertDescription className="text-muted-foreground mt-2">
                <p className="mb-3">
                  The Community feature requires database tables that need to be refreshed in Supabase.
                </p>
                <p className="text-sm mb-3">
                  <strong>To fix this:</strong>
                </p>
                <ol className="list-decimal list-inside text-sm space-y-1 mb-4">
                  <li>Go to Supabase Dashboard</li>
                  <li>Navigate to Settings → API</li>
                  <li>Click &quot;Reload schema&quot; button</li>
                  <li>Come back and refresh this page</li>
                </ol>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-border/50 flex items-center gap-4">
        <div className="flex-1">
          <CommunityFilters
          filters={filters}
          onTypeChange={setTypeFilter}
          onCategoryChange={setCategoryFilter}
          onSearchChange={setSearchFilter}
          onSortChange={setSortBy}
        />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isLoading}
          className="gap-2 flex-shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Featured Section */}
        {hasFeatured && filters.type === 'all' && !filters.search && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-white">Featured</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['wildcard', 'recipe', 'prompt', 'director'] as const).map((type) => {
                const item = featuredByType[type]
                if (!item) return null
                return (
                  <div key={type} className="relative">
                    <div className="absolute -top-2 -left-2 z-10 flex items-center gap-1 bg-amber-500 text-black text-xs font-medium px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3 fill-current" />
                      Featured {TYPE_LABELS[type]}
                    </div>
                    <CommunityCard
                      item={item}
                      isInLibrary={isInLibrary(item.id)}
                      userRating={getUserRating(item.id)}
                      onAdd={() => handleAdd(item.id)}
                      onRate={(rating) => handleRate(item.id, rating)}
                      isAdmin={isAdmin}
                      onEdit={() => handleOpenEdit(item)}
                      onDelete={() => handleOpenDelete(item)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* All Items Grid */}
        <div>
          {hasFeatured && filters.type === 'all' && !filters.search && (
            <h2 className="text-lg font-semibold text-white mb-4">All Items</h2>
          )}
          <CommunityGrid
            items={regularItems}
            isLoading={isLoading}
            isInLibrary={isInLibrary}
            getUserRating={getUserRating}
            onAdd={handleAdd}
            onRate={handleRate}
            isAdmin={isAdmin}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
          />
        </div>
      </div>

      {/* Stats Footer */}
      <div className="p-3 border-t border-border/50 bg-muted/20 text-center">
        <p className="text-xs text-muted-foreground">
          {items.length} item{items.length !== 1 ? 's' : ''} in community
        </p>
      </div>

      {/* Admin Edit Dialog - Wide for recipes, normal for others */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className={cn(
          "bg-zinc-900 border-zinc-800",
          editingItem?.type === 'recipe'
            ? "max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto"
            : "max-w-md"
        )}>
          <DialogHeader>
            <DialogTitle className="text-white">
              Edit Community {editingItem?.type === 'recipe' ? 'Recipe' : 'Item'}
            </DialogTitle>
            <DialogDescription>
              Editing: {editingItem?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Common Fields - Name, Description, Category, Tags */}
            <div className={cn(
              editingItem?.type === 'recipe' ? 'grid grid-cols-2 gap-4' : 'space-y-4'
            )}>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Input
                  id="edit-category"
                  value={editFormData.category}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-zinc-800 border-zinc-700"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-tags"
                value={editFormData.tags.join(', ')}
                onChange={(e) => setEditFormData(prev => ({
                  ...prev,
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                }))}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {/* Recipe-Specific Fields */}
            {editingItem?.type === 'recipe' && (
              <>
                {/* Recipe Note and Aspect Ratio */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-700">
                  <div className="space-y-2">
                    <Label htmlFor="edit-recipe-note">
                      Recipe Note <span className="text-muted-foreground text-xs">(shown when activated)</span>
                    </Label>
                    <Input
                      id="edit-recipe-note"
                      value={recipeNote}
                      onChange={(e) => setRecipeNote(e.target.value)}
                      placeholder="e.g., Please provide a reference image"
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-aspect-ratio">Suggested Aspect Ratio</Label>
                    <Select value={suggestedAspectRatio} onValueChange={setSuggestedAspectRatio}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Select aspect ratio..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1:1">1:1 (Square)</SelectItem>
                        <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                        <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                        <SelectItem value="4:3">4:3 (Classic)</SelectItem>
                        <SelectItem value="3:2">3:2 (Photo)</SelectItem>
                        <SelectItem value="21:9">21:9 (Cinematic)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Pipeline Stages */}
                <div className="space-y-4 pt-4 border-t border-zinc-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label>Pipeline Stages</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <HelpCircle className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <div className="text-xs space-y-1">
                              <p><strong>Multi-stage recipes:</strong> Each stage runs sequentially.</p>
                              <p>Previous stage output becomes reference for next stage.</p>
                              <p><strong>Field Syntax:</strong> {`<<FIELD_NAME:type!>>`}</p>
                              <p><strong>Types:</strong> name (small), text (large), select(opt1,opt2)</p>
                              <p><strong>!</strong> at end = required field</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addRecipeStage}
                      className="h-7 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Stage
                    </Button>
                  </div>

                  {recipeStages.map((stage, index) => (
                    <RecipeStageEditor
                      key={stage.id}
                      stage={stage}
                      index={index}
                      canRemove={recipeStages.length > 1}
                      onTemplateChange={(template) => updateStageTemplate(index, template)}
                      onRemove={() => removeRecipeStage(index)}
                      onAddImage={(file) => addReferenceImage(index, file)}
                      onRemoveImage={(imageId) => removeReferenceImage(index, imageId)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingItem(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={actionLoading}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Delete Confirmation */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete &quot;{deletingItem?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this {deletingItem?.type} from the community.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={actionLoading}
              className="bg-red-500 hover:bg-red-600"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Recipe Stage Editor Component
interface RecipeStageEditorProps {
  stage: RecipeStage
  index: number
  canRemove: boolean
  onTemplateChange: (template: string) => void
  onRemove: () => void
  onAddImage: (file: File) => void
  onRemoveImage: (imageId: string) => void
}

function RecipeStageEditor({
  stage,
  index,
  canRemove,
  onTemplateChange,
  onRemove,
  onAddImage,
  onRemoveImage,
}: RecipeStageEditorProps) {
  const [isOpen, setIsOpen] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          onAddImage(file)
        }
      })
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-zinc-700 rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 cursor-pointer">
            <div className="flex items-center gap-2">
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span className="font-medium text-sm">Stage {index + 1}</span>
              {stage.fields.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {stage.fields.length} fields
                </Badge>
              )}
              {stage.referenceImages.length > 0 && (
                <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/30">
                  <ImageIcon className="w-3 h-3 mr-1" />
                  {stage.referenceImages.length} images
                </Badge>
              )}
            </div>
            {canRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove()
                }}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-3 space-y-3 border-t border-zinc-700">
            {/* Template */}
            <div className="space-y-2">
              <Label className="text-xs">Prompt Template</Label>
              <Textarea
                value={stage.template}
                onChange={(e) => onTemplateChange(e.target.value)}
                placeholder={`<<SHOT_TYPE:select(CU,MS,WS)!>> of <<SUBJECT:text!>>...`}
                className="min-h-[120px] font-mono text-sm bg-zinc-800 border-zinc-700"
              />
            </div>

            {/* Parsed Fields Preview */}
            {stage.fields.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Detected Fields</Label>
                <div className="flex gap-1 flex-wrap">
                  {stage.fields.map((field) => (
                    <Badge
                      key={field.id}
                      variant="outline"
                      className={cn(
                        'text-xs',
                        field.required
                          ? 'border-amber-500 text-amber-400'
                          : 'border-zinc-600'
                      )}
                    >
                      {field.label} ({field.type})
                      {field.required && '!'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Reference Images */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Fixed Reference Images <span className="text-blue-400">(auto-attached when recipe is used)</span>
              </Label>

              <div className="flex gap-2 flex-wrap">
                {stage.referenceImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-16 h-16 object-cover rounded border border-zinc-600"
                    />
                    <button
                      onClick={() => onRemoveImage(img.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[10px] text-white px-1 truncate">
                      {img.name}
                    </div>
                  </div>
                ))}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 flex flex-col items-center justify-center gap-1 border-dashed border-zinc-600"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-[10px]">Add</span>
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
