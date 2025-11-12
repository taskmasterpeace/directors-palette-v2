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
  RESOLUTIONS,
  ASPECT_RATIOS
} from '../config/models.config'

interface ModelSettingsModalProps {
  settings: AnimatorSettings
  onSave: (settings: AnimatorSettings) => void
}

export function ModelSettingsModal({ settings, onSave }: ModelSettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [localSettings, setLocalSettings] = useState<AnimatorSettings>(settings)
  const [activeTab, setActiveTab] = useState<AnimationModel>('seedance-lite')

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
          className="h-10 sm:h-8 w-full sm:w-auto min-h-[44px] sm:min-h-0 text-slate-400 hover:text-white hover:bg-slate-800 touch-manipulation justify-center"
        >
          <Settings className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline ml-1">Settings</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="w-full max-w-2xl bg-slate-900 border-slate-700 text-white safe-bottom">
        <DialogHeader>
          <DialogTitle>Model Settings</DialogTitle>
          <DialogDescription className="text-slate-400">
            Configure settings for each animation model
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AnimationModel)}>
          <TabsList className="grid w-full grid-cols-2 bg-slate-800 h-11 sm:h-10 touch-manipulation">
            <TabsTrigger value="seedance-lite" className="data-[state=active]:bg-slate-700 min-h-[44px] sm:min-h-0">
              Seedance Lite
            </TabsTrigger>
            <TabsTrigger value="seedance-pro" className="data-[state=active]:bg-slate-700 min-h-[44px] sm:min-h-0">
              Seedance Pro
            </TabsTrigger>
          </TabsList>

          {/* Seedance Lite Settings */}
          <div className="max-h-[60vh] overflow-y-auto mt-4 px-2 sm:px-0">
            <TabsContent value="seedance-lite" className="space-y-6 mt-4">
              <ModelSettingsPanel
                model="seedance-lite"
                settings={localSettings['seedance-lite']}
                onUpdate={(updates) => updateModelSettings('seedance-lite', updates)}
              />
            </TabsContent>

            {/* Seedance Pro Settings */}
            <TabsContent value="seedance-pro" className="space-y-6 mt-4">
              <ModelSettingsPanel
                model="seedance-pro"
                settings={localSettings['seedance-pro']}
                onUpdate={(updates) => updateModelSettings('seedance-pro', updates)}
              />
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="gap-2 px-4 sm:px-6">
          <Button variant="outline" onClick={handleCancel} className="bg-slate-800 border-slate-600 min-h-[44px] touch-manipulation w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 min-h-[44px] touch-manipulation w-full sm:w-auto">
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

  return (
    <div className="space-y-6 p-4 sm:p-4 overflow-y-auto bg-slate-800/50 rounded-lg border border-slate-700">
      {/* Duration Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-white">Duration</Label>
          <span className="text-sm text-slate-400">{settings.duration} sec</span>
        </div>
        <Slider
          value={[settings.duration]}
          onValueChange={([value]) => onUpdate({ duration: value })}
          min={DURATION_CONSTRAINTS.min}
          max={DURATION_CONSTRAINTS.max}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>{DURATION_CONSTRAINTS.min} sec</span>
          <span>{DURATION_CONSTRAINTS.max} sec</span>
        </div>
      </div>

      {/* Resolution */}
      <div className="space-y-3">
        <Label className="text-white">Resolution</Label>
        <RadioGroup
          value={settings.resolution}
          onValueChange={(value) => onUpdate({ resolution: value as '480p' | '720p' | '1080p' })}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4"
        >
          {RESOLUTIONS.map((res) => (
            <div key={res} className="flex items-center space-x-2 touch-manipulation min-h-[44px] sm:min-h-0">
              <RadioGroupItem value={res} id={`${model}-${res}`} className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" />
              <Label htmlFor={`${model}-${res}`} className="cursor-pointer text-slate-300">
                {res}
              </Label>
            </div>
          ))}
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
          {ASPECT_RATIOS.map((ratio) => (
            <div key={ratio.value} className="flex items-center space-x-2 touch-manipulation min-h-[44px] sm:min-h-0">
              <RadioGroupItem value={ratio.value} id={`${model}-${ratio.value}`} className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" />
              <Label
                htmlFor={`${model}-${ratio.value}`}
                className="cursor-pointer text-slate-300 text-sm"
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
        <div className="text-slate-400 text-sm">24 (fixed)</div>
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
            className="text-slate-300 cursor-pointer"
          >
            Fix Camera Position
          </Label>
        </div>
      </div>

      {/* Seed */}
      <div className="space-y-3">
        <Label className="text-white">Advanced</Label>
        <div className="space-y-2">
          <Label className="text-sm text-slate-400">Seed (optional)</Label>
          <Input
            type="number"
            value={settings.seed || ''}
            onChange={(e) => onUpdate({ seed: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="Leave empty for random generation"
            className="bg-slate-900 border-slate-600 text-white min-h-[44px] text-base sm:text-sm"
          />
          <p className="text-xs text-slate-500">
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
      <div className="bg-slate-700/30 rounded p-3">
        <p className="text-xs text-slate-400">
          ℹ️ {modelConfig.description}
        </p>
      </div>
    </div>
  )
}
