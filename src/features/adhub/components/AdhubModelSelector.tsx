'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/utils'
import { useAdhubStore } from '../store/adhub.store'
import type { AdhubModel } from '../types/adhub.types'

interface ModelOption {
  id: AdhubModel
  name: string
  icon: string
  description: string
  badge: string
  badgeColor: string
  capabilities: string[]
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'nano-banana-2',
    name: 'Nano Banana 2',
    icon: '🍌',
    description: 'Latest model - fast, high quality, free',
    badge: 'New',
    badgeColor: 'bg-green-600',
    capabilities: ['Text rendering', 'Fast generation', 'Free tier'],
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    icon: '🔥',
    description: 'SOTA quality, text rendering, 4K, editing',
    badge: 'Pro',
    badgeColor: 'bg-orange-600',
    capabilities: ['Text rendering', '4K', 'Editing'],
  },
]

export function AdhubModelSelector() {
  const { selectedModel, setSelectedModel } = useAdhubStore()

  const handleModelChange = (model: AdhubModel) => {
    setSelectedModel(model)
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
        Model
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {MODEL_OPTIONS.map((option) => {
          const isSelected = selectedModel === option.id
          return (
            <button
              key={option.id}
              onClick={() => handleModelChange(option.id)}
              className={cn(
                'p-4 rounded-lg border-2 transition-all text-left',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-muted/50 hover:border-primary/30'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{option.icon}</span>
                <span className="font-medium">{option.name}</span>
                <Badge className={cn(option.badgeColor, 'text-white text-xs')}>
                  {option.badge}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {option.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {option.capabilities.map((cap) => (
                  <Badge
                    key={cap}
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {cap}
                  </Badge>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
