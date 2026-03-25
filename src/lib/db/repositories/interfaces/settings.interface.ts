import { Tables } from "@/lib/db/types"

type SettingsRepositoryResult = {
  id: string
  data: Tables<'settings'>
}

export type UpsertSettingsInput = {
  user_id: string
  config: Record<string, unknown>
}

/**
 * Settings Repository Interface
 * 
 * Handles user settings storage with JSON configuration merging
 */
export interface ISettingsRepository {
  /**
   * Upsert user settings - creates or updates user settings by merging JSON config
   * Uses Supabase's native upsert functionality with client-side JSON merging
   * @param input Settings input with user_id and config JSON
   * @returns Promise resolving to the settings record
   */
  upsert(input: UpsertSettingsInput): Promise<SettingsRepositoryResult>

  /**
   * Find settings by user ID
   * @param userId User ID
   * @returns Promise resolving to settings or null if not found
   */
  findByUserId(userId: string): Promise<SettingsRepositoryResult | null>

  /**
   * Delete settings by user ID
   * @param userId User ID
   * @returns Promise resolving to void
   */
  deleteByUserId(userId: string): Promise<void>
}