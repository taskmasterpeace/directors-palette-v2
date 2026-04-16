/**
 * Storage Limits Service
 * Handles image limits (500 max) and video expiration (7 days)
 */

import { createClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'


const log = createLogger('Storage')
const IMAGE_LIMIT = 500
const IMAGE_WARNING_THRESHOLD = 400
const VIDEO_EXPIRATION_DAYS = 7
const STORAGE_BUCKET = 'directors-palette'
// Reference files (used by the "restore/recycle" feature) are kept for 7 days
// OR as long as they are pointed at by one of the user's last 10 generations,
// whichever protects more. Files older than this AND not referenced by a
// protected generation get garbage-collected.
const REFERENCE_RETENTION_DAYS = 7
const REFERENCE_RETENTION_FLOOR_GENERATIONS = 10

// Lazy-load Supabase client
let _supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _supabase
}

export interface StorageLimitsInfo {
  imageCount: number
  imageLimit: number
  imagesRemaining: number
  isAtWarning: boolean  // true if >= 400
  isAtLimit: boolean    // true if >= 500
  canCreateImage: boolean
  videoExpirationDays: number
}

export class StorageLimitsService {
  /**
   * Get storage limits info for a user
   */
  static async getStorageLimits(userId: string): Promise<StorageLimitsInfo> {
    const { count, error } = await getSupabase()
      .from('gallery')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('generation_type', 'image')
      .eq('status', 'completed')

    if (error) {
      log.error('Error getting image count', { error: error })
      // Return safe defaults on error
      return {
        imageCount: 0,
        imageLimit: IMAGE_LIMIT,
        imagesRemaining: IMAGE_LIMIT,
        isAtWarning: false,
        isAtLimit: false,
        canCreateImage: true,
        videoExpirationDays: VIDEO_EXPIRATION_DAYS,
      }
    }

    const imageCount = count || 0
    const imagesRemaining = Math.max(0, IMAGE_LIMIT - imageCount)

    return {
      imageCount,
      imageLimit: IMAGE_LIMIT,
      imagesRemaining,
      isAtWarning: imageCount >= IMAGE_WARNING_THRESHOLD,
      isAtLimit: imageCount >= IMAGE_LIMIT,
      canCreateImage: imageCount < IMAGE_LIMIT,
      videoExpirationDays: VIDEO_EXPIRATION_DAYS,
    }
  }

  /**
   * Check if user can create more images
   */
  static async canCreateImage(userId: string): Promise<boolean> {
    const limits = await this.getStorageLimits(userId)
    return limits.canCreateImage
  }

  /**
   * Delete expired content (videos older than 7 days)
   * Deletes both storage files and database entries
   * Should be called by a cron job or scheduled task
   */
  static async deleteExpiredContent(): Promise<number> {
    const supabase = getSupabase()

    // First, get all expired items with their storage paths
    const { data: expiredItems, error: fetchError } = await supabase
      .from('gallery')
      .select('id, storage_path')
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString()) as { data: { id: string; storage_path: string | null }[] | null; error: unknown }

    if (fetchError) {
      log.error('Error fetching expired content', { fetchError: fetchError })
      return 0
    }

    if (!expiredItems || expiredItems.length === 0) {
      return 0
    }

    // Delete storage files (filter out nulls)
    const storagePaths = expiredItems
      .map(item => item.storage_path)
      .filter((path): path is string => path !== null)

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(storagePaths)

      if (storageError) {
        log.error('Error deleting storage files', { storageError: storageError })
        // Continue anyway to delete database entries
      }
    }

    // Delete database entries using the RPC function
    const { data, error } = await supabase.rpc('delete_expired_content')

    if (error) {
      log.error('Error deleting expired database entries', { error: error })
      return 0
    }

    return data || expiredItems.length
  }

  /**
   * Delete orphaned reference upload files.
   *
   * Files live at generations/{userId}/upload_*.{ext}. Each is kept while either:
   *   (a) it is referenced by a generation newer than REFERENCE_RETENTION_DAYS, OR
   *   (b) it is referenced by one of the user's last REFERENCE_RETENTION_FLOOR_GENERATIONS.
   *
   * Anything failing both checks AND older than the retention window gets deleted.
   * We never delete a file younger than the retention window, even if orphaned —
   * a user might have just uploaded it and not yet kicked off a generation.
   *
   * Safe to re-run: idempotent, per-user failures are isolated.
   */
  static async deleteOrphanedReferenceFiles(): Promise<{
    deletedCount: number
    usersProcessed: number
    usersFailed: number
  }> {
    const supabase = getSupabase()
    const retentionCutoffMs = Date.now() - REFERENCE_RETENTION_DAYS * 24 * 60 * 60 * 1000
    const retentionCutoffIso = new Date(retentionCutoffMs).toISOString()

    // Enumerate users by listing top-level folders under `generations/`.
    // Each folder name is a userId.
    const { data: topLevel, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list('generations', { limit: 1000 })

    if (listError) {
      log.error('Reference cleanup: failed to list users', { error: listError })
      return { deletedCount: 0, usersProcessed: 0, usersFailed: 0 }
    }

    if (!topLevel || topLevel.length === 0) {
      return { deletedCount: 0, usersProcessed: 0, usersFailed: 0 }
    }

    // Folders have id === null in Supabase Storage; files have a UUID id.
    const userIds = topLevel
      .filter(item => item.id === null && !!item.name)
      .map(item => item.name)

    let totalDeleted = 0
    let usersProcessed = 0
    let usersFailed = 0

    for (const userId of userIds) {
      try {
        // Build the set of URLs that are currently "protected" for this user.
        // Union of: generations in last 7 days + user's last 10 generations.
        const protectedUrls = new Set<string>()

        const { data: recentByTime } = await supabase
          .from('gallery')
          .select('metadata')
          .eq('user_id', userId)
          .gte('created_at', retentionCutoffIso)

        const { data: last10 } = await supabase
          .from('gallery')
          .select('metadata')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(REFERENCE_RETENTION_FLOOR_GENERATIONS)

        const collectUrls = (rows: { metadata: unknown }[] | null) => {
          if (!rows) return
          for (const row of rows) {
            const urls = (row.metadata as { reference_image_urls?: unknown })?.reference_image_urls
            if (!Array.isArray(urls)) continue
            for (const url of urls) {
              if (typeof url === 'string' && url.length > 0) {
                protectedUrls.add(url)
              }
            }
          }
        }
        collectUrls(recentByTime as { metadata: unknown }[] | null)
        collectUrls(last10 as { metadata: unknown }[] | null)

        // List this user's files and find orphaned upload_* entries past retention.
        const { data: userFiles, error: userFilesError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .list(`generations/${userId}`, { limit: 1000 })

        if (userFilesError || !userFiles) {
          log.error('Reference cleanup: failed to list user files', { userId, error: userFilesError })
          usersFailed++
          continue
        }

        const pathsToDelete: string[] = []

        for (const file of userFiles) {
          // Only target uploaded reference files.
          if (!file.name.startsWith('upload_')) continue

          // Respect retention window — never delete files younger than cutoff.
          const createdAt = file.created_at ? new Date(file.created_at).getTime() : Date.now()
          if (createdAt > retentionCutoffMs) continue

          const fullPath = `generations/${userId}/${file.name}`
          const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fullPath)
          if (protectedUrls.has(urlData.publicUrl)) continue

          pathsToDelete.push(fullPath)
        }

        if (pathsToDelete.length > 0) {
          const { error: removeError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .remove(pathsToDelete)

          if (removeError) {
            log.error('Reference cleanup: batch remove failed', { userId, count: pathsToDelete.length, error: removeError })
            usersFailed++
            continue
          }

          totalDeleted += pathsToDelete.length
        }

        usersProcessed++
      } catch (error) {
        log.error('Reference cleanup: unexpected error for user', { userId, error: error instanceof Error ? error.message : String(error) })
        usersFailed++
      }
    }

    log.info('Reference cleanup completed', { totalDeleted, usersProcessed, usersFailed, totalUsers: userIds.length })

    return { deletedCount: totalDeleted, usersProcessed, usersFailed }
  }

  /**
   * Get expiration date for a video (7 days from now)
   */
  static getVideoExpirationDate(): Date {
    const date = new Date()
    date.setDate(date.getDate() + VIDEO_EXPIRATION_DAYS)
    return date
  }

  /**
   * Calculate days until expiration for a video
   */
  static getDaysUntilExpiration(expiresAt: string | Date): number {
    const expiration = new Date(expiresAt)
    const now = new Date()
    const diffTime = expiration.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }
}

// Export constants for use in UI
export const STORAGE_LIMITS = {
  IMAGE_LIMIT,
  IMAGE_WARNING_THRESHOLD,
  VIDEO_EXPIRATION_DAYS,
}
