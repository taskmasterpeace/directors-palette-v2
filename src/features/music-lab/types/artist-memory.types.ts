/**
 * Artist Memory Types
 * Persistent memory across chat sessions — remembers you, your work, your relationship
 */

export interface UserKnowledge {
  name: string | null
  preferences: string[]
  musicTaste: string[]
  personalDetails: string[]
  workStyle: string[]
  petPeeves: string[]
}

export interface SessionSummary {
  id: string
  date: string
  summary: string
  outcome: string
  moodOfSession: string
  keyDecisions: string[]
  unresolvedIdeas: string[]
}

export interface RelationshipState {
  rapportLevel: number       // 0-100, grows over time
  insideJokes: string[]
  sharedReferences: string[]
  conflictHistory: string[]
  trust: number              // affects vulnerability
}

export interface SelfReflection {
  growthNotes: string[]
  currentObsessions: string[]
  frustrations: string[]
  goals: string[]
}

export interface MemoryFact {
  content: string
  source: string             // "chat on 2/28"
  importance: number         // 0-10
}

export interface ArtistMemory {
  aboutUser: UserKnowledge
  sessions: SessionSummary[]
  relationship: RelationshipState
  selfReflections: SelfReflection[]
  facts: MemoryFact[]
}

export interface DbArtistMemory {
  id: string
  artist_id: string
  user_id: string
  memory_json: ArtistMemory
  updated_at: string
}

export function createEmptyMemory(): ArtistMemory {
  return {
    aboutUser: {
      name: null,
      preferences: [],
      musicTaste: [],
      personalDetails: [],
      workStyle: [],
      petPeeves: [],
    },
    sessions: [],
    relationship: {
      rapportLevel: 10,
      insideJokes: [],
      sharedReferences: [],
      conflictHistory: [],
      trust: 10,
    },
    selfReflections: [],
    facts: [],
  }
}
