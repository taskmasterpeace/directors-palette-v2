'use client'

import { useState } from 'react'
import { useStoryCreatorStore } from '../../store/story-creator.store'
import { StoryProjectService } from '../../services/story-project.service'
import { PromptGeneratorService } from '../../services/prompt-generator.service'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen, FileText, ListChecks, Activity } from 'lucide-react'
import StoryInputSection from '../sections/StoryInputSection'
import ShotsReviewSection from '../sections/ShotsReviewSection'
import GenerationQueueSection from '../sections/GenerationQueueSection'

/**
 * Story Creator Mobile View
 * Touch-optimized tabbed workflow
 */
export default function StoryCreatorMobile() {
    const {
        currentProject,
        shots,
        currentQueue,
        setCurrentProject,
        setShots,
        updateShot,
        setCurrentQueue
    } = useStoryCreatorStore()

    const [activeTab, setActiveTab] = useState('input')
    const [isExtracting, setIsExtracting] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)

    const handleExtractShots = async (title: string, storyText: string) => {
        setIsExtracting(true)
        try {
            // Create project
            const { data: project, error: projectError } = await StoryProjectService.createProject({
                title,
                story_text: storyText
            })

            if (projectError || !project) {
                throw new Error('Failed to create project')
            }

            setCurrentProject(project)

            // Extract scenes
            const scenes = PromptGeneratorService.extractScenes(storyText)

            // Extract entities
            const characters = PromptGeneratorService.extractCharacters(storyText)
            const locations = PromptGeneratorService.extractLocations(storyText)
            const entities = [
                ...characters.map(c => ({ type: 'character' as const, ...c })),
                ...locations.map(l => ({ type: 'location' as const, ...l }))
            ]

            // Generate prompts for each scene
            const shotInputs = scenes.map((scene) => {
                const { prompt, referenceTags } = PromptGeneratorService.generatePrompt(
                    scene.text,
                    entities
                )

                return {
                    project_id: project.id,
                    sequence_number: scene.sequence,
                    chapter: scene.chapter,
                    prompt,
                    reference_tags: referenceTags,
                    metadata: { originalText: scene.text }
                }
            })

            // Create shots in DB
            const { data: createdShots, error: shotsError } = await StoryProjectService.createShots(shotInputs)

            if (shotsError || !createdShots) {
                throw new Error('Failed to create shots')
            }

            setShots(createdShots)
            setActiveTab('review')
        } catch (error) {
            console.error('Error extracting shots:', error)
        } finally {
            setIsExtracting(false)
        }
    }

    const handleUpdateShot = async (shotId: string, updates: { prompt?: string; reference_tags?: string[] }) => {
        await StoryProjectService.updateShot(shotId, updates)
        updateShot(shotId, updates)
    }

    const handleGenerateAll = async () => {
        if (!currentProject || shots.length === 0) return

        setIsGenerating(true)
        try {
            const shotIds = shots.map(s => s.id)
            const { data: queue, error } = await StoryProjectService.createQueue({
                project_id: currentProject.id,
                shot_ids: shotIds
            })

            if (error || !queue) {
                throw new Error('Failed to create generation queue')
            }

            setCurrentQueue(queue)
            setActiveTab('queue')
        } catch (error) {
            console.error('Error creating queue:', error)
        } finally {
            setIsGenerating(false)
        }
    }

    const handlePauseResume = async () => {
        if (!currentQueue) return

        const newStatus = currentQueue.status === 'paused' ? 'processing' : 'paused'
        await StoryProjectService.updateQueueProgress(currentQueue.id, {
            status: newStatus,
            progress: currentQueue.progress,
            current_shot_index: currentQueue.current_shot_index
        })

        setCurrentQueue({ ...currentQueue, status: newStatus })
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header - Sticky */}
            <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 p-3">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-red-500" />
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-semibold text-white">Story Creator</h1>
                        {currentProject && (
                            <p className="text-xs text-slate-400 truncate">{currentProject.title}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabbed Content */}
            <div className="flex-1 overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <TabsList className="mx-3 mt-3 bg-slate-800 border border-slate-700 grid grid-cols-3 h-auto">
                        <TabsTrigger value="input" className="flex flex-col items-center gap-1 py-2 text-xs">
                            <FileText className="w-4 h-4" />
                            <span>Input</span>
                        </TabsTrigger>
                        <TabsTrigger value="review" className="flex flex-col items-center gap-1 py-2 text-xs" disabled={shots.length === 0}>
                            <ListChecks className="w-4 h-4" />
                            <span>Review</span>
                            {shots.length > 0 && (
                                <span className="absolute -top-1 -right-1 text-xs bg-red-600 text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                    {shots.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="queue" className="flex flex-col items-center gap-1 py-2 text-xs" disabled={!currentQueue}>
                            <Activity className="w-4 h-4" />
                            <span>Queue</span>
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-auto p-3">
                        <TabsContent value="input" className="mt-0">
                            <StoryInputSection
                                onExtractShots={handleExtractShots}
                                isExtracting={isExtracting}
                            />
                        </TabsContent>

                        <TabsContent value="review" className="mt-0">
                            <ShotsReviewSection
                                shots={shots}
                                onUpdateShot={handleUpdateShot}
                                onGenerateAll={handleGenerateAll}
                                isGenerating={isGenerating}
                            />
                        </TabsContent>

                        <TabsContent value="queue" className="mt-0">
                            <GenerationQueueSection
                                shots={shots}
                                queue={currentQueue}
                                onPauseResume={handlePauseResume}
                            />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    )
}
