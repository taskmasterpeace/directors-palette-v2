import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_BUCKET = 'directors-palette';

// Lazy-load Supabase client to avoid build-time errors when env vars aren't available
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      const missing = [];
      if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
      if (!key) missing.push('SUPABASE_SERVICE_ROLE_KEY');
      throw new Error(`StorageService: Missing required env vars: ${missing.join(', ')}`);
    }

    console.log('[StorageService] Initializing Supabase client');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

/**
 * Storage Service
 * Handles downloading assets from Replicate and uploading to Supabase Storage
 */
export class StorageService {
  /**
   * Download asset from Replicate URL
   * @param url - The Replicate asset URL (temporary, expires in 1 hour)
   * @returns Buffer and content type
   */
  static async downloadAsset(
    url: string
  ): Promise<{ buffer: ArrayBuffer; contentType: string }> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`Failed to download asset from ${url}: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'application/octet-stream';

      return { buffer, contentType };
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error(`Download timeout for ${url}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Determine MIME type and file extension from URL or format
   * @param url - The asset URL
   * @param format - Optional format hint from input
   * @returns File extension and MIME type
   */
  static getMimeType(url: string, format?: string): { ext: string; mimeType: string } {
    // MIME type mapping
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      mp4: 'video/mp4',
      webm: 'video/webm',
    };

    // Try to get extension from URL
    const urlMatch = url.match(/\.([a-z0-9]{3,4})(\?|$)/i);
    if (urlMatch) {
      const ext = urlMatch[1].toLowerCase();
      return {
        ext,
        mimeType: mimeMap[ext] || 'application/octet-stream',
      };
    }

    // Fall back to format parameter
    if (format) {
      const ext = format.toLowerCase();
      return {
        ext,
        mimeType: mimeMap[ext] || 'application/octet-stream',
      };
    }

    // Default to JPEG
    return { ext: 'jpg', mimeType: 'image/jpeg' };
  }

  /**
   * Upload asset to Supabase Storage
   * @param buffer - The file buffer
   * @param userId - User ID for organizing files
   * @param predictionId - Prediction ID for unique naming
   * @param fileExtension - File extension
   * @param mimeType - MIME type
   * @returns Public URL, storage path, and file size
   */
  static async uploadToStorage(
    buffer: ArrayBuffer,
    userId: string,
    predictionId: string,
    fileExtension: string,
    mimeType: string
  ): Promise<{
    publicUrl: string;
    storagePath: string;
    fileSize: number;
  }> {
    // Storage path: generations/{user_id}/{prediction_id}.{ext}
    const storagePath = `generations/${userId}/${predictionId}.${fileExtension}`;

    const { error: uploadError } = await getSupabase().storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
        cacheControl: 'public, max-age=31536000, immutable',
      });

    if (uploadError) {
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = getSupabase().storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

    return {
      publicUrl,
      storagePath,
      fileSize: buffer.byteLength,
    };
  }
}
