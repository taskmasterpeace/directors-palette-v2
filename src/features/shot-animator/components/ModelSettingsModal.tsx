'use client'

import React, { useState } from 'react'
import { Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { AnimationModel, AnimatorSettings, ModelSettings } from '../types'
import {
  ANIMATION_MODELS,
  DURATION_CONSTRAINTS,
  ASPECT_RATIOS,
  ACTIVE_VIDEO_MODELS,
  MODEL_TIER_LABELS,
} from '../config/models.config'
import { VIDEO_MODEL_PRICING } from '../types'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

interface ModelSettingsModalProps {
  settings: AnimatorSettings
  onSave: (settings: AnimatorSettings) => void
}

export function ModelSettingsModal({ settings, onSave }: ModelSettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [localSettings, setLocalSettings] = useState<AnimatorSettings>(settings)
  const [activeTab, setActiveTab] = useState<AnimationModel>('seedance-1.5-pro')

  const updateModelSettings = (model: AnimationModel, updates: Partial<ModelSettings>) => {
    setLocalSettings(prev => ({
      ...prev,
      [model]: {
        ...prev[model],
        ...updates
      }
    }))
  }

  const handleSave = () => {
    onSave(localSettings)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setLocalSettings(settings) // Reset to original
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 sm:h-8 w-full sm:w-auto min-h-[44px] sm:min-h-0 text-muted-foreground hover:text-white hover:bg-card touch-manipulation justify-center"
        >
          <Settings className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline ml-1">Settings</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden bg-background border-border text-white safe-bottom">
        <DialogHeader>
          <DialogTitle>Model Settings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure settings for each animation model
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AnimationModel)}>
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-max bg-card h-11 sm:h-10 touch-manipulation gap-1 p-1">
              {ACTIVE_VIDEO_MODELS.map((modelId) => {
                const config = ANIMATION_MODELS[modelId]
                const tier = MODEL_TIER_LABELS[modelId]
                return (
                  <TabsTrigger
                    key={modelId}
                    value={modelId}
                    className="data-[state=active]:bg-secondary min-h-[44px] sm:min-h-0 px-3 whitespace-nowrap"
                  >
                    <span className="mr-1">{config.displayName}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 hidden sm:inline">
                      {tier}
                    </Badge>
                  </TabsTrigger>
                )
              })}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Model Settings Panels */}
          <div className="max-h-[60vh] overflow-y-auto mt-4 px-2 sm:px-0">
            {ACTIVE_VIDEO_MODELS.map((modelId) => (
              <TabsContent key={modelId} value={modelId} className="space-y-6 mt-4">
                <ModelSettingsPanel
                  model={modelId}
                  settings={localSettings[modelId]}
                  onUpdate={(updates) => updateModelSettings(modelId, updates)}
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <DialogFooter className="gap-2 px-4 sm:px-6">
          <Button variant="outline" onClick={handleCancel} className="bg-card border-border min-h-[44px] touch-manipulation w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 min-h-[44px] touch-manipulation w-full sm:w-auto">
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  )
}

interface ModelSettingsPanelProps {
  model: AnimationModel
  settings: ModelSettings
  onUpdate: (updates: Partial<ModelSettings>) => void
}

function ModelSettingsPanel({ model, settings, onUpdate }: ModelSettingsPanelProps) {
  const modelConfig = ANIMATION_MODELS[model]
  const pricing = VIDEO_MODEL_PRICING[model]
  const tier = MODEL_TIER_LABELS[model]

  // Calculate estimated cost for preview (with null guards)
  const resolution = settings?.resolution ?? '720p'
  const duration = settings?.duration ?? 5
  const pricePerUnit = pricing?.[resolution] ?? pricing?.['720p'] ?? 0
  const estimatedCost = modelConfig?.pricingType === 'per-video'
    ? pricePerUnit
    : pricePerUnit * duration

  // Check if duration is fixed for this model
  const isFixedDuration = modelConfig?.pricingType === 'per-video'

  return (
    <div className="space-y-6 p-4 sm:p-4 overflow-y-auto bg-card/50 rounded-lg border border-border">
      {/* Pricing Info Banner */}
      <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded p-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{tier}</Badge>
          <span className="text-sm text-muted-foreground">
            {modelConfig?.pricingType === 'per-video'
              ? `${pricePerUnit} pts/video`
              : `${pricePerUnit} pts/sec @ ${resolution}`}
          </span>
        </div>
        <div className="text-right">
          <span className="text-primary font-semibold">{estimatedCost} pts</span>
          <span className="text-xs text-muted-foreground ml-1">estimated</span>
        </div>
      </div>

      {/* Duration Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-white">Duration</Label>
          <span className="text-sm text-muted-foreground">
            {isFixedDuration ? `${modelConfig?.maxDuration ?? 5} sec (fixed)` : `${duration} sec`}
          </span>
        </div>
        {isFixedDuration ? (
          <div className="text-xs text-muted-foreground bg-secondary/30 rounded p-2">
            This model has a fixed duration of {modelConfig?.maxDuration ?? 5} seconds per video.
          </div>
        ) : (
          <>
            <Slider
              value={[duration]}
              onValueChange={([value]) => onUpdate({ duration: value })}
              min={DURATION_CONSTRAINTS.min}
              max={modelConfig?.maxDuration ?? 10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{DURATION_CONSTRAINTS.min} sec</span>
              <span>{modelConfig?.maxDuration ?? 10} sec</span>
            </div>
          </>
        )}
      </div>

      {/* Resolution */}
      <div className="space-y-3">
        <Label className="text-white">Resolution</Label>
        <RadioGroup
          value={resolution}
          onValueChange={(value) => onUpdate({ resolution: value as '480p' | '720p' | '1080p' })}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4"
        >
          {(modelConfig?.supportedResolutions ?? ['720p']).map((res) => {
            const resPrice = pricing?.[res] ?? pricing?.['720p'] ?? 0
            return (
              <div key={res} className="flex items-center space-x-2 touch-manipulation min-h-[44px] sm:min-h-0">
                <RadioGroupItem value={res} id={`${model}-${res}`} className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" />
                <Label htmlFor={`${model}-${res}`} className="cursor-pointer text-foreground">
                  {res}
                  <span className="text-xs text-muted-foreground ml-1">({resPrice} pts)</span>
                </Label>
              </div>
            )
          })}
        </RadioGroup>
      </div>

      {/* Aspect Ratio */}
      <div className="space-y-3">
        <Label className="text-white">Aspect Ratio</Label>
        <RadioGroup
          value={settings.aspectRatio}
          onValueChange={(value) => onUpdate({ aspectRatio: value as '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | '9:21' })}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {ASPECT_RATIOS
            .filter((ratio) => modelConfig.supportedAspectRatios?.includes(ratio.value as '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | '9:21'))
            .map((ratio) => (
            <div key={ratio.value} className="flex items-center space-x-2 touch-manipulation min-h-[44px] sm:min-h-0">
              <RadioGroupItem value={ratio.value} id={`${model}-${ratio.value}`} className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" />
              <Label
                htmlFor={`${model}-${ratio.value}`}
                className="cursor-pointer text-foreground text-sm"
              >
                {ratio.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* FPS */}
      <div className="space-y-2">
        <Label className="text-white">FPS</Label>
        <div className="text-muted-foreground text-sm">24 (fixed)</div>
      </div>

      {/* Camera Options */}
      <div className="space-y-3">
        <Label className="text-white">Camera Options</Label>
        <div className="flex items-center space-x-2 touch-manipulation min-h-[44px] sm:min-h-0">
          <Checkbox
            id={`${model}-camera-fixed`}
            checked={settings.cameraFixed}
            onCheckedChange={(checked) => onUpdate({ cameraFixed: checked as boolean })}
            className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
          />
          <Label
            htmlFor={`${model}-camera-fixed`}
            className="text-foreground cursor-pointer"
          >
            Fix Camera Position
          </Label>
        </div>
      </div>

      {/* Audio Generation (models that support it) */}
      {modelConfig.supportsAudio && (
        <div className="space-y-3">
          <Label className="text-white">Audio</Label>
          <div className="flex items-center space-x-2 touch-manipulation min-h-[44px] sm:min-h-0">
            <Checkbox
              id={`${model}-generate-audio`}
              checked={settings.generateAudio ?? false}
              onCheckedChange={(checked) => onUpdate({ generateAudio: checked as boolean })}
              className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
            />
            <Label
              htmlFor={`${model}-generate-audio`}
              className="text-foreground cursor-pointer"
            >
              Generate audio synced to video
            </Label>
          </div>
        </div>
      )}

      {/* Seed */}
      <div className="space-y-3">
        <Label className="text-white">Advanced</Label>
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Seed (optional)</Label>
          <Input
            type="number"
            value={settings.seed || ''}
            onChange={(e) => onUpdate({ seed: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="Leave empty for random generation"
            className="bg-background border-border text-white min-h-[44px] text-base sm:text-sm"
          />
          <p className="text-xs text-muted-foreground">
            💡 Leave empty for random generation
          </p>
        </div>
      </div>

      {/* Model-specific warnings */}
      {modelConfig.restrictions && modelConfig.restrictions.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
          <p className="text-sm text-yellow-400 font-medium mb-1">⚠️ Note:</p>
          {modelConfig.restrictions.map((restriction, index) => (
            <p key={index} className="text-xs text-yellow-400/80">
              • {restriction}
            </p>
          ))}
        </div>
      )}

      {/* Model info */}
      <div className="bg-secondary/30 rounded p-3">
        <p className="text-xs text-muted-foreground">
          ℹ️ {modelConfig.description}
        </p>
      </div>
    </div>
  )
}
