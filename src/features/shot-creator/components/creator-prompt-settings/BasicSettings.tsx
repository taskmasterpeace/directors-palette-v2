import React, { useMemo } from 'react'
import { useShotCreatorSettings } from "../../hooks"
import { aspectRatios, resolutions } from "../../constants"
import { getModelConfig, ModelId } from '@/config'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import StyleSelector from './StyleSelector'

const BasicSettings = () => {
    const { settings: shotCreatorSettings, updateSettings } = useShotCreatorSettings()
    const selectedModel = shotCreatorSettings.model || 'nano-banana'
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
        // For nano-banana-pro, use resolution parameter
        if (selectedModel === 'nano-banana-pro') {
            const proParam = modelConfig.parameters.resolution
            if (proParam?.options) {
                return proParam.options
            }
        }

        const resolutionParam = modelConfig.parameters.resolution
        if (resolutionParam?.options) {
            return resolutionParam.options
        }
        return resolutions
    }, [modelConfig, selectedModel])

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
                {/* Style */}
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Style</Label>
                    <StyleSelector compact />
                </div>

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
                        <Label className="text-xs text-muted-foreground">Resolution</Label>
                        <Select
                            value={shotCreatorSettings.resolution}
                            onValueChange={(value) => updateSettings({ resolution: value })}
                        >
                            <SelectTrigger className="bg-card border-border text-white h-9 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {resolutionOptions.map((res) => (
                                    <SelectItem key={res.value} value={res.value}>
                                        {res.label}
                                    </SelectItem>
                                ))}
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
        </div>
    )
}

export default BasicSettings
