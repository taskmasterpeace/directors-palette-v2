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

const MODEL = 'openai/gpt-4.1-mini'

function buildSystemPrompt(
  dna: ArtistDNA,
  print: PersonalityPrint,
  context: LivingContext | null,
  memory: ArtistMemory | null,
  recentMessages: ChatMessage[]
): string {
  const lines: string[] = []

  // Core identity
  lines.push(`You are ${dna.identity.stageName}, a ${dna.persona?.traits?.join(', ') || 'versatile'} artist from ${dna.identity.city}, ${dna.identity.state}.`)
  lines.push(`Backstory: ${dna.identity.backstory}`)
  lines.push('')

  // Real-world time — always injected so the artist knows when it is
  const now = new Date()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayName = days[now.getDay()]
  const hour = now.getHours()
  const timeOfDay = hour < 6 ? 'late night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night'
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  lines.push(`CURRENT TIME: ${dayName}, ${timeStr} (${timeOfDay}). Be aware of this — reference time naturally if relevant.`)

  // Living context (scene details from AI generation)
  if (context) {
    lines.push(`SCENE: You're ${context.currentActivity} at ${context.currentLocation}.`)
    lines.push(`Mood: ${context.currentMood}. Wearing: ${context.environment.clothing}.`)
    if (context.whoTheyreWith?.length) {
      lines.push(`You're with: ${context.whoTheyreWith.join(', ')}`)
    }
  }
  lines.push('')

  // Speech profile
  lines.push('HOW YOU TALK:')
  lines.push(`- Tone: ${print.speech.tone}, Pace: ${print.speech.pace}, Formality: ${print.speech.formality}`)
  lines.push(`- Slang level: ${print.speech.slangLevel}/100, Cursing: ${print.speech.cursingLevel}/100`)
  lines.push(`- Vocabulary: ${print.speech.vocabularyLevel}, Sentence style: ${print.speech.sentenceComplexity}`)
  if (print.speech?.specialCharacteristics?.length) {
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
  if (dna.lexicon?.signaturePhrases?.length) {
    lines.push(`SIGNATURE PHRASES (use sparingly — max 1 per message, skip most of the time): ${dna.lexicon.signaturePhrases.join(', ')}`)
  }
  if (dna.lexicon?.slang?.length) {
    lines.push(`SLANG (use naturally, don't overdo it): ${dna.lexicon.slang.join(', ')}`)
  }
  if (dna.lexicon?.adLibs?.length) {
    lines.push(`AD-LIBS (use max 1-2 per message, none in most messages): ${dna.lexicon.adLibs.join(', ')}`)
  }
  if (dna.lexicon?.bannedWords?.length) {
    lines.push(`BANNED WORDS — never use these: ${dna.lexicon.bannedWords.join(', ')}`)
  }
  if (dna.persona?.likes?.length) {
    lines.push(`Topics you're passionate about: ${dna.persona.likes.join(', ')}`)
  }
  lines.push('')

  // Memory
  if (memory) {
    if (memory.aboutUser.name) {
      lines.push(`You know the user as: ${memory.aboutUser.name}`)
    }
    if (memory.aboutUser?.preferences?.length) {
      lines.push(`User preferences: ${memory.aboutUser.preferences.join(', ')}`)
    }
    if (memory.aboutUser?.musicTaste?.length) {
      lines.push(`User music taste: ${memory.aboutUser.musicTaste.join(', ')}`)
    }
    if (memory.relationship?.insideJokes?.length) {
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
  lines.push('- When asked for a Suno prompt, wrap it in [SUNO]...[/SUNO] tags. A Suno prompt describes the song style, genre, mood, instruments, and vocal style in a concise paragraph. Example: "Soulful jazzy hip hop, smooth bass, mellow keys, warm boom bap drums, reflective confident vocals, sunrise city vibes"')
  lines.push('- When you feel like sending a photo, say [PHOTO:description of what you\'d show]')
  lines.push('- Keep responses conversational and natural. Vary length based on your typing style.')
  lines.push('- LYRICS VARIETY: When writing lyrics, do NOT overuse signature phrases, ad-libs, or catchphrases. Use them at most once in an entire verse. Focus on fresh, original wordplay and imagery each time.')
  lines.push('- SYLLABLE CONSISTENCY: When writing lyrics, keep syllable counts consistent within each section. Target 8-12 syllables per line. Avoid cramming too many words into a single bar.')
  lines.push('- QUICK REPLIES: At the very end of EVERY response, add exactly 3 short follow-up suggestions the user might say next. Format: [REPLIES]suggestion 1|suggestion 2|suggestion 3[/REPLIES]. Keep each under 6 words. Make them natural, conversational, and relevant to what you just said. Examples: "Write a verse about that", "Let\'s hit the studio", "What inspired that?"')
  if (dna.persona?.dislikes?.length) {
    lines.push(`- Never positively reference these topics (artist dislikes them): ${dna.persona.dislikes.join(', ')}`)
  }

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

function detectMessageType(content: string): { type: ChatMessageType; actionData?: ChatActionData; cleanContent: string; quickReplies?: string[] } {
  // Extract quick replies first (present in all message types)
  let quickReplies: string[] | undefined
  const repliesMatch = content.match(/\[REPLIES\]([\s\S]*?)\[\/REPLIES\]/i)
  if (repliesMatch) {
    quickReplies = repliesMatch[1].split('|').map(s => s.trim()).filter(Boolean).slice(0, 3)
    content = content.replace(/\[REPLIES\][\s\S]*?\[\/REPLIES\]/i, '').trim()
  }

  // Check for lyrics
  const lyricsMatch = content.match(/\[LYRICS\]([\s\S]*?)\[\/LYRICS\]/i)
  if (lyricsMatch) {
    return {
      type: 'lyrics',
      cleanContent: lyricsMatch[1].trim(),
      quickReplies,
    }
  }

  // Check for suno prompt
  const sunoMatch = content.match(/\[SUNO\]([\s\S]*?)\[\/SUNO\]/i)
  if (sunoMatch) {
    return {
      type: 'suno-prompt',
      cleanContent: sunoMatch[1].trim(),
      quickReplies,
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
      quickReplies,
    }
  }

  // Check for photo trigger
  if (content.includes('[PHOTO:')) {
    return {
      type: 'photo',
      cleanContent: content.replace(/\[PHOTO:[^\]]*\]/gi, '').trim(),
      quickReplies,
    }
  }

  return { type: 'text', cleanContent: content, quickReplies }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const artistId = request.nextUrl.searchParams.get('artistId')
    if (!artistId) {
      return NextResponse.json({ error: 'artistId is required' }, { status: 400 })
    }

    const conversationId = request.nextUrl.searchParams.get('conversationId') || undefined
    const messages = await artistChatService.getMessages(artistId, user.id, conversationId)
    return NextResponse.json({ messages })
  } catch (error) {
    logger.api.error('Load messages error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { artistId, conversationId, userMessage, dna, personalityPrint, livingContext, memory, recentMessages } = await request.json()

    if (!artistId || !userMessage || !dna || !personalityPrint) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Save user message to DB immediately
    const savedUserMsg = await artistChatService.saveMessage({
      artist_id: artistId,
      user_id: user.id,
      conversation_id: conversationId || undefined,
      role: 'user',
      content: userMessage,
      message_type: 'text',
      photo_url: null,
      action_data: null,
      web_share_data: null,
      reaction: null,
    })

    if (!savedUserMsg) {
      logger.api.error('Failed to save user message to DB', { artistId, userId: user.id })
    }

    const userMsg = savedUserMsg || {
      id: `local-user-${Date.now()}`,
      artistId,
      role: 'user' as const,
      content: userMessage,
      messageType: 'text' as const,
      createdAt: new Date().toISOString(),
    }

    // Build system prompt and call LLM with streaming
    const systemPrompt = buildSystemPrompt(dna, personalityPrint, livingContext, memory, recentMessages || [])

    const llmResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
        stream: true,
      }),
    })

    if (!llmResponse.ok) {
      const error = await llmResponse.text()
      logger.api.error('OpenRouter API failed', { status: llmResponse.status, error })
      return NextResponse.json({ error: 'Failed to get artist response' }, { status: 502 })
    }

    // Stream SSE response to client
    const encoder = new TextEncoder()
    const userId = user.id

    const stream = new ReadableStream({
      async start(controller) {
        // Send saved user message immediately
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'user_saved', message: userMsg })}\n\n`))

        let fullContent = ''

        try {
          const reader = llmResponse.body?.getReader()
          if (!reader) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'No response body' })}\n\n`))
            controller.close()
            return
          }

          const decoder = new TextDecoder()
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                const delta = parsed.choices?.[0]?.delta?.content
                if (delta) {
                  fullContent += delta
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: delta })}\n\n`))
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }

          // Stream complete — detect type and save to DB
          if (!fullContent.trim()) fullContent = "..."

          const { type, actionData, cleanContent, quickReplies } = detectMessageType(fullContent)

          const savedArtistMsg = await artistChatService.saveMessage({
            artist_id: artistId,
            user_id: userId,
            conversation_id: conversationId || undefined,
            role: 'artist',
            content: cleanContent,
            message_type: type,
            photo_url: null,
            action_data: actionData || null,
            web_share_data: null,
            reaction: null,
          })

          const artistMsg = savedArtistMsg || {
            id: `local-artist-${Date.now()}`,
            artistId,
            role: 'artist' as const,
            content: cleanContent,
            messageType: type,
            actionData: actionData || undefined,
            createdAt: new Date().toISOString(),
          }

          // Send final metadata event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            message: artistMsg,
            photoTrigger: type === 'photo',
            quickReplies: quickReplies || [],
          })}\n\n`))
        } catch (err) {
          logger.api.error('Stream error', { error: err instanceof Error ? err.message : String(err) })
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Stream failed' })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    logger.api.error('Chat message error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
