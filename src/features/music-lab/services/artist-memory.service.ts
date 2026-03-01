/**
 * Artist Memory Service
 * CRUD + LLM extraction for persistent artist memory
 */

import { getClient } from '@/lib/db/client'
import type { ArtistMemory, DbArtistMemory } from '../types/artist-memory.types'
import { createEmptyMemory } from '../types/artist-memory.types'
import type { ChatMessage } from '../types/artist-chat.types'
import { logger } from '@/lib/logger'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSupabase(): Promise<any> {
  return await getClient()
}

class ArtistMemoryService {
  async getMemory(artistId: string, userId: string): Promise<ArtistMemory> {
    const supabase = await getSupabase()
    if (!supabase) return createEmptyMemory()

    const { data, error } = await supabase
      .from('artist_memories')
      .select('*')
      .eq('artist_id', artistId)
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return createEmptyMemory()
    }

    const db = data as DbArtistMemory
    const empty = createEmptyMemory()
    return {
      aboutUser: { ...empty.aboutUser, ...db.memory_json?.aboutUser },
      sessions: db.memory_json?.sessions || [],
      relationship: { ...empty.relationship, ...db.memory_json?.relationship },
      selfReflections: db.memory_json?.selfReflections || [],
      facts: db.memory_json?.facts || [],
    }
  }

  async saveMemory(artistId: string, userId: string, memory: ArtistMemory): Promise<boolean> {
    const supabase = await getSupabase()
    if (!supabase) return false

    const { error } = await supabase
      .from('artist_memories')
      .upsert({
        artist_id: artistId,
        user_id: userId,
        memory_json: memory,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'artist_id,user_id' })

    if (error) {
      logger.musicLab.error('Error saving artist memory', { error })
      return false
    }

    return true
  }

  async extractMemoryUpdates(
    transcript: ChatMessage[],
    existingMemory: ArtistMemory,
    artistName: string
  ): Promise<ArtistMemory> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': "Director's Palette - Memory Extraction",
        },
        body: JSON.stringify({
          model: 'openai/gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content: `You are a memory extraction system for ${artistName}. Analyze this chat transcript and extract updates to the artist's memory about the user.

Return ONLY valid JSON (no markdown, no code fences) matching this structure:
{
  "newFacts": [{"content": "...", "importance": 0-10}],
  "userUpdates": {"name": null, "preferences": [], "musicTaste": [], "personalDetails": [], "workStyle": [], "petPeeves": []},
  "sessionSummary": {"summary": "...", "outcome": "...", "moodOfSession": "...", "keyDecisions": [], "unresolvedIdeas": []},
  "rapportChange": 0,
  "trustChange": 0,
  "selfReflections": {"growthNotes": [], "currentObsessions": [], "frustrations": [], "goals": []}
}

Only include fields that have NEW information from this conversation. Use empty arrays for fields with no updates. rapportChange and trustChange should be -5 to +5.`
            },
            {
              role: 'user',
              content: `Existing memory:\n${JSON.stringify(existingMemory, null, 2)}\n\nNew transcript:\n${transcript.map(m => `${m.role}: ${m.content}`).join('\n')}`
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      })

      if (!response.ok) {
        logger.musicLab.warn('Memory extraction API failed')
        return existingMemory
      }

      const data = await response.json()
      const raw = data.choices?.[0]?.message?.content || ''
      const cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim()
      const updates = JSON.parse(cleaned)

      // Apply updates to existing memory
      const updated = { ...existingMemory }

      // Add new facts
      if (updates.newFacts?.length) {
        const date = new Date().toLocaleDateString()
        const newFacts = updates.newFacts.map((f: { content: string; importance: number }) => ({
          content: f.content,
          source: `chat on ${date}`,
          importance: f.importance,
        }))
        updated.facts = [...updated.facts, ...newFacts]
      }

      // Update user knowledge
      if (updates.userUpdates) {
        const u = updates.userUpdates
        if (u.name) updated.aboutUser.name = u.name
        if (u.preferences?.length) updated.aboutUser.preferences = [...new Set([...updated.aboutUser.preferences, ...u.preferences])]
        if (u.musicTaste?.length) updated.aboutUser.musicTaste = [...new Set([...updated.aboutUser.musicTaste, ...u.musicTaste])]
        if (u.personalDetails?.length) updated.aboutUser.personalDetails = [...new Set([...updated.aboutUser.personalDetails, ...u.personalDetails])]
        if (u.workStyle?.length) updated.aboutUser.workStyle = [...new Set([...updated.aboutUser.workStyle, ...u.workStyle])]
        if (u.petPeeves?.length) updated.aboutUser.petPeeves = [...new Set([...updated.aboutUser.petPeeves, ...u.petPeeves])]
      }

      // Add session summary
      if (updates.sessionSummary?.summary) {
        updated.sessions.push({
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          ...updates.sessionSummary,
        })
      }

      // Update rapport and trust
      if (updates.rapportChange) {
        updated.relationship.rapportLevel = Math.max(0, Math.min(100, updated.relationship.rapportLevel + updates.rapportChange))
      }
      if (updates.trustChange) {
        updated.relationship.trust = Math.max(0, Math.min(100, updated.relationship.trust + updates.trustChange))
      }

      // Add self reflections
      if (updates.selfReflections) {
        const sr = updates.selfReflections
        if (sr.growthNotes?.length || sr.currentObsessions?.length || sr.frustrations?.length || sr.goals?.length) {
          updated.selfReflections.push(sr)
        }
      }

      // Enforce caps
      if (updated.sessions.length > 50) {
        updated.sessions = updated.sessions.slice(-50)
      }
      if (updated.facts.length > 100) {
        updated.facts = updated.facts
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 100)
      }

      return updated
    } catch (e) {
      logger.musicLab.error('Memory extraction failed', { error: e instanceof Error ? e.message : String(e) })
      return existingMemory
    }
  }
}

export const artistMemoryService = new ArtistMemoryService()
