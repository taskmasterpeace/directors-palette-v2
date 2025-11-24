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
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

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
        // For seedream-4, use seedreamResolution parameter
        if (selectedModel === 'seedream-4') {
            const seedreamParam = modelConfig.parameters.resolution
            if (seedreamParam?.options) {
                return seedreamParam.options
            }
        }

        // For nano-banana-pro, use nanoBananaProResolution parameter
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
        modelConfig.supportedParameters.includes('aspectRatio') ||
        modelConfig.supportedParameters.includes('gen4AspectRatio'),
        [modelConfig]
    )
    const supportsResolution = useMemo(() =>
        modelConfig.supportedParameters.includes('resolution') ||
        modelConfig.supportedParameters.includes('seedreamResolution'),
        [modelConfig]
    )
    const supportsCustomDimensions = useMemo(() =>
        selectedModel === 'seedream-4' && shotCreatorSettings.resolution === 'custom',
        [selectedModel, shotCreatorSettings.resolution]
    )
    const supportsOutputFormat = useMemo(() =>
        modelConfig.supportedParameters.includes('outputFormat'),
        [modelConfig]
    )

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                {/* Aspect Ratio */}
                {supportsAspectRatio && (
                    <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Aspect Ratio</Label>
                        <Select
                            value={shotCreatorSettings.aspectRatio}
                            onValueChange={(value) => updateSettings({ aspectRatio: value })}
                        >
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
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
                    <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Resolution</Label>
                        <Select
                            value={shotCreatorSettings.resolution}
                            onValueChange={(value) => updateSettings({ resolution: value })}
                        >
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
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
                    <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Output Format</Label>
                        <Select
                            value={shotCreatorSettings.outputFormat || 'webp'}
                            onValueChange={(value) => updateSettings({ outputFormat: value })}
                        >
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="webp">WebP (Recommended)</SelectItem>
                                <SelectItem value="jpg">JPG</SelectItem>
                                <SelectItem value="png">PNG</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* Custom Dimensions for Seedream-4 */}
            {supportsCustomDimensions && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Width (px)</Label>
                        <Input
                            type="number"
                            min="1024"
                            max="4096"
                            value={shotCreatorSettings.customWidth || 2048}
                            onChange={(e) => updateSettings({ customWidth: parseInt(e.target.value) })}
                            className="bg-slate-800 border-slate-600 text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Height (px)</Label>
                        <Input
                            type="number"
                            min="1024"
                            max="4096"
                            value={shotCreatorSettings.customHeight || 2048}
                            onChange={(e) => updateSettings({ customHeight: parseInt(e.target.value) })}
                            className="bg-slate-800 border-slate-600 text-white"
                        />
                    </div>
                </div>
            )}

            {/* Raw Prompt Mode Toggle */}
            <div className="space-y-2 pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-sm text-slate-300">Raw Prompt Mode</Label>
                        <p className="text-xs text-slate-400">
                            Send prompt as literal text, ignore [brackets], pipes |, and _wildcards_
                        </p>
                    </div>
                    <Switch
                        checked={shotCreatorSettings.rawPromptMode || false}
                        onCheckedChange={(value) => updateSettings({ rawPromptMode: value })}
                    />
                </div>
            </div>

            {/* Wild Card Manager Link */}
            <div className="pt-4 border-t border-slate-700">
                <Link href="/wildcards" target="_blank">
                    <Button variant="outline" className="w-full" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Manage Wild Cards
                    </Button>
                </Link>
                <p className="text-xs text-slate-400 mt-2">
                    Create and manage _wildcard_ lists for dynamic prompt variations
                </p>
            </div>
        </div>
    )
}

export default BasicSettings