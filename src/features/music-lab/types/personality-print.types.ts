/**
 * Personality Print Types
 * Deep personality profile generated from Artist DNA
 * Drives how artists talk, think, argue, joke, and collaborate
 */

export interface SpeechProfile {
  tone: string
  pace: string
  formality: string
  slangLevel: number        // 0-100
  cursingLevel: number      // 0-100
  vocabularyLevel: string
  specialCharacteristics: string[]
  emphasisTactics: string[]
  sentenceComplexity: string
  questionStyle: string
}

export interface RhetoricProfile {
  debateStyle: string
  strategy: string
  persuasionTactics: string[]
  evidenceTypes: string[]
}

export interface EmotionalProfile {
  expressiveness: number    // 0-100
  primaryEmotions: string[]
  humorStyle: string
  humorSubjects: string[]
}

export interface CognitiveProfile {
  analyticalStrategy: string
  focusAreas: string[]
  problemSolving: string
  oppositionEval: string
}

export interface KnowledgeProfile {
  expertise: string[]
  otherKnowledge: string[]
  culturalRefTypes: string[]
  culturalRefFrequency: string
}

export interface ConversationStyleProfile {
  topicPreferences: string[]
  musicTalkRatio: number    // 0-100
  smallTalkAbility: string
  tangentStyle: string
  initiatesTopics: boolean
  conversationEnergy: string
  deepConvoTriggers: string[]
}

export interface ThematicProfile {
  commonThemes: string[]
  repeatedMotifs: string[]
  metaphorTypes: string[]
  imagery: string[]
}

export interface NonVerbalProfile {
  typingStyle: string
  emojiUsage: string
  responseSpeed: string
  listeningStyle: string
}

export interface EthicsProfile {
  moralBeliefs: string[]
  influences: string[]
  decisionDrivers: string[]
}

export interface CreativityProfile {
  problemSolvingStyle: string
  communicationStyle: string
}

export interface MotivationProfile {
  primaryDrivers: string[]
  impactOnDecisions: string
}

export interface SelfPerceptionProfile {
  selfView: string
  impactOnActions: string
}

export interface CollaborationProfile {
  opinionStrength: number   // 0-100 (how hard they fight for ideas)
  feedbackResponse: string
  conflictStyle: string
}

export interface PersonalityPrint {
  speech: SpeechProfile
  rhetoric: RhetoricProfile
  emotional: EmotionalProfile
  cognitive: CognitiveProfile
  knowledge: KnowledgeProfile
  conversationStyle: ConversationStyleProfile
  thematic: ThematicProfile
  nonVerbal: NonVerbalProfile
  ethics: EthicsProfile
  creativity: CreativityProfile
  motivation: MotivationProfile
  selfPerception: SelfPerceptionProfile
  collaborationStyle: CollaborationProfile
  generatedAt: string
}

export interface DbPersonalityPrint {
  id: string
  artist_id: string
  user_id: string
  print_json: PersonalityPrint
  created_at: string
  updated_at: string
}
