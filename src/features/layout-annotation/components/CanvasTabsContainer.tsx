'use client'

/**
 * Canvas Tabs Container
 * 
 * Wrapper with two tabs:
 * 1. Layout & Annotation (existing)
 * 2. Mask & Inpaint (new Enhancor-style)
 */

import React from 'react'
import LayoutAnnotationTab from "./LayoutAnnotationTab"

interface CanvasTabsContainerProps {
    className?: string
    setActiveTab?: (tab: string) => void
}

export function CanvasTabsContainer({ className, setActiveTab }: CanvasTabsContainerProps) {
    // const [activeMode, setActiveMode] = useState<"layout" | "inpaint">("layout")

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Mode Tabs - Commented out to focus on Shot Canvas
            <div className="order-2 sm:order-1 pb-2 sm:pt-0">
                <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as "layout" | "inpaint")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-12 sm:h-10 bg-background/80 border border-border/50">
                        <TabsTrigger
                            value="layout"
                            className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary h-10 sm:h-8"
                        >
                            <Layers className="w-4 h-4" />
                            <span className="hidden sm:inline">Layout & Annotate</span>
                            <span className="sm:hidden">Layout</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="inpaint"
                            className="flex items-center gap-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 h-10 sm:h-8"
                        >
                            <Wand2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Mask & Inpaint</span>
                            <span className="sm:hidden">Inpaint</span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            */}

            {/* Content */}
            <div className="flex-1 order-1 sm:order-2 min-h-0 overflow-hidden">
                <LayoutAnnotationTab setActiveTab={setActiveTab} />
                {/* 
                {activeMode === "layout" ? (
                    <LayoutAnnotationTab setActiveTab={setActiveTab} />
                ) : (
                    <MaskEditorTab />
                )}
                */}
            </div>
        </div>
    )
}

export default CanvasTabsContainer
