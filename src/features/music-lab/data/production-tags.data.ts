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
  { id: 'brushed-drums', label: 'brushed drums', category: 'drumDesign', group: 'Patterns' },
  { id: 'one-drop-drums', label: 'one-drop drums', category: 'drumDesign', group: 'Patterns' },
  { id: 'double-bass-drums', label: 'double bass drums', category: 'drumDesign', group: 'Patterns' },
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
  { id: 'shuffle', label: 'shuffle', category: 'grooveFeel' },
  { id: 'dembow', label: 'dembow', category: 'grooveFeel' },
  { id: 'bossa-nova', label: 'bossa nova', category: 'grooveFeel' },
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
  { id: 'analog-synth-bass', label: 'analog synth bass', category: 'bassStyle' },
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
  { id: 'ambient-pads', label: 'ambient pads', category: 'synthTexture' },
  { id: 'filtered-pads', label: 'filtered pads', category: 'synthTexture' },
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
  { id: 'room-reverb', label: 'room reverb', category: 'spaceFx', group: 'Reverb' },
  { id: 'filter-sweeps', label: 'filter sweeps', category: 'spaceFx', group: 'Processing' },
  { id: 'wah-wah', label: 'wah-wah', category: 'spaceFx', group: 'Processing' },
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
  { id: 'talk-box', label: 'talk-box', category: 'earCandy' },
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

// ─── Era ─────────────────────────────────────────────────────────────────────
// Single-select era picker. Mix of decade labels and flavored era descriptors
// that give Suno a distinct sonic time period to emulate.

export const ERA_TAGS: ProductionTag[] = [
  // Decades
  { id: 'era-60s', label: '60s', category: 'era', group: 'Decade' },
  { id: 'era-70s', label: '70s', category: 'era', group: 'Decade' },
  { id: 'era-80s', label: '80s', category: 'era', group: 'Decade' },
  { id: 'era-90s', label: '90s', category: 'era', group: 'Decade' },
  { id: 'era-2000s', label: '2000s', category: 'era', group: 'Decade' },
  { id: 'era-2010s', label: '2010s', category: 'era', group: 'Decade' },
  // Flavored eras
  { id: 'era-70s-soul', label: '70s orchestral soul', category: 'era', group: 'Flavor' },
  { id: 'era-70s-funk', label: '70s funk', category: 'era', group: 'Flavor' },
  { id: 'era-80s-horror', label: '80s horror movie', category: 'era', group: 'Flavor' },
  { id: 'era-80s-synthwave', label: '80s synthwave', category: 'era', group: 'Flavor' },
  { id: 'era-80s-boogie', label: '80s boogie', category: 'era', group: 'Flavor' },
  { id: 'era-90s-boombap', label: '90s boom-bap', category: 'era', group: 'Flavor' },
  { id: 'era-90s-gfunk', label: '90s G-funk', category: 'era', group: 'Flavor' },
  { id: 'era-golden-era', label: 'golden era hip-hop', category: 'era', group: 'Flavor' },
  { id: 'era-dusty-crates', label: 'dusty crate digger', category: 'era', group: 'Flavor' },
  { id: 'era-blaxploitation', label: 'blaxploitation', category: 'era', group: 'Flavor' },
  { id: 'era-giallo', label: 'Italian giallo score', category: 'era', group: 'Flavor' },
  { id: 'era-2000s-crunk', label: '2000s crunk', category: 'era', group: 'Flavor' },
  { id: 'era-2010s-trap', label: '2010s trap', category: 'era', group: 'Flavor' },
  { id: 'era-library-music', label: '70s library music', category: 'era', group: 'Flavor' },
]

// ─── Sample Character ────────────────────────────────────────────────────────
// Describes what the source sample/loop FEELS like — transformations and genre
// of source material. Lets users ask for "pitched-down 70s orchestral soul" etc.

export const SAMPLE_CHARACTER_TAGS: ProductionTag[] = [
  // Transformations
  { id: 'pitched-down-sample', label: 'pitched-down', category: 'sampleCharacter', group: 'Transform' },
  { id: 'sped-up-sample', label: 'sped-up / chipmunked', category: 'sampleCharacter', group: 'Transform' },
  { id: 'chopped-sample', label: 'chopped & flipped', category: 'sampleCharacter', group: 'Transform' },
  { id: 'reversed-sample', label: 'reversed sample', category: 'sampleCharacter', group: 'Transform' },
  { id: 'filtered-sample', label: 'filtered sample', category: 'sampleCharacter', group: 'Transform' },
  { id: 'looped-sample', label: 'loop-able break', category: 'sampleCharacter', group: 'Transform' },
  { id: 'time-stretched', label: 'time-stretched', category: 'sampleCharacter', group: 'Transform' },
  { id: 'vinyl-pop-sample', label: 'vinyl-pop sample', category: 'sampleCharacter', group: 'Transform' },
  // Source material
  { id: 'orchestral-soul-sample', label: 'orchestral soul sample', category: 'sampleCharacter', group: 'Source' },
  { id: 'horror-movie-sample', label: 'horror movie sample', category: 'sampleCharacter', group: 'Source' },
  { id: 'gospel-sample', label: 'gospel sample', category: 'sampleCharacter', group: 'Source' },
  { id: 'jazz-break', label: 'jazz break', category: 'sampleCharacter', group: 'Source' },
  { id: 'funk-break', label: 'funk break', category: 'sampleCharacter', group: 'Source' },
  { id: 'blaxploitation-strings', label: 'blaxploitation strings', category: 'sampleCharacter', group: 'Source' },
  { id: 'library-music-sample', label: 'library music', category: 'sampleCharacter', group: 'Source' },
  { id: 'kung-fu-dialogue', label: 'kung-fu movie dialogue', category: 'sampleCharacter', group: 'Source' },
  { id: 'bollywood-sample', label: 'Bollywood strings', category: 'sampleCharacter', group: 'Source' },
  { id: 'spaghetti-western-sample', label: 'spaghetti western', category: 'sampleCharacter', group: 'Source' },
  { id: 'dusty-crate-sample', label: 'dusty crate sample', category: 'sampleCharacter', group: 'Source' },
  { id: 'bossa-sample', label: 'bossa nova sample', category: 'sampleCharacter', group: 'Source' },
  { id: 'childrens-record-sample', label: "children's record sample", category: 'sampleCharacter', group: 'Source' },
  { id: 'old-tv-sample', label: 'old TV theme sample', category: 'sampleCharacter', group: 'Source' },
]

// ─── Motion & Envelope ───────────────────────────────────────────────────────
// The VERBS that give elements shape — swelling, fading, breathing, pulsing.
// These modify whatever sound design is already picked.

export const MOTION_ENVELOPE_TAGS: ProductionTag[] = [
  { id: 'swelling', label: 'swelling', category: 'motionEnvelope' },
  { id: 'fading', label: 'fading', category: 'motionEnvelope' },
  { id: 'breathing', label: 'breathing', category: 'motionEnvelope' },
  { id: 'pulsing', label: 'pulsing undercurrent', category: 'motionEnvelope' },
  { id: 'throbbing', label: 'throbbing', category: 'motionEnvelope' },
  { id: 'rising', label: 'rising', category: 'motionEnvelope' },
  { id: 'falling', label: 'falling', category: 'motionEnvelope' },
  { id: 'cresting', label: 'cresting', category: 'motionEnvelope' },
  { id: 'decaying', label: 'slow decay', category: 'motionEnvelope' },
  { id: 'building', label: 'building', category: 'motionEnvelope' },
  { id: 'long-phrases', label: 'long breathing phrases', category: 'motionEnvelope' },
  { id: 'swells-and-fades', label: 'swells and fades', category: 'motionEnvelope' },
  { id: 'ebbs-and-flows', label: 'ebbs and flows', category: 'motionEnvelope' },
  { id: 'slow-attack', label: 'slow attack', category: 'motionEnvelope' },
  { id: 'long-release', label: 'long release tails', category: 'motionEnvelope' },
  { id: 'tempo-pushing', label: 'tempo pushing', category: 'motionEnvelope' },
  { id: 'tempo-pulling', label: 'tempo pulling back', category: 'motionEnvelope' },
  { id: 'dynamic-swells', label: 'dynamic swells', category: 'motionEnvelope' },
  // Spatial modifiers (distance/dryness — belongs here conceptually)
  { id: 'distant', label: 'distant', category: 'motionEnvelope', group: 'Space' },
  { id: 'close-and-dry', label: 'close and dry', category: 'motionEnvelope', group: 'Space' },
  { id: 'far-back-in-mix', label: 'far back in mix', category: 'motionEnvelope', group: 'Space' },
  { id: 'intimate', label: 'intimate / nearfield', category: 'motionEnvelope', group: 'Space' },
  { id: 'cavernous', label: 'cavernous', category: 'motionEnvelope', group: 'Space' },
  { id: 'dusty-room-tone', label: 'dusty room tone', category: 'motionEnvelope', group: 'Space' },
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
  { id: '12-bar-blues', label: '12-Bar Blues', value: '12-bar blues progression (I-I-I-I-IV-IV-I-I-V-IV-I-V)' },
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
