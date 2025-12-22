import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { StorybookProjectsService } from '@/features/storybook/services/storybook-projects.service';

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
    console.error('Projects list error:', error);
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
  try {
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

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
      const project = await StorybookProjectsService.updateProject(id, auth.user.id, {
        title,
        status: status || 'draft',
        projectData,
      });

      return NextResponse.json({
        project,
        message: 'Project updated successfully',
      });
    }

    // Create new project
    const project = await StorybookProjectsService.createProject(
      auth.user.id,
      title,
      projectData,
      status || 'draft'
    );

    return NextResponse.json({
      project,
      message: 'Project created successfully',
    });
  } catch (error) {
    console.error('Project save error:', error);
    return NextResponse.json(
      { error: 'Failed to save project', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
