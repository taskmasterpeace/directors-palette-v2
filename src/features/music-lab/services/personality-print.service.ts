/**
 * Personality Print Service
 * CRUD operations for artist personality prints in Supabase
 */

import { getClient } from '@/lib/db/client'
import type { PersonalityPrint, DbPersonalityPrint } from '../types/personality-print.types'
import { logger } from '@/lib/logger'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSupabase(): Promise<any> {
  return await getClient()
}

class PersonalityPrintService {
  async getPrint(artistId: string, userId: string): Promise<PersonalityPrint | null> {
    const supabase = await getSupabase()
    if (!supabase) return null

    const { data, error } = await supabase
      .from('artist_personality_prints')
      .select('*')
      .eq('artist_id', artistId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      logger.musicLab.error('Error fetching personality print', { error })
      return null
    }

    return (data as DbPersonalityPrint).print_json
  }

  async savePrint(artistId: string, userId: string, print: PersonalityPrint): Promise<boolean> {
    const supabase = await getSupabase()
    if (!supabase) return false

    // Upsert: delete old + insert new
    await supabase
      .from('artist_personality_prints')
      .delete()
      .eq('artist_id', artistId)
      .eq('user_id', userId)

    const { error } = await supabase
      .from('artist_personality_prints')
      .insert({
        artist_id: artistId,
        user_id: userId,
        print_json: print,
      })

    if (error) {
      logger.musicLab.error('Error saving personality print', { error })
      return false
    }

    return true
  }

  async deletePrint(artistId: string): Promise<boolean> {
    const supabase = await getSupabase()
    if (!supabase) return false

    const { error } = await supabase
      .from('artist_personality_prints')
      .delete()
      .eq('artist_id', artistId)

    if (error) {
      logger.musicLab.error('Error deleting personality print', { error })
      return false
    }

    return true
  }
}

export const personalityPrintService = new PersonalityPrintService()
