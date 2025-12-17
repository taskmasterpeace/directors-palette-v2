/**
 * Storage Limits Service
 * Handles image limits (500 max) and video expiration (7 days)
 */

import { createClient } from '@supabase/supabase-js'

const IMAGE_LIMIT = 500
const IMAGE_WARNING_THRESHOLD = 400
const VIDEO_EXPIRATION_DAYS = 7

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
      console.error('Error getting image count:', error)
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
   * Should be called by a cron job or scheduled task
   */
  static async deleteExpiredContent(): Promise<number> {
    const { data, error } = await getSupabase()
      .rpc('delete_expired_content')

    if (error) {
      console.error('Error deleting expired content:', error)
      return 0
    }

    return data || 0
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
