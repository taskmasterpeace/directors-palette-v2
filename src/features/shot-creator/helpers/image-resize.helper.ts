import imageCompression from 'browser-image-compression';
import { ASPECT_RATIO_SIZES } from '@/config';
import { logger } from '@/lib/logger'

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_DIMENSION = 512; // Don't shrink below 512px on short side
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const EXTENSION_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
};

function inferMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_MIME_MAP[ext] || '';
}

/**
 * Validates image file size and type
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: `File too large: ${sizeMB}MB. Maximum size is 10MB.`,
    };
  }

  // Check file type - allow empty type (common on mobile) and infer from extension
  const fileType = file.type || inferMimeType(file.name);
  if (fileType && !ALLOWED_TYPES.includes(fileType)) {
    return {
      valid: false,
      error: `Invalid file type: ${fileType}. Allowed types: JPEG, PNG, WebP, HEIC.`,
    };
  }

  return { valid: true };
}

/**
 * Calculates target dimensions based on aspect ratio
 */
function getTargetDimensions(aspectRatio: string): { width: number; height: number } {
  // Use predefined sizes if available
  if (aspectRatio in ASPECT_RATIO_SIZES) {
    return ASPECT_RATIO_SIZES[aspectRatio];
  }

  // Default to 1024x1024 for unknown aspect ratios
  return { width: 1024, height: 1024 };
}

/**
 * Ensures dimensions meet minimum requirements
 */
function ensureMinimumDimensions(width: number, height: number): { width: number; height: number } {
  const shortSide = Math.min(width, height);

  if (shortSide < MIN_DIMENSION) {
    const scale = MIN_DIMENSION / shortSide;
    return {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    };
  }

  return { width, height };
}

/**
 * Resizes image to target dimensions based on aspect ratio
 * Mobile-friendly, runs in browser
 */
export async function resizeImage(
  file: File,
  aspectRatio: string = '1:1'
): Promise<File> {
  // Get target dimensions for this aspect ratio
  let { width: targetWidth, height: targetHeight } = getTargetDimensions(aspectRatio);

  // Ensure we don't go below minimum dimensions
  ({ width: targetWidth, height: targetHeight } = ensureMinimumDimensions(targetWidth, targetHeight));

  const maxDimension = Math.max(targetWidth, targetHeight);

  const options = {
    maxWidthOrHeight: maxDimension,
    useWebWorker: true,
    fileType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
    initialQuality: 0.85,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    logger.shotCreator.error('Error resizing image', { error: error instanceof Error ? error.message : String(error) })
    throw new Error('Failed to resize image. Please try again.');
  }
}

/**
 * Uploads image to Supabase storage and returns permanent HTTPS URL
 * Uses /api/upload-file endpoint
 * Returns: https://tarohelkwuurakbxjyxm.supabase.co/... (permanent URL)
 */
export async function uploadImageToStorage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload-file', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload image');
  }

  const data = await response.json();
  return data.url;
}

/**
 * Complete workflow: Validate → Resize → Upload
 */
export async function processAndUploadImage(
  file: File,
  aspectRatio: string = '1:1'
): Promise<{ url: string; error?: string }> {
  // Step 1: Validate
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { url: '', error: validation.error };
  }

  try {
    // Step 2: Resize
    const resizedFile = await resizeImage(file, aspectRatio);

    // Step 3: Upload
    const url = await uploadImageToStorage(resizedFile);

    return { url };
  } catch (error) {
    return {
      url: '',
      error: error instanceof Error ? error.message : 'Failed to process image',
    };
  }
}
