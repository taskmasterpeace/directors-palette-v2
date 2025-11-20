import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import React, { useCallback, useMemo } from 'react'
import { useShotCreatorSettings } from "../../hooks"
import { useShotCreatorStore } from "../../store/shot-creator.store"
import { getModelConfig, ModelId } from '@/config'
import { Button } from "@/components/ui/button"
import { Shuffle } from "lucide-react"

const AdvancedSettings = () => {
    const { settings: shotCreatorSettings, updateSettings } = useShotCreatorSettings()
    const { shotCreatorReferenceImages } = useShotCreatorStore()
    const selectedModel = shotCreatorSettings.model || 'nano-banana'
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
    const supportsMaxImages = useMemo(() =>
        modelConfig.supportedParameters.includes('maxImages'),
        [modelConfig]
    )
    const supportsSequentialGeneration = useMemo(() =>
        modelConfig.supportedParameters.includes('sequentialGeneration'),
        [modelConfig]
    )
    const supportsQwenGuidance = useMemo(() =>
        modelConfig.supportedParameters.includes('qwenGuidance'),
        [modelConfig]
    )
    const supportsQwenSteps = useMemo(() =>
        modelConfig.supportedParameters.includes('qwenSteps'),
        [modelConfig]
    )
    const supportsOutputQuality = useMemo(() =>
        modelConfig.supportedParameters.includes('outputQuality'),
        [modelConfig]
    )
    const supportsGoFast = useMemo(() =>
        modelConfig.supportedParameters.includes('goFast'),
        [modelConfig]
    )
    const supportsSafetyFilterLevel = useMemo(() =>
        modelConfig.supportedParameters.includes('safetyFilterLevel'),
        [modelConfig]
    )

    // Check if this is Qwen Image with img2img (has reference images)
    const isQwenImageWithImg2Img = useMemo(() =>
        selectedModel === 'qwen-image' && shotCreatorReferenceImages.length > 0,
        [selectedModel, shotCreatorReferenceImages.length]
    )

    return (
        <div className="space-y-4 border-t border-slate-700 pt-4">
            {/* Seed - for models that support it */}
            {supportsSeed && (
                <div className="space-y-2">
                    <Label className="text-sm text-slate-300">Seed (Optional)</Label>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            value={shotCreatorSettings.seed || ''}
                            onChange={(e) => updateSettings({
                                seed: e.target.value ? parseInt(e.target.value) : undefined
                            })}
                            placeholder="Random"
                            className="bg-slate-800 border-slate-600 text-white"
                        />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={generateRandomSeed}
                                    className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                                >
                                    <Shuffle className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Generate random seed</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            )}

            {/* Number of Images - for Seedream-4 */}
            {supportsMaxImages && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm text-slate-300">Number of Images</Label>
                        <span className="text-sm text-slate-400">{shotCreatorSettings.maxImages || 1}</span>
                    </div>
                    <Slider
                        value={[shotCreatorSettings.maxImages || 1]}
                        onValueChange={(value) => updateSettings({ maxImages: value[0] })}
                        min={1}
                        max={15}
                        step={1}
                        className="w-full"
                    />
                    <p className="text-xs text-slate-400">Generate 1-15 images in one request</p>
                </div>
            )}

            {/* Sequential Generation - for Seedream-4 */}
            {supportsSequentialGeneration && (
                <div className="flex items-center justify-between space-y-2">
                    <div className="space-y-1">
                        <Label className="text-sm text-slate-300">Sequential Generation</Label>
                        <p className="text-xs text-slate-400">Generate related image variations for storytelling</p>
                    </div>
                    <Switch
                        checked={shotCreatorSettings.sequentialGeneration || false}
                        onCheckedChange={(checked) => updateSettings({ sequentialGeneration: checked })}
                    />
                </div>
            )}

            {/* Qwen Image specific parameters */}
            {(supportsQwenGuidance || supportsQwenSteps) && (
                <div className="grid grid-cols-2 gap-4">
                    {supportsQwenGuidance && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm text-slate-300">Guidance</Label>
                                <span className="text-sm text-slate-400">{shotCreatorSettings.guidance || 3}</span>
                            </div>
                            <Slider
                                value={[shotCreatorSettings.guidance || 3]}
                                onValueChange={(value) => updateSettings({ guidance: value[0] })}
                                min={0}
                                max={10}
                                step={0.5}
                                className="w-full"
                            />
                            <p className="text-xs text-slate-400">Lower = more realistic (0-10)</p>
                        </div>
                    )}
                    {supportsQwenSteps && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm text-slate-300">Inference Steps</Label>
                                <span className="text-sm text-slate-400">{shotCreatorSettings.num_inference_steps || 30}</span>
                            </div>
                            <Slider
                                value={[shotCreatorSettings.num_inference_steps || 30]}
                                onValueChange={(value) => updateSettings({ num_inference_steps: value[0] })}
                                min={10}
                                max={50}
                                step={1}
                                className="w-full"
                            />
                            <p className="text-xs text-slate-400">More steps = higher quality (10-50)</p>
                        </div>
                    )}
                </div>
            )}

            {/* Output Quality - for Qwen Image Edit */}
            {supportsOutputQuality && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm text-slate-300">Output Quality</Label>
                        <span className="text-sm text-slate-400">{shotCreatorSettings.outputQuality || 95}%</span>
                    </div>
                    <Slider
                        value={[shotCreatorSettings.outputQuality || 95]}
                        onValueChange={(value) => updateSettings({ outputQuality: value[0] })}
                        min={50}
                        max={100}
                        step={5}
                        className="w-full"
                    />
                </div>
            )}

            {/* Fast Mode - for Qwen models */}
            {supportsGoFast && (
                <div className="flex items-center justify-between space-y-2">
                    <div className="space-y-1">
                        <Label className="text-sm text-slate-300">Fast Mode</Label>
                        <p className="text-xs text-slate-400">Enable optimizations for faster generation</p>
                    </div>
                    <Switch
                        checked={shotCreatorSettings.goFast !== false}
                        onCheckedChange={(checked) => updateSettings({ goFast: checked })}
                    />
                </div>
            )}

            {/* Safety Filter Level - for Nano Banana Pro */}
            {supportsSafetyFilterLevel && (
                <div className="space-y-2">
                    <Label className="text-sm text-slate-300">Safety Filter Level</Label>
                    <Select
                        value={shotCreatorSettings.safetyFilterLevel || 'block_only_high'}
                        onValueChange={(value) => updateSettings({ safetyFilterLevel: value })}
                    >
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="block_only_high">Minimal (Block only high)</SelectItem>
                            <SelectItem value="block_medium_and_above">Moderate (Block medium & above)</SelectItem>
                            <SelectItem value="block_low_and_above">Strict (Block low & above)</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-400">Content safety filtering level</p>
                </div>
            )}

            {/* Strength - for Qwen Image img2img mode */}
            {isQwenImageWithImg2Img && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm text-slate-300">Img2Img Strength</Label>
                        <span className="text-sm text-slate-400">{shotCreatorSettings.strength || 0.7}</span>
                    </div>
                    <Slider
                        value={[shotCreatorSettings.strength || 0.7]}
                        onValueChange={(value) => updateSettings({ strength: value[0] })}
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        className="w-full"
                    />
                    <p className="text-xs text-slate-400">Higher = more creative changes (0.1-1.0)</p>
                </div>
            )}
        </div>
    )
}

export default AdvancedSettings