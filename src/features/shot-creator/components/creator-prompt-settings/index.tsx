import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    Settings,
    ChevronDown,
    ChevronUp,
    Copy,
    X
} from 'lucide-react'
import { useShotCreatorStore } from "@/features/shot-creator/store/shot-creator.store"
import { useShotCreatorSettings } from "../../hooks"
import { getModelConfig, ModelId } from "@/config/index"
import { useCallback, useRef, useState } from "react"
import { clipboardManager } from '@/utils/clipboard-manager'
import { usePromptLibraryStore } from "../../store/prompt-library-store"
import AdvancedSettings from "./AdvancedSettings"
import BasicSettings from "./BasicSettings"
import { PromptActions } from "./PromptActions"
import { PromptBrowser } from "./PromptBrowser"
import { logger } from '@/lib/logger'

const CreatorPromptSettings = ({ compact, showResizeControls = true }: { compact?: boolean; showResizeControls?: boolean }) => {
    const [showAdvanced, setShowAdvanced] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const { shotCreatorPrompt, setShotCreatorPrompt, shotCreatorReferenceImages } = useShotCreatorStore()
    const { settings: shotCreatorSettings } = useShotCreatorSettings()
    const { quickPrompts, toggleQuickAccess } = usePromptLibraryStore()

    const modelConfig = getModelConfig((shotCreatorSettings.model || 'nano-banana-2') as ModelId)

    const referenceImagesCount = shotCreatorReferenceImages.length
    const hasNonPipelineImages = shotCreatorReferenceImages.some(img => img.url && !img.url.includes('pipeline'))

    // Insert preset into prompt at cursor position
    const insertPreset = useCallback((presetPrompt: string) => {
        if (textareaRef.current) {
            const textarea = textareaRef.current
            const start = textarea.selectionStart
            const end = textarea.selectionEnd
            const currentPrompt = shotCreatorPrompt

            // Insert preset at cursor position
            const newPrompt = currentPrompt.slice(0, start) + presetPrompt + currentPrompt.slice(end)
            setShotCreatorPrompt(newPrompt)

            // Update cursor position
            setTimeout(() => {
                textarea.focus()
                textarea.setSelectionRange(start + presetPrompt.length, start + presetPrompt.length)
            }, 0)
        }
    }, [shotCreatorPrompt, setShotCreatorPrompt])

    // Copy current settings
    const copySettings = useCallback(async () => {
        try {
            const settingsText = JSON.stringify(shotCreatorSettings, null, 2)
            await clipboardManager.writeText(settingsText)
        } catch (error) {
            logger.shotCreator.error('Copy settings failed', { error: error instanceof Error ? error.message : String(error) })
        }
    }, [shotCreatorSettings])

    return (
        <TooltipProvider>
            <div className="p-4 lg:p-6 space-y-4">
                {/* Prompt Input */}
                <PromptActions textareaRef={textareaRef} showResizeControls={showResizeControls} />

                {/* Basic Settings */}
                <BasicSettings />

                {/* Settings Gear Toggle */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                            {referenceImagesCount} ref{referenceImagesCount !== 1 ? 's' : ''} • {modelConfig.name}
                        </span>
                        {hasNonPipelineImages && (
                            <Badge variant="secondary" className="text-xs">
                                Ready
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={copySettings}
                                    className="text-muted-foreground hover:text-white h-8 w-8 p-0"
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy settings</TooltipContent>
                        </Tooltip>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-muted-foreground hover:text-white h-8 px-2"
                        >
                            <Settings className="w-4 h-4 mr-1" />
                            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                {/* Advanced Settings (expanded via gear) */}
                {showAdvanced && (
                    <div className="space-y-4 border-t border-border pt-4">
                        {/* Quick Presets - Dynamic from store */}
                        {!compact && (
                            <div className="space-y-2">
                                <Label className="text-sm text-foreground">Quick Presets</Label>
                                <div className="flex flex-wrap gap-2">
                                    {quickPrompts.length === 0 ? (
                                        <span className="text-xs text-muted-foreground">
                                            No quick presets. Star prompts in the library to add them here.
                                        </span>
                                    ) : (
                                        quickPrompts.map((prompt) => (
                                            <div key={prompt.id} className="group relative">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => insertPreset(prompt.prompt)}
                                                    className="text-xs bg-card border-border hover:bg-secondary text-foreground pr-6"
                                                >
                                                    {prompt.title}
                                                </Button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        toggleQuickAccess(prompt.id)
                                                    }}
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Prompt Library Browser */}
                        {!compact && (
                            <PromptBrowser onSelectPrompt={insertPreset} />
                        )}

                        <AdvancedSettings />
                    </div>
                )}
            </div>

        </TooltipProvider>
    )
}

export default CreatorPromptSettings