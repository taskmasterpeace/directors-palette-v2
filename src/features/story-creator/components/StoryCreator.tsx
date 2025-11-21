'use client'

import { useIsMobile } from '@/hooks/use-mobile'
import StoryCreatorDesktop from './desktop/StoryCreatorDesktop'
import StoryCreatorMobile from './mobile/StoryCreatorMobile'

/**
 * Story Creator - Main component
 * Conditionally renders desktop or mobile version based on screen size
 */
export default function StoryCreator() {
    const isMobile = useIsMobile()

    if (isMobile) {
        return <StoryCreatorMobile />
    }

    return <StoryCreatorDesktop />
}
