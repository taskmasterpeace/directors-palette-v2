/**
 * Living Context Service
 * Computes real-time awareness of what the artist is doing right now
 * No DB — generated fresh each time via LLM
 */

import type { ArtistDNA } from '../types/artist-dna.types'
import type { PersonalityPrint } from '../types/personality-print.types'
import type { ArtistSocialCircle, LivingContext } from '../types/living-context.types'
import { logger } from '@/lib/logger'

const HOLIDAYS: Record<string, string> = {
  '01-01': "New Year's Day",
  '01-20': 'MLK Day',
  '02-14': "Valentine's Day",
  '03-17': "St. Patrick's Day",
  '04-20': 'Easter',
  '05-26': 'Memorial Day',
  '07-04': '4th of July',
  '09-01': 'Labor Day',
  '10-31': 'Halloween',
  '11-27': 'Thanksgiving',
  '12-25': 'Christmas',
  '12-31': "New Year's Eve",
}

function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'fall'
  return 'winter'
}

function getTimeOfDay(hour: number): string {
  if (hour >= 5 && hour < 9) return 'early morning'
  if (hour >= 9 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 14) return 'afternoon'
  if (hour >= 14 && hour < 17) return 'late afternoon'
  if (hour >= 17 && hour < 20) return 'evening'
  if (hour >= 20 && hour < 23) return 'night'
  return 'late night'
}

class LivingContextService {
  async generateContext(
    dna: ArtistDNA,
    print: PersonalityPrint | null,
    socialCircle?: ArtistSocialCircle
  ): Promise<LivingContext> {
    const now = new Date()
    const monthDay = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const holiday = HOLIDAYS[monthDay] || null
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' })
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    const season = getSeason(now.getMonth())
    const timeOfDay = getTimeOfDay(now.getHours())

    const prompt = `Given this artist, what would they realistically be doing right now?

Artist: ${dna.identity.stageName}
City: ${dna.identity.city}, ${dna.identity.state}
Neighborhood: ${dna.identity.neighborhood}
Personality traits: ${dna.persona.traits.join(', ')}
Likes: ${dna.persona.likes.join(', ')}
Attitude: ${dna.persona.attitude}
Fashion: ${dna.look.fashionStyle}
${socialCircle ? `Entourage: ${socialCircle.entourage.map(e => `${e.name} (${e.role})`).join(', ')}` : ''}
${socialCircle ? `Hangout spots: ${socialCircle.hangoutSpots.join(', ')}` : ''}
${socialCircle ? `Transportation: ${socialCircle.transportation}` : ''}
${print ? `Conversation energy: ${print.conversationStyle.conversationEnergy}` : ''}

Current time: ${dayOfWeek}, ${timeStr}
Season: ${season}
${holiday ? `Holiday: ${holiday}` : ''}

Return ONLY valid JSON (no markdown, no code fences):
{
  "currentActivity": "what they're doing",
  "currentMood": "their mood",
  "currentLocation": "where they are",
  "whoTheyreWith": ["names or descriptions"],
  "environment": {"setting": "...", "vibe": "...", "clothing": "what they're wearing"},
  "phone": {"model": "iPhone/Android", "caseStyle": "...", "photoStyle": "...", "socialHabits": "..."},
  "statusLine": "short location + time context",
  "statusEmoji": "single emoji",
  "activityDescription": "vivid 1-sentence description in present tense"
}`

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': "Director's Palette - Living Context",
        },
        body: JSON.stringify({
          model: 'openai/gpt-4.1-mini',
          messages: [
            { role: 'system', content: 'You are a creative fiction writer generating realistic daily life context for virtual music artists. Be specific and vivid.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.8,
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        logger.musicLab.warn('Living context API failed')
        return this.fallbackContext(dna, now, dayOfWeek, season, holiday, timeOfDay, timeStr)
      }

      const data = await response.json()
      const raw = data.choices?.[0]?.message?.content || ''
      const cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim()
      const parsed = JSON.parse(cleaned)

      return {
        currentTime: timeStr,
        dayOfWeek,
        date: now.toLocaleDateString(),
        season,
        holiday,
        timeOfDay,
        currentActivity: parsed.currentActivity || 'chillin',
        currentMood: parsed.currentMood || 'relaxed',
        currentLocation: parsed.currentLocation || dna.identity.city,
        whoTheyreWith: parsed.whoTheyreWith || [],
        environment: parsed.environment || { setting: 'home studio', vibe: 'chill', clothing: 'casual' },
        phone: parsed.phone || { model: 'iPhone 15 Pro', caseStyle: 'matte black', photoStyle: 'casual snaps', socialHabits: 'posts occasionally' },
        statusLine: parsed.statusLine || `${dna.identity.city} · ${timeOfDay}`,
        statusEmoji: parsed.statusEmoji || '🎵',
        activityDescription: parsed.activityDescription || `${dna.identity.stageName} is vibing in the studio`,
      }
    } catch (e) {
      logger.musicLab.error('Living context generation failed', { error: e instanceof Error ? e.message : String(e) })
      return this.fallbackContext(dna, now, dayOfWeek, season, holiday, timeOfDay, timeStr)
    }
  }

  private fallbackContext(
    dna: ArtistDNA,
    now: Date,
    dayOfWeek: string,
    season: string,
    holiday: string | null,
    timeOfDay: string,
    timeStr: string
  ): LivingContext {
    return {
      currentTime: timeStr,
      dayOfWeek,
      date: now.toLocaleDateString(),
      season,
      holiday,
      timeOfDay,
      currentActivity: 'in the studio',
      currentMood: 'focused',
      currentLocation: dna.identity.city,
      whoTheyreWith: [],
      environment: { setting: 'home studio', vibe: 'creative', clothing: 'casual streetwear' },
      phone: { model: 'iPhone 15 Pro', caseStyle: 'matte black', photoStyle: 'moody selfies', socialHabits: 'posts on IG stories' },
      statusLine: `${dna.identity.city} · ${timeOfDay}`,
      statusEmoji: '🎵',
      activityDescription: `${dna.identity.stageName} is working on new music in the studio`,
    }
  }
}

export const livingContextService = new LivingContextService()
