import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { StorybookProjectsService } from '@/features/storybook/services/storybook-projects.service';
import { lognog } from '@/lib/lognog';
import { logger } from '@/lib/logger'

/**
 * GET /api/storybook/projects
 * List all storybook projects for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const projects = await StorybookProjectsService.listProjects(auth.user.id);

    return NextResponse.json({ projects });
  } catch (error) {
    logger.api.error('Projects list error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to list projects', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/storybook/projects
 * Create a new storybook project or update existing one
 */
export async function POST(request: NextRequest) {
  const apiStart = Date.now();
  let userId: string | undefined;
  let userEmail: string | undefined;

  try {
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;
    userId = auth.user.id;
    userEmail = auth.user.email;

    const body = await request.json();
    const { id, title, status, projectData } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!projectData) {
      return NextResponse.json(
        { error: 'Project data is required' },
        { status: 400 }
      );
    }

    // If ID is provided, update existing project
    if (id) {
      const project = await StorybookProjectsService.updateProject(id, userId, {
        title,
        status: status || 'draft',
        projectData,
      });

      // Log project update
      lognog.info('storybook_project_updated', {
        type: 'business',
        event: 'storybook_project_updated',
        user_id: userId,
        user_email: userEmail,
        project_id: id,
        title,
      });

      lognog.info(`POST /api/storybook/projects 200 (${Date.now() - apiStart}ms)`, {
        type: 'api',
        route: '/api/storybook/projects',
        method: 'POST',
        status_code: 200,
        duration_ms: Date.now() - apiStart,
        user_id: userId,
        user_email: userEmail,
      });

      return NextResponse.json({
        project,
        message: 'Project updated successfully',
      });
    }

    // Create new project
    const project = await StorybookProjectsService.createProject(
      userId,
      title,
      projectData,
      status || 'draft'
    );

    // Log project creation
    lognog.info('storybook_project_created', {
      type: 'business',
      event: 'storybook_project_created',
      user_id: userId,
      user_email: userEmail,
      project_id: project.id,
      title,
    });

    lognog.info(`POST /api/storybook/projects 200 (${Date.now() - apiStart}ms)`, {
      type: 'api',
      route: '/api/storybook/projects',
      method: 'POST',
      status_code: 200,
      duration_ms: Date.now() - apiStart,
      user_id: userId,
      user_email: userEmail,
    });

    return NextResponse.json({
      project,
      message: 'Project created successfully',
    });
  } catch (error) {
    logger.api.error('Project save error', { error: error instanceof Error ? error.message : String(error) });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    lognog.error(errorMessage, {
      type: 'error',
      route: '/api/storybook/projects',
      user_id: userId,
      user_email: userEmail,
    });

    lognog.info(`POST /api/storybook/projects 500 (${Date.now() - apiStart}ms)`, {
      type: 'api',
      route: '/api/storybook/projects',
      method: 'POST',
      status_code: 500,
      duration_ms: Date.now() - apiStart,
      user_id: userId,
      user_email: userEmail,
      error: errorMessage,
    });

    return NextResponse.json(
      { error: 'Failed to save project', details: errorMessage },
      { status: 500 }
    );
  }
}
