import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { R2StorageService } from '@/features/generation/services/r2-storage.service';

/**
 * Generate a fresh signed URL for an R2-stored video
 * POST /api/storage/sign-url
 * Body: { storagePath: string }
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { storagePath } = await request.json();

    if (!storagePath || !storagePath.startsWith('videos/')) {
      return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 });
    }

    // Verify the path belongs to this user
    if (!storagePath.startsWith(`videos/${auth.user.id}/`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const signedUrl = await R2StorageService.getSignedUrl(storagePath);
    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate URL' },
      { status: 500 }
    );
  }
}
