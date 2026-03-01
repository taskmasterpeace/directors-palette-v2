/**
 * Living Context Types
 * Real-time awareness of what the artist is doing right now
 */

export interface PhoneProfile {
  model: string
  caseStyle: string
  photoStyle: string
  socialHabits: string
}

export interface EnvironmentContext {
  setting: string
  vibe: string
  clothing: string
}

export interface LivingContext {
  // Time awareness
  currentTime: string
  dayOfWeek: string
  date: string
  season: string
  holiday: string | null
  timeOfDay: string

  // Inferred activity
  currentActivity: string
  currentMood: string
  currentLocation: string
  whoTheyreWith: string[]

  // Environment (feeds image gen)
  environment: EnvironmentContext

  // Phone & photo behavior
  phone: PhoneProfile

  // Status bar display
  statusLine: string
  statusEmoji: string
  activityDescription: string
}

export interface EntourageMember {
  name: string
  role: string
  appearance: string
  frequency: string   // "always around", "weekends only"
}

export interface ArtistSocialCircle {
  entourage: EntourageMember[]
  hangoutSpots: string[]
  transportation: string
}
