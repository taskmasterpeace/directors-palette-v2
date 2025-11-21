'use client'

import { useEffect } from 'react'
import { useStoryCreatorStore } from '../../store/story-creator.store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BookOpen, Plus } from 'lucide-react'

/**
 * Story Creator Desktop View
 * Split panel layout for larger screens
 */
export default function StoryCreatorDesktop() {
    const { currentProject } = useStoryCreatorStore()

    useEffect(() => {
        // TODO: Load projects on mount
        console.log('Story Creator Desktop mounted')
    }, [])

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="border-b border-slate-700 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <BookOpen className="w-6 h-6 text-red-500" />
                        <div>
                            <h1 className="text-xl font-semibold text-white">Story Creator</h1>
                            <p className="text-sm text-slate-400">Transform stories into visual shots</p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Project
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-auto">
                {currentProject ? (
                    <Card className="p-6 bg-slate-800 border-slate-700">
                        <p className="text-slate-300">Project view coming soon...</p>
                        <p className="text-xs text-slate-500 mt-2">Project ID: {currentProject.id}</p>
                    </Card>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <BookOpen className="w-16 h-16 text-slate-600 mb-4" />
                        <h2 className="text-lg font-medium text-slate-300 mb-2">
                            No Project Selected
                        </h2>
                        <p className="text-sm text-slate-400 mb-6 max-w-md">
                            Create a new project or select an existing one to start generating shots from your story.
                        </p>
                        <Button
                            className="bg-red-600 hover:bg-red-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Your First Project
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
