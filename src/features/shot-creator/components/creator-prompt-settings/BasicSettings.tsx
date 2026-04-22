import React, { useMemo } from 'react'
import { useShotCreatorSettings } from "../../hooks"
import { aspectRatios, resolutions } from "../../constants"
import { getModelConfig, getModelCost, ModelId } from '@/config'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import StyleSelector from './StyleSelector'
import { CameraAngleSection } from '../camera-angle/CameraAngleSection'

const BasicSettings = () => {
    const { settings: shotCreatorSettings, updateSettings } = useShotCreatorSettings()
    const selectedModel = shotCreatorSettings.model || 'nano-banana-2'
    const modelConfig = useMemo(() => getModelConfig(selectedModel as ModelId), [selectedModel])

    // Get model-specific aspect ratios
    const aspectRatioOptions = useMemo(() => {
        const aspectRatioParam = modelConfig.parameters.aspectRatio
        if (aspectRatioParam?.options) {
            return aspectRatioParam.options
        }
        return aspectRatios
    }, [modelConfig])

    // Get model-specific resolution options
    const resolutionOptions = useMemo(() => {
        const resolutionParam = modelConfig.parameters.resolution
        if (resolutionParam?.options) {
            return resolutionParam.options
        }
        return resolutions
    }, [modelConfig])

    // Check if model supports each parameter
    const supportsAspectRatio = useMemo(() =>
        modelConfig.supportedParameters.includes('aspectRatio'),
        [modelConfig]
    )
    const supportsResolution = useMemo(() =>
        modelConfig.supportedParameters.includes('resolution'),
        [modelConfig]
    )
    const supportsOutputFormat = useMemo(() =>
        modelConfig.supportedParameters.includes('outputFormat'),
        [modelConfig]
    )

    return (
        <div className="space-y-4">
            {/* Compact Settings Row - All 4 on same line (desktop), 2x2 (mobile) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
                {/* Style — not available with Camera Angle model */}
                {selectedModel !== 'qwen-image-edit' && (
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Style</Label>
                        <StyleSelector compact />
                    </div>
                )}

                {/* Aspect Ratio */}
                {supportsAspectRatio && (
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Aspect</Label>
                        <Select
                            value={shotCreatorSettings.aspectRatio}
                            onValueChange={(value) => updateSettings({ aspectRatio: value })}
                        >
                            <SelectTrigger className="bg-card border-border text-white h-9 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {aspectRatioOptions.map((ratio) => (
                                    <SelectItem key={ratio.value} value={ratio.value}>
                                        {ratio.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Resolution */}
                {supportsResolution && (
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                            Resolution
                            {/* Show current cost if model has tiered pricing */}
                            {modelConfig.costByResolution && (
                                <span className="ml-1 text-amber-400">
                                    ({Math.round(getModelCost(selectedModel as ModelId, shotCreatorSettings.resolution) * 100)} pts)
                                </span>
                            )}
                        </Label>
                        <Select
                            value={shotCreatorSettings.resolution}
                            onValueChange={(value) => updateSettings({ resolution: value })}
                        >
                            <SelectTrigger className="bg-card border-border text-white h-9 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {resolutionOptions.map((res) => {
                                    // Show cost for tiered pricing models
                                    const resCost = modelConfig.costByResolution
                                        ? Math.round(getModelCost(selectedModel as ModelId, res.value) * 100)
                                        : null;
                                    return (
                                        <SelectItem key={res.value} value={res.value}>
                                            {res.label}
                                            {resCost && <span className="ml-1 text-amber-400">({resCost} pts)</span>}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Output Format */}
                {supportsOutputFormat && (
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Output</Label>
                        <Select
                            value={shotCreatorSettings.outputFormat || 'webp'}
                            onValueChange={(value) => updateSettings({ outputFormat: value })}
                        >
                            <SelectTrigger className="bg-card border-border text-white h-9 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="webp">WebP</SelectItem>
                                <SelectItem value="jpg">JPG</SelectItem>
                                <SelectItem value="png">PNG</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* Camera Angle Control (Qwen Image Edit only) */}
            {selectedModel === 'qwen-image-edit' && (
                <CameraAngleSection />
            )}

            {/* GPT Image 2 specific controls */}
            {selectedModel === 'gpt-image-2' && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
                    {/* Quality (pricing tier) */}
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                            Quality
                            <span className="ml-1 text-amber-400">
                                ({Math.round(getModelCost(selectedModel as ModelId, shotCreatorSettings.gptImageQuality || 'medium') * 100)} pts)
                            </span>
                        </Label>
                        <Select
                            value={shotCreatorSettings.gptImageQuality || 'medium'}
                            onValueChange={(value) => updateSettings({ gptImageQuality: value as 'low' | 'medium' })}
                        >
                            <SelectTrigger className="bg-card border-border text-white h-9 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">Low (2 pts)</SelectItem>
                                <SelectItem value="medium">Medium (8 pts)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Background */}
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Background</Label>
                        <Select
                            value={shotCreatorSettings.gptImageBackground || 'auto'}
                            onValueChange={(value) => updateSettings({ gptImageBackground: value as 'auto' | 'opaque' })}
                        >
                            <SelectTrigger className="bg-card border-border text-white h-9 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">Auto</SelectItem>
                                <SelectItem value="opaque">Opaque</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Moderation */}
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Moderation</Label>
                        <Select
                            value={shotCreatorSettings.gptImageModeration || 'auto'}
                            onValueChange={(value) => updateSettings({ gptImageModeration: value as 'auto' | 'low' })}
                        >
                            <SelectTrigger className="bg-card border-border text-white h-9 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">Auto</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Number of images */}
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground"># Images</Label>
                        <Select
                            value={String(shotCreatorSettings.gptImageNumberOfImages ?? 1)}
                            onValueChange={(value) => updateSettings({ gptImageNumberOfImages: Number(value) })}
                        >
                            <SelectTrigger className="bg-card border-border text-white h-9 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
        </div>
    )
}

export default BasicSettings
