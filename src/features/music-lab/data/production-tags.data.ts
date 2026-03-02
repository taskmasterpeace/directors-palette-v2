import type { ProductionTag } from '../types/sound-studio.types'

// ─── Drum Design ─────────────────────────────────────────────────────────────

export const DRUM_DESIGN_TAGS: ProductionTag[] = [
  // Kick
  { id: 'boomy-kick', label: 'boomy kick', category: 'drumDesign', group: 'Kick' },
  { id: 'punchy-kick', label: 'punchy kick', category: 'drumDesign', group: 'Kick' },
  { id: 'deep-kick', label: 'deep kick', category: 'drumDesign', group: 'Kick' },
  { id: '808-kick', label: '808 kick', category: 'drumDesign', group: 'Kick' },
  { id: 'distorted-kick', label: 'distorted kick', category: 'drumDesign', group: 'Kick' },
  { id: 'soft-kick', label: 'soft kick', category: 'drumDesign', group: 'Kick' },
  // Snare
  { id: 'crispy-snare', label: 'crispy snare', category: 'drumDesign', group: 'Snare' },
  { id: 'snappy-snare', label: 'snappy snare', category: 'drumDesign', group: 'Snare' },
  { id: 'rimshot', label: 'rimshot', category: 'drumDesign', group: 'Snare' },
  { id: 'fat-snare', label: 'fat snare', category: 'drumDesign', group: 'Snare' },
  { id: 'clap-snare', label: 'clap snare', category: 'drumDesign', group: 'Snare' },
  { id: 'lo-fi-snare', label: 'lo-fi snare', category: 'drumDesign', group: 'Snare' },
  // Hi-hats
  { id: 'rolling-hihats', label: 'rolling hi-hats', category: 'drumDesign', group: 'Hi-hats' },
  { id: 'trap-hihats', label: 'trap hi-hats', category: 'drumDesign', group: 'Hi-hats' },
  { id: 'closed-hihats', label: 'closed hi-hats', category: 'drumDesign', group: 'Hi-hats' },
  { id: 'open-hihats', label: 'open hi-hats', category: 'drumDesign', group: 'Hi-hats' },
  { id: 'shimmering-hihats', label: 'shimmering hi-hats', category: 'drumDesign', group: 'Hi-hats' },
  // Patterns
  { id: 'boom-bap-pattern', label: 'boom-bap pattern', category: 'drumDesign', group: 'Patterns' },
  { id: 'half-time-feel', label: 'half-time feel', category: 'drumDesign', group: 'Patterns' },
  { id: 'four-on-floor', label: 'four-on-the-floor', category: 'drumDesign', group: 'Patterns' },
  { id: 'breakbeat-pattern', label: 'breakbeat pattern', category: 'drumDesign', group: 'Patterns' },
  { id: 'shuffled-drums', label: 'shuffled drums', category: 'drumDesign', group: 'Patterns' },
  { id: 'double-time-drums', label: 'double-time drums', category: 'drumDesign', group: 'Patterns' },
]

// ─── Groove Feel ─────────────────────────────────────────────────────────────

export const GROOVE_FEEL_TAGS: ProductionTag[] = [
  { id: 'swung', label: 'swung', category: 'grooveFeel' },
  { id: 'laid-back', label: 'laid-back', category: 'grooveFeel' },
  { id: 'bouncy', label: 'bouncy', category: 'grooveFeel' },
  { id: 'syncopated', label: 'syncopated', category: 'grooveFeel' },
  { id: 'behind-the-beat', label: 'behind the beat', category: 'grooveFeel' },
  { id: 'pocket-groove', label: 'pocket groove', category: 'grooveFeel' },
  { id: 'tight-quantized', label: 'tight quantized', category: 'grooveFeel' },
  { id: 'loose-feel', label: 'loose feel', category: 'grooveFeel' },
  { id: 'driving', label: 'driving', category: 'grooveFeel' },
  { id: 'dragging', label: 'dragging', category: 'grooveFeel' },
  { id: 'polyrhythmic', label: 'polyrhythmic', category: 'grooveFeel' },
  { id: 'stuttered', label: 'stuttered', category: 'grooveFeel' },
]

// ─── Bass Style ──────────────────────────────────────────────────────────────

export const BASS_STYLE_TAGS: ProductionTag[] = [
  { id: '808-sub-bass', label: '808 sub bass', category: 'bassStyle' },
  { id: 'reese-bass', label: 'reese bass', category: 'bassStyle' },
  { id: 'slap-bass', label: 'slap bass', category: 'bassStyle' },
  { id: 'walking-bass', label: 'walking bass', category: 'bassStyle' },
  { id: 'moog-bass', label: 'Moog bass', category: 'bassStyle' },
  { id: 'filtered-bass', label: 'filtered bass', category: 'bassStyle' },
  { id: 'wobble-bass', label: 'wobble bass', category: 'bassStyle' },
  { id: 'distorted-bass', label: 'distorted bass', category: 'bassStyle' },
  { id: 'deep-bass', label: 'deep bass', category: 'bassStyle' },
  { id: 'plucked-bass', label: 'plucked bass', category: 'bassStyle' },
  { id: 'acid-bass', label: 'acid bass', category: 'bassStyle' },
  { id: 'fingerstyle-bass', label: 'fingerstyle bass', category: 'bassStyle' },
]

// ─── Synth/Keys Texture ──────────────────────────────────────────────────────

export const SYNTH_TEXTURE_TAGS: ProductionTag[] = [
  { id: 'warm-pads', label: 'warm pads', category: 'synthTexture' },
  { id: 'glassy-synth', label: 'glassy', category: 'synthTexture' },
  { id: 'analog-warmth', label: 'analog warmth', category: 'synthTexture' },
  { id: 'chord-stabs', label: 'chord stabs', category: 'synthTexture' },
  { id: 'rhodes-chords', label: 'Rhodes chords', category: 'synthTexture' },
  { id: 'fm-textures', label: 'FM textures', category: 'synthTexture' },
  { id: 'lush-pads', label: 'lush pads', category: 'synthTexture' },
  { id: 'detuned-synth', label: 'detuned synth', category: 'synthTexture' },
  { id: 'bright-keys', label: 'bright keys', category: 'synthTexture' },
  { id: 'pluck-melody', label: 'pluck melody', category: 'synthTexture' },
  { id: 'arpeggiated-synth', label: 'arpeggiated synth', category: 'synthTexture' },
  { id: 'gritty-keys', label: 'gritty keys', category: 'synthTexture' },
]

// ─── Harmony Color ───────────────────────────────────────────────────────────

export const HARMONY_COLOR_TAGS: ProductionTag[] = [
  { id: 'minor-key', label: 'minor key', category: 'harmonyColor' },
  { id: 'major-key', label: 'major key', category: 'harmonyColor' },
  { id: 'jazz-chords', label: 'jazz chords', category: 'harmonyColor' },
  { id: 'gospel-chords', label: 'gospel chords', category: 'harmonyColor' },
  { id: 'neo-soul-chords', label: 'neo-soul chords', category: 'harmonyColor' },
  { id: 'pentatonic', label: 'pentatonic', category: 'harmonyColor' },
  { id: 'blues-scale', label: 'blues scale', category: 'harmonyColor' },
  { id: 'modal', label: 'modal', category: 'harmonyColor' },
  { id: 'chromatic', label: 'chromatic', category: 'harmonyColor' },
  { id: 'seventh-chords', label: 'seventh chords', category: 'harmonyColor' },
  { id: 'suspended-chords', label: 'suspended chords', category: 'harmonyColor' },
  { id: 'power-chords', label: 'power chords', category: 'harmonyColor' },
]

// ─── Space & FX ──────────────────────────────────────────────────────────────

export const SPACE_FX_TAGS: ProductionTag[] = [
  // Reverb
  { id: 'heavy-reverb', label: 'heavy reverb', category: 'spaceFx', group: 'Reverb' },
  { id: 'plate-reverb', label: 'plate reverb', category: 'spaceFx', group: 'Reverb' },
  { id: 'hall-reverb', label: 'hall reverb', category: 'spaceFx', group: 'Reverb' },
  { id: 'gated-reverb', label: 'gated reverb', category: 'spaceFx', group: 'Reverb' },
  { id: 'spring-reverb', label: 'spring reverb', category: 'spaceFx', group: 'Reverb' },
  // Delay
  { id: 'tape-delay', label: 'tape delay', category: 'spaceFx', group: 'Delay' },
  { id: 'ping-pong-delay', label: 'ping-pong delay', category: 'spaceFx', group: 'Delay' },
  { id: 'slapback-delay', label: 'slapback delay', category: 'spaceFx', group: 'Delay' },
  { id: 'dotted-delay', label: 'dotted delay', category: 'spaceFx', group: 'Delay' },
  // Width & Processing
  { id: 'sidechain-compression', label: 'sidechain compression', category: 'spaceFx', group: 'Processing' },
  { id: 'lo-fi-degradation', label: 'lo-fi degradation', category: 'spaceFx', group: 'Processing' },
  { id: 'stereo-width', label: 'wide stereo', category: 'spaceFx', group: 'Processing' },
  { id: 'mono-center', label: 'mono center', category: 'spaceFx', group: 'Processing' },
  { id: 'tape-saturation', label: 'tape saturation', category: 'spaceFx', group: 'Processing' },
  { id: 'bit-crushing', label: 'bit-crushing', category: 'spaceFx', group: 'Processing' },
  { id: 'chorus', label: 'chorus', category: 'spaceFx', group: 'Processing' },
  { id: 'phaser', label: 'phaser', category: 'spaceFx', group: 'Processing' },
  { id: 'flanger', label: 'flanger', category: 'spaceFx', group: 'Processing' },
]

// ─── Ear Candy ───────────────────────────────────────────────────────────────

export const EAR_CANDY_TAGS: ProductionTag[] = [
  { id: 'vinyl-crackle', label: 'vinyl crackle', category: 'earCandy' },
  { id: 'tape-hiss', label: 'tape hiss', category: 'earCandy' },
  { id: 'risers', label: 'risers', category: 'earCandy' },
  { id: 'stutter-edits', label: 'stutter edits', category: 'earCandy' },
  { id: 'record-scratch', label: 'record scratch', category: 'earCandy' },
  { id: 'granular-textures', label: 'granular textures', category: 'earCandy' },
  { id: 'white-noise-sweeps', label: 'white noise sweeps', category: 'earCandy' },
  { id: 'reversed-sounds', label: 'reversed sounds', category: 'earCandy' },
  { id: 'vocal-chops', label: 'vocal chops', category: 'earCandy' },
  { id: 'foley-sounds', label: 'foley sounds', category: 'earCandy' },
  { id: 'glitch-textures', label: 'glitch textures', category: 'earCandy' },
  { id: 'transition-fx', label: 'transition FX', category: 'earCandy' },
]

// ─── Production Style (general tags) ────────────────────────────────────────

export const PRODUCTION_STYLE_TAGS: ProductionTag[] = [
  { id: 'sparse-production', label: 'sparse production', category: 'productionStyle' },
  { id: 'dense-production', label: 'dense production', category: 'productionStyle' },
  { id: 'lo-fi-production', label: 'lo-fi', category: 'productionStyle' },
  { id: 'polished', label: 'polished', category: 'productionStyle' },
  { id: 'raw-production', label: 'raw', category: 'productionStyle' },
  { id: 'sample-based', label: 'sample-based', category: 'productionStyle' },
  { id: 'vintage', label: 'vintage', category: 'productionStyle' },
  { id: 'analog', label: 'analog', category: 'productionStyle' },
  { id: 'digital-clean', label: 'digital clean', category: 'productionStyle' },
  { id: 'minimalist', label: 'minimalist', category: 'productionStyle' },
  { id: 'maximalist', label: 'maximalist', category: 'productionStyle' },
  { id: 'layered', label: 'layered', category: 'productionStyle' },
]

// ─── Structure Presets ───────────────────────────────────────────────────────

export const STRUCTURE_PRESETS = [
  { id: 'verse-chorus', label: 'Verse → Chorus → Verse → Chorus', value: 'verse-chorus-verse-chorus' },
  { id: 'loop-based', label: 'Loop-based (no structure)', value: 'loop-based continuous beat' },
  { id: 'build-drop', label: 'Build → Drop → Break → Drop', value: 'build-drop-break-drop' },
  { id: 'intro-verse-chorus-bridge', label: 'Intro → Verse → Chorus → Bridge → Chorus', value: 'intro-verse-chorus-bridge-chorus' },
  { id: 'ambient-evolving', label: 'Slow Evolving (ambient)', value: 'slowly evolving ambient progression' },
  { id: 'abab', label: 'A-B-A-B', value: 'ABAB alternating sections' },
  { id: 'cinematic-arc', label: 'Cinematic Arc', value: 'cinematic arc building from quiet to epic' },
]

// ─── Musical Keys ────────────────────────────────────────────────────────────

export const MUSICAL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
export const KEY_MODES = ['Major', 'Minor'] as const

export function getMusicalKeys(): string[] {
  const keys: string[] = []
  for (const note of MUSICAL_NOTES) {
    for (const mode of KEY_MODES) {
      keys.push(`${note} ${mode}`)
    }
  }
  return keys
}
