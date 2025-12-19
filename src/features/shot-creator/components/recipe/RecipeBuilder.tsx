'use client'

import { useState, useRef } from 'react'
import { useRecipeStore } from '../../store/recipe.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus,
  Trash2,
  Star,
  StarOff,
  Edit3,
  Play,
  HelpCircle,
  Image as ImageIcon,
  X,
  ChevronDown,
  ChevronUp,
  Layers,
  Settings,
  Copy,
  Lock,
} from 'lucide-react'
import { cn } from '@/utils/utils'
import { useToast } from '@/hooks/use-toast'
import {
  Recipe,
  RecipeStage,
  RecipeReferenceImage,
  parseStageTemplate,
  getAllFields,
} from '../../types/recipe.types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface RecipeBuilderProps {
  onSelectRecipe: (recipeId: string) => void
  className?: string
}

export function RecipeBuilder({ onSelectRecipe, className }: RecipeBuilderProps) {
  const { toast } = useToast()
  const {
    recipes,
    categories,
    quickAccessItems,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    duplicateRecipe,
    addToQuickAccess,
    removeFromQuickAccess,
    setActiveRecipe,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useRecipeStore()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isCategoryManageOpen, setIsCategoryManageOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('')

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formRecipeNote, setFormRecipeNote] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formQuickLabel, setFormQuickLabel] = useState('')
  const [formIsQuickAccess, setFormIsQuickAccess] = useState(false)
  const [formAspectRatio, setFormAspectRatio] = useState('')
  const [formStages, setFormStages] = useState<RecipeStage[]>([
    { id: 'stage_0', order: 0, template: '', fields: [], referenceImages: [] }
  ])

  // Reset form
  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormRecipeNote('')
    setFormCategory('')
    setFormQuickLabel('')
    setFormIsQuickAccess(false)
    setFormAspectRatio('')
    setFormStages([{ id: 'stage_0', order: 0, template: '', fields: [], referenceImages: [] }])
  }

  // Open create dialog
  const openCreate = () => {
    resetForm()
    setIsCreateOpen(true)
  }

  // Open edit dialog
  const openEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setFormName(recipe.name)
    setFormDescription(recipe.description || '')
    setFormRecipeNote(recipe.recipeNote || '')
    setFormCategory(recipe.categoryId || '')
    setFormQuickLabel(recipe.quickAccessLabel || '')
    setFormIsQuickAccess(recipe.isQuickAccess)
    setFormAspectRatio(recipe.suggestedAspectRatio || '')
    setFormStages(recipe.stages.map(s => ({ ...s })))
    setIsEditOpen(true)
  }

  // Handle create
  const handleCreate = () => {
    if (!formName.trim() || formStages.every(s => !s.template.trim())) return

    // Parse fields for each stage
    const stagesWithFields = formStages.map((stage, idx) => ({
      ...stage,
      id: `stage_${idx}_${Date.now()}`,
      order: idx,
      fields: parseStageTemplate(stage.template, idx),
    }))

    const totalImages = stagesWithFields.reduce((acc, s) => acc + s.referenceImages.length, 0)

    addRecipe({
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      recipeNote: formRecipeNote.trim() || undefined,
      stages: stagesWithFields,
      suggestedAspectRatio: formAspectRatio.trim() || undefined,
      categoryId: formCategory || undefined,
      quickAccessLabel: formIsQuickAccess ? formQuickLabel.trim() : undefined,
      isQuickAccess: formIsQuickAccess && !!formQuickLabel.trim(),
    })

    toast({
      title: 'Recipe Created',
      description: `"${formName.trim()}" saved with ${stagesWithFields.length} stage(s)${totalImages > 0 ? ` and ${totalImages} image(s)` : ''}.`,
    })

    setIsCreateOpen(false)
    resetForm()
  }

  // Handle update
  const handleUpdate = () => {
    if (!editingRecipe || !formName.trim() || formStages.every(s => !s.template.trim())) return

    // Parse fields for each stage
    const stagesWithFields = formStages.map((stage, idx) => ({
      ...stage,
      order: idx,
      fields: parseStageTemplate(stage.template, idx),
    }))

    const totalImages = stagesWithFields.reduce((acc, s) => acc + s.referenceImages.length, 0)

    updateRecipe(editingRecipe.id, {
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      recipeNote: formRecipeNote.trim() || undefined,
      stages: stagesWithFields,
      suggestedAspectRatio: formAspectRatio.trim() || undefined,
      categoryId: formCategory || undefined,
      quickAccessLabel: formIsQuickAccess ? formQuickLabel.trim() : undefined,
      isQuickAccess: formIsQuickAccess && !!formQuickLabel.trim(),
    })

    toast({
      title: 'Recipe Updated',
      description: `"${formName.trim()}" saved with ${stagesWithFields.length} stage(s)${totalImages > 0 ? ` and ${totalImages} image(s)` : ''}.`,
    })

    setIsEditOpen(false)
    setEditingRecipe(null)
    resetForm()
  }

  // Handle delete
  const handleDelete = (recipe: Recipe) => {
    if (confirm(`Delete recipe "${recipe.name}"?`)) {
      deleteRecipe(recipe.id)
    }
  }

  // Handle duplicate (for system recipes - creates editable copy)
  const handleDuplicate = async (recipe: Recipe) => {
    const newRecipe = await duplicateRecipe(recipe.id)
    if (newRecipe) {
      toast({
        title: 'Recipe Duplicated',
        description: `"${newRecipe.name}" created. You can now edit it.`,
      })
      // Open the edit dialog for the new recipe
      openEdit(newRecipe)
    } else {
      toast({
        title: 'Duplicate Failed',
        description: 'Could not duplicate recipe. Please try again.',
        variant: 'destructive',
      })
    }
  }

  // Toggle quick access
  const toggleQuickAccess = async (recipe: Recipe) => {
    const existing = quickAccessItems.find((item) => item.recipeId === recipe.id)
    if (existing) {
      await removeFromQuickAccess(existing.id)
      await updateRecipe(recipe.id, { isQuickAccess: false, quickAccessLabel: undefined })
    } else {
      const label = prompt('Enter a 1-word label for quick access:', recipe.name.split(' ')[0])
      if (label && label.trim()) {
        const added = await addToQuickAccess(recipe.id, label.trim().slice(0, 12))
        if (added) {
          await updateRecipe(recipe.id, { isQuickAccess: true, quickAccessLabel: label.trim() })
        }
      }
    }
  }

  // Use recipe (activate it)
  const handleUseRecipe = (recipe: Recipe) => {
    setActiveRecipe(recipe.id)
    onSelectRecipe(recipe.id)
  }

  // Filter recipes by category
  const filteredRecipes = selectedCategory
    ? recipes.filter((r) => r.categoryId === selectedCategory)
    : recipes

  // Check if recipe is in quick access
  const isInQuickAccess = (recipeId: string) => {
    return quickAccessItems.some((item) => item.recipeId === recipeId)
  }

  // Stage management in form
  const addStage = () => {
    const newIndex = formStages.length
    setFormStages([...formStages, {
      id: `stage_${newIndex}_${Date.now()}`,
      order: newIndex,
      template: '',
      fields: [],
      referenceImages: [],
    }])
  }

  const removeStage = (index: number) => {
    if (formStages.length <= 1) return
    setFormStages(formStages.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })))
  }

  const updateStageTemplate = (index: number, template: string) => {
    setFormStages(formStages.map((s, i) =>
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
      setFormStages(formStages.map((s, i) =>
        i === stageIndex ? { ...s, referenceImages: [...s.referenceImages, newImage] } : s
      ))
    }
    reader.readAsDataURL(file)
  }

  const removeReferenceImage = (stageIndex: number, imageId: string) => {
    setFormStages(formStages.map((s, i) =>
      i === stageIndex ? { ...s, referenceImages: s.referenceImages.filter(img => img.id !== imageId) } : s
    ))
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {recipes.length} recipes
          </Badge>
        </div>
        <Button
          size="sm"
          onClick={openCreate}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Recipe
        </Button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className="h-7 text-xs"
        >
          All
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
            className="h-7 text-xs"
          >
            {cat.icon} {cat.name}
          </Button>
        ))}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCategoryManageOpen(true)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Manage Categories</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Recipe List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {filteredRecipes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recipes yet</p>
              <p className="text-xs mt-1">Create your first recipe to get started</p>
            </div>
          ) : (
            filteredRecipes.map((recipe) => {
              const allFields = getAllFields(recipe.stages)
              const totalRefImages = recipe.stages.reduce((acc, s) => acc + s.referenceImages.length, 0)

              return (
                <div
                  key={recipe.id}
                  className="bg-card border border-border rounded-lg p-3 hover:border-amber-500/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-white text-sm truncate">
                          {recipe.name}
                        </h4>
                        {recipe.isSystem && (
                          <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-400">
                            <Lock className="w-3 h-3 mr-1" />
                            System
                          </Badge>
                        )}
                        {isInQuickAccess(recipe.id) && (
                          <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-400">
                            Quick
                          </Badge>
                        )}
                        {recipe.stages.length > 1 && (
                          <Badge variant="outline" className="text-xs">
                            <Layers className="w-3 h-3 mr-1" />
                            {recipe.stages.length} stages
                          </Badge>
                        )}
                        {totalRefImages > 0 && (
                          <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/30">
                            <ImageIcon className="w-3 h-3 mr-1" />
                            {totalRefImages}
                          </Badge>
                        )}
                      </div>
                      {recipe.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {recipe.description}
                        </p>
                      )}
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {allFields.slice(0, 4).map((field) => (
                          <Badge
                            key={field.id}
                            variant="outline"
                            className={cn(
                              'text-xs',
                              field.required
                                ? 'border-amber-500/50 text-amber-400'
                                : 'border-border text-muted-foreground'
                            )}
                          >
                            {field.label}
                            {field.required && '!'}
                          </Badge>
                        ))}
                        {allFields.length > 4 && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            +{allFields.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUseRecipe(recipe)}
                              className="h-7 w-7 p-0 text-green-400 hover:text-green-300"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Use Recipe</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleQuickAccess(recipe)}
                              className={cn(
                                'h-7 w-7 p-0',
                                isInQuickAccess(recipe.id)
                                  ? 'text-amber-400 hover:text-amber-300'
                                  : 'text-muted-foreground hover:text-white'
                              )}
                            >
                              {isInQuickAccess(recipe.id) ? (
                                <Star className="w-4 h-4 fill-current" />
                              ) : (
                                <StarOff className="w-4 h-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isInQuickAccess(recipe.id) ? 'Remove from Quick' : 'Add to Quick'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {recipe.isSystem ? (
                        // System recipes: Show duplicate button instead of edit/delete
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDuplicate(recipe)}
                                className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicate to My Recipes</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        // User recipes: Show edit and delete buttons
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(recipe)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(recipe)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Recipe</DialogTitle>
          </DialogHeader>

          <RecipeForm
            name={formName}
            description={formDescription}
            recipeNote={formRecipeNote}
            category={formCategory}
            quickLabel={formQuickLabel}
            isQuickAccess={formIsQuickAccess}
            aspectRatio={formAspectRatio}
            stages={formStages}
            categories={categories}
            onNameChange={setFormName}
            onDescriptionChange={setFormDescription}
            onRecipeNoteChange={setFormRecipeNote}
            onCategoryChange={setFormCategory}
            onQuickLabelChange={setFormQuickLabel}
            onIsQuickAccessChange={setFormIsQuickAccess}
            onAspectRatioChange={setFormAspectRatio}
            onAddStage={addStage}
            onRemoveStage={removeStage}
            onUpdateStageTemplate={updateStageTemplate}
            onAddReferenceImage={addReferenceImage}
            onRemoveReferenceImage={removeReferenceImage}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formName.trim() || formStages.every(s => !s.template.trim())}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Create Recipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Recipe</DialogTitle>
          </DialogHeader>

          <RecipeForm
            name={formName}
            description={formDescription}
            recipeNote={formRecipeNote}
            category={formCategory}
            quickLabel={formQuickLabel}
            isQuickAccess={formIsQuickAccess}
            aspectRatio={formAspectRatio}
            stages={formStages}
            categories={categories}
            onNameChange={setFormName}
            onDescriptionChange={setFormDescription}
            onRecipeNoteChange={setFormRecipeNote}
            onCategoryChange={setFormCategory}
            onQuickLabelChange={setFormQuickLabel}
            onIsQuickAccessChange={setFormIsQuickAccess}
            onAspectRatioChange={setFormAspectRatio}
            onAddStage={addStage}
            onRemoveStage={removeStage}
            onUpdateStageTemplate={updateStageTemplate}
            onAddReferenceImage={addReferenceImage}
            onRemoveReferenceImage={removeReferenceImage}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formName.trim() || formStages.every(s => !s.template.trim())}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Management Dialog */}
      <Dialog open={isCategoryManageOpen} onOpenChange={setIsCategoryManageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add New Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Add New Category</Label>
              <div className="flex gap-2">
                <Input
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value.slice(0, 2))}
                  placeholder="Icon"
                  className="w-16"
                  maxLength={2}
                />
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name..."
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (newCategoryName.trim() && newCategoryIcon.trim()) {
                      addCategory(newCategoryName.trim(), newCategoryIcon.trim())
                      setNewCategoryName('')
                      setNewCategoryIcon('')
                    }
                  }}
                  disabled={!newCategoryName.trim() || !newCategoryIcon.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Use an emoji as icon (e.g., 🎭)</p>
            </div>

            {/* Existing Categories */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Existing Categories</Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 p-2 rounded border border-border bg-card/50"
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span className="flex-1 text-sm">{cat.name}</span>
                    {cat.isDefault ? (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Default
                      </Badge>
                    ) : (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newName = prompt('Enter new name:', cat.name)
                                  if (newName && newName.trim()) {
                                    updateCategory(cat.id, { name: newName.trim() })
                                  }
                                }}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-white"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Rename</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Delete category "${cat.name}"? Recipes will be moved to Custom.`)) {
                                    deleteCategory(cat.id)
                                  }
                                }}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryManageOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Recipe Form Component (shared between create and edit)
interface RecipeFormProps {
  name: string
  description: string
  recipeNote: string
  category: string
  quickLabel: string
  isQuickAccess: boolean
  aspectRatio: string
  stages: RecipeStage[]
  categories: { id: string; name: string; icon: string }[]
  onNameChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onRecipeNoteChange: (v: string) => void
  onCategoryChange: (v: string) => void
  onQuickLabelChange: (v: string) => void
  onIsQuickAccessChange: (v: boolean) => void
  onAspectRatioChange: (v: string) => void
  onAddStage: () => void
  onRemoveStage: (index: number) => void
  onUpdateStageTemplate: (index: number, template: string) => void
  onAddReferenceImage: (stageIndex: number, file: File) => void
  onRemoveReferenceImage: (stageIndex: number, imageId: string) => void
}

function RecipeForm({
  name,
  description,
  recipeNote,
  category,
  quickLabel,
  isQuickAccess,
  aspectRatio,
  stages,
  categories,
  onNameChange,
  onDescriptionChange,
  onRecipeNoteChange,
  onCategoryChange,
  onQuickLabelChange,
  onIsQuickAccessChange,
  onAspectRatioChange,
  onAddStage,
  onRemoveStage,
  onUpdateStageTemplate,
  onAddReferenceImage,
  onRemoveReferenceImage,
}: RecipeFormProps) {
  return (
    <div className="space-y-4">
      {/* Name & Category Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Recipe Name</Label>
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g., Cinematic Portrait"
          />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Input
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Brief description of this recipe..."
        />
      </div>

      {/* Recipe Note */}
      <div className="space-y-2">
        <Label>
          Recipe Note <span className="text-muted-foreground text-xs">(shown when recipe is activated)</span>
        </Label>
        <Input
          value={recipeNote}
          onChange={(e) => onRecipeNoteChange(e.target.value)}
          placeholder="e.g., Please provide an image with a character"
        />
      </div>

      {/* Aspect Ratio */}
      <div className="space-y-2">
        <Label>Suggested Aspect Ratio (optional)</Label>
        <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
          <SelectTrigger className="w-[200px]">
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

      {/* Stages */}
      <div className="space-y-4 pt-4 border-t border-border">
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
            onClick={onAddStage}
            className="h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Stage
          </Button>
        </div>

        {stages.map((stage, index) => (
          <StageSection
            key={stage.id}
            stage={stage}
            index={index}
            canRemove={stages.length > 1}
            onTemplateChange={(template) => onUpdateStageTemplate(index, template)}
            onRemove={() => onRemoveStage(index)}
            onAddImage={(file) => onAddReferenceImage(index, file)}
            onRemoveImage={(imageId) => onRemoveReferenceImage(index, imageId)}
          />
        ))}
      </div>

      {/* Quick Access */}
      <div className="space-y-2 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="quickAccess"
            checked={isQuickAccess}
            onChange={(e) => onIsQuickAccessChange(e.target.checked)}
            className="rounded border-border"
          />
          <Label htmlFor="quickAccess" className="cursor-pointer">
            Add to Quick Access bar
          </Label>
        </div>
        {isQuickAccess && (
          <div className="pl-6">
            <Label className="text-xs text-muted-foreground">
              Quick Access Label (1 word, max 12 chars)
            </Label>
            <Input
              value={quickLabel}
              onChange={(e) => onQuickLabelChange(e.target.value.slice(0, 12))}
              placeholder="e.g., Portrait"
              className="max-w-[200px] mt-1"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Individual Stage Section
interface StageSectionProps {
  stage: RecipeStage
  index: number
  canRemove: boolean
  onTemplateChange: (template: string) => void
  onRemove: () => void
  onAddImage: (file: File) => void
  onRemoveImage: (imageId: string) => void
}

function StageSection({
  stage,
  index,
  canRemove,
  onTemplateChange,
  onRemove,
  onAddImage,
  onRemoveImage,
}: StageSectionProps) {
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
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Insert field syntax helper
  const insertField = (fieldType: string, fieldName: string, required: boolean) => {
    let syntax = `<<${fieldName}:${fieldType}`
    if (required) syntax += '!'
    syntax += '>>'
    onTemplateChange(stage.template + ' ' + syntax)
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 bg-card/50 hover:bg-card cursor-pointer">
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
          <div className="p-3 space-y-3 border-t border-border">
            {/* Template */}
            <div className="space-y-2">
              <Label className="text-xs">Prompt Template</Label>
              <Textarea
                value={stage.template}
                onChange={(e) => onTemplateChange(e.target.value)}
                placeholder={`<<SHOT_TYPE:select(CU,MS,WS)!>> of <<SUBJECT:text!>>...`}
                className="min-h-[80px] font-mono text-sm"
              />

              {/* Quick insert buttons */}
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Insert:</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => insertField('name', 'CHARACTER_NAME', true)}
                >
                  Name!
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => insertField('text', 'DESCRIPTION', false)}
                >
                  Text
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => insertField('select(ECU,CU,MS,WS,EWS)', 'SHOT_TYPE', true)}
                >
                  Shot Type!
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => insertField('select(dramatic,soft,natural,rim)', 'LIGHTING', false)}
                >
                  Lighting
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => insertField('select(claymation,anime,watercolor,oil painting)', 'STYLE', true)}
                >
                  Style!
                </Button>
              </div>
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
                          : 'border-border'
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
                      className="w-16 h-16 object-cover rounded border border-border"
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
                  className="w-16 h-16 flex flex-col items-center justify-center gap-1 border-dashed"
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
