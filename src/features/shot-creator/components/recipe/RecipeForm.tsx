'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  HelpCircle,
} from 'lucide-react'
import {
  RecipeStage,
  RecipeStageType,
  RecipeToolId,
} from '../../types/recipe.types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { StageSection } from './StageSection'

export interface RecipeFormProps {
  name: string
  description: string
  recipeNote: string
  category: string
  quickLabel: string
  isQuickAccess: boolean
  aspectRatio: string
  suggestedModel: string
  stages: RecipeStage[]
  categories: { id: string; name: string; icon: string }[]
  onNameChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onRecipeNoteChange: (v: string) => void
  onCategoryChange: (v: string) => void
  onQuickLabelChange: (v: string) => void
  onIsQuickAccessChange: (v: boolean) => void
  onAspectRatioChange: (v: string) => void
  onSuggestedModelChange: (v: string) => void
  onAddStage: () => void
  onRemoveStage: (index: number) => void
  onMoveStageUp: (index: number) => void
  onMoveStageDown: (index: number) => void
  onUpdateStageTemplate: (index: number, template: string) => void
  onUpdateStageType: (index: number, type: RecipeStageType) => void
  onUpdateStageToolId: (index: number, toolId: RecipeToolId) => void
  onAddReferenceImage: (stageIndex: number, file: File) => void
  onRemoveReferenceImage: (stageIndex: number, imageId: string) => void
}

export function RecipeForm({
  name,
  description,
  recipeNote,
  category,
  quickLabel,
  isQuickAccess,
  aspectRatio,
  suggestedModel,
  stages,
  categories,
  onNameChange,
  onDescriptionChange,
  onRecipeNoteChange,
  onCategoryChange,
  onQuickLabelChange,
  onIsQuickAccessChange,
  onAspectRatioChange,
  onSuggestedModelChange,
  onAddStage,
  onRemoveStage,
  onMoveStageUp,
  onMoveStageDown,
  onUpdateStageTemplate,
  onUpdateStageType,
  onUpdateStageToolId,
  onAddReferenceImage,
  onRemoveReferenceImage,
}: RecipeFormProps) {
  return (
    <div className="space-y-4">
      {/* Name & Category Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

      {/* Aspect Ratio & Suggested Model Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2">
          <Label>Suggested Aspect Ratio (optional)</Label>
          <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
            <SelectTrigger>
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
        <div className="space-y-2">
          <Label>Suggested Model (optional)</Label>
          <Select value={suggestedModel} onValueChange={onSuggestedModelChange}>
            <SelectTrigger>
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nano-banana">Nano Banana (fast)</SelectItem>
              <SelectItem value="nano-banana-pro">Nano Banana Pro (quality)</SelectItem>
              <SelectItem value="ideogram-v2">Ideogram v2 (text)</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
            totalStages={stages.length}
            canRemove={stages.length > 1}
            onTemplateChange={(template) => onUpdateStageTemplate(index, template)}
            onTypeChange={(type) => onUpdateStageType(index, type)}
            onToolIdChange={(toolId) => onUpdateStageToolId(index, toolId)}
            onRemove={() => onRemoveStage(index)}
            onMoveUp={() => onMoveStageUp(index)}
            onMoveDown={() => onMoveStageDown(index)}
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
