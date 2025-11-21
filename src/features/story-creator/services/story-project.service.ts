/**
 * Story Project Service - CRUD operations for story projects and shots
 * Interfaces with Supabase database
 *
 * Note: story_projects and story_shots tables exist in migrations but types not yet regenerated
 * Using type assertions until Supabase types are updated
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary: story tables exist but types not regenerated
import { getClient } from '@/lib/db/client'
import type {
    StoryProject,
    CreateStoryProjectInput,
    UpdateStoryProjectInput,
    StoryShot,
    CreateShotInput,
    UpdateShotInput,
    GenerationQueue,
    CreateGenerationQueueInput,
    QueueProgressUpdate
} from '../types/story.types'

export class StoryProjectService {
    // ==================== PROJECT OPERATIONS ====================

    /**
     * Get all projects for the current user
     */
    static async getProjects() {
        try {
            const supabase = await getClient()
            // @ts-expect-error - story_projects table exists but types not regenerated yet
            const { data, error } = await supabase
                .from('story_projects')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            return { data: data as StoryProject[], error: null }
        } catch (error) {
            console.error('Error fetching projects:', error)
            return { data: null, error }
        }
    }

    /**
     * Get a single project by ID
     */
    static async getProject(projectId: string) {
        try {
            const supabase = await getClient()
            const { data, error } = await supabase
                .from('story_projects')
                .select('*')
                .eq('id', projectId)
                .single()

            if (error) throw error

            return { data: data as StoryProject, error: null }
        } catch (error) {
            console.error('Error fetching project:', error)
            return { data: null, error }
        }
    }

    /**
     * Create a new story project
     */
    static async createProject(input: CreateStoryProjectInput) {
        try {
            const supabase = await getClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not authenticated')

            const { data, error } = await supabase
                .from('story_projects')
                .insert({
                    user_id: user.id,
                    title: input.title,
                    story_text: input.story_text,
                    status: 'draft',
                    metadata: input.metadata || {}
                })
                .select()
                .single()

            if (error) throw error

            return { data: data as StoryProject, error: null }
        } catch (error) {
            console.error('Error creating project:', error)
            return { data: null, error }
        }
    }

    /**
     * Update a story project
     */
    static async updateProject(projectId: string, updates: UpdateStoryProjectInput) {
        try {
            const supabase = await getClient()
            const { data, error } = await supabase
                .from('story_projects')
                .update(updates)
                .eq('id', projectId)
                .select()
                .single()

            if (error) throw error

            return { data: data as StoryProject, error: null }
        } catch (error) {
            console.error('Error updating project:', error)
            return { data: null, error }
        }
    }

    /**
     * Delete a story project (cascades to shots)
     */
    static async deleteProject(projectId: string) {
        try {
            const supabase = await getClient()
            const { error } = await supabase
                .from('story_projects')
                .delete()
                .eq('id', projectId)

            if (error) throw error

            return { error: null }
        } catch (error) {
            console.error('Error deleting project:', error)
            return { error }
        }
    }

    // ==================== SHOT OPERATIONS ====================

    /**
     * Get all shots for a project
     */
    static async getShots(projectId: string) {
        try {
            const supabase = await getClient()
            const { data, error } = await supabase
                .from('story_shots')
                .select('*')
                .eq('project_id', projectId)
                .order('sequence_number', { ascending: true })

            if (error) throw error

            return { data: data as StoryShot[], error: null }
        } catch (error) {
            console.error('Error fetching shots:', error)
            return { data: null, error }
        }
    }

    /**
     * Get a single shot by ID
     */
    static async getShot(shotId: string) {
        try {
            const supabase = await getClient()
            const { data, error } = await supabase
                .from('story_shots')
                .select('*')
                .eq('id', shotId)
                .single()

            if (error) throw error

            return { data: data as StoryShot, error: null }
        } catch (error) {
            console.error('Error fetching shot:', error)
            return { data: null, error }
        }
    }

    /**
     * Create multiple shots at once (bulk insert)
     */
    static async createShots(shots: CreateShotInput[]) {
        try {
            const supabase = await getClient()
            const { data, error } = await supabase
                .from('story_shots')
                .insert(shots)
                .select()

            if (error) throw error

            return { data: data as StoryShot[], error: null }
        } catch (error) {
            console.error('Error creating shots:', error)
            return { data: null, error }
        }
    }

    /**
     * Create a single shot
     */
    static async createShot(input: CreateShotInput) {
        try {
            const supabase = await getClient()
            const { data, error } = await supabase
                .from('story_shots')
                .insert({
                    project_id: input.project_id,
                    sequence_number: input.sequence_number,
                    chapter: input.chapter,
                    prompt: input.prompt,
                    reference_tags: input.reference_tags || [],
                    status: 'ready',
                    metadata: input.metadata || {}
                })
                .select()
                .single()

            if (error) throw error

            return { data: data as StoryShot, error: null }
        } catch (error) {
            console.error('Error creating shot:', error)
            return { data: null, error }
        }
    }

    /**
     * Update a shot
     */
    static async updateShot(shotId: string, updates: UpdateShotInput) {
        try {
            const supabase = await getClient()
            const { data, error } = await supabase
                .from('story_shots')
                .update(updates)
                .eq('id', shotId)
                .select()
                .single()

            if (error) throw error

            return { data: data as StoryShot, error: null }
        } catch (error) {
            console.error('Error updating shot:', error)
            return { data: null, error }
        }
    }

    /**
     * Delete a shot
     */
    static async deleteShot(shotId: string) {
        try {
            const supabase = await getClient()
            const { error } = await supabase
                .from('story_shots')
                .delete()
                .eq('id', shotId)

            if (error) throw error

            return { error: null }
        } catch (error) {
            console.error('Error deleting shot:', error)
            return { error }
        }
    }

    /**
     * Delete multiple shots at once
     */
    static async deleteShots(shotIds: string[]) {
        try {
            const supabase = await getClient()
            const { error } = await supabase
                .from('story_shots')
                .delete()
                .in('id', shotIds)

            if (error) throw error

            return { error: null }
        } catch (error) {
            console.error('Error deleting shots:', error)
            return { error }
        }
    }

    // ==================== GENERATION QUEUE OPERATIONS ====================

    /**
     * Create a new generation queue
     */
    static async createQueue(input: CreateGenerationQueueInput) {
        try {
            const supabase = await getClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not authenticated')

            const { data, error } = await supabase
                .from('generation_queue')
                .insert({
                    user_id: user.id,
                    project_id: input.project_id,
                    shot_ids: input.shot_ids,
                    status: 'pending',
                    progress: 0,
                    current_shot_index: 0
                })
                .select()
                .single()

            if (error) throw error

            return { data: data as GenerationQueue, error: null }
        } catch (error) {
            console.error('Error creating queue:', error)
            return { data: null, error }
        }
    }

    /**
     * Get a generation queue by ID
     */
    static async getQueue(queueId: string) {
        try {
            const supabase = await getClient()
            const { data, error } = await supabase
                .from('generation_queue')
                .select('*')
                .eq('id', queueId)
                .single()

            if (error) throw error

            return { data: data as GenerationQueue, error: null }
        } catch (error) {
            console.error('Error fetching queue:', error)
            return { data: null, error }
        }
    }

    /**
     * Update queue progress
     */
    static async updateQueueProgress(queueId: string, updates: QueueProgressUpdate) {
        try {
            const supabase = await getClient()
            const { data, error} = await supabase
                .from('generation_queue')
                .update(updates)
                .eq('id', queueId)
                .select()
                .single()

            if (error) throw error

            return { data: data as GenerationQueue, error: null }
        } catch (error) {
            console.error('Error updating queue:', error)
            return { data: null, error }
        }
    }

    /**
     * Delete a generation queue
     */
    static async deleteQueue(queueId: string) {
        try {
            const supabase = await getClient()
            const { error } = await supabase
                .from('generation_queue')
                .delete()
                .eq('id', queueId)

            if (error) throw error

            return { error: null }
        } catch (error) {
            console.error('Error deleting queue:', error)
            return { error }
        }
    }

    /**
     * Get active queues for a project
     */
    static async getActiveQueues(projectId: string) {
        try {
            const supabase = await getClient()
            const { data, error } = await supabase
                .from('generation_queue')
                .select('*')
                .eq('project_id', projectId)
                .in('status', ['pending', 'processing', 'paused'])
                .order('created_at', { ascending: false })

            if (error) throw error

            return { data: data as GenerationQueue[], error: null }
        } catch (error) {
            console.error('Error fetching active queues:', error)
            return { data: null, error }
        }
    }
}
