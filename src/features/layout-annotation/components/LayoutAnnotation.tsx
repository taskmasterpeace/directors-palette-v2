import React from 'react'
import CanvasTabsContainer from "./CanvasTabsContainer"
import { useLayoutStore } from '@/store/layout.store'

interface LayoutAnnotationWrapperProps {
    className?: string
}

/**
 * Layout Annotation Wrapper
 * 
 * Now includes two tabs:
 * 1. Layout & Annotation - existing canvas tools
 * 2. Mask & Inpaint - draw-to-edit with AI inpainting
 */
const LayoutAnnotation: React.FC<LayoutAnnotationWrapperProps> = ({ className = '' }) => {
    const { setActiveTab } = useLayoutStore()

    return (
        <div className={`h-full ${className}`}>
            <CanvasTabsContainer className="h-full" setActiveTab={setActiveTab} />
        </div>
    )
}

export default LayoutAnnotation

