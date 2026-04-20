/**
 * Contact Sheet Recipe — types
 *
 * A contact sheet is a 6-frame composited JPG that tells an external
 * video generator (Kling, Runway, Sora, Seedance) what should happen
 * during a ~15s song segment. It is the "what" brief that pairs with
 * the artist character sheet (the "who") in a Music Lab export kit.
 */

export interface ContactSheetBeat {
  /** Short imperative caption placed under the frame, e.g. "Low dolly-in on empty porch" */
  caption: string
  /** Optional extra prompt detail for this frame only */
  promptExtra?: string
}

export interface ContactSheetInput {
  /** Artist profile id (artist_profiles.id) — used to load DNA + character sheet */
  artistId: string
  /** Song identifier from the user's catalog (free-form string) */
  songId: string
  /** Segment id within the song, e.g. "v1-a" or "chorus-1" */
  segmentId: string
  /** Human label shown on the sheet header, e.g. "Verse 1 — Bar 1-4" */
  segmentLabel?: string
  /** Segment start time in seconds */
  startS: number
  /** Segment end time in seconds (must be <= startS + 15) */
  endS: number
  /**
   * One-line scene brief for the entire 15s, e.g.
   * "Empty streetlit porch at 3am, 45s after a fight — guilt, dusty-exit energy."
   */
  scene: string
  /**
   * Exactly 6 beats. They map left-to-right, top-to-bottom on a 2x3 grid.
   * Frames 1 & 6 should be the visual bookends (open / close).
   */
  beats: ContactSheetBeat[]
  /** Optional extra wardrobe / lighting overrides that should apply to all frames */
  globalStyleNotes?: string
}

export interface ContactSheetFrame {
  index: number
  caption: string
  prompt: string
  /** Public URL of the individually-generated frame (intermediate artifact) */
  frameUrl?: string
  /** Error message if this frame failed */
  error?: string
}

export interface ContactSheetResult {
  /** Unique id for this contact sheet run (used in file names) */
  id: string
  artistId: string
  songId: string
  segmentId: string
  /** Public URL of the composited contact sheet JPG */
  contactSheetUrl: string
  /** Supabase storage path */
  storagePath: string
  /** Per-frame details */
  frames: ContactSheetFrame[]
  /** Total credits deducted (sum of per-frame generation) */
  creditsSpent: number
  /** ISO timestamp */
  createdAt: string
}
