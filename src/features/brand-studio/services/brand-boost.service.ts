import type { Brand } from '../types'

export class BrandBoostService {
  static enrichImagePrompt(prompt: string, brand: Brand): string {
    const parts = [prompt]
    const colors = brand.visual_identity_json?.colors
    if (colors?.length) {
      parts.push(`Color palette: ${colors.map(c => `${c.name} (${c.hex})`).join(', ')}`)
    }
    const style = brand.visual_style_json
    if (style) {
      if (style.photography_tone) parts.push(`Photography tone: ${style.photography_tone}`)
      if (style.subjects?.length) parts.push(`Visual style: ${style.subjects.join(', ')}`)
      if (style.composition) parts.push(`Composition: ${style.composition}`)
    }
    return parts.join('. ')
  }

  static enrichVideoPrompt(prompt: string, brand: Brand): string {
    return BrandBoostService.enrichImagePrompt(prompt, brand)
  }

  static enrichMusicPrompt(prompt: string, brand: Brand): string {
    const parts = [prompt]
    const music = brand.music_json
    if (music) {
      if (music.genres?.length) parts.push(`Genre: ${music.genres.join(', ')}`)
      if (music.moods?.length) parts.push(`Mood: ${music.moods.join(', ')}`)
      if (music.bpm_range) parts.push(`BPM: ${music.bpm_range.min}-${music.bpm_range.max}`)
    }
    return parts.join('. ')
  }

  static getVoiceSettings(brand: Brand): { stability: number; similarity_boost: number } {
    const voice = brand.voice_json
    if (!voice) return { stability: 0.5, similarity_boost: 0.75 }
    const tones = voice.tone.map(t => t.toLowerCase())
    const isCalm = tones.some(t => ['calm', 'professional', 'warm', 'gentle'].includes(t))
    const isEnergetic = tones.some(t => ['energetic', 'bold', 'dynamic', 'exciting'].includes(t))
    return {
      stability: isCalm ? 0.7 : isEnergetic ? 0.3 : 0.5,
      similarity_boost: 0.75,
    }
  }
}
