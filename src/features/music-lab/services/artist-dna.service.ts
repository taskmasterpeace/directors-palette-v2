/**
 * Artist DNA Service
 * Handles CRUD operations for artist profiles stored in Supabase
 */

import { getClient } from '@/lib/db/client'
import type { ArtistDNA, DbArtistProfile, UserArtistProfile } from '../types/artist-dna.types'
import { createEmptyDNA } from '../types/artist-dna.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getArtistClient(): Promise<any> {
  return await getClient()
}

/** Merge raw DB dna with defaults so old records don't crash on missing fields */
function safeDna(raw: ArtistDNA): ArtistDNA {
  const d = createEmptyDNA()
  const sound = { ...d.sound, ...raw.sound }
  // Ensure new array fields aren't null (spread of { ...defaults, ...{ field: null } } yields null)
  if (!Array.isArray(sound.genreEvolution)) sound.genreEvolution = []
  if (!Array.isArray(sound.keyCollaborators)) sound.keyCollaborators = []
  return {
    identity: { ...d.identity, ...raw.identity },
    sound,
    persona: { ...d.persona, ...raw.persona },
    lexicon: { ...d.lexicon, ...raw.lexicon },
    look: { ...d.look, ...raw.look },
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
      console.error('Error fetching artist profiles:', error)
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
      console.error('Error fetching artist profile:', error)
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
      console.error('Error creating artist profile:', error)
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
      console.error('Error updating artist profile:', error)
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
      console.error('Error deleting artist profile:', error)
      return false
    }

    return true
  }
}

export const artistDnaService = new ArtistDnaService()
