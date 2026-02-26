'use client'

import { useState, useRef } from 'react'
import { useRecipes } from '../../hooks/useRecipes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Trash2,
  Star,
  StarOff,
  Edit3,
  Play,
  Image as ImageIcon,
  Layers,
  Settings,
  Copy,
  Lock,
  Download,
  Upload,
  MoreVertical,
} from 'lucide-react'
import { cn } from '@/utils/utils'
import { useToast } from '@/hooks/use-toast'
import {
  Recipe,
  RecipeStage,
  RecipeReferenceImage,
  RecipeStageType,
  RecipeToolId,
  parseStageTemplate,
  getAllFields,
} from '../../types/recipe.types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useRecipeImportExport } from '../../hooks/useRecipeImportExport'
import { RecipeForm } from './RecipeForm'

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
    isLoading: _isLoading,
  } = useRecipes()

  const { exportRecipes, importRecipes } = useRecipeImportExport()
  const importInputRef = useRef<HTMLInputElement>(null)

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
  const [formSuggestedModel, setFormSuggestedModel] = useState('')
  const [formStages, setFormStages] = useState<RecipeStage[]>([
    { id: 'stage_0', order: 0, type: 'generation', template: '', fields: [], referenceImages: [] }
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
    setFormSuggestedModel('')
    setFormStages([{ id: 'stage_0', order: 0, type: 'generation', template: '', fields: [], referenceImages: [] }])
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
    setFormSuggestedModel(recipe.suggestedModel || '')
    setFormStages(recipe.stages.map(s => ({ ...s, type: s.type || 'generation' })))
    setIsEditOpen(true)
  }

  // Handle create
  const handleCreate = async () => {
    // For tool stages, template can be empty, so check both generation and tool stages
    const hasValidStage = formStages.some(s =>
      s.type === 'tool' ? !!s.toolId : s.template.trim()
    )
    if (!formName.trim() || !hasValidStage) return

    // Parse fields for each stage
    const stagesWithFields = formStages.map((stage, idx) => ({
      ...stage,
      id: `stage_${idx}_${Date.now()}`,
      order: idx,
      type: stage.type || 'generation',
      fields: stage.type === 'tool' ? [] : parseStageTemplate(stage.template, idx),
    }))

    const totalImages = stagesWithFields.reduce((acc, s) => acc + s.referenceImages.length, 0)

    // Await and check result
    const newRecipe = await addRecipe({
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      recipeNote: formRecipeNote.trim() || undefined,
      stages: stagesWithFields,
      suggestedAspectRatio: formAspectRatio.trim() || undefined,
      suggestedModel: formSuggestedModel.trim() || undefined,
      categoryId: formCategory || undefined,
      quickAccessLabel: formIsQuickAccess ? formQuickLabel.trim() : undefined,
      isQuickAccess: formIsQuickAccess && !!formQuickLabel.trim(),
    })

    if (newRecipe) {
      toast({
        title: 'Recipe Created',
        description: `"${formName.trim()}" saved with ${stagesWithFields.length} stage(s)${totalImages > 0 ? ` and ${totalImages} image(s)` : ''}.`,
      })
      setIsCreateOpen(false)
      resetForm()
    } else {
      toast({
        title: 'Failed to Create Recipe',
        description: 'Please try again. Check console for details.',
        variant: 'destructive',
      })
    }
  }

  // Handle update
  const handleUpdate = () => {
    // For tool stages, template can be empty, so check both generation and tool stages
    const hasValidStage = formStages.some(s =>
      s.type === 'tool' ? !!s.toolId : s.template.trim()
    )
    if (!editingRecipe || !formName.trim() || !hasValidStage) return

    // Parse fields for each stage
    const stagesWithFields = formStages.map((stage, idx) => ({
      ...stage,
      order: idx,
      type: stage.type || 'generation',
      fields: stage.type === 'tool' ? [] : parseStageTemplate(stage.template, idx),
    }))

    const totalImages = stagesWithFields.reduce((acc, s) => acc + s.referenceImages.length, 0)

    updateRecipe(editingRecipe.id, {
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      recipeNote: formRecipeNote.trim() || undefined,
      stages: stagesWithFields,
      suggestedAspectRatio: formAspectRatio.trim() || undefined,
      suggestedModel: formSuggestedModel.trim() || undefined,
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

  // Handle import file selection
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      importRecipes(file)
    }
    // Reset input for re-selection
    if (importInputRef.current) {
      importInputRef.current.value = ''
    }
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

  const moveStageUp = (index: number) => {
    if (index <= 0) return
    const newStages = [...formStages]
    const temp = newStages[index]
    newStages[index] = newStages[index - 1]
    newStages[index - 1] = temp
    // Update order fields
    setFormStages(newStages.map((s, i) => ({ ...s, order: i })))
  }

  const moveStageDown = (index: number) => {
    if (index >= formStages.length - 1) return
    const newStages = [...formStages]
    const temp = newStages[index]
    newStages[index] = newStages[index + 1]
    newStages[index + 1] = temp
    // Update order fields
    setFormStages(newStages.map((s, i) => ({ ...s, order: i })))
  }

  const updateStageTemplate = (index: number, template: string) => {
    setFormStages(formStages.map((s, i) =>
      i === index ? { ...s, template, fields: parseStageTemplate(template, i) } : s
    ))
  }

  const updateStageType = (index: number, type: RecipeStageType) => {
    setFormStages(formStages.map((s, i) =>
      i === index ? {
        ...s,
        type,
        // Clear toolId if switching to generation, set default if switching to tool
        toolId: type === 'tool' ? 'remove-background' : undefined,
        // Clear template and fields if switching to tool
        template: type === 'tool' ? '' : s.template,
        fields: type === 'tool' ? [] : s.fields,
      } : s
    ))
  }

  const updateStageToolId = (index: number, toolId: RecipeToolId) => {
    setFormStages(formStages.map((s, i) =>
      i === index ? { ...s, toolId } : s
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
        <div className="flex items-center gap-2">
          {/* Desktop: Export/Import buttons visible */}
          <Button
            size="sm"
            onClick={() => exportRecipes()}
            variant="outline"
            className="hidden sm:inline-flex border-border hover:bg-card"
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button
            size="sm"
            onClick={() => importInputRef.current?.click()}
            variant="outline"
            className="hidden sm:inline-flex border-border hover:bg-card"
          >
            <Upload className="w-4 h-4 mr-1" />
            Import
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportFile}
          />

          {/* Mobile: Export/Import in dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="sm:hidden border-border hover:bg-card"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportRecipes()}>
                <Download className="w-4 h-4 mr-2" />
                Export Recipes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => importInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Import Recipes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            onClick={openCreate}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Recipe
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-1.5 sm:gap-2 mb-4 flex-wrap items-center">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className="h-7 text-xs px-2 sm:px-3"
        >
          All
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
            className="h-7 text-xs px-2 sm:px-3"
          >
            <span>{cat.icon}</span>
            <span className="hidden xs:inline sm:inline ml-1">{cat.name}</span>
          </Button>
        ))}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCategoryManageOpen(true)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-white shrink-0"
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
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <h4 className="font-medium text-white text-sm truncate max-w-[150px] sm:max-w-none">
                          {recipe.name}
                        </h4>
                        {recipe.isSystem && (
                          <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-400 shrink-0">
                            <Lock className="w-3 h-3 sm:mr-1" />
                            <span className="hidden sm:inline">System</span>
                          </Badge>
                        )}
                        {isInQuickAccess(recipe.id) && (
                          <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-400 shrink-0">
                            <Star className="w-3 h-3 fill-current sm:hidden" />
                            <span className="hidden sm:inline">Quick</span>
                          </Badge>
                        )}
                        {recipe.stages.length > 1 && (
                          <Badge variant="outline" className="text-xs shrink-0 hidden sm:inline-flex">
                            <Layers className="w-3 h-3 mr-1" />
                            {recipe.stages.length} stages
                          </Badge>
                        )}
                        {totalRefImages > 0 && (
                          <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/30 shrink-0 hidden sm:inline-flex">
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
                        {allFields.slice(0, 3).map((field) => (
                          <Badge
                            key={field.id}
                            variant="outline"
                            className={cn(
                              'text-xs truncate max-w-[80px] sm:max-w-none',
                              field.required
                                ? 'border-amber-500/50 text-amber-400'
                                : 'border-border text-muted-foreground'
                            )}
                          >
                            {field.label}
                            {field.required && '!'}
                          </Badge>
                        ))}
                        {/* Show 4th field only on sm+ screens */}
                        {allFields.length > 3 && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs hidden sm:inline-flex',
                              allFields[3]?.required
                                ? 'border-amber-500/50 text-amber-400'
                                : 'border-border text-muted-foreground'
                            )}
                          >
                            {allFields[3]?.label}
                            {allFields[3]?.required && '!'}
                          </Badge>
                        )}
                        {allFields.length > 4 && (
                          <Badge variant="outline" className="text-xs text-muted-foreground hidden sm:inline-flex">
                            +{allFields.length - 4} more
                          </Badge>
                        )}
                        {allFields.length > 3 && (
                          <Badge variant="outline" className="text-xs text-muted-foreground sm:hidden">
                            +{allFields.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Desktop: Show all buttons */}
                      <div className="hidden sm:flex items-center gap-1">
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

                      {/* Mobile: Use button always visible, others in dropdown */}
                      <div className="flex sm:hidden items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUseRecipe(recipe)}
                          className="h-7 w-7 p-0 text-green-400 hover:text-green-300"
                        >
                          <Play className="w-4 h-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleQuickAccess(recipe)}>
                              {isInQuickAccess(recipe.id) ? (
                                <>
                                  <Star className="w-4 h-4 mr-2 fill-amber-400 text-amber-400" />
                                  Remove from Quick
                                </>
                              ) : (
                                <>
                                  <StarOff className="w-4 h-4 mr-2" />
                                  Add to Quick
                                </>
                              )}
                            </DropdownMenuItem>
                            {recipe.isSystem ? (
                              <DropdownMenuItem onClick={() => handleDuplicate(recipe)}>
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate to My Recipes
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => openEdit(recipe)}>
                                  <Edit3 className="w-4 h-4 mr-2" />
                                  Edit Recipe
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(recipe)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Recipe
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
            <DialogTitle>Create Recipe</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2">
            <RecipeForm
              name={formName}
              description={formDescription}
              recipeNote={formRecipeNote}
              category={formCategory}
              quickLabel={formQuickLabel}
              isQuickAccess={formIsQuickAccess}
              aspectRatio={formAspectRatio}
              suggestedModel={formSuggestedModel}
              stages={formStages}
              categories={categories}
              onNameChange={setFormName}
              onDescriptionChange={setFormDescription}
              onRecipeNoteChange={setFormRecipeNote}
              onCategoryChange={setFormCategory}
              onQuickLabelChange={setFormQuickLabel}
              onIsQuickAccessChange={setFormIsQuickAccess}
              onAspectRatioChange={setFormAspectRatio}
              onSuggestedModelChange={setFormSuggestedModel}
              onAddStage={addStage}
              onRemoveStage={removeStage}
              onMoveStageUp={moveStageUp}
              onMoveStageDown={moveStageDown}
              onUpdateStageTemplate={updateStageTemplate}
              onUpdateStageType={updateStageType}
              onUpdateStageToolId={updateStageToolId}
              onAddReferenceImage={addReferenceImage}
              onRemoveReferenceImage={removeReferenceImage}
            />
          </div>

          <DialogFooter className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 shrink-0 border-t border-border">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formName.trim() || !formStages.some(s => s.type === 'tool' ? !!s.toolId : s.template.trim())}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Create Recipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
            <DialogTitle>Edit Recipe</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2">
            <RecipeForm
              name={formName}
              description={formDescription}
              recipeNote={formRecipeNote}
              category={formCategory}
              quickLabel={formQuickLabel}
              isQuickAccess={formIsQuickAccess}
              aspectRatio={formAspectRatio}
              suggestedModel={formSuggestedModel}
              stages={formStages}
              categories={categories}
              onNameChange={setFormName}
              onDescriptionChange={setFormDescription}
              onRecipeNoteChange={setFormRecipeNote}
              onCategoryChange={setFormCategory}
              onQuickLabelChange={setFormQuickLabel}
              onIsQuickAccessChange={setFormIsQuickAccess}
              onAspectRatioChange={setFormAspectRatio}
              onSuggestedModelChange={setFormSuggestedModel}
              onAddStage={addStage}
              onRemoveStage={removeStage}
              onMoveStageUp={moveStageUp}
              onMoveStageDown={moveStageDown}
              onUpdateStageTemplate={updateStageTemplate}
              onUpdateStageType={updateStageType}
              onUpdateStageToolId={updateStageToolId}
              onAddReferenceImage={addReferenceImage}
              onRemoveReferenceImage={removeReferenceImage}
            />
          </div>

          <DialogFooter className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 shrink-0 border-t border-border">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formName.trim() || !formStages.some(s => s.type === 'tool' ? !!s.toolId : s.template.trim())}
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
