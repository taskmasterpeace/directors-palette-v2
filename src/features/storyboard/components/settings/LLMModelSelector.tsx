'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStoryboardStore } from '../../store'
import { DEFAULT_OPENROUTER_MODELS } from '../../types/storyboard.types'

export function LLMModelSelector() {
    const { selectedModel, setSelectedModel } = useStoryboardStore()

    return (
        <div className="space-y-2">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                    {DEFAULT_OPENROUTER_MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                            <div className="flex flex-col">
                                <span className="font-medium">{model.name}</span>
                                <span className="text-xs text-muted-foreground">
                                    {model.description}
                                    {model.costPer1M && (
                                        <> - ${model.costPer1M.input}/${model.costPer1M.output} per 1M tokens</>
                                    )}
                                </span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
