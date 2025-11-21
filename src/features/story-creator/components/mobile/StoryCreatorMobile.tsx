'use client'

import { useEffect } from 'react'
import { useStoryCreatorStore } from '../../store/story-creator.store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BookOpen, Plus } from 'lucide-react'

/**
 * Story Creator Mobile View
 * Touch-optimized vertical layout with accordions
 */
export default function StoryCreatorMobile() {
    const { currentProject } = useStoryCreatorStore()

    useEffect(() => {
        // TODO: Load projects on mount
        console.log('Story Creator Mobile mounted')
    }, [])

    return (
        <div className="flex flex-col h-full">
            {/* Header - Sticky */}
            <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-red-500" />
                        <h1 className="text-lg font-semibold text-white">Story Creator</h1>
                    </div>
                    <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 min-h-[44px]"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-auto">
                {currentProject ? (
                    <Card className="p-4 bg-slate-800 border-slate-700">
                        <p className="text-slate-300 text-sm">Project view coming soon...</p>
                        <p className="text-xs text-slate-500 mt-2">Project: {currentProject.title}</p>
                    </Card>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <BookOpen className="w-12 h-12 text-slate-600 mb-3" />
                        <h2 className="text-base font-medium text-slate-300 mb-2">
                            No Project
                        </h2>
                        <p className="text-sm text-slate-400 mb-6 px-4">
                            Create a project to generate shots from your story
                        </p>
                        <Button
                            className="bg-red-600 hover:bg-red-700 min-h-[48px] px-6"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Project
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
