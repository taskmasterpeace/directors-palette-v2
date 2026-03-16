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
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useShotCreatorSettings } from "../../hooks"
import { getModelConfig, ModelId } from '@/config'
import { Button } from "@/components/ui/button"
import { Shuffle, Save, Trash2 } from "lucide-react"
import { useLoraStore } from "../../store/lora.store"
import { useShotCreatorStore } from "../../store/shot-creator.store"
import { useShallow } from "zustand/react/shallow"
import { ShotCreatorSettings } from "../../types"

// ── Preset system (localStorage) ─────────────────────────────────────────
interface SettingsPreset {
    id: string
    name: string
    settings: Partial<ShotCreatorSettings>
    createdAt: number
}

const PRESETS_KEY = 'dp-shot-creator-presets'

function loadPresets(): SettingsPreset[] {
    try {
        const raw = localStorage.getItem(PRESETS_KEY)
        return raw ? JSON.parse(raw) : []
    } catch { return [] }
}

function savePresets(presets: SettingsPreset[]) {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
}

// ── Default label (clickable reset) ──────────────────────────────────────
function DefaultLabel({ value, defaultValue, onReset }: {
    value: number | undefined
    defaultValue: number
    onReset: () => void
}) {
    const isDefault = value === undefined || value === defaultValue
    return (
        <button
            type="button"
            onClick={onReset}
            className={`text-[10px] tabular-nums transition-colors ${
                isDefault
                    ? 'text-muted-foreground/50 cursor-default'
                    : 'text-cyan-400/70 hover:text-cyan-400 cursor-pointer'
            }`}
            disabled={isDefault}
            title={isDefault ? `At default (${defaultValue})` : `Reset to default (${defaultValue})`}
        >
            {isDefault ? `default` : `reset to ${defaultValue}`}
        </button>
    )
}

const AdvancedSettings = () => {
    const { settings: shotCreatorSettings, updateSettings } = useShotCreatorSettings()
    const selectedModel = shotCreatorSettings.model || 'nano-banana-2'
    const modelConfig = useMemo(() => getModelConfig(selectedModel as ModelId), [selectedModel])
    const referenceImageCount = useShotCreatorStore(s => s.shotCreatorReferenceImages.length)

    // ── Presets ───────────────────────────────────────────────────────────
    const [presets, setPresets] = useState<SettingsPreset[]>([])
    const [showSaveInput, setShowSaveInput] = useState(false)
    const [presetName, setPresetName] = useState('')

    useEffect(() => { setPresets(loadPresets()) }, [])

    const handleSavePreset = useCallback(() => {
        if (!presetName.trim()) return
        const preset: SettingsPreset = {
            id: crypto.randomUUID(),
            name: presetName.trim(),
            settings: {
                guidanceScale: shotCreatorSettings.guidanceScale,
                img2imgStrength: shotCreatorSettings.img2imgStrength,
                loraScale: shotCreatorSettings.loraScale,
                safetyFilterLevel: shotCreatorSettings.safetyFilterLevel,
                googleSearch: shotCreatorSettings.googleSearch,
                imageSearch: shotCreatorSettings.imageSearch,
                sequentialGeneration: shotCreatorSettings.sequentialGeneration,
                maxImages: shotCreatorSettings.maxImages,
                outputFormat: shotCreatorSettings.outputFormat,
                batchCount: shotCreatorSettings.batchCount,
            },
            createdAt: Date.now(),
        }
        const updated = [...presets, preset]
        setPresets(updated)
        savePresets(updated)
        setPresetName('')
        setShowSaveInput(false)
    }, [presetName, presets, shotCreatorSettings])

    const handleLoadPreset = useCallback((presetId: string) => {
        const preset = presets.find(p => p.id === presetId)
        if (!preset) return
        // Only apply non-undefined values from preset
        const clean = Object.fromEntries(
            Object.entries(preset.settings).filter(([, v]) => v !== undefined)
        )
        updateSettings(clean)
    }, [presets, updateSettings])

    const handleDeletePreset = useCallback((presetId: string) => {
        const updated = presets.filter(p => p.id !== presetId)
        setPresets(updated)
        savePresets(updated)
    }, [presets])

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
    const supportsGoogleSearch = useMemo(() =>
        modelConfig.supportedParameters.includes('googleSearch'),
        [modelConfig]
    )
    const supportsImageSearch = useMemo(() =>
        modelConfig.supportedParameters.includes('imageSearch'),
        [modelConfig]
    )
    const supportsGuidanceScale = useMemo(() =>
        modelConfig.supportedParameters.includes('guidanceScale'),
        [modelConfig]
    )

    const activeLoras = useLoraStore(useShallow((s) => s.getActiveLoras()))
    const activeLora = activeLoras.length > 0 ? activeLoras[0] : null

    // Default values for sliders
    const guidanceDefault = activeLora ? 1 : 0
    const img2imgDefault = 0.6
    const loraScaleDefault = 1.25
    const maxImagesDefault = 3

    return (
        <div className="space-y-4 border-t border-border pt-4">
            {/* ── Presets ────────────────────────────────────────────── */}
            {presets.length > 0 || showSaveInput ? (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Presets</Label>
                        {!showSaveInput && (
                            <button
                                type="button"
                                onClick={() => setShowSaveInput(true)}
                                className="text-[10px] text-cyan-400/70 hover:text-cyan-400 transition-colors"
                            >
                                + Save current
                            </button>
                        )}
                    </div>
                    {showSaveInput && (
                        <div className="flex gap-1.5">
                            <Input
                                value={presetName}
                                onChange={(e) => setPresetName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSavePreset()
                                    if (e.key === 'Escape') { setShowSaveInput(false); setPresetName('') }
                                }}
                                placeholder="Preset name..."
                                className="h-7 text-xs bg-card border-border text-white"
                                autoFocus
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSavePreset}
                                disabled={!presetName.trim()}
                                className="h-7 px-2 bg-card border-border hover:bg-secondary"
                            >
                                <Save className="w-3 h-3" />
                            </Button>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                        {presets.map(p => (
                            <div key={p.id} className="group flex items-center gap-0.5">
                                <button
                                    type="button"
                                    onClick={() => handleLoadPreset(p.id)}
                                    className="text-xs px-2 py-0.5 rounded-md bg-card border border-border hover:border-cyan-400/50 hover:text-cyan-400 transition-colors text-muted-foreground"
                                >
                                    {p.name}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeletePreset(p.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-red-400 p-0.5"
                                    title="Delete preset"
                                >
                                    <Trash2 className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Settings</Label>
                    <button
                        type="button"
                        onClick={() => setShowSaveInput(true)}
                        className="text-[10px] text-muted-foreground/50 hover:text-cyan-400/70 transition-colors"
                    >
                        Save as preset
                    </button>
                </div>
            )}

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

            {/* Google Search - for Nano Banana 2 */}
            {supportsGoogleSearch && (
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="googleSearch"
                            checked={shotCreatorSettings.googleSearch || false}
                            onCheckedChange={(checked) => updateSettings({ googleSearch: checked === true })}
                        />
                        <Label htmlFor="googleSearch" className="text-sm text-foreground cursor-pointer">
                            Google Web Search
                        </Label>
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">
                        Use real-time web info (weather, scores, recent events)
                    </p>
                </div>
            )}

            {/* Image Search - for Nano Banana 2 */}
            {supportsImageSearch && (
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="imageSearch"
                            checked={shotCreatorSettings.imageSearch || false}
                            onCheckedChange={(checked) => updateSettings({ imageSearch: checked === true })}
                        />
                        <Label htmlFor="imageSearch" className="text-sm text-foreground cursor-pointer">
                            Google Image Search
                        </Label>
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">
                        Use web images as visual context (also enables web search)
                    </p>
                </div>
            )}

            {/* Prompt Influence - for z-image-turbo */}
            {supportsGuidanceScale && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Label className="text-sm text-foreground">Prompt Influence</Label>
                            <DefaultLabel
                                value={shotCreatorSettings.guidanceScale}
                                defaultValue={guidanceDefault}
                                onReset={() => updateSettings({ guidanceScale: guidanceDefault })}
                            />
                        </div>
                        <span className="text-sm text-muted-foreground font-medium tabular-nums">
                            {shotCreatorSettings.guidanceScale ?? guidanceDefault}
                        </span>
                    </div>
                    <Slider
                        value={[shotCreatorSettings.guidanceScale ?? guidanceDefault]}
                        onValueChange={([val]) => updateSettings({ guidanceScale: val })}
                        min={0}
                        max={20}
                        step={0.5}
                        className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                        {referenceImageCount > 0 && selectedModel === 'z-image-turbo'
                            ? 'How closely the output follows your prompt. 0 = fastest, higher = more faithful to what you typed.'
                            : <>Use 0 for turbo speed, higher for more prompt adherence{activeLora && ' (auto-set to 1 for LoRA)'}</>
                        }
                    </p>
                </div>
            )}

            {/* Image Transform - Z-Image Turbo with reference image */}
            {selectedModel === 'z-image-turbo' && referenceImageCount > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Label className="text-sm text-foreground">Image Transform</Label>
                            <DefaultLabel
                                value={shotCreatorSettings.img2imgStrength}
                                defaultValue={img2imgDefault}
                                onReset={() => updateSettings({ img2imgStrength: img2imgDefault })}
                            />
                        </div>
                        <span className="text-sm text-cyan-400 font-medium tabular-nums">
                            {shotCreatorSettings.img2imgStrength ?? img2imgDefault}
                        </span>
                    </div>
                    <Slider
                        value={[shotCreatorSettings.img2imgStrength ?? img2imgDefault]}
                        onValueChange={([val]) => updateSettings({ img2imgStrength: val })}
                        min={0}
                        max={1}
                        step={0.05}
                        className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                        How much to change your reference image. Low keeps the original look, high reimagines it completely.
                    </p>
                </div>
            )}

            {/* Camera LoRA Scale - only for qwen-image-edit (auto-injected camera angle LoRA) */}
            {selectedModel === 'qwen-image-edit' && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Label className="text-sm text-foreground">Camera LoRA Scale</Label>
                            <DefaultLabel
                                value={shotCreatorSettings.loraScale}
                                defaultValue={loraScaleDefault}
                                onReset={() => updateSettings({ loraScale: loraScaleDefault })}
                            />
                        </div>
                        <span className="text-sm text-cyan-400 font-medium tabular-nums">
                            {shotCreatorSettings.loraScale ?? loraScaleDefault}
                        </span>
                    </div>
                    <Slider
                        value={[shotCreatorSettings.loraScale ?? loraScaleDefault]}
                        onValueChange={([val]) => updateSettings({ loraScale: val })}
                        min={0}
                        max={2}
                        step={0.1}
                        className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                        Strength of the camera angle LoRA (0 = none, 1.25 = default, 2 = exaggerated)
                    </p>
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
                                maxImages: checked === true ? (shotCreatorSettings.maxImages || maxImagesDefault) : undefined
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
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm text-foreground">Max Images</Label>
                                    <DefaultLabel
                                        value={shotCreatorSettings.maxImages}
                                        defaultValue={maxImagesDefault}
                                        onReset={() => updateSettings({ maxImages: maxImagesDefault })}
                                    />
                                </div>
                                <span className="text-sm text-amber-400 font-medium">
                                    {shotCreatorSettings.maxImages || maxImagesDefault}
                                </span>
                            </div>
                            <Slider
                                value={[shotCreatorSettings.maxImages || maxImagesDefault]}
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
