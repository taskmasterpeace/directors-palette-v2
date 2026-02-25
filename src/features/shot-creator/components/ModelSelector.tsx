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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
  Sparkles,
  Info,
  Flame,
  Zap,
  Image as ImageIcon,
  Type,
  Clock
} from 'lucide-react'
import { getAvailableModels, ModelId } from "@/config/index"

// Enhanced model capability info
const MODEL_CAPABILITIES: Record<ModelId, {
  speed: string
  textRendering: string
  refImages: string
  bestFor: string[]
}> = {
  'z-image-turbo': {
    speed: '~5s (Fast)',
    textRendering: 'Good',
    refImages: 'Up to 1',
    bestFor: ['Ultra-fast generation', 'Concept exploration', 'Budget work']
  },
  'nano-banana': {
    speed: '~8s (Moderate)',
    textRendering: 'Good',
    refImages: 'Up to 10',
    bestFor: ['Multi-reference work', 'Character consistency', 'General use']
  },
  'nano-banana-pro': {
    speed: '~15s (Moderate)',
    textRendering: 'Excellent',
    refImages: 'Up to 14',
    bestFor: ['Text in images', 'Complex scenes', 'Multi-reference composites']
  },
  'gpt-image-low': {
    speed: '~16s (Slower)',
    textRendering: 'Very Good',
    refImages: 'Up to 10',
    bestFor: ['Budget GPT quality', 'Drafts with refs', 'Quick concepts']
  },
  'gpt-image-medium': {
    speed: '~18s (Slower)',
    textRendering: 'Excellent',
    refImages: 'Up to 10',
    bestFor: ['Accurate text', 'Story prompts', 'Final renders']
  },
  'gpt-image-high': {
    speed: '~25s (Slowest)',
    textRendering: 'Excellent',
    refImages: 'Up to 10',
    bestFor: ['Maximum quality', 'Client work', 'Detailed scenes']
  },
  'seedream-4.5': {
    speed: '~10s (Moderate)',
    textRendering: 'Good',
    refImages: 'Up to 14',
    bestFor: ['4K resolution', 'Sequential images', 'High quality']
  },
  'seedream-5-lite': {
    speed: '~10s (Moderate)',
    textRendering: 'Good',
    refImages: 'Up to 14',
    bestFor: ['Deep thinking', 'Reasoning', 'Editing', 'Cheap']
  },
  'riverflow-2-pro': {
    speed: '~20s (Moderate)',
    textRendering: 'Excellent',
    refImages: 'Up to 10 + 4 detail',
    bestFor: ['Custom fonts', 'Logo cleanup', 'Infographics', 'Product shots']
  }
}

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
          const capabilities = MODEL_CAPABILITIES[model.id as ModelId]

          const buttonContent = (
            <Button
              variant={isSelected ? "default" : "outline"}
              onClick={() => onModelChange(model.id)}
              className={`h-auto p-4 flex flex-col items-center gap-2 transition-all duration-200 w-full ${
                isSelected
                  ? 'bg-secondary border-border shadow-md ring-2 ring-ring/30'
                  : 'bg-card/50 border-border hover:bg-secondary hover:border-border'
              }`}
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

              {/* Cost Badge - show range for tiered pricing */}
              <Badge className={`${model.badgeColor} text-white text-xs`}>
                {model.costByResolution ? (
                  // Show range for tiered pricing (e.g., nano-banana-pro)
                  `${Math.round(Math.min(...Object.values(model.costByResolution)) * 100)}-${Math.round(Math.max(...Object.values(model.costByResolution)) * 100)} pts`
                ) : (
                  `${Math.round(model.costPerImage * 100)} pts`
                )}
              </Badge>

              {/* Description for selected */}
              {isSelected && showTooltips && (
                <p className="text-xs text-foreground text-center mt-1">
                  {model.description}
                </p>
              )}
            </Button>
          )

          // Wrap with HoverCard for tooltips
          if (showTooltips && capabilities) {
            return (
              <HoverCard key={model.id} openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  {buttonContent}
                </HoverCardTrigger>
                <HoverCardContent
                  side="top"
                  align="center"
                  className="w-64 bg-card border-border"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{model.icon}</span>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{model.displayName}</h4>
                        <p className="text-xs text-muted-foreground">{model.description}</p>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span className="text-muted-foreground">Speed:</span>
                        <span className="text-white">{capabilities.speed}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Type className="w-3 h-3 text-violet-400" />
                        <span className="text-muted-foreground">Text:</span>
                        <span className="text-white">{capabilities.textRendering}</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <ImageIcon className="w-3 h-3 text-amber-400" />
                        <span className="text-muted-foreground">References:</span>
                        <span className="text-white">{capabilities.refImages}</span>
                      </div>
                    </div>

                    {/* Best for */}
                    <div className="border-t border-border pt-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Zap className="w-3 h-3 text-green-400" />
                        <span className="text-xs text-muted-foreground">Best for:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {capabilities.bestFor.map((use, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {use}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )
          }

          return <div key={model.id}>{buttonContent}</div>
        })}
      </div>
    </div>
  )
}