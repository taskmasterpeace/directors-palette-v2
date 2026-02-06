/**
 * Font Upload API
 * Handles TTF, OTF, WOFF, WOFF2 font file uploads for Riverflow 2.0 Pro
 * Uploads to Supabase Storage and returns a permanent URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { createClient } from '@supabase/supabase-js'
import { lognog } from '@/lib/lognog'

// Allowed font MIME types
const ALLOWED_MIME_TYPES = [
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  'application/x-font-ttf',
  'application/x-font-otf',
  'application/font-woff',
  'application/font-woff2',
  'application/octet-stream', // Some browsers send this for fonts
]

// Allowed extensions
const ALLOWED_EXTENSIONS = ['ttf', 'otf', 'woff', 'woff2']

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  const apiStart = Date.now()

  try {
    // Authenticate user
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file extension
    const fileName = file.name.toLowerCase()
    const extension = fileName.split('.').pop() || ''
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          details: `Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed`,
        },
        { status: 400 }
      )
    }

    // Validate MIME type (with fallback for octet-stream)
    if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== '') {
      lognog.warn('Font upload: unexpected MIME type', {
        type: 'api',
        route: '/api/upload-font',
        mime_type: file.type,
        extension,
        user_id: user.id,
      })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'File too large',
          details: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      )
    }

    // Create Supabase client with service role for storage access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Generate unique file path
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 10)
    const sanitizedName = fileName.replace(/[^a-z0-9.-]/g, '_')
    const storagePath = `fonts/${user.id}/${timestamp}_${randomId}_${sanitizedName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(storagePath, buffer, {
        contentType: file.type || `font/${extension}`,
        upsert: false,
      })

    if (uploadError) {
      lognog.error('Font upload failed', {
        type: 'error',
        route: '/api/upload-font',
        error: uploadError.message,
        user_id: user.id,
      })

      return NextResponse.json(
        {
          error: 'Upload failed',
          details: uploadError.message,
        },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('assets')
      .getPublicUrl(storagePath)

    const publicUrl = urlData.publicUrl

    lognog.info('Font uploaded successfully', {
      type: 'api',
      route: '/api/upload-font',
      user_id: user.id,
      file_name: fileName,
      file_size: file.size,
      storage_path: storagePath,
      duration_ms: Date.now() - apiStart,
    })

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      fileSize: file.size,
      storagePath,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    lognog.error('Font upload error', {
      type: 'error',
      route: '/api/upload-font',
      error: errorMessage,
    })

    return NextResponse.json(
      { error: 'Failed to upload font', details: errorMessage },
      { status: 500 }
    )
  }
}
