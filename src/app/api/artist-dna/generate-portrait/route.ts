/**
 * Artist DNA Generate Portrait API
 * Generates an artist portrait via Replicate nano-banana
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

interface PortraitRequest {
  skinTone: string
  hairStyle: string
  fashionStyle: string
  jewelry: string
  tattoos: string
  visualDescription: string
  ethnicity: string
}

function buildPrompt(req: PortraitRequest): string {
  const parts: string[] = ['Portrait of a']

  if (req.ethnicity) parts.push(req.ethnicity)
  parts.push('music artist')

  if (req.skinTone) parts.push(`with ${req.skinTone} skin`)
  if (req.hairStyle) parts.push(`${req.hairStyle} hair`)
  if (req.fashionStyle) parts.push(`Wearing ${req.fashionStyle}`)
  if (req.jewelry) parts.push(req.jewelry)
  if (req.tattoos) parts.push(req.tattoos)
  if (req.visualDescription) parts.push(req.visualDescription)

  parts.push('Professional headshot, studio lighting, high quality portrait photography.')

  return parts.join('. ').replace(/\.\./g, '.')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json() as PortraitRequest

    const prompt = buildPrompt(body)

    const prediction = await replicate.predictions.create({
      model: 'google/nano-banana',
      input: {
        prompt,
        aspect_ratio: '1:1',
        output_format: 'jpg',
      },
    })

    const completed = await replicate.wait(prediction, { interval: 1000 })

    if (completed.status === 'succeeded' && completed.output) {
      const url = Array.isArray(completed.output)
        ? completed.output[0]
        : completed.output
      return NextResponse.json({ url })
    }

    return NextResponse.json({ error: 'Portrait generation failed' }, { status: 500 })
  } catch (error) {
    console.error('Portrait generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
