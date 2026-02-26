import { DatabaseError } from "@/lib/errors"
import { ISettingsRepository, UpsertSettingsInput } from "./interfaces/settings.interface"
import { Json, Tables } from "../../../../supabase/database.types"
import { getClient, TypedSupabaseClient } from "../client"
import { createLogger } from '@/lib/logger'


const log = createLogger('Lib')
type SettingsRepositoryResult = {
  id: string
  data: Tables<'settings'>
}

export class SupabaseSettingsRepository implements ISettingsRepository {
  private supabase: TypedSupabaseClient | null = null

  constructor(private clientOverride?: TypedSupabaseClient) { }

  private async getSupabaseClient(): Promise<TypedSupabaseClient> {
    if (this.clientOverride) {
      return this.clientOverride
    }
    if (!this.supabase) {
      this.supabase = await getClient()
    }
    return this.supabase
  }

  async upsert(input: UpsertSettingsInput): Promise<SettingsRepositoryResult> {
    try {
      const supabase = await this.getSupabaseClient()

      // First, get existing settings to merge config
      let existing: SettingsRepositoryResult | null = null
      try {
        existing = await this.findByUserId(input.user_id)
      } catch (error) {
        // If findByUserId fails, log and continue with new config only
        log.warn('Failed to load existing settings, will create new', { error: error instanceof Error ? error.message : String(error) })
      }

      // Merge existing config with new config (new config overrides old)
      // Ensure we're working with Json compatible types
      let mergedConfig: Json

      if (existing && typeof existing.data.config === 'object' && existing.data.config !== null) {
        // Merge the configs instead of shallow merge
        mergedConfig = this.deepMerge(
          existing.data.config as Record<string, unknown>,
          input.config as Record<string, unknown>
        ) as Json
      } else {
        mergedConfig = input.config as Json
      }

      // Use Supabase's built-in upsert functionality
      const { data: result, error } = await supabase
        .from('settings')
        .upsert({
          user_id: input.user_id,
          config: mergedConfig
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single()

      if (error) {
        throw new DatabaseError(`Failed to upsert settings: ${error.message}`, error)
      }

      if (!result) {
        throw new DatabaseError('No result returned from settings upsert', null)
      }

      return {
        id: result.id,
        data: result
      }
    } catch (error) {
      // Handle network errors or client initialization errors
      if (error instanceof DatabaseError) {
        throw error
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new DatabaseError(`Failed to upsert settings: ${errorMessage}`, error)
    }
  }

  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target }

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(
          (target[key] as Record<string, unknown>) || {},
          source[key] as Record<string, unknown>
        )
      } else {
        result[key] = source[key]
      }
    }

    return result
  }

  async findByUserId(userId: string): Promise<SettingsRepositoryResult | null> {
    const supabase = await this.getSupabaseClient()

    const { data: result, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      throw new DatabaseError(`Failed to find settings: ${error.message}`, error)
    }

    if (!result) {
      return null
    }

    return {
      id: result.id,
      data: result
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    const supabase = await this.getSupabaseClient()

    const { error } = await supabase
      .from('settings')
      .delete()
      .eq('user_id', userId)

    if (error) {
      throw new DatabaseError(`Failed to delete settings: ${error.message}`, error)
    }
  }
}