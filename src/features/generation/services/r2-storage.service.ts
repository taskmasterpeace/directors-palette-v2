import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@/lib/logger';

const R2_PUBLIC_BASE = 'https://pub-5db40a08df07458593b2b31de8bb6b62.r2.dev';

let _s3Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!_s3Client) {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error('R2StorageService: Missing R2 env vars (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)');
    }

    _s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _s3Client;
}

const BUCKET = process.env.R2_BUCKET || 'directorspal';

/**
 * R2 Storage Service
 * Handles uploading videos to Cloudflare R2 (S3-compatible)
 * Public bucket — permanent URLs, no expiry, zero egress fees
 */
export class R2StorageService {
  /**
   * Upload a video to R2
   */
  static async uploadVideo(
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
    const storagePath = `videos/${userId}/${predictionId}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: storagePath,
      Body: new Uint8Array(buffer),
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await getR2Client().send(command);
    logger.generation.info('[R2] Uploaded video', { storagePath, size: buffer.byteLength });

    const publicUrl = `${R2_PUBLIC_BASE}/${storagePath}`;

    return {
      publicUrl,
      storagePath,
      fileSize: buffer.byteLength,
    };
  }
}
