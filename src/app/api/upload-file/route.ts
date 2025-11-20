import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB server-side limit
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    // ✅ SECURITY: Verify authentication first
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth; // Return 401 error

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'File too large',
          details: `Maximum file size is 50MB. Your file: ${(file.size / 1024 / 1024).toFixed(1)}MB`
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          details: `Allowed types: JPEG, PNG, WebP. Your file: ${file.type}`
        },
        { status: 400 }
      );
    }

    // Get optional metadata from form data
    const metadataString = formData.get('metadata') as string | null;
    let metadata: Record<string, string> | undefined;
    
    if (metadataString) {
      try {
        metadata = JSON.parse(metadataString);
      } catch (_e) {
        return NextResponse.json(
          { error: 'Invalid metadata JSON format' },
          { status: 400 }
        );
      }
    }

    // Upload file to Replicate
    const response = await replicate.files.create(file, metadata);

    // Return the urls.get property as requested
    return NextResponse.json({
      url: response.urls.get,
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload file to Replicate',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
