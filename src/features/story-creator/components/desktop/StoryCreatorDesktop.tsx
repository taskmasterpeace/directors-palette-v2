'use client'

import { useState } from 'react'
import { useStoryCreatorStore } from '../../store/story-creator.store'
import { StoryProjectService } from '../../services/story-project.service'
import { PromptGeneratorService } from '../../services/prompt-generator.service'
import { LLMService } from '../../services/llm.service'
import { useStoryGeneration } from '../../hooks/useStoryGeneration'
import { validateBracketSyntax } from '@/features/shot-creator/helpers/prompt-syntax-feedback'
import { toast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, ListChecks, Activity, Users } from 'lucide-react'
import StoryInputSection from '../sections/StoryInputSection'
import EntitiesSection from '../sections/EntitiesSection'
import ShotsReviewSection from '../sections/ShotsReviewSection'
import GenerationQueueSection from '../sections/GenerationQueueSection'
import { MissingReferencesWarning } from '../MissingReferencesWarning'
import type { GeneratedShot } from '@/features/story-creator/services/shot-augmentation.service'

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
        setExtractedEntities
    } = useStoryCreatorStore()

    const [activeTab, setActiveTab] = useState('input')
    const [isExtracting, setIsExtracting] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [showMissingReferencesModal, setShowMissingReferencesModal] = useState(false)
    const [missingReferences, setMissingReferences] = useState<Array<{ tag: string; shotNumbers: number[] }>>([])

    const { checkMissingReferences } = useStoryGeneration()

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

                    // Store entities in zustand for later use
                    const extractedEntities = [
                        ...entities.characters.map(c => ({ type: 'character' as const, ...c })),
                        ...entities.locations.map(l => ({ type: 'location' as const, ...l }))
                    ]
                    setExtractedEntities(extractedEntities)

                    // Generate prompts for each scene
                    shotInputs = await Promise.all(scenes.map(async (scene) => {
                        const { prompt, referenceTags } = await LLMService.generateImagePrompt(
                            scene,
                            entities
                        )

                        return {
                            project_id: project.id,
                            sequence_number: Math.floor(scene.sequence), // Ensure integer for database
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

                // Store entities in zustand for later use
                setExtractedEntities(entities)

                shotInputs = scenes.map((scene) => {
                    const { prompt, referenceTags } = PromptGeneratorService.generatePrompt(
                        scene.text,
                        entities
                    )

                    return {
                        project_id: project.id,
                        sequence_number: Math.floor(scene.sequence), // Ensure integer for database
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
            setActiveTab('entities')
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

    const handleAddShots = async (generatedShots: GeneratedShot[]) => {
        if (!currentProject) return

        try {
            // Create shots in database
            const shotInputs = generatedShots.map(gs => ({
                project_id: currentProject.id,
                sequence_number: gs.sequenceNumber,
                chapter: gs.chapter,
                prompt: gs.prompt,
                reference_tags: gs.referenceTags,
                metadata: {
                    aiGenerated: true,
                    ...gs.metadata
                }
            }))

            const { data: newShots, error } = await StoryProjectService.createShots(shotInputs)

            if (error || !newShots) {
                throw new Error('Failed to create augmented shots')
            }

            // Add to store
            setShots([...shots, ...newShots])

            toast({
                title: 'Shots Added',
                description: `Added ${newShots.length} shots with bracket variations`,
            })
        } catch (error) {
            console.error('Error adding shots:', error)
            toast({
                title: 'Failed to Add Shots',
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: 'destructive'
            })
        }
    }

    const handleGenerateAll = async () => {
        if (!currentProject || shots.length === 0) return

        // Validate bracket syntax in all prompts
        const invalidShots: Array<{ shotNumber: number; error: string; suggestion?: string }> = []
        shots.forEach((shot) => {
            const validation = validateBracketSyntax(shot.prompt)
            if (!validation.isValid) {
                invalidShots.push({
                    shotNumber: shot.sequence_number,
                    error: validation.error || 'Invalid syntax',
                    suggestion: validation.suggestion
                })
            }
        })

        if (invalidShots.length > 0) {
            const errorMessages = invalidShots.slice(0, 3).map(s =>
                `Shot ${s.shotNumber}: ${s.error}`
            ).join('\n')
            const additionalCount = invalidShots.length > 3 ? ` (+${invalidShots.length - 3} more)` : ''

            toast({
                title: 'Invalid Bracket Syntax',
                description: `${errorMessages}${additionalCount}\n\nPlease fix syntax errors before generating.`,
                variant: 'destructive'
            })
            return
        }

        // Check for missing references
        const missing = checkMissingReferences(shots)
        if (missing.length > 0) {
            setMissingReferences(missing)
            setShowMissingReferencesModal(true)
            return
        }

        // All validations passed, proceed with generation
        await proceedWithGeneration()
    }

    const proceedWithGeneration = async () => {
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

    const handleAssignReferences = () => {
        setShowMissingReferencesModal(false)
        setActiveTab('entities')
    }

    const handleContinueAnyway = async () => {
        setShowMissingReferencesModal(false)
        await proceedWithGeneration()
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
        <div className="h-full flex flex-col">
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
                            Entities
                            {extractedEntities.length > 0 && (
                                <span className="ml-1 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                                    {extractedEntities.length}
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
                                onContinue={() => setActiveTab('review')}
                            />
                        </TabsContent>

                        <TabsContent value="review" className="mt-0">
                            <ShotsReviewSection
                                shots={shots}
                                entities={extractedEntities}
                                onUpdateShot={handleUpdateShot}
                                onAddShots={handleAddShots}
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

            {/* Missing References Warning Modal */}
            <MissingReferencesWarning
                open={showMissingReferencesModal}
                onOpenChange={setShowMissingReferencesModal}
                missingReferences={missingReferences}
                onAssignReferences={handleAssignReferences}
                onContinueAnyway={handleContinueAnyway}
            />
        </div>
    )
}
