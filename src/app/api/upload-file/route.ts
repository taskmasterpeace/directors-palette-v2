import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { randomUUID } from 'crypto';

const STORAGE_BUCKET = 'directors-palette';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB server-side limit
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Create Supabase client on demand to avoid build-time errors
function getSupabaseClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication first
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

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

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Determine file extension
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const fileExtension = extMap[file.type] || 'jpg';

    // Generate unique ID for this upload
    const uploadId = randomUUID();
    const userId = auth.user.id;

    // Upload directly to Supabase Storage
    const storagePath = `generations/${userId}/upload_${uploadId}.${fileExtension}`;
    const supabase = getSupabaseClient();

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[upload-file] Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    return NextResponse.json({
      url: publicUrl,
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
