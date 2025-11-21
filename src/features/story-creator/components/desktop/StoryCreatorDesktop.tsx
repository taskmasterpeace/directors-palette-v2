'use client'

import { useState } from 'react'
import { useStoryCreatorStore } from '../../store/story-creator.store'
import { StoryProjectService } from '../../services/story-project.service'
import { PromptGeneratorService } from '../../services/prompt-generator.service'
import { LLMService } from '../../services/llm.service'
import type { ExtractedEntity } from '../../types/story.types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen, FileText, Users, ListChecks, Activity, Film } from 'lucide-react'
import StoryInputSection from '../sections/StoryInputSection'
import EntitiesSection from '../sections/EntitiesSection'
import TitleCardsSection from '../sections/TitleCardsSection'
import ShotsReviewSection from '../sections/ShotsReviewSection'
import GenerationQueueSection from '../sections/GenerationQueueSection'
import { TitleCardService } from '../../services/title-card.service'

/**
 * Story Creator Desktop View
 * Tabbed workflow for story processing
 */
export default function StoryCreatorDesktop() {
    const {
        currentProject,
        shots,
        currentQueue,
        extractedEntities,
        setCurrentProject,
        setShots,
        updateShot,
        setCurrentQueue,
        setExtractedEntities,
        updateEntity
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

            let shotInputs: Array<{
                project_id: string
                sequence_number: number
                chapter?: string
                prompt: string
                reference_tags: string[]
                metadata: { originalText: string }
            }> = []

            // Try LLM extraction first if configured
            if (LLMService.isConfigured()) {
                try {
                    console.log('🤖 Using LLM for scene extraction...')

                    // Extract scenes and entities with AI
                    const [scenes, entities] = await Promise.all([
                        LLMService.extractScenes(storyText),
                        LLMService.extractEntities(storyText)
                    ])

                    console.log(`📝 Extracted ${scenes.length} scenes, ${entities.characters.length} characters, ${entities.locations.length} locations`)

                    // Store entities for user to assign references
                    const allEntities = [
                        ...entities.characters.map(c => ({ ...c, type: 'character' as const })),
                        ...entities.locations.map(l => ({ ...l, type: 'location' as const }))
                    ]
                    setExtractedEntities(allEntities)

                    // Generate initial prompts (will be regenerated after user assigns refs)
                    shotInputs = await Promise.all(scenes.map(async (scene) => {
                        const { prompt, referenceTags } = await LLMService.generateImagePrompt(
                            scene,
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
                    }))
                } catch (llmError) {
                    console.warn('LLM extraction failed, falling back to basic extraction:', llmError)
                }
            }

            // Fallback to basic extraction if LLM not configured or failed
            if (shotInputs.length === 0) {
                console.log('📝 Using basic text extraction...')

                const scenes = PromptGeneratorService.extractScenes(storyText)
                const characters = PromptGeneratorService.extractCharacters(storyText)
                const locations = PromptGeneratorService.extractLocations(storyText)
                const entities = [
                    ...characters.map(c => ({ type: 'character' as const, ...c })),
                    ...locations.map(l => ({ type: 'location' as const, ...l }))
                ]

                shotInputs = scenes.map((scene) => {
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
            }

            // Create shots in DB
            const { data: createdShots, error: shotsError } = await StoryProjectService.createShots(shotInputs)

            if (shotsError || !createdShots) {
                throw new Error('Failed to create shots')
            }

            setShots(createdShots)
            setActiveTab(extractedEntities.length > 0 ? 'entities' : 'review')
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

    /**
     * Regenerate ALL prompts when entity references change (global find/replace)
     * This is called after user assigns/removes reference images
     */
    const regenerateAllPrompts = async () => {
        if (!currentProject || shots.length === 0) return

        console.log('🔄 Regenerating all prompts with updated references...')

        try {
            // Build reference images map from entities
            const referenceMap = new Map<string, string>()
            extractedEntities.forEach(entity => {
                if (entity.referenceImageUrl) {
                    referenceMap.set(entity.tag, entity.referenceImageUrl)
                }
            })

            // Re-extract entities for generateImagePrompt (need characters/locations separated)
            const entities = {
                characters: extractedEntities.filter(e => e.type === 'character').map(e => ({
                    name: e.name,
                    tag: e.tag,
                    description: e.description || ''
                })),
                locations: extractedEntities.filter(e => e.type === 'location').map(e => ({
                    name: e.name,
                    tag: e.tag,
                    description: e.description || ''
                }))
            }

            // Regenerate each shot's prompt
            const updatedShots = await Promise.all(shots.map(async (shot) => {
                // Reconstruct scene from shot metadata
                const scene = {
                    sequence: shot.sequence_number,
                    chapter: shot.chapter,
                    text: shot.metadata.originalText || '',
                    visualDescription: shot.prompt, // Use existing prompt as base
                    characters: shot.reference_tags
                        .filter(tag => tag.startsWith('@'))
                        .map(tag => tag.slice(1)) // Remove @ prefix
                        .map(tag => {
                            const entity = entities.characters.find(c => c.tag === tag)
                            return entity?.name || tag
                        })
                        .filter(name => name),
                    location: shot.chapter || '',
                    mood: '',
                    cameraAngle: ''
                }

                // Generate new prompt with current references
                const { prompt, referenceTags } = await LLMService.generateImagePrompt(
                    scene,
                    entities,
                    referenceMap
                )

                return {
                    shotId: shot.id,
                    updates: {
                        prompt,
                        reference_tags: referenceTags
                    }
                }
            }))

            // Update all shots in DB and store
            for (const { shotId, updates } of updatedShots) {
                await StoryProjectService.updateShot(shotId, updates)
                updateShot(shotId, updates)
            }

            console.log(`✅ Regenerated ${updatedShots.length} prompts`)
        } catch (error) {
            console.error('Error regenerating prompts:', error)
        }
    }

    /**
     * Handle entity update and trigger prompt regeneration if reference changed
     */
    const handleUpdateEntity = (tag: string, updates: Partial<ExtractedEntity>) => {
        const oldEntity = extractedEntities.find(e => e.tag === tag)
        const referenceChanged = updates.referenceImageUrl !== undefined &&
                                 updates.referenceImageUrl !== oldEntity?.referenceImageUrl

        updateEntity(tag, updates)

        // If reference was assigned/removed, regenerate all prompts
        if (referenceChanged) {
            console.log(`🎯 Reference changed for @${tag}, regenerating all prompts...`)
            // Use setTimeout to allow state to update first
            setTimeout(() => regenerateAllPrompts(), 100)
        }
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

    // Title Cards handlers
    const handleCreateTitleCard = async (title: string, sequenceNumber: number, style: string) => {
        if (!currentProject) return

        const titleCardInput = TitleCardService.createCustomTitleCard(
            currentProject.id,
            title,
            sequenceNumber,
            style
        )

        const { data: createdShot, error } = await StoryProjectService.createShots([titleCardInput])

        if (error || !createdShot) {
            console.error('Failed to create title card:', error)
            return
        }

        // Add to shots state
        setShots([...shots, ...createdShot].sort((a, b) => a.sequence_number - b.sequence_number))
    }

    const handleUpdateTitleCard = async (shotId: string, title: string, style: string) => {
        const shot = shots.find(s => s.id === shotId)
        if (!shot) return

        const newPrompt = TitleCardService.generateTitleCardPrompt(title, style)

        const updates = {
            prompt: newPrompt,
            chapter: title,
            metadata: {
                ...shot.metadata,
                title_card_config: {
                    chapter_name: title,
                    style_description: style,
                    generated_automatically: shot.metadata.title_card_config?.generated_automatically || false
                }
            }
        }

        await StoryProjectService.updateShot(shotId, updates)
        updateShot(shotId, updates)
    }

    const handleDeleteTitleCard = async (shotId: string) => {
        await StoryProjectService.deleteShot(shotId)
        setShots(shots.filter(s => s.id !== shotId))
    }

    const handleGenerateAllTitleCards = async (style: string) => {
        if (!currentProject) return

        const titleCardInputs = TitleCardService.generateAllTitleCards(
            currentProject.id,
            currentProject.story_text,
            shots,
            style
        )

        if (titleCardInputs.length === 0) {
            console.log('No chapters detected for title cards')
            return
        }

        // Filter out chapters that already have title cards
        const newTitleCards = titleCardInputs.filter(tc =>
            !TitleCardService.hasTitleCard(shots, tc.chapter || '')
        )

        if (newTitleCards.length === 0) {
            console.log('All chapters already have title cards')
            return
        }

        const { data: createdShots, error } = await StoryProjectService.createShots(newTitleCards)

        if (error || !createdShots) {
            console.error('Failed to create title cards:', error)
            return
        }

        // Add to shots state and sort by sequence
        setShots([...shots, ...createdShots].sort((a, b) => a.sequence_number - b.sequence_number))
        console.log(`✅ Created ${createdShots.length} title cards`)
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="border-b border-slate-700 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <BookOpen className="w-6 h-6 text-red-500" />
                        <div>
                            <h1 className="text-xl font-semibold text-white">Story Creator</h1>
                            {currentProject && (
                                <p className="text-sm text-slate-400">{currentProject.title}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabbed Content */}
            <div className="flex-1 overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <TabsList className="mx-4 mt-4 bg-slate-800 border border-slate-700">
                        <TabsTrigger value="input" className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Story Input
                        </TabsTrigger>
                        <TabsTrigger value="entities" className="flex items-center gap-2" disabled={extractedEntities.length === 0}>
                            <Users className="w-4 h-4" />
                            Characters
                            {extractedEntities.length > 0 && (
                                <span className="ml-1 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                                    {extractedEntities.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="title-cards" className="flex items-center gap-2" disabled={!currentProject || shots.length === 0}>
                            <Film className="w-4 h-4" />
                            Title Cards
                            {TitleCardService.getTitleCardShots(shots).length > 0 && (
                                <span className="ml-1 text-xs bg-yellow-600 text-white px-1.5 py-0.5 rounded-full">
                                    {TitleCardService.getTitleCardShots(shots).length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="review" className="flex items-center gap-2" disabled={shots.length === 0}>
                            <ListChecks className="w-4 h-4" />
                            Shots Review
                            {shots.length > 0 && (
                                <span className="ml-1 text-xs bg-red-600 text-white px-1.5 py-0.5 rounded-full">
                                    {shots.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="queue" className="flex items-center gap-2" disabled={!currentQueue}>
                            <Activity className="w-4 h-4" />
                            Generation
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-auto p-6">
                        <TabsContent value="input" className="mt-0">
                            <StoryInputSection
                                onExtractShots={handleExtractShots}
                                isExtracting={isExtracting}
                            />
                        </TabsContent>

                        <TabsContent value="entities" className="mt-0">
                            <EntitiesSection
                                entities={extractedEntities}
                                onUpdateEntity={handleUpdateEntity}
                                onContinue={() => setActiveTab('title-cards')}
                            />
                        </TabsContent>

                        <TabsContent value="title-cards" className="mt-0">
                            {currentProject && (
                                <TitleCardsSection
                                    projectId={currentProject.id}
                                    storyText={currentProject.story_text}
                                    shots={shots}
                                    onCreateTitleCard={handleCreateTitleCard}
                                    onUpdateTitleCard={handleUpdateTitleCard}
                                    onDeleteTitleCard={handleDeleteTitleCard}
                                    onGenerateAllTitleCards={handleGenerateAllTitleCards}
                                />
                            )}
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
