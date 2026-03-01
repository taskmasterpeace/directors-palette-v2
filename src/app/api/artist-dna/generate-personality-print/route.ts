/**
 * Generate Personality Print API Route
 * Creates a deep personality profile from Artist DNA
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { personalityPrintService } from '@/features/music-lab/services/personality-print.service'
import { logger } from '@/lib/logger'

const MODEL = 'openai/gpt-4.1'

const SYSTEM_PROMPT = `You are a personality psychologist and music industry expert. Given an artist's DNA profile (identity, sound, persona, lexicon, look, catalog), generate a deep PersonalityPrint that drives how this artist talks, thinks, argues, jokes, and collaborates in conversation.

Return ONLY valid JSON (no markdown, no code fences) matching this exact structure:

{
  "speech": {
    "tone": "overall conversational tone (e.g. 'warm but direct', 'intense and poetic')",
    "pace": "how fast they talk (e.g. 'rapid-fire', 'slow and deliberate', 'varies by mood')",
    "formality": "formality level (e.g. 'very casual', 'switches between formal and street')",
    "slangLevel": 0-100,
    "cursingLevel": 0-100,
    "vocabularyLevel": "basic / street / educated / academic / mixed",
    "specialCharacteristics": ["unique speech patterns"],
    "emphasisTactics": ["how they emphasize points"],
    "sentenceComplexity": "simple / compound / complex / varies",
    "questionStyle": "how they ask questions"
  },
  "rhetoric": {
    "debateStyle": "how they argue",
    "strategy": "their go-to persuasion approach",
    "persuasionTactics": ["specific tactics"],
    "evidenceTypes": ["what they cite as proof"]
  },
  "emotional": {
    "expressiveness": 0-100,
    "primaryEmotions": ["dominant emotional states"],
    "humorStyle": "type of humor",
    "humorSubjects": ["what they joke about"]
  },
  "cognitive": {
    "analyticalStrategy": "how they break down problems",
    "focusAreas": ["what they pay attention to"],
    "problemSolving": "approach to solving issues",
    "oppositionEval": "how they evaluate opposing views"
  },
  "knowledge": {
    "expertise": ["areas of deep knowledge"],
    "otherKnowledge": ["surface-level knowledge areas"],
    "culturalRefTypes": ["types of cultural references they make"],
    "culturalRefFrequency": "how often they reference culture"
  },
  "conversationStyle": {
    "topicPreferences": ["favorite conversation topics"],
    "musicTalkRatio": 0-100,
    "smallTalkAbility": "good / awkward / minimal / natural",
    "tangentStyle": "how they go off topic",
    "initiatesTopics": true/false,
    "conversationEnergy": "high / medium / low / variable",
    "deepConvoTriggers": ["topics that make them go deep"]
  },
  "thematic": {
    "commonThemes": ["recurring themes in conversation"],
    "repeatedMotifs": ["phrases or ideas they return to"],
    "metaphorTypes": ["types of metaphors they use"],
    "imagery": ["visual language they use"]
  },
  "nonVerbal": {
    "typingStyle": "rapid short messages / long paragraphs / mixed / voice-note style",
    "emojiUsage": "heavy / moderate / rare / never",
    "responseSpeed": "instant / quick / takes their time / unpredictable",
    "listeningStyle": "active / passive / interrupts / asks follow-ups"
  },
  "ethics": {
    "moralBeliefs": ["core moral stances"],
    "influences": ["philosophical or spiritual influences"],
    "decisionDrivers": ["what drives their decisions"]
  },
  "creativity": {
    "problemSolvingStyle": "how they approach creative problems",
    "communicationStyle": "how they communicate creative ideas"
  },
  "motivation": {
    "primaryDrivers": ["what motivates them"],
    "impactOnDecisions": "how motivation affects choices"
  },
  "selfPerception": {
    "selfView": "how they see themselves",
    "impactOnActions": "how self-image affects behavior"
  },
  "collaborationStyle": {
    "opinionStrength": 0-100,
    "feedbackResponse": "how they handle criticism",
    "conflictStyle": "how they handle disagreements"
  },
  "generatedAt": "ISO timestamp"
}

CALIBRATION:
- An artist with traits=['aggressive', 'confident', 'confrontational'] should have collaborationStyle.opinionStrength around 80-90
- An artist with traits=['chill', 'easygoing', 'laid-back'] should have opinionStrength around 30-40
- slangLevel should match their city/neighborhood culture
- cursingLevel should match their public persona
- Match typing style to their persona (street artists type in short bursts, introspective artists write paragraphs)`

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { artistId, dna } = await request.json()

    if (!artistId || !dna) {
      return NextResponse.json({ error: 'artistId and dna are required' }, { status: 400 })
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Personality Print",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Generate a PersonalityPrint for this artist:\n\n${JSON.stringify(dna, null, 2)}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      logger.api.error('Personality print generation failed', { error })
      return NextResponse.json({ error: 'Failed to generate personality print' }, { status: 500 })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || ''
    const cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim()

    let print
    try {
      print = JSON.parse(cleaned)
      print.generatedAt = new Date().toISOString()
    } catch {
      logger.api.error('Failed to parse personality print', { detail: raw.substring(0, 500) })
      return NextResponse.json({ error: 'Failed to parse personality print' }, { status: 500 })
    }

    // Save to DB
    await personalityPrintService.savePrint(artistId, user.id, print)

    return NextResponse.json({ print })
  } catch (error) {
    logger.api.error('Personality print error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
