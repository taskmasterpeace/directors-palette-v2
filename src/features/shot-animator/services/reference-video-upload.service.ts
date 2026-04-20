/**
 * Reference video upload — shot-animator-scoped R2 helper.
 *
 * We don't reuse R2StorageService.uploadVideo because that helper keys files
 * under `videos/{userId}/{predictionId}.{ext}` (output gallery videos). These
 * are user-supplied *reference* clips, so they live under a different prefix
 * with short retention expectations.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { logger } from '@/lib/logger'

const R2_PUBLIC_BASE = 'https://pub-5db40a08df07458593b2b31de8bb6b62.r2.dev'

let _client: S3Client | null = null

function getClient(): S3Client {
  if (_client) return _client
  const endpoint = process.env.R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('ReferenceVideoUpload: R2 env vars missing')
  }
  _client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  })
  return _client
}

const BUCKET = process.env.R2_BUCKET || 'directorspal'

export async function uploadReferenceVideo(
  buffer: Buffer,
  userId: string,
  uniqueId: string,
  mimeType = 'video/mp4'
): Promise<{ publicUrl: string; storagePath: string; fileSize: number }> {
  const storagePath = `shot-animator-refs/${userId}/${uniqueId}.mp4`

  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: storagePath,
      Body: new Uint8Array(buffer),
      ContentType: mimeType,
      // 7-day cache + eventual GC (handled by existing storage cleanup task)
      CacheControl: 'public, max-age=604800',
    })
  )

  logger.generation.info('[R2] Uploaded reference video', { storagePath, size: buffer.byteLength })

  return {
    publicUrl: `${R2_PUBLIC_BASE}/${storagePath}`,
    storagePath,
    fileSize: buffer.byteLength,
  }
}
