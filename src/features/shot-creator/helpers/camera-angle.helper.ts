/**
 * Camera Angle Helper
 * Maps azimuth/elevation/distance values to text tokens for the
 * Qwen Image Edit 2511 Multiple-Angles LoRA.
 *
 * The LoRA defines 96 camera poses: 8 azimuths × 4 elevations × 3 distances.
 * Prompt format: "<sks> [azimuth] [elevation] [distance]"
 */

export interface CameraAngle {
  azimuth: number    // 0-360 degrees (horizontal rotation)
  elevation: number  // -30 to 60 degrees (vertical tilt)
  distance: number   // 0-10 (zoom: 0=wide, 10=close-up)
}

export const DEFAULT_CAMERA_ANGLE: CameraAngle = {
  azimuth: 0,
  elevation: 0,
  distance: 5,
}

// ── Azimuth mapping (8 positions) ────────────────────────────────────

const AZIMUTH_SEGMENTS = [
  { min: 337.5, max: 360, label: 'front view' },
  { min: 0,     max: 22.5, label: 'front view' },
  { min: 22.5,  max: 67.5, label: 'front-right quarter view' },
  { min: 67.5,  max: 112.5, label: 'right side view' },
  { min: 112.5, max: 157.5, label: 'back-right quarter view' },
  { min: 157.5, max: 202.5, label: 'back view' },
  { min: 202.5, max: 247.5, label: 'back-left quarter view' },
  { min: 247.5, max: 292.5, label: 'left side view' },
  { min: 292.5, max: 337.5, label: 'front-left quarter view' },
] as const

// ── Elevation mapping (4 positions) ─────────────────────────────────

const ELEVATION_THRESHOLDS = [
  { max: -15, label: 'low-angle shot' },      // -30°
  { max: 15,  label: 'eye-level shot' },       //   0°
  { max: 45,  label: 'elevated shot' },        //  30°
  { max: 90,  label: 'high-angle shot' },      //  60°
] as const

// ── Distance mapping (3 positions) ──────────────────────────────────

const DISTANCE_THRESHOLDS = [
  { max: 3.33,  label: 'wide shot' },
  { max: 6.67,  label: 'medium shot' },
  { max: 10,    label: 'close-up' },
] as const

/**
 * Convert azimuth degrees to text token
 */
export function getAzimuthLabel(azimuth: number): string {
  const normalized = ((azimuth % 360) + 360) % 360
  for (const seg of AZIMUTH_SEGMENTS) {
    if (seg.min <= seg.max) {
      if (normalized >= seg.min && normalized < seg.max) return seg.label
    } else {
      // Wrapping segment (337.5 → 360)
      if (normalized >= seg.min || normalized < seg.max) return seg.label
    }
  }
  return 'front view'
}

/**
 * Convert elevation degrees to text token
 */
export function getElevationLabel(elevation: number): string {
  const clamped = Math.max(-30, Math.min(60, elevation))
  for (const t of ELEVATION_THRESHOLDS) {
    if (clamped <= t.max) return t.label
  }
  return 'eye-level shot'
}

/**
 * Convert distance value to text token
 */
export function getDistanceLabel(distance: number): string {
  const clamped = Math.max(0, Math.min(10, distance))
  for (const t of DISTANCE_THRESHOLDS) {
    if (clamped <= t.max) return t.label
  }
  return 'medium shot'
}

/**
 * Build the full camera angle prompt token.
 * Format: "<sks> [azimuth] [elevation] [distance]"
 */
export function buildCameraAnglePrompt(angle: CameraAngle): string {
  const azimuth = getAzimuthLabel(angle.azimuth)
  const elevation = getElevationLabel(angle.elevation)
  const distance = getDistanceLabel(angle.distance)
  return `<sks> ${azimuth} ${elevation} ${distance}`
}

/**
 * Build a human-readable description (for UI display, no <sks> token)
 */
export function getCameraAngleDescription(angle: CameraAngle): string {
  const azimuth = getAzimuthLabel(angle.azimuth)
  const elevation = getElevationLabel(angle.elevation)
  const distance = getDistanceLabel(angle.distance)
  return `${azimuth}, ${elevation}, ${distance}`
}

/**
 * Preset camera angles for quick selection
 */
export const CAMERA_PRESETS = [
  { name: 'Front',       angle: { azimuth: 0,   elevation: 0,   distance: 5 } },
  { name: 'Right',       angle: { azimuth: 90,  elevation: 0,   distance: 5 } },
  { name: 'Back',        angle: { azimuth: 180, elevation: 0,   distance: 5 } },
  { name: 'Left',        angle: { azimuth: 270, elevation: 0,   distance: 5 } },
  { name: 'Hero Low',    angle: { azimuth: 30,  elevation: -20, distance: 7 } },
  { name: 'Bird\'s Eye', angle: { azimuth: 0,   elevation: 55,  distance: 3 } },
  { name: 'Close-up',    angle: { azimuth: 0,   elevation: 0,   distance: 9 } },
  { name: 'Wide',        angle: { azimuth: 0,   elevation: 0,   distance: 1 } },
] as const
