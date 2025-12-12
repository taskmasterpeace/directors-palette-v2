'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Palette } from 'lucide-react'
import { useStoryboardStore } from '../../store'
import { PresetStyleSelector } from './PresetStyleSelector'

export function StyleGuideEditor() {
    const { selectedPresetStyle, setSelectedPresetStyle } = useStoryboardStore()

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Style Guide
                </CardTitle>
                <CardDescription>
                    Select a visual style that will be applied to all generated shots
                </CardDescription>
            </CardHeader>
            <CardContent>
                <PresetStyleSelector
                    selectedPresetId={selectedPresetStyle}
                    onSelect={setSelectedPresetStyle}
                />
            </CardContent>
        </Card>
    )
}
