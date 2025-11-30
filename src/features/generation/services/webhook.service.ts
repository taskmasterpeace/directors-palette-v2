import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StorageService } from './storage.service';
import type { Database } from '../../../../supabase/database.types';

// Lazy-load Supabase client to avoid build-time errors when env vars aren't available
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

// Replicate Prediction Types
export interface ReplicatePredictionInput {
  prompt?: string;
  output_format?: string;
  images?: string[];
  [key: string]: unknown;
}

export interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output: string | string[] | null;
  error?: string | null;
  input?: ReplicatePredictionInput;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  metrics?: {
    predict_time?: number;
  };
}

// Gallery Metadata Types (used by other services)
export interface GalleryMetadata {
  prompt?: string;
  model?: string;
  output_format?: string;
  replicate_url?: string;
  completed_at?: string;
  error?: string;
  [key: string]: unknown;
}

type GalleryStatus = Database['public']['Enums']['status'];
type GalleryRow = Database['public']['Tables']['gallery']['Row'];

/**
 * Webhook Service
 * Orchestrates webhook processing for Replicate predictions
 */
export class WebhookService {
  /**
   * Process completed prediction and update gallery
   */
  static async processCompletedPrediction(prediction: ReplicatePrediction): Promise<void> {
    const { id, output, status, error, input } = prediction;

    // Find the gallery entry by prediction_id
    const { data: galleryEntry, error: findError } = await getSupabase()
      .from('gallery')
      .select('*')
      .eq('prediction_id', id)
      .single();

    if (findError || !galleryEntry) {
      console.error(`No gallery entry found for prediction ${id}:`, findError);
      return;
    }

    try {
      // Handle starting status
      if (status === 'starting') {
        await this.updateGalleryStatus(id, 'processing', null);
        return;
      }

      // Handle processing status
      if (status === 'processing') {
        await this.updateGalleryStatus(id, 'processing', null);
        return;
      }

      // Handle succeeded status
      if (status === 'succeeded' && output) {
        await this.handleSuccessfulPrediction(galleryEntry, output, input);
        return;
      }

      // Handle failed status
      if (status === 'failed') {
        console.error(`Prediction ${id} failed:`, error);
        await this.updateGalleryWithError(
          id,
          galleryEntry,
          error?.toString() || 'Prediction failed'
        );
        return;
      }

      // Handle canceled status
      if (status === 'canceled') {
        await this.updateGalleryStatus(id, 'canceled', 'Prediction was canceled');
        return;
      }

      // Handle succeeded with no output (edge case)
      if (status === 'succeeded' && !output) {
        console.error(`Prediction ${id} succeeded but has no output`);
        await this.updateGalleryWithError(
          id,
          galleryEntry,
          'Generation succeeded but produced no output'
        );
        return;
      }
    } catch (processingError) {
      // If any processing step fails (download, upload, etc.), mark as failed
      console.error(`Error processing prediction ${id}:`, processingError);
      const errorMessage = processingError instanceof Error
        ? processingError.message
        : 'Failed to process prediction results';

      await this.updateGalleryWithError(id, galleryEntry, errorMessage);
      throw processingError; // Re-throw so webhook endpoint returns 500 for Replicate to retry
    }
  }

  /**
   * Handle successful prediction: download, upload, and update gallery
   */
  private static async handleSuccessfulPrediction(
    galleryEntry: GalleryRow,
    output: string | string[],
    input?: ReplicatePredictionInput
  ): Promise<void> {
    // Get asset URL (output can be string or array, take first)
    const assetUrl = Array.isArray(output) ? output[0] : output;

    if (!assetUrl || typeof assetUrl !== 'string') {
      throw new Error('Invalid output URL');
    }

    // Download asset from Replicate
    const { buffer } = await StorageService.downloadAsset(assetUrl);

    // Determine file type
    const { ext, mimeType } = StorageService.getMimeType(
      assetUrl,
      input?.output_format as string | undefined
    );

    // Upload to Supabase Storage
    const { publicUrl, storagePath, fileSize } = await StorageService.uploadToStorage(
      buffer,
      galleryEntry.user_id,
      galleryEntry.prediction_id,
      ext,
      mimeType
    );

    // Get current metadata
    const currentMetadata = (galleryEntry.metadata as Record<string, unknown>) || {};

    // Update gallery record with success data
    const { error: updateError } = await getSupabase()
      .from('gallery')
      .update({
        status: 'completed' as GalleryStatus,
        storage_path: storagePath,
        public_url: publicUrl,
        file_size: fileSize,
        mime_type: mimeType,
        metadata: {
          ...currentMetadata,
          replicate_url: assetUrl,
          completed_at: new Date().toISOString(),
        },
      })
      .eq('prediction_id', galleryEntry.prediction_id);

    if (updateError) {
      console.error('Error updating gallery record:', updateError);
      throw new Error(`Failed to update gallery: ${updateError.message}`);
    }
  }

  /**
   * Update gallery with error status and message
   */
  private static async updateGalleryWithError(
    predictionId: string,
    galleryEntry: GalleryRow,
    errorMessage: string
  ): Promise<void> {
    const currentMetadata = (galleryEntry.metadata as Record<string, unknown>) || {};

    await getSupabase()
      .from('gallery')
      .update({
        status: 'failed' as GalleryStatus,
        error_message: errorMessage,
        metadata: {
          ...currentMetadata,
          error: errorMessage,
          failed_at: new Date().toISOString(),
        },
      })
      .eq('prediction_id', predictionId);
  }

  /**
   * Update gallery status
   */
  private static async updateGalleryStatus(
    predictionId: string,
    status: GalleryStatus,
    errorMessage: string | null
  ): Promise<void> {
    const updateData: Database['public']['Tables']['gallery']['Update'] = { status };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    await getSupabase().from('gallery').update(updateData).eq('prediction_id', predictionId);
  }
}
