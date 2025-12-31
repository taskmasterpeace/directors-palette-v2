import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { lognog } from '@/lib/lognog';
import { StorybookProjectsService } from '@/features/storybook/services/storybook-projects.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/storybook/projects/[id]
 * Get a specific storybook project by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const apiStart = Date.now();
  let userId: string | undefined;
  let userEmail: string | undefined;

  try {
    const { id } = await params;
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;
    userId = auth.user.id;
    userEmail = auth.user.email;

    const project = await StorybookProjectsService.getProject(id, auth.user.id);

    if (!project) {
      lognog.api({
        route: `/api/storybook/projects/${id}`,
        method: 'GET',
        status_code: 404,
        duration_ms: Date.now() - apiStart,
        user_id: userId,
        user_email: userEmail,
      });

      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    lognog.api({
      route: `/api/storybook/projects/${id}`,
      method: 'GET',
      status_code: 200,
      duration_ms: Date.now() - apiStart,
      user_id: userId,
      user_email: userEmail,
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Project fetch error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    lognog.error({
      message: errorMessage,
      route: '/api/storybook/projects/[id]',
      user_id: userId,
      user_email: userEmail,
    });

    lognog.api({
      route: '/api/storybook/projects/[id]',
      method: 'GET',
      status_code: 500,
      duration_ms: Date.now() - apiStart,
      user_id: userId,
      user_email: userEmail,
      error: errorMessage,
    });

    return NextResponse.json(
      { error: 'Failed to fetch project', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/storybook/projects/[id]
 * Update a specific storybook project
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const apiStart = Date.now();
  let userId: string | undefined;
  let userEmail: string | undefined;

  try {
    const { id } = await params;
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;
    userId = auth.user.id;
    userEmail = auth.user.email;

    const body = await request.json();
    const { title, status, projectData } = body;

    const project = await StorybookProjectsService.updateProject(id, auth.user.id, {
      title,
      status,
      projectData,
    });

    lognog.business({
      event: 'storybook_project_updated',
      user_id: userId,
      user_email: userEmail,
      project_id: id,
      title,
    });

    lognog.api({
      route: `/api/storybook/projects/${id}`,
      method: 'PUT',
      status_code: 200,
      duration_ms: Date.now() - apiStart,
      user_id: userId,
      user_email: userEmail,
    });

    return NextResponse.json({
      project,
      message: 'Project updated successfully',
    });
  } catch (error) {
    console.error('Project update error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (error instanceof Error && error.message === 'Project not found') {
      lognog.api({
        route: '/api/storybook/projects/[id]',
        method: 'PUT',
        status_code: 404,
        duration_ms: Date.now() - apiStart,
        user_id: userId,
        user_email: userEmail,
      });

      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    lognog.error({
      message: errorMessage,
      route: '/api/storybook/projects/[id]',
      user_id: userId,
      user_email: userEmail,
    });

    lognog.api({
      route: '/api/storybook/projects/[id]',
      method: 'PUT',
      status_code: 500,
      duration_ms: Date.now() - apiStart,
      user_id: userId,
      user_email: userEmail,
      error: errorMessage,
    });

    return NextResponse.json(
      { error: 'Failed to update project', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/storybook/projects/[id]
 * Delete a specific storybook project
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const apiStart = Date.now();
  let userId: string | undefined;
  let userEmail: string | undefined;

  try {
    const { id } = await params;
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;
    userId = auth.user.id;
    userEmail = auth.user.email;

    await StorybookProjectsService.deleteProject(id, auth.user.id);

    lognog.business({
      event: 'storybook_project_deleted',
      user_id: userId,
      user_email: userEmail,
      project_id: id,
    });

    lognog.api({
      route: `/api/storybook/projects/${id}`,
      method: 'DELETE',
      status_code: 200,
      duration_ms: Date.now() - apiStart,
      user_id: userId,
      user_email: userEmail,
    });

    return NextResponse.json({
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Project delete error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    lognog.error({
      message: errorMessage,
      route: '/api/storybook/projects/[id]',
      user_id: userId,
      user_email: userEmail,
    });

    lognog.api({
      route: '/api/storybook/projects/[id]',
      method: 'DELETE',
      status_code: 500,
      duration_ms: Date.now() - apiStart,
      user_id: userId,
      user_email: userEmail,
      error: errorMessage,
    });

    return NextResponse.json(
      { error: 'Failed to delete project', details: errorMessage },
      { status: 500 }
    );
  }
}
