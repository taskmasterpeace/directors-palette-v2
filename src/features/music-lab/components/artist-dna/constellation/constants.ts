import type { ArtistDnaTab } from '../../../types/artist-dna.types'

export const RING_COLORS = [
  '#f59e0b', // amber - Sound
  '#38bdf8', // sky blue - Influences
  '#ef4444', // red - Persona
  '#06b6d4', // cyan - Lexicon
  '#22c55e', // green - Profile
]

export const RING_LABELS = ['Sound', 'Influences', 'Persona', 'Lexicon', 'Profile'] as const

export const RING_TAB_MAP: Record<string, ArtistDnaTab> = {
  Sound: 'sound',
  Influences: 'sound',
  Persona: 'persona',
  Lexicon: 'lexicon',
  Profile: 'identity',
}

// Genre → particle color palettes for StarField atmosphere
export const GENRE_PALETTES: Record<string, [number, number, number][]> = {
  'hip-hop':    [[0.96, 0.62, 0.04], [0.92, 0.35, 0.05], [0.10, 0.10, 0.04]],
  'trap':       [[0.96, 0.62, 0.04], [0.92, 0.35, 0.05], [0.10, 0.10, 0.04]],
  'rap':        [[0.96, 0.62, 0.04], [0.92, 0.35, 0.05], [0.10, 0.10, 0.04]],
  'pop':        [[0.93, 0.28, 0.60], [0.66, 0.33, 0.97], [0.98, 0.98, 0.98]],
  'rock':       [[0.94, 0.27, 0.27], [0.98, 0.45, 0.09], [0.27, 0.10, 0.01]],
  'metal':      [[0.94, 0.27, 0.27], [0.98, 0.45, 0.09], [0.27, 0.10, 0.01]],
  'electronic': [[0.02, 0.71, 0.83], [0.23, 0.51, 0.96], [0.05, 0.65, 0.91]],
  'dance':      [[0.02, 0.71, 0.83], [0.23, 0.51, 0.96], [0.05, 0.65, 0.91]],
  'r&b':        [[0.49, 0.23, 0.93], [0.96, 0.62, 0.04], [0.60, 0.40, 0.90]],
  'soul':       [[0.49, 0.23, 0.93], [0.96, 0.62, 0.04], [0.60, 0.40, 0.90]],
  'jazz':       [[0.85, 0.47, 0.02], [0.57, 0.25, 0.05], [0.90, 0.75, 0.40]],
  'country':    [[0.85, 0.60, 0.20], [0.57, 0.40, 0.15], [0.40, 0.65, 0.30]],
  'reggae':     [[0.20, 0.80, 0.20], [0.96, 0.62, 0.04], [0.80, 0.20, 0.20]],
  'latino':     [[0.96, 0.40, 0.20], [0.96, 0.62, 0.04], [0.85, 0.25, 0.40]],
  'blues':      [[0.15, 0.30, 0.70], [0.40, 0.55, 0.80], [0.85, 0.75, 0.50]],
  'classical':  [[0.90, 0.85, 0.70], [0.70, 0.60, 0.45], [0.95, 0.92, 0.88]],
}

export const DEFAULT_PALETTE: [number, number, number][] = [
  [0.8, 0.8, 0.8],
  [0.96, 0.62, 0.04],
  [0.22, 0.74, 0.97],
]

export const ATTITUDE_SHIFTS: Record<string, number> = {
  aggressive: 0.08,
  angry: 0.08,
  defiant: 0.05,
  chill: -0.08,
  mellow: -0.06,
  playful: 0.0,
  vulnerable: -0.04,
}
