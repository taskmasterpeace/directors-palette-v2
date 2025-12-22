import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { StorybookProjectsService } from '@/features/storybook/services/storybook-projects.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/storybook/projects/[id]
 * Get a specific storybook project by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const project = await StorybookProjectsService.getProject(id, auth.user.id);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Project fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/storybook/projects/[id]
 * Update a specific storybook project
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { title, status, projectData } = body;

    const project = await StorybookProjectsService.updateProject(id, auth.user.id, {
      title,
      status,
      projectData,
    });

    return NextResponse.json({
      project,
      message: 'Project updated successfully',
    });
  } catch (error) {
    console.error('Project update error:', error);

    if (error instanceof Error && error.message === 'Project not found') {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update project', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/storybook/projects/[id]
 * Delete a specific storybook project
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    await StorybookProjectsService.deleteProject(id, auth.user.id);

    return NextResponse.json({
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Project delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete project', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
