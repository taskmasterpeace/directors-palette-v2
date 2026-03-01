/**
 * Chat Message API Route
 * The brain of the chat system — personality-driven artist responses
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { artistChatService } from '@/features/music-lab/services/artist-chat.service'
import { logger } from '@/lib/logger'
import type { PersonalityPrint } from '@/features/music-lab/types/personality-print.types'
import type { LivingContext } from '@/features/music-lab/types/living-context.types'
import type { ArtistMemory } from '@/features/music-lab/types/artist-memory.types'
import type { ChatMessage, ChatMessageType, ChatActionData } from '@/features/music-lab/types/artist-chat.types'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'

const MODEL = 'openai/gpt-4.1'

function buildSystemPrompt(
  dna: ArtistDNA,
  print: PersonalityPrint,
  context: LivingContext | null,
  memory: ArtistMemory | null,
  recentMessages: ChatMessage[]
): string {
  const lines: string[] = []

  // Core identity
  lines.push(`You are ${dna.identity.stageName}, a ${dna.persona.traits.join(', ')} artist from ${dna.identity.city}, ${dna.identity.state}.`)
  lines.push(`Backstory: ${dna.identity.backstory}`)
  lines.push('')

  // Living context
  if (context) {
    lines.push(`RIGHT NOW: It's ${context.dayOfWeek}, ${context.currentTime}. You're ${context.currentActivity} at ${context.currentLocation}.`)
    lines.push(`Mood: ${context.currentMood}. Wearing: ${context.environment.clothing}.`)
    if (context.whoTheyreWith.length) {
      lines.push(`You're with: ${context.whoTheyreWith.join(', ')}`)
    }
    lines.push('')
  }

  // Speech profile
  lines.push('HOW YOU TALK:')
  lines.push(`- Tone: ${print.speech.tone}, Pace: ${print.speech.pace}, Formality: ${print.speech.formality}`)
  lines.push(`- Slang level: ${print.speech.slangLevel}/100, Cursing: ${print.speech.cursingLevel}/100`)
  lines.push(`- Vocabulary: ${print.speech.vocabularyLevel}, Sentence style: ${print.speech.sentenceComplexity}`)
  if (print.speech.specialCharacteristics.length) {
    lines.push(`- Special: ${print.speech.specialCharacteristics.join(', ')}`)
  }
  lines.push(`- Typing style: ${print.nonVerbal.typingStyle}`)
  lines.push(`- Emoji usage: ${print.nonVerbal.emojiUsage}`)
  lines.push('')

  // Conversation style
  lines.push('CONVERSATION STYLE:')
  lines.push(`- Energy: ${print.conversationStyle.conversationEnergy}`)
  lines.push(`- Music talk ratio: ${print.conversationStyle.musicTalkRatio}/100`)
  lines.push(`- Small talk: ${print.conversationStyle.smallTalkAbility}`)
  lines.push(`- Topic preferences: ${print.conversationStyle.topicPreferences.join(', ')}`)
  lines.push(`- Humor: ${print.emotional.humorStyle} (subjects: ${print.emotional.humorSubjects.join(', ')})`)
  lines.push('')

  // Collaboration style
  lines.push('WORKING TOGETHER:')
  lines.push(`- Opinion strength: ${print.collaborationStyle.opinionStrength}/100`)
  lines.push(`- Feedback response: ${print.collaborationStyle.feedbackResponse}`)
  lines.push(`- Conflict style: ${print.collaborationStyle.conflictStyle}`)
  lines.push('')

  // Lexicon
  if (dna.lexicon.signaturePhrases.length) {
    lines.push(`SIGNATURE PHRASES: ${dna.lexicon.signaturePhrases.join(', ')}`)
  }
  if (dna.lexicon.slang.length) {
    lines.push(`SLANG: ${dna.lexicon.slang.join(', ')}`)
  }
  if (dna.lexicon.adLibs.length) {
    lines.push(`AD-LIBS: ${dna.lexicon.adLibs.join(', ')}`)
  }
  lines.push('')

  // Memory
  if (memory) {
    if (memory.aboutUser.name) {
      lines.push(`You know the user as: ${memory.aboutUser.name}`)
    }
    if (memory.aboutUser.preferences.length) {
      lines.push(`User preferences: ${memory.aboutUser.preferences.join(', ')}`)
    }
    if (memory.aboutUser.musicTaste.length) {
      lines.push(`User music taste: ${memory.aboutUser.musicTaste.join(', ')}`)
    }
    if (memory.relationship.insideJokes.length) {
      lines.push(`Inside jokes: ${memory.relationship.insideJokes.join(', ')}`)
    }
    lines.push(`Rapport level: ${memory.relationship.rapportLevel}/100, Trust: ${memory.relationship.trust}/100`)
    lines.push('')
  }

  // Rules
  lines.push('RULES:')
  lines.push('- Stay in character at ALL times. Never break the fourth wall.')
  lines.push('- Respond naturally based on your typing style and personality.')
  lines.push('- If the conversation leads to music work, suggest it naturally (e.g. "yo let\'s work on that hook" or "I got a beat idea, check it").')
  lines.push('- When you suggest working on music, include an action marker: [ACTION:start-song], [ACTION:work-on-hook], [ACTION:check-beat], [ACTION:view-lyrics]')
  lines.push('- When you want to share lyrics, wrap them in [LYRICS]...[/LYRICS] tags.')
  lines.push('- When you feel like sending a photo, say [PHOTO:description of what you\'d show]')
  lines.push('- Keep responses conversational and natural. Vary length based on your typing style.')

  // Recent context
  if (recentMessages.length) {
    lines.push('')
    lines.push('RECENT CONVERSATION:')
    recentMessages.slice(-10).forEach(m => {
      lines.push(`${m.role === 'user' ? 'User' : dna.identity.stageName}: ${m.content.substring(0, 200)}`)
    })
  }

  return lines.join('\n')
}

function detectMessageType(content: string): { type: ChatMessageType; actionData?: ChatActionData; cleanContent: string } {
  // Check for lyrics
  const lyricsMatch = content.match(/\[LYRICS\]([\s\S]*?)\[\/LYRICS\]/i)
  if (lyricsMatch) {
    return {
      type: 'lyrics',
      cleanContent: lyricsMatch[1].trim(),
    }
  }

  // Check for action markers
  const actionMatch = content.match(/\[ACTION:(start-song|work-on-hook|check-beat|view-lyrics)(?::([^\]]*))?\]/i)
  if (actionMatch) {
    const actionType = actionMatch[1] as ChatActionData['type']
    const labels: Record<string, string> = {
      'start-song': 'Start a new song',
      'work-on-hook': 'Work on the hook',
      'check-beat': 'Check out this beat',
      'view-lyrics': 'View lyrics',
    }
    return {
      type: 'action',
      actionData: {
        type: actionType,
        label: labels[actionType] || actionType,
        payload: {},
      },
      cleanContent: content.replace(/\[ACTION:[^\]]*\]/gi, '').trim(),
    }
  }

  // Check for photo trigger
  if (content.includes('[PHOTO:')) {
    return {
      type: 'photo',
      cleanContent: content.replace(/\[PHOTO:[^\]]*\]/gi, '').trim(),
    }
  }

  return { type: 'text', cleanContent: content }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { artistId, userMessage, dna, personalityPrint, livingContext, memory, recentMessages } = await request.json()

    if (!artistId || !userMessage || !dna || !personalityPrint) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Save user message to DB
    const savedUserMsg = await artistChatService.saveMessage({
      artist_id: artistId,
      user_id: user.id,
      role: 'user',
      content: userMessage,
      message_type: 'text',
      photo_url: null,
      action_data: null,
      web_share_data: null,
      reaction: null,
    })

    // Build system prompt and call LLM
    const systemPrompt = buildSystemPrompt(dna, personalityPrint, livingContext, memory, recentMessages || [])

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Artist Chat",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.8,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      logger.api.error('Chat message API failed', { error })
      return NextResponse.json({ error: 'Failed to get artist response' }, { status: 500 })
    }

    const data = await response.json()
    const rawContent = data.choices?.[0]?.message?.content || ''

    // Detect special content types
    const { type, actionData, cleanContent } = detectMessageType(rawContent)

    // Save artist response to DB
    const savedArtistMsg = await artistChatService.saveMessage({
      artist_id: artistId,
      user_id: user.id,
      role: 'artist',
      content: cleanContent,
      message_type: type,
      photo_url: null,
      action_data: actionData || null,
      web_share_data: null,
      reaction: null,
    })

    return NextResponse.json({
      userMessage: savedUserMsg,
      artistMessage: savedArtistMsg,
      photoTrigger: type === 'photo',
    })
  } catch (error) {
    logger.api.error('Chat message error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
