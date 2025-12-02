import React, { useMemo, useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { WildCardCreateDialog } from '../wildcard/WildCardCreateDialog'

const BasicSettings = () => {
    const { settings: shotCreatorSettings, updateSettings } = useShotCreatorSettings()
    const selectedModel = shotCreatorSettings.model || 'nano-banana'
    const modelConfig = useMemo(() => getModelConfig(selectedModel as ModelId), [selectedModel])
    const [wildCardDialogOpen, setWildCardDialogOpen] = useState(false)

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
                        <Label className="text-sm text-foreground">Aspect Ratio</Label>
                        <Select
                            value={shotCreatorSettings.aspectRatio}
                            onValueChange={(value) => updateSettings({ aspectRatio: value })}
                        >
                            <SelectTrigger className="bg-card border-border text-white">
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
                        <Label className="text-sm text-foreground">Resolution</Label>
                        <Select
                            value={shotCreatorSettings.resolution}
                            onValueChange={(value) => updateSettings({ resolution: value })}
                        >
                            <SelectTrigger className="bg-card border-border text-white">
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
                        <Label className="text-sm text-foreground">Output Format</Label>
                        <Select
                            value={shotCreatorSettings.outputFormat || 'webp'}
                            onValueChange={(value) => updateSettings({ outputFormat: value })}
                        >
                            <SelectTrigger className="bg-card border-border text-white">
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
                        <Label className="text-sm text-foreground">Width (px)</Label>
                        <Input
                            type="number"
                            min="1024"
                            max="4096"
                            value={shotCreatorSettings.customWidth || 2048}
                            onChange={(e) => updateSettings({ customWidth: parseInt(e.target.value) })}
                            className="bg-card border-border text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm text-foreground">Height (px)</Label>
                        <Input
                            type="number"
                            min="1024"
                            max="4096"
                            value={shotCreatorSettings.customHeight || 2048}
                            onChange={(e) => updateSettings({ customHeight: parseInt(e.target.value) })}
                            className="bg-card border-border text-white"
                        />
                    </div>
                </div>
            )}

            {/* Wild Card Creation */}
            <div className="pt-4 border-t border-border">
                <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={() => setWildCardDialogOpen(true)}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Wild Card
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                    Upload a text file to create _wildcard_ for random prompt variations
                </p>
            </div>

            {/* Wild Card Dialog */}
            <WildCardCreateDialog
                open={wildCardDialogOpen}
                onOpenChange={setWildCardDialogOpen}
            />
        </div>
    )
}

export default BasicSettings