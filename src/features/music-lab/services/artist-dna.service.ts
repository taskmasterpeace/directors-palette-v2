/**
 * Artist DNA Service
 * Handles CRUD operations for artist profiles stored in Supabase
 */

import { getClient } from '@/lib/db/client'
import type { ArtistDNA, DbArtistProfile, UserArtistProfile } from '../types/artist-dna.types'
import { createEmptyDNA } from '../types/artist-dna.types'
import { logger } from '@/lib/logger'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getArtistClient(): Promise<any> {
  return await getClient()
}

/** Ensure all array fields in a section default to [] if null/undefined */
function safeArrays<T extends Record<string, unknown>>(obj: T, defaults: T): T {
  const result = { ...obj }
  for (const key of Object.keys(defaults)) {
    if (Array.isArray(defaults[key]) && !Array.isArray(result[key])) {
      (result as Record<string, unknown>)[key] = []
    }
  }
  return result
}

/** Merge raw DB dna with defaults so old records don't crash on missing fields */
function safeDna(raw: ArtistDNA): ArtistDNA {
  const d = createEmptyDNA()
  return {
    identity: safeArrays({ ...d.identity, ...raw.identity }, d.identity),
    sound: safeArrays({ ...d.sound, ...raw.sound }, d.sound),
    persona: safeArrays({ ...d.persona, ...raw.persona }, d.persona),
    lexicon: safeArrays({ ...d.lexicon, ...raw.lexicon }, d.lexicon),
    look: safeArrays({ ...d.look, ...raw.look }, d.look),
    catalog: { ...d.catalog, ...raw.catalog },
    lowConfidenceFields: Array.isArray(raw.lowConfidenceFields) ? raw.lowConfidenceFields : [],
  }
}

function dbToUserProfile(db: DbArtistProfile): UserArtistProfile {
  return {
    id: db.id,
    userId: db.user_id,
    name: db.name,
    dna: safeDna(db.dna),
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

class ArtistDnaService {
  async getArtists(userId: string): Promise<UserArtistProfile[]> {
    const supabase = await getArtistClient()
    if (!supabase) return []

    const { data, error } = await supabase
      .from('artist_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.musicLab.error('Error fetching artist profiles', { error: error })
      return []
    }

    return (data as DbArtistProfile[]).map(dbToUserProfile)
  }

  async getArtist(id: string, userId: string): Promise<UserArtistProfile | null> {
    const supabase = await getArtistClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from('artist_profiles')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      logger.musicLab.error('Error fetching artist profile', { error: error })
      return null
    }

    return dbToUserProfile(data as DbArtistProfile)
  }

  async createArtist(userId: string, name: string, dna: ArtistDNA): Promise<UserArtistProfile | null> {
    const supabase = await getArtistClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from('artist_profiles')
      .insert({
        user_id: userId,
        name,
        dna,
      })
      .select()
      .single()

    if (error) {
      logger.musicLab.error('Error creating artist profile', { error: error })
      return null
    }

    return dbToUserProfile(data as DbArtistProfile)
  }

  async updateArtist(id: string, userId: string, name: string, dna: ArtistDNA): Promise<UserArtistProfile | null> {
    const supabase = await getArtistClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from('artist_profiles')
      .update({
        name,
        dna,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      logger.musicLab.error('Error updating artist profile', { error: error })
      return null
    }

    return dbToUserProfile(data as DbArtistProfile)
  }

  async deleteArtist(id: string, userId: string): Promise<boolean> {
    const supabase = await getArtistClient()
    if (!supabase) return false

    const { error } = await supabase
      .from('artist_profiles')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      logger.musicLab.error('Error deleting artist profile', { error: error })
      return false
    }

    return true
  }
}

export const artistDnaService = new ArtistDnaService()
