/**
 * Sound Studio Service
 * DB CRUD for presets + Suno prompt builder
 */

import { getClient } from '@/lib/db/client'
import type { SoundStudioSettings, SoundStudioPreset, DbSoundStudioPreset } from '../types/sound-studio.types'
import { energyToLabel } from '../types/sound-studio.types'
import { logger } from '@/lib/logger'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSupabase(): Promise<any> {
  return await getClient()
}

function dbToPreset(db: DbSoundStudioPreset): SoundStudioPreset {
  return {
    id: db.id,
    userId: db.user_id,
    artistId: db.artist_id,
    name: db.name,
    settings: db.preset_json,
    sunoPrompt: db.suno_prompt,
    createdAt: db.created_at,
  }
}

class SoundStudioService {
  async getPresets(userId: string, artistId?: string): Promise<SoundStudioPreset[]> {
    const supabase = await getSupabase()
    if (!supabase) return []

    let query = supabase
      .from('sound_studio_presets')
      .select('*')
      .eq('user_id', userId)

    if (artistId) {
      query = query.eq('artist_id', artistId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      logger.musicLab.error('Error fetching sound studio presets', { error })
      return []
    }

    return (data as DbSoundStudioPreset[]).map(dbToPreset)
  }

  async savePreset(preset: Omit<DbSoundStudioPreset, 'id' | 'created_at'>): Promise<SoundStudioPreset | null> {
    const supabase = await getSupabase()
    if (!supabase) return null

    const { data, error } = await supabase
      .from('sound_studio_presets')
      .insert({
        user_id: preset.user_id,
        artist_id: preset.artist_id,
        name: preset.name,
        preset_json: preset.preset_json,
        suno_prompt: preset.suno_prompt,
      })
      .select()
      .single()

    if (error) {
      logger.musicLab.error('Error saving sound studio preset', { error })
      return null
    }

    return dbToPreset(data as DbSoundStudioPreset)
  }

  async deletePreset(id: string): Promise<boolean> {
    const supabase = await getSupabase()
    if (!supabase) return false

    const { error } = await supabase
      .from('sound_studio_presets')
      .delete()
      .eq('id', id)

    if (error) {
      logger.musicLab.error('Error deleting sound studio preset', { error })
      return false
    }

    return true
  }

  /**
   * Build a Suno-compatible prompt string from settings
   * Pure function, no LLM involved
   */
  buildSunoPrompt(settings: SoundStudioSettings): string {
    const parts: string[] = []

    // Genre chain
    if (settings.genres.length) parts.push(settings.genres.join(', '))
    if (settings.subgenres.length) parts.push(settings.subgenres.join(', '))
    if (settings.microgenres.length) parts.push(settings.microgenres.join(', '))

    // Era
    if (settings.era) parts.push(settings.era)

    // Mood + energy
    if (settings.moods.length) parts.push(settings.moods.join(', '))
    parts.push(energyToLabel(settings.energy))

    // BPM
    if (settings.bpm) parts.push(`${settings.bpm} BPM`)

    // Key
    if (settings.key) parts.push(`key of ${settings.key}`)

    // Production sections
    if (settings.drumDesign.length) parts.push(settings.drumDesign.join(', '))
    if (settings.grooveFeel.length) parts.push(settings.grooveFeel.join(', '))
    if (settings.bassStyle.length) parts.push(settings.bassStyle.join(', '))
    if (settings.synthTexture.length) parts.push(settings.synthTexture.join(', '))
    if (settings.harmonyColor.length) parts.push(settings.harmonyColor.join(', '))
    if (settings.spaceFx.length) parts.push(settings.spaceFx.join(', '))
    if (settings.earCandy.length) parts.push(settings.earCandy.join(', '))

    // Structure
    if (settings.structure) parts.push(settings.structure)

    // Instruments
    if (settings.instruments.length) parts.push(settings.instruments.join(', '))

    // Production tags
    if (settings.productionTags.length) parts.push(settings.productionTags.join(', '))

    // Negative tags
    if (settings.negativeTags.length) parts.push(settings.negativeTags.join(', '))

    const prompt = parts.join(', ')
    if (prompt.length > 1000) {
      return prompt.substring(0, 997) + '...'
    }
    return prompt
  }
}

export const soundStudioService = new SoundStudioService()
