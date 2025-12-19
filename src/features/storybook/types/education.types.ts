/**
 * Educational Category System for Storybook
 *
 * Provides a drill-down taxonomy of educational categories and age-appropriate topics
 * for AI-generated children's stories.
 */

export type AgeRange = '2-3' | '4-5' | '6-7' | '8-9' | '10-12'

export interface EducationTopic {
  id: string
  name: string
  description: string
  ageRanges: AgeRange[]
  promptKeywords: string[]
  icon?: string
}

export interface EducationCategory {
  id: string
  name: string
  icon: string
  description: string
  topics: EducationTopic[]
}

export const EDUCATION_CATEGORIES: EducationCategory[] = [
  {
    id: 'narrative',
    name: 'Narrative',
    icon: '📖',
    description: 'Stories & Life Lessons',
    topics: [
      { id: 'honesty', name: 'Honesty', description: 'Learning to tell the truth', ageRanges: ['4-5', '6-7', '8-9'], promptKeywords: ['truth', 'lying', 'honest', 'trust'], icon: '✅' },
      { id: 'kindness', name: 'Kindness', description: 'Being nice to others', ageRanges: ['2-3', '4-5', '6-7'], promptKeywords: ['kind', 'helping', 'caring', 'empathy'], icon: '💝' },
      { id: 'sharing', name: 'Sharing', description: 'The joy of giving', ageRanges: ['2-3', '4-5', '6-7'], promptKeywords: ['share', 'give', 'generous', 'taking turns'], icon: '🤝' },
      { id: 'courage', name: 'Courage', description: 'Facing fears', ageRanges: ['4-5', '6-7', '8-9'], promptKeywords: ['brave', 'fear', 'try new things', 'overcome'], icon: '🦁' },
      { id: 'friendship', name: 'Friendship', description: 'Making & keeping friends', ageRanges: ['4-5', '6-7', '8-9'], promptKeywords: ['friend', 'play together', 'loyalty', 'forgive'], icon: '👥' },
      { id: 'perseverance', name: 'Perseverance', description: 'Never giving up', ageRanges: ['4-5', '6-7', '8-9', '10-12'], promptKeywords: ['try again', 'practice', 'keep going', 'hard work'], icon: '🎯' },
      { id: 'responsibility', name: 'Responsibility', description: 'Taking care of things', ageRanges: ['4-5', '6-7', '8-9'], promptKeywords: ['chores', 'pet care', 'promises', 'reliable'], icon: '🏠' },
      { id: 'gratitude', name: 'Gratitude', description: 'Being thankful', ageRanges: ['2-3', '4-5', '6-7'], promptKeywords: ['thank you', 'appreciate', 'grateful', 'lucky'], icon: '🙏' },
    ]
  },
  {
    id: 'math',
    name: 'Math',
    icon: '🔢',
    description: 'Numbers & Counting',
    topics: [
      { id: 'counting-10', name: 'Counting 1-10', description: 'Basic number recognition', ageRanges: ['2-3', '4-5'], promptKeywords: ['count', 'numbers', 'one two three', 'how many'], icon: '🔢' },
      { id: 'counting-20', name: 'Counting 1-20', description: 'Extended counting', ageRanges: ['4-5', '6-7'], promptKeywords: ['count higher', 'teens', 'twenty'], icon: '🔢' },
      { id: 'shapes', name: 'Shapes', description: 'Circle, square, triangle...', ageRanges: ['2-3', '4-5'], promptKeywords: ['circle', 'square', 'triangle', 'shape hunt'], icon: '⭕' },
      { id: 'colors', name: 'Colors', description: 'Primary & secondary colors', ageRanges: ['2-3', '4-5'], promptKeywords: ['red', 'blue', 'yellow', 'rainbow', 'color mixing'], icon: '🎨' },
      { id: 'big-small', name: 'Big & Small', description: 'Comparing sizes', ageRanges: ['2-3', '4-5'], promptKeywords: ['big', 'small', 'bigger', 'smaller', 'compare'], icon: '📏' },
      { id: 'patterns', name: 'Patterns', description: 'AB, ABC patterns', ageRanges: ['4-5', '6-7'], promptKeywords: ['pattern', 'repeat', 'what comes next', 'AB pattern'], icon: '🔄' },
      { id: 'addition', name: 'Simple Addition', description: 'Adding to 10', ageRanges: ['6-7', '8-9'], promptKeywords: ['add', 'plus', 'more', 'total', 'sum'], icon: '➕' },
      { id: 'subtraction', name: 'Simple Subtraction', description: 'Subtracting from 10', ageRanges: ['6-7', '8-9'], promptKeywords: ['take away', 'minus', 'less', 'subtract'], icon: '➖' },
    ]
  },
  {
    id: 'reading',
    name: 'Reading',
    icon: '📚',
    description: 'Letters & Phonics',
    topics: [
      { id: 'alphabet', name: 'Alphabet', description: 'Learning A-Z', ageRanges: ['2-3', '4-5'], promptKeywords: ['letter', 'alphabet', 'ABC', 'sounds'], icon: '🔤' },
      { id: 'phonics', name: 'Phonics', description: 'Letter sounds', ageRanges: ['4-5', '6-7'], promptKeywords: ['sound', 'phonics', 'sounding out', 'blend'], icon: '🗣️' },
      { id: 'sight-words', name: 'Sight Words', description: 'Common words', ageRanges: ['4-5', '6-7'], promptKeywords: ['the', 'and', 'is', 'word recognition'], icon: '👁️' },
      { id: 'rhyming', name: 'Rhyming', description: 'Words that sound alike', ageRanges: ['4-5', '6-7'], promptKeywords: ['rhyme', 'cat hat', 'sounds like'], icon: '🎵' },
      { id: 'vocabulary', name: 'Vocabulary', description: 'New words', ageRanges: ['6-7', '8-9'], promptKeywords: ['new word', 'meaning', 'dictionary', 'learn words'], icon: '📖' },
    ]
  },
  {
    id: 'science',
    name: 'Science',
    icon: '🔬',
    description: 'Nature & Discovery',
    topics: [
      { id: 'animals', name: 'Animals', description: 'Creatures & habitats', ageRanges: ['2-3', '4-5', '6-7'], promptKeywords: ['animal', 'pet', 'wild', 'farm', 'habitat'], icon: '🐾' },
      { id: 'weather', name: 'Weather', description: 'Sun, rain, snow', ageRanges: ['2-3', '4-5'], promptKeywords: ['sunny', 'rainy', 'cloudy', 'weather', 'seasons'], icon: '🌤️' },
      { id: 'plants', name: 'Plants', description: 'Growing things', ageRanges: ['4-5', '6-7'], promptKeywords: ['seed', 'grow', 'plant', 'flower', 'tree'], icon: '🌱' },
      { id: 'body', name: 'Human Body', description: 'Body parts & health', ageRanges: ['4-5', '6-7'], promptKeywords: ['body', 'healthy', 'exercise', 'senses'], icon: '🫀' },
      { id: 'space', name: 'Space', description: 'Stars & planets', ageRanges: ['6-7', '8-9'], promptKeywords: ['moon', 'stars', 'planets', 'astronaut', 'space'], icon: '🚀' },
    ]
  },
  {
    id: 'social',
    name: 'Social Skills',
    icon: '👫',
    description: 'Emotions & Relationships',
    topics: [
      { id: 'emotions', name: 'Emotions', description: 'Naming feelings', ageRanges: ['2-3', '4-5', '6-7'], promptKeywords: ['happy', 'sad', 'angry', 'feelings', 'emotions'], icon: '😊' },
      { id: 'manners', name: 'Manners', description: 'Please & thank you', ageRanges: ['2-3', '4-5'], promptKeywords: ['please', 'thank you', 'polite', 'manners'], icon: '🎩' },
      { id: 'hygiene', name: 'Hygiene', description: 'Clean habits', ageRanges: ['2-3', '4-5'], promptKeywords: ['wash hands', 'brush teeth', 'bath', 'clean'], icon: '🧼' },
      { id: 'safety', name: 'Safety', description: 'Staying safe', ageRanges: ['4-5', '6-7'], promptKeywords: ['safe', 'careful', 'stranger danger', 'rules'], icon: '🦺' },
      { id: 'family', name: 'Family', description: 'Family relationships', ageRanges: ['2-3', '4-5', '6-7'], promptKeywords: ['mom', 'dad', 'sibling', 'grandparents', 'family'], icon: '👨‍👩‍👧' },
    ]
  },
  {
    id: 'creativity',
    name: 'Creativity',
    icon: '🎨',
    description: 'Art & Imagination',
    topics: [
      { id: 'art', name: 'Art & Drawing', description: 'Creative expression', ageRanges: ['2-3', '4-5', '6-7'], promptKeywords: ['draw', 'paint', 'art', 'create', 'colors'], icon: '🖌️' },
      { id: 'music', name: 'Music', description: 'Songs & rhythm', ageRanges: ['2-3', '4-5', '6-7'], promptKeywords: ['sing', 'music', 'dance', 'instrument', 'rhythm'], icon: '🎶' },
      { id: 'imagination', name: 'Imagination', description: 'Make-believe play', ageRanges: ['4-5', '6-7'], promptKeywords: ['pretend', 'imagine', 'adventure', 'dream'], icon: '✨' },
      { id: 'storytelling', name: 'Storytelling', description: 'Creating stories', ageRanges: ['6-7', '8-9'], promptKeywords: ['story', 'character', 'plot', 'beginning middle end'], icon: '📝' },
    ]
  }
]

/**
 * Story approach types for generating 4 different story variations
 */
export interface StoryApproach {
  id: string
  name: string
  icon: string
  description: string
}

export const STORY_APPROACHES: StoryApproach[] = [
  { id: 'adventure', name: 'Adventure', icon: '🏞️', description: 'An exciting journey or quest' },
  { id: 'animals', name: 'Animals', icon: '🐾', description: 'Animal friends and companions' },
  { id: 'party', name: 'Party', icon: '🎂', description: 'A celebration or special event' },
  { id: 'magic', name: 'Magic', icon: '🌟', description: 'Magical or fantastical elements' },
  { id: 'family', name: 'Family', icon: '👨‍👩‍👧', description: 'Family moments and lessons' },
  { id: 'school', name: 'School', icon: '🏫', description: 'School and learning adventures' },
  { id: 'nature', name: 'Nature', icon: '🌳', description: 'Outdoor and nature exploration' },
  { id: 'friendship', name: 'Friendship', icon: '🤝', description: 'Making and keeping friends' },
]

/**
 * Get age range string from numeric age
 */
export function getAgeRange(age: number): AgeRange {
  if (age <= 3) return '2-3'
  if (age <= 5) return '4-5'
  if (age <= 7) return '6-7'
  if (age <= 9) return '8-9'
  return '10-12'
}

/**
 * Get category by ID
 */
export function getCategoryById(categoryId: string): EducationCategory | undefined {
  return EDUCATION_CATEGORIES.find(c => c.id === categoryId)
}

/**
 * Get topic by category and topic ID
 */
export function getTopicById(categoryId: string, topicId: string): EducationTopic | undefined {
  const category = getCategoryById(categoryId)
  return category?.topics.find(t => t.id === topicId)
}

/**
 * Get topics filtered by category and age
 */
export function getTopicsForAge(categoryId: string, age: number): EducationTopic[] {
  const category = getCategoryById(categoryId)
  if (!category) return []

  const ageRange = getAgeRange(age)
  return category.topics.filter(t => t.ageRanges.includes(ageRange))
}

/**
 * Check if a topic is appropriate for a given age
 */
export function isTopicAppropriateForAge(topic: EducationTopic, age: number): boolean {
  const ageRange = getAgeRange(age)
  return topic.ageRanges.includes(ageRange)
}

/**
 * Get 4 random story approaches (for variation)
 */
export function getRandomApproaches(count: number = 4): StoryApproach[] {
  const shuffled = [...STORY_APPROACHES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/**
 * Page count options
 */
export const PAGE_COUNT_OPTIONS = [4, 6, 8, 10, 12] as const
export type PageCount = typeof PAGE_COUNT_OPTIONS[number]

/**
 * Sentences per page options
 */
export const SENTENCES_PER_PAGE_OPTIONS = [1, 2, 3, 4, 5, 6] as const
export type SentencesPerPage = typeof SENTENCES_PER_PAGE_OPTIONS[number]

/**
 * Story generation input
 */
export interface StoryGenerationInput {
  characterName: string
  characterAge: number
  category: string
  topic: string
  pageCount: PageCount
  sentencesPerPage: SentencesPerPage
  approach: string
}

/**
 * Generated story page
 */
export interface GeneratedStoryPage {
  pageNumber: number
  text: string
  sceneDescription: string
  learningNote?: string
}

/**
 * Generated story output
 */
export interface GeneratedStory {
  title: string
  summary: string
  pages: GeneratedStoryPage[]
}

/**
 * Story idea (for the 4-approach selection)
 */
export interface StoryIdea {
  id: string
  approach: string
  approachIcon: string
  title: string
  summary: string
}

/**
 * Extracted character from story
 */
export interface ExtractedCharacter {
  name: string
  description: string
  appearances: number[]
  role: 'main' | 'supporting'
}

/**
 * Extracted location from story
 */
export interface ExtractedLocation {
  name: string
  description: string
  appearances: number[]
}

/**
 * Extracted elements from generated story
 */
export interface ExtractedElements {
  characters: ExtractedCharacter[]
  locations: ExtractedLocation[]
}
