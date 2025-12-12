'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sparkles,
  Info,
  Flame
} from 'lucide-react'
import { getAvailableModels, ModelId } from "@/config/index"

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (model: string) => void
  showTooltips?: boolean
  compact?: boolean
  filterType?: 'generation' | 'editing' | 'all'
}

export function ModelSelector({ 
  selectedModel, 
  onModelChange, 
  showTooltips = true,
  compact = false,
  filterType = 'all'
}: ModelSelectorProps) {
  const allModels = getAvailableModels()
  const filteredModels = filterType === 'all' 
    ? allModels 
    : allModels.filter(model => model.type === filterType)

  // Map to legacy format for icon components
  const models = filteredModels.map(model => ({
    ...model,
    iconComponent: getIconComponent(model.id),
    badgeColor: model.badgeColor,
    textColor: model.textColor
  }))

  function getIconComponent(modelId: ModelId) {
    switch (modelId) {
      case 'nano-banana': return Sparkles
      case 'nano-banana-pro': return Flame
      default: return Sparkles
    }
  }

  const currentModel = models.find(m => m.id === selectedModel) || models[0]

  if (compact) {
    return (
      <Select value={selectedModel} onValueChange={onModelChange}>
        <SelectTrigger className="w-full bg-card border-border text-white">
          <SelectValue>
            <div className="flex items-center gap-2">
              <span className="text-lg">{currentModel.icon}</span>
              <span className="font-medium">{currentModel.displayName}</span>
              <Badge className={`${currentModel.badgeColor} text-white text-xs`}>
                {currentModel.badge}
              </Badge>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{model.icon}</span>
                <span className="font-medium">{model.displayName}</span>
                <Badge className={`${model.badgeColor} text-white text-xs`}>
                  {model.badge}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-white">Model Selection</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {models.map((model) => {
          const isSelected = selectedModel === model.id
          const IconComponent = model.iconComponent
          
          return (
            <Button
              key={model.id}
              variant={isSelected ? "default" : "outline"}
              onClick={() => onModelChange(model.id)}
              className={`h-auto p-4 flex flex-col items-center gap-2 transition-all duration-200 ${
                isSelected 
                  ? 'bg-secondary border-border shadow-md ring-2 ring-ring/30' 
                  : 'bg-card/50 border-border hover:bg-secondary hover:border-border'
              }`}
              title={showTooltips ? model.description : undefined}
            >
              {/* Icon */}
              <div className="flex items-center gap-1">
                <span className="text-2xl">{model.icon}</span>
                <IconComponent className={`w-4 h-4 ${model.textColor}`} />
              </div>
              
              {/* Name */}
              <span className="text-sm font-medium text-white">
                {model.displayName}
              </span>
              
              {/* Badge */}
              <Badge className={`${model.badgeColor} text-white text-xs`}>
                {model.badge}
              </Badge>
              
              {/* Description for selected */}
              {isSelected && showTooltips && (
                <p className="text-xs text-foreground text-center mt-1">
                  {model.description}
                </p>
              )}
            </Button>
          )
        })}
      </div>
    </div>
  )
}