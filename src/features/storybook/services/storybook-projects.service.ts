/**
 * Storybook Projects Service
 * Handles all storybook project database operations
 */

import { getAPIClient } from '@/lib/db/client'

// Database project type (matches Supabase schema)
export interface DbStorybookProject {
  id: string
  user_id: string
  title: string
  status: string
  project_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

// API response project type
export interface StorybookProjectSummary {
  id: string
  title: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface StorybookProjectFull extends StorybookProjectSummary {
  projectData: Record<string, unknown>
}

// Helper to get an untyped client for storybook tables (not in main DB types yet)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getStorybookClient(): Promise<any> {
  return await getAPIClient()
}

/**
 * Storybook Projects Service
 */
export class StorybookProjectsService {
  /**
   * List all projects for a user
   */
  static async listProjects(userId: string): Promise<StorybookProjectSummary[]> {
    const supabase = await getStorybookClient()

    const { data, error } = await supabase
      .from('storybook_projects')
      .select('id, title, status, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching storybook projects:', error)
      throw new Error(`Failed to fetch projects: ${error.message}`)
    }

    return (data || []).map((p: DbStorybookProject) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }))
  }

  /**
   * Get a single project by ID
   */
  static async getProject(projectId: string, userId: string): Promise<StorybookProjectFull | null> {
    const supabase = await getStorybookClient()

    const { data, error } = await supabase
      .from('storybook_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Error fetching storybook project:', error)
      throw new Error(`Failed to fetch project: ${error.message}`)
    }

    const project = data as DbStorybookProject
    return {
      id: project.id,
      title: project.title,
      status: project.status,
      projectData: project.project_data,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    }
  }

  /**
   * Create a new project
   */
  static async createProject(
    userId: string,
    title: string,
    projectData: Record<string, unknown>,
    status: string = 'draft'
  ): Promise<StorybookProjectSummary> {
    const supabase = await getStorybookClient()

    const { data, error } = await supabase
      .from('storybook_projects')
      .insert({
        user_id: userId,
        title,
        status,
        project_data: projectData,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating storybook project:', error)
      throw new Error(`Failed to create project: ${error.message}`)
    }

    const project = data as DbStorybookProject
    return {
      id: project.id,
      title: project.title,
      status: project.status,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    }
  }

  /**
   * Update an existing project
   */
  static async updateProject(
    projectId: string,
    userId: string,
    updates: {
      title?: string
      status?: string
      projectData?: Record<string, unknown>
    }
  ): Promise<StorybookProjectSummary> {
    const supabase = await getStorybookClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.projectData !== undefined) updateData.project_data = updates.projectData

    const { data, error } = await supabase
      .from('storybook_projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Project not found')
      }
      console.error('Error updating storybook project:', error)
      throw new Error(`Failed to update project: ${error.message}`)
    }

    const project = data as DbStorybookProject
    return {
      id: project.id,
      title: project.title,
      status: project.status,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    }
  }

  /**
   * Delete a project
   */
  static async deleteProject(projectId: string, userId: string): Promise<void> {
    const supabase = await getStorybookClient()

    const { error } = await supabase
      .from('storybook_projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting storybook project:', error)
      throw new Error(`Failed to delete project: ${error.message}`)
    }
  }
}
