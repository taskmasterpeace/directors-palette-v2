import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import React, { useCallback, useMemo } from 'react'
import { useShotCreatorSettings } from "../../hooks"
import { getModelConfig, ModelId } from '@/config'
import { Button } from "@/components/ui/button"
import { Shuffle } from "lucide-react"

const AdvancedSettings = () => {
    const { settings: shotCreatorSettings, updateSettings } = useShotCreatorSettings()
    const selectedModel = shotCreatorSettings.model || 'nano-banana-2'
    const modelConfig = useMemo(() => getModelConfig(selectedModel as ModelId), [selectedModel])

    // Generate random seed
    const generateRandomSeed = useCallback(() => {
        const newSeed = Math.floor(Math.random() * 1000000)
        updateSettings({ seed: newSeed })
    }, [updateSettings])

    // Check if model supports each parameter
    const supportsSeed = useMemo(() =>
        modelConfig.supportedParameters.includes('seed'),
        [modelConfig]
    )
    const supportsSafetyFilterLevel = useMemo(() =>
        modelConfig.supportedParameters.includes('safetyFilterLevel'),
        [modelConfig]
    )
    const supportsSequentialGeneration = useMemo(() =>
        modelConfig.supportedParameters.includes('sequentialGeneration'),
        [modelConfig]
    )
    const supportsMaxImages = useMemo(() =>
        modelConfig.supportedParameters.includes('maxImages'),
        [modelConfig]
    )

    return (
        <div className="space-y-4 border-t border-border pt-4">
            {/* Seed - for models that support it */}
            {supportsSeed && (
                <div className="space-y-2">
                    <Label className="text-sm text-foreground">Seed (Optional)</Label>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            value={shotCreatorSettings.seed || ''}
                            onChange={(e) => updateSettings({
                                seed: e.target.value ? parseInt(e.target.value) : undefined
                            })}
                            placeholder="Random"
                            className="bg-card border-border text-white"
                        />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={generateRandomSeed}
                                    className="bg-card border-border hover:bg-secondary"
                                >
                                    <Shuffle className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Generate random seed</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            )}

            {/* Safety Filter Level - for Nano Banana Pro */}
            {supportsSafetyFilterLevel && (
                <div className="space-y-2">
                    <Label className="text-sm text-foreground">Safety Filter Level</Label>
                    <Select
                        value={shotCreatorSettings.safetyFilterLevel || 'block_only_high'}
                        onValueChange={(value) => updateSettings({ safetyFilterLevel: value as 'block_low_and_above' | 'block_medium_and_above' | 'block_only_high' })}
                    >
                        <SelectTrigger className="bg-card border-border text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="block_only_high">Minimal (Block only high)</SelectItem>
                            <SelectItem value="block_medium_and_above">Moderate (Block medium & above)</SelectItem>
                            <SelectItem value="block_low_and_above">Strict (Block low & above)</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Content safety filtering level</p>
                </div>
            )}

            {/* Sequential Generation - for Seedream models */}
            {supportsSequentialGeneration && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="sequentialGeneration"
                            checked={shotCreatorSettings.sequentialGeneration || false}
                            onCheckedChange={(checked) => updateSettings({
                                sequentialGeneration: checked === true,
                                // Reset maxImages when disabling
                                maxImages: checked === true ? (shotCreatorSettings.maxImages || 3) : undefined
                            })}
                        />
                        <Label htmlFor="sequentialGeneration" className="text-sm text-foreground cursor-pointer">
                            Sequential Generation
                        </Label>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-muted-foreground text-[10px] font-bold cursor-help shrink-0">?</span>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs text-xs leading-relaxed">
                                <p className="font-medium mb-1">How to write sequential prompts:</p>
                                <p className="mb-1">Number each image in your prompt and match the Max Images count. Example:</p>
                                <p className="italic text-muted-foreground">&quot;Generate 4 character poses. Image 1: neutral stance; Image 2: action pose; Image 3: side profile; Image 4: back view. Same outfit and palette.&quot;</p>
                                <p className="mt-1">The model keeps style, identity, and color consistent across all images. Great for storyboards, character sheets, ad campaigns, and step-by-step tutorials.</p>
                                <p className="mt-1 text-amber-400">Cost is per-image: 4 images = 4x the cost.</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Generate multiple related images with consistent style and identity
                    </p>

                    {/* Max Images slider - only shows when sequential is enabled */}
                    {shotCreatorSettings.sequentialGeneration && supportsMaxImages && (
                        <div className="space-y-2 pl-6">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm text-foreground">Max Images</Label>
                                <span className="text-sm text-amber-400 font-medium">
                                    {shotCreatorSettings.maxImages || 3}
                                </span>
                            </div>
                            <Slider
                                value={[shotCreatorSettings.maxImages || 3]}
                                onValueChange={([val]) => updateSettings({ maxImages: val })}
                                min={2}
                                max={15}
                                step={1}
                                className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                                Match this number in your prompt (e.g. &quot;Generate 4 images...&quot;). Cost multiplied by count.
                            </p>
                        </div>
                    )}
                </div>
            )}

        </div>
    )
}

export default AdvancedSettings
