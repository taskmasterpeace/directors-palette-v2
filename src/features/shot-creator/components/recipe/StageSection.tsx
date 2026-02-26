'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/utils/utils'
import {
  RecipeStage,
  RecipeStageType,
  RecipeToolId,
  RECIPE_TOOLS,
} from '../../types/recipe.types'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

export interface StageSectionProps {
  stage: RecipeStage
  index: number
  totalStages: number
  canRemove: boolean
  onTemplateChange: (template: string) => void
  onTypeChange: (type: RecipeStageType) => void
  onToolIdChange: (toolId: RecipeToolId) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onAddImage: (file: File) => void
  onRemoveImage: (imageId: string) => void
}

export function StageSection({
  stage,
  index,
  totalStages,
  canRemove,
  onTemplateChange,
  onTypeChange,
  onToolIdChange,
  onRemove,
  onMoveUp,
  onMoveDown,
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
            <div className="flex items-center gap-1">
              {/* Move Up/Down buttons - only show when there are multiple stages */}
              {totalStages > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onMoveUp()
                    }}
                    disabled={index === 0}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-primary disabled:opacity-30"
                    title="Move stage up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onMoveDown()
                    }}
                    disabled={index === totalStages - 1}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-primary disabled:opacity-30"
                    title="Move stage down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </>
              )}
              {/* Delete button */}
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
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-3 space-y-3 border-t border-border">
            {/* Stage Type Selector */}
            <div className="space-y-2">
              <Label className="text-xs">Stage Type</Label>
              <Select
                value={stage.type || 'generation'}
                onValueChange={(value) => onTypeChange(value as RecipeStageType)}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generation">🎨 Image Generation</SelectItem>
                  <SelectItem value="tool">🔧 Tool</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tool Selection (only for tool stages) */}
            {stage.type === 'tool' && (
              <div className="space-y-2">
                <Label className="text-xs">Select Tool</Label>
                <Select
                  value={stage.toolId || 'remove-background'}
                  onValueChange={(value) => onToolIdChange(value as RecipeToolId)}
                >
                  <SelectTrigger className="w-full sm:w-[350px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(RECIPE_TOOLS).map(tool => (
                      <SelectItem key={tool.id} value={tool.id}>
                        <span className="flex items-center gap-2">
                          <span>{tool.icon} {tool.name}</span>
                          <span className="text-zinc-500">({tool.cost} pts)</span>
                          {tool.outputType === 'multi' && 'outputCount' in tool && (
                            <span className="text-xs text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                              {tool.outputCount}x output
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {stage.toolId && RECIPE_TOOLS[stage.toolId] && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {RECIPE_TOOLS[stage.toolId].description}
                    </p>
                    {RECIPE_TOOLS[stage.toolId].outputType === 'multi' && 'outputCount' in RECIPE_TOOLS[stage.toolId] && (
                      <p className="text-xs text-amber-400">
                        This tool produces {(RECIPE_TOOLS[stage.toolId] as { outputCount: number }).outputCount} separate images as output
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Template (only for generation stages) */}
            {stage.type !== 'tool' && (
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
