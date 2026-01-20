/**
 * Story Structures Data
 * Predefined narrative frameworks for AI-powered story generation
 *
 * Each structure provides a template that guides the AI in creating
 * well-paced, engaging children's stories with proper narrative beats.
 */

import type { StoryStructure } from '../types/story-structure.types'

/**
 * Story Spine (Pixar)
 * The simplest and most versatile structure, perfect for younger children
 * Origin: Pixar Animation Studios storytelling formula
 */
export const STORY_SPINE: StoryStructure = {
  id: 'story-spine',
  name: 'Story Spine',
  origin: 'Pixar',
  icon: '🎬',
  description: 'Classic Pixar storytelling formula - simple, powerful, perfect for young readers',
  longDescription:
    'The Story Spine is a simple but powerful narrative framework developed at Pixar. It uses transitional phrases to create a clear cause-and-effect chain that young children can easily follow.',
  beatCount: 7,
  beats: [
    {
      id: 'once-upon',
      order: 0,
      name: 'Once upon a time...',
      purpose: 'Introduce the main character and their everyday world',
      promptGuidance:
        'Set the scene with a warm, inviting introduction to the main character. Show their normal life and what makes them special. Keep it simple and visual.',
      canBeSpread: true,
      suggestedImageCount: 1,
    },
    {
      id: 'every-day',
      order: 1,
      name: 'Every day...',
      purpose: 'Establish the routine and what the character wants',
      promptGuidance:
        'Show the character doing their regular activities. Hint at what they dream about or wish for. This creates contrast with what comes next.',
      canBeSpread: false,
      suggestedImageCount: 1,
    },
    {
      id: 'but-one-day',
      order: 2,
      name: 'But one day...',
      purpose: 'The inciting incident - something changes everything',
      promptGuidance:
        'Something unexpected happens that disrupts the routine. This is the exciting moment that kicks off the adventure. Make it visually interesting and surprising.',
      canBeSpread: true,
      suggestedImageCount: 1,
    },
    {
      id: 'because-of-that',
      order: 3,
      name: 'Because of that...',
      purpose: 'First consequence and reaction',
      promptGuidance:
        'Show how the character responds to the change. What do they decide to do? This should show them taking action or making a choice.',
      canBeSpread: false,
      suggestedImageCount: 1,
    },
    {
      id: 'because-of-that-2',
      order: 4,
      name: 'Because of that...',
      purpose: 'Second consequence - things escalate',
      promptGuidance:
        'The situation develops further. Maybe there is a challenge or obstacle. The character learns something or meets someone important.',
      canBeSpread: true,
      suggestedImageCount: 1,
    },
    {
      id: 'until-finally',
      order: 5,
      name: 'Until finally...',
      purpose: 'The climax - the big moment',
      promptGuidance:
        'The most exciting moment of the story. The character faces their biggest challenge or achieves their goal. This should be the most dynamic, action-filled scene.',
      canBeSpread: true,
      suggestedImageCount: 1,
    },
    {
      id: 'ever-since',
      order: 6,
      name: 'And ever since then...',
      purpose: 'Resolution - how things are different now',
      promptGuidance:
        "Show how the character's world is better now. What did they learn? How have they grown? End with a warm, satisfying feeling.",
      canBeSpread: false,
      suggestedImageCount: 1,
    },
  ],
  suggestedPageCounts: [8, 12, 16],
  ageRanges: ['2-4', '3-5', '5-7'],
  bestFor: ['simple adventures', 'first stories', 'clear cause-and-effect', 'young readers'],
  aiSystemPrompt: `Use the Story Spine structure for clear, cause-and-effect storytelling:
- Start with "Once upon a time" to set the scene
- Establish routine with "Every day"
- Introduce change with "But one day"
- Build consequences with "Because of that" (can repeat)
- Reach climax with "Until finally"
- Resolve with "And ever since then"
Keep language simple and age-appropriate. Each beat should flow naturally to the next.`,
}

/**
 * Story Circle (Dan Harmon)
 * A simplified hero's journey, great for character growth stories
 * Origin: Dan Harmon (Community, Rick and Morty)
 */
export const STORY_CIRCLE: StoryStructure = {
  id: 'story-circle',
  name: 'Story Circle',
  origin: 'Dan Harmon',
  icon: '⭕',
  description: 'Character leaves comfort zone, faces challenges, returns changed',
  longDescription:
    "Dan Harmon's Story Circle is a simplified hero's journey that focuses on character transformation. The character leaves their comfort zone, faces the unknown, and returns home fundamentally changed.",
  beatCount: 8,
  beats: [
    {
      id: 'you',
      order: 0,
      name: 'You (Comfort Zone)',
      purpose: 'Establish the character in their familiar world',
      promptGuidance:
        "Introduce the main character in their comfortable, familiar environment. Show who they are and what their life is like. Make readers feel at home with this character.",
      canBeSpread: false,
      suggestedImageCount: 1,
    },
    {
      id: 'need',
      order: 1,
      name: 'Need (Desire)',
      purpose: 'The character wants or needs something',
      promptGuidance:
        'Show what the character desires or what problem they face. This could be something they want, something missing, or a problem that needs solving.',
      canBeSpread: false,
      suggestedImageCount: 1,
    },
    {
      id: 'go',
      order: 2,
      name: 'Go (Unfamiliar)',
      purpose: 'Character enters an unfamiliar situation',
      promptGuidance:
        'The character leaves their comfort zone and enters somewhere new or different. This is a visual transition - show the contrast between old and new.',
      canBeSpread: true,
      suggestedImageCount: 1,
    },
    {
      id: 'search',
      order: 3,
      name: 'Search (Adapt)',
      purpose: 'Character adapts to the new situation',
      promptGuidance:
        'Show the character exploring, learning, or trying to figure things out. They might struggle or make mistakes. Include moments of discovery.',
      canBeSpread: true,
      suggestedImageCount: 2,
    },
    {
      id: 'find',
      order: 4,
      name: 'Find (Discovery)',
      purpose: "Character finds what they're looking for",
      promptGuidance:
        "A moment of triumph or discovery. The character achieves their goal or finds what they needed. This should feel rewarding and exciting.",
      canBeSpread: true,
      suggestedImageCount: 1,
    },
    {
      id: 'take',
      order: 5,
      name: 'Take (Pay Price)',
      purpose: 'There is a cost or consequence',
      promptGuidance:
        'Success comes with a price or complication. Maybe they realize something important, or face an unexpected challenge. Keep it age-appropriate.',
      canBeSpread: false,
      suggestedImageCount: 1,
    },
    {
      id: 'return',
      order: 6,
      name: 'Return (Go Back)',
      purpose: 'Character returns to familiar world',
      promptGuidance:
        'The character heads back home or to their familiar world. Show the journey back and their anticipation of returning.',
      canBeSpread: false,
      suggestedImageCount: 1,
    },
    {
      id: 'change',
      order: 7,
      name: 'Change (Growth)',
      purpose: 'Character is changed by the experience',
      promptGuidance:
        "Show how the character is different now. They've learned, grown, or changed. End with a sense of completion and growth.",
      canBeSpread: false,
      suggestedImageCount: 1,
    },
  ],
  suggestedPageCounts: [8, 12, 16, 20],
  ageRanges: ['5-7', '6-8', '8-10'],
  bestFor: ['character growth', 'adventure stories', 'learning lessons', 'transformation'],
  aiSystemPrompt: `Use the Story Circle for character-driven transformation:
1. YOU - Character in comfort zone
2. NEED - They want something
3. GO - Enter unfamiliar situation
4. SEARCH - Adapt and explore
5. FIND - Discover what they needed
6. TAKE - Pay a price for it
7. RETURN - Go back home
8. CHANGE - They are transformed

Focus on the character's internal journey alongside external events.`,
}

/**
 * Three-Act Structure
 * The classic dramatic structure, great for longer stories
 * Origin: Classical drama (Aristotle)
 */
export const THREE_ACT: StoryStructure = {
  id: 'three-act',
  name: 'Three-Act Structure',
  origin: 'Classical Drama',
  icon: '🎭',
  description: 'Setup, Confrontation, Resolution - the classic story formula',
  longDescription:
    'The Three-Act Structure divides the story into beginning (setup), middle (confrontation), and end (resolution). It includes key turning points and a clear midpoint.',
  beatCount: 9,
  beats: [
    {
      id: 'opening',
      order: 0,
      name: 'Opening Image',
      purpose: 'First impression - establish tone and world',
      promptGuidance:
        "Create a vivid opening scene that sets the story's tone. This first image should capture the reader's attention and hint at the world they're entering.",
      canBeSpread: true,
      suggestedImageCount: 1,
    },
    {
      id: 'setup',
      order: 1,
      name: 'Setup',
      purpose: 'Introduce characters, world, and the status quo',
      promptGuidance:
        "Establish the main character, their world, and their normal life. Show their relationships and what matters to them. Plant seeds for what's to come.",
      canBeSpread: false,
      suggestedImageCount: 2,
    },
    {
      id: 'catalyst',
      order: 2,
      name: 'Catalyst',
      purpose: 'Something happens that changes everything',
      promptGuidance:
        "The inciting incident - something happens that disrupts the character's world and sets the story in motion. Make it clear and impactful.",
      canBeSpread: true,
      suggestedImageCount: 1,
    },
    {
      id: 'debate',
      order: 3,
      name: 'Reaction',
      purpose: 'Character reacts and decides what to do',
      promptGuidance:
        "Show the character's response to the catalyst. They might hesitate, prepare, or start taking action. This is the transition into the adventure.",
      canBeSpread: false,
      suggestedImageCount: 1,
    },
    {
      id: 'midpoint',
      order: 4,
      name: 'Midpoint',
      purpose: 'Stakes are raised - point of no return',
      promptGuidance:
        "A major event that raises the stakes. The character is fully committed now - there's no going back. This should feel like a turning point.",
      canBeSpread: true,
      suggestedImageCount: 1,
    },
    {
      id: 'complications',
      order: 5,
      name: 'Rising Challenges',
      purpose: 'Obstacles increase, tension builds',
      promptGuidance:
        "Things get harder. The character faces obstacles, setbacks, or complications. Build tension but keep it age-appropriate.",
      canBeSpread: true,
      suggestedImageCount: 2,
    },
    {
      id: 'crisis',
      order: 6,
      name: 'Crisis',
      purpose: 'Darkest moment before the breakthrough',
      promptGuidance:
        "The character's lowest point or biggest challenge. Everything seems difficult, but this moment leads to insight or determination.",
      canBeSpread: false,
      suggestedImageCount: 1,
    },
    {
      id: 'climax',
      order: 7,
      name: 'Climax',
      purpose: 'The decisive moment - character triumphs',
      promptGuidance:
        "The most exciting part of the story. The character faces their challenge head-on and succeeds. Make this visually dynamic and satisfying.",
      canBeSpread: true,
      suggestedImageCount: 1,
    },
    {
      id: 'resolution',
      order: 8,
      name: 'Resolution',
      purpose: 'New normal - show how things have changed',
      promptGuidance:
        "Wrap up the story with a new equilibrium. Show how the character and their world have changed for the better. End with warmth and satisfaction.",
      canBeSpread: false,
      suggestedImageCount: 1,
    },
  ],
  suggestedPageCounts: [12, 16, 20, 24],
  ageRanges: ['6-8', '8-10', '9-12'],
  bestFor: ['dramatic stories', 'longer tales', 'building tension', 'satisfying resolutions'],
  aiSystemPrompt: `Use Three-Act Structure for dramatic, well-paced storytelling:

ACT 1 (Setup - 25%):
- Opening Image: Hook the reader
- Setup: Establish character and world
- Catalyst: The inciting incident
- Reaction: Character responds

ACT 2 (Confrontation - 50%):
- Midpoint: Stakes raised, no turning back
- Rising Challenges: Obstacles increase
- Crisis: Darkest moment

ACT 3 (Resolution - 25%):
- Climax: The decisive moment
- Resolution: New normal

Balance action with character moments. Build tension gradually.`,
}

/**
 * Hero's Journey (Campbell)
 * Full mythic structure for epic adventures
 * Origin: Joseph Campbell's "The Hero with a Thousand Faces"
 */
export const HEROS_JOURNEY: StoryStructure = {
  id: 'heros-journey',
  name: "Hero's Journey",
  origin: 'Joseph Campbell',
  icon: '⚔️',
  description: 'Epic adventure with mentors, challenges, and transformation',
  longDescription:
    "Joseph Campbell's Hero's Journey is a mythic story structure found across cultures. The hero receives a call to adventure, crosses into a special world, faces trials, and returns transformed.",
  beatCount: 12,
  beats: [
    {
      id: 'ordinary-world',
      order: 0,
      name: 'Ordinary World',
      purpose: "Hero's normal life before the adventure",
      promptGuidance:
        "Establish the hero's everyday life. Show their home, friends, or family. Make readers understand what 'normal' looks like for this character.",
      canBeSpread: false,
      suggestedImageCount: 1,
    },
    {
      id: 'call',
      order: 1,
      name: 'Call to Adventure',
      purpose: 'Hero is presented with a challenge or quest',
      promptGuidance:
        "Something or someone calls the hero to adventure. This could be a message, a stranger, a discovery, or a problem that needs solving.",
      canBeSpread: true,
      suggestedImageCount: 1,
    },
    {
      id: 'refusal',
      order: 2,
      name: 'Hesitation',
      purpose: 'Hero is uncertain or reluctant',
      promptGuidance:
        "Show the hero's doubt or hesitation. They might feel scared, unprepared, or unsure. This makes them relatable.",
      canBeSpread: false,
      suggestedImageCount: 1,
    },
    {
      id: 'mentor',
      order: 3,
      name: 'Meeting the Mentor',
      purpose: 'Hero receives guidance or a gift',
      promptGuidance:
        "Introduce a wise helper - could be an older character, a magical being, or even a book. They give advice, tools, or encouragement.",
      canBeSpread: true,
      suggestedImageCount: 1,
    },
    {
      id: 'threshold',
      order: 4,
      name: 'Crossing the Threshold',
      purpose: 'Hero enters the special world',
      promptGuidance:
        "The hero commits and enters the adventure. Show them physically crossing into a new place or situation. Make the transition visual and exciting.",
      canBeSpread: true,
      suggestedImageCount: 1,
    },
    {
      id: 'tests',
      order: 5,
      name: 'Tests and Allies',
      purpose: 'Hero faces challenges and makes friends',
      promptGuidance:
        "Show the hero being tested and meeting helpers. They learn the rules of this new world and start proving themselves.",
      canBeSpread: true,
      suggestedImageCount: 2,
    },
    {
      id: 'approach',
      order: 6,
      name: 'Approach',
      purpose: 'Preparing for the major challenge',
      promptGuidance:
        "The hero prepares for their biggest test. Build anticipation. They might gather tools, make plans, or steel their courage.",
      canBeSpread: false,
      suggestedImageCount: 1,
    },
    {
      id: 'ordeal',
      order: 7,
      name: 'The Ordeal',
      purpose: "Hero faces their greatest challenge",
      promptGuidance:
        "The big confrontation or challenge. This is the most intense part - the hero must face their fears or biggest obstacle. Make it dramatic but age-appropriate.",
      canBeSpread: true,
      suggestedImageCount: 1,
    },
    {
      id: 'reward',
      order: 8,
      name: 'Reward',
      purpose: 'Hero achieves their goal',
      promptGuidance:
        "Victory! The hero gets what they came for - it could be a treasure, knowledge, a rescued friend, or personal growth. Celebrate the achievement.",
      canBeSpread: true,
      suggestedImageCount: 1,
    },
    {
      id: 'road-back',
      order: 9,
      name: 'The Road Back',
      purpose: 'Hero begins the journey home',
      promptGuidance:
        "The hero starts heading back. There might be urgency or one last complication. Show them leaving the special world behind.",
      canBeSpread: false,
      suggestedImageCount: 1,
    },
    {
      id: 'resurrection',
      order: 10,
      name: 'Final Test',
      purpose: 'One last challenge proves transformation',
      promptGuidance:
        "A final test or challenge that proves the hero has truly changed. They use what they learned to overcome this last obstacle.",
      canBeSpread: true,
      suggestedImageCount: 1,
    },
    {
      id: 'return',
      order: 11,
      name: 'Return with Elixir',
      purpose: 'Hero returns home, changed and bearing gifts',
      promptGuidance:
        "The hero returns home, but everything is different now - they are different. Show them sharing what they gained with their community. End with hope and accomplishment.",
      canBeSpread: false,
      suggestedImageCount: 1,
    },
  ],
  suggestedPageCounts: [16, 20, 24, 28, 32],
  ageRanges: ['8-10', '9-12'],
  bestFor: ['epic adventures', 'fantasy stories', 'personal growth', 'overcoming fears'],
  aiSystemPrompt: `Use the Hero's Journey for epic, transformative adventures:

DEPARTURE:
1. Ordinary World - Hero's normal life
2. Call to Adventure - The challenge appears
3. Hesitation - Doubt or reluctance
4. Meeting the Mentor - Guidance received
5. Crossing the Threshold - Entering the adventure

INITIATION:
6. Tests and Allies - Challenges and friends
7. Approach - Preparing for the ordeal
8. The Ordeal - Greatest challenge
9. Reward - Victory achieved

RETURN:
10. The Road Back - Journey home
11. Final Test - Proving transformation
12. Return with Elixir - Changed hero shares gifts

Include helpers, challenges, and clear transformation.`,
}

/**
 * Kishōtenketsu
 * Japanese/Chinese four-act structure without conflict
 * Origin: Classical Chinese and Japanese storytelling
 */
export const KISHOTENKETSU: StoryStructure = {
  id: 'kishotenketsu',
  name: 'Kishōtenketsu',
  origin: 'Japanese/Chinese',
  icon: '🌸',
  description: 'Gentle four-part structure with surprising twist - no conflict needed',
  longDescription:
    'Kishōtenketsu is a four-act narrative structure from East Asia that does not require conflict. Instead, it relies on a surprising twist or new perspective in the third act to create interest.',
  beatCount: 4,
  beats: [
    {
      id: 'ki',
      order: 0,
      name: 'Ki (Introduction)',
      purpose: 'Introduce characters and setting',
      promptGuidance:
        "Gently introduce the main characters and their world. Set a peaceful, inviting tone. There's no need to hint at problems - just establish who and where.",
      canBeSpread: true,
      suggestedImageCount: 2,
    },
    {
      id: 'sho',
      order: 1,
      name: 'Shō (Development)',
      purpose: 'Develop the situation further',
      promptGuidance:
        "Expand on the introduction. Show more about the characters, their activities, or their world. Deepen understanding without introducing conflict.",
      canBeSpread: true,
      suggestedImageCount: 2,
    },
    {
      id: 'ten',
      order: 2,
      name: 'Ten (Twist)',
      purpose: 'Unexpected element changes perspective',
      promptGuidance:
        "Introduce something unexpected that shifts perspective. This isn't a conflict - it's a surprise, revelation, or new way of seeing things. It should feel delightful or thought-provoking.",
      canBeSpread: true,
      suggestedImageCount: 2,
    },
    {
      id: 'ketsu',
      order: 3,
      name: 'Ketsu (Conclusion)',
      purpose: 'Reconcile the twist with what came before',
      promptGuidance:
        "Bring everything together. Show how the twist integrates with or changes understanding of what came before. End with harmony and completeness.",
      canBeSpread: true,
      suggestedImageCount: 2,
    },
  ],
  suggestedPageCounts: [8, 12, 16],
  ageRanges: ['2-4', '3-5', '5-7'],
  bestFor: ['gentle stories', 'no conflict needed', 'exploration', 'contemplative tales', 'bedtime stories'],
  aiSystemPrompt: `Use Kishōtenketsu for gentle, conflict-free storytelling:

1. KI (Introduction) - Introduce characters and world peacefully
2. SHŌ (Development) - Expand and deepen understanding
3. TEN (Twist) - Surprising element or new perspective (NOT conflict)
4. KETSU (Conclusion) - Harmonious resolution

IMPORTANT: This structure does NOT require conflict, villains, or problems.
The twist is a delightful surprise or new way of seeing, not a complication.
Perfect for bedtime stories, gentle exploration, and contemplative tales.
Focus on wonder, discovery, and harmony.`,
}

/**
 * All available story structures
 */
export const STORY_STRUCTURES: StoryStructure[] = [
  STORY_SPINE,
  STORY_CIRCLE,
  THREE_ACT,
  HEROS_JOURNEY,
  KISHOTENKETSU,
]

/**
 * Get a story structure by ID
 */
export function getStoryStructure(id: string): StoryStructure | undefined {
  return STORY_STRUCTURES.find(s => s.id === id)
}

/**
 * Get structures suitable for a given age range
 */
export function getStructuresForAge(ageRange: string): StoryStructure[] {
  return STORY_STRUCTURES.filter(s => s.ageRanges.includes(ageRange as import('../types/story-structure.types').AgeRange))
}

/**
 * Get structures suitable for a given page count
 */
export function getStructuresForPageCount(pageCount: number): StoryStructure[] {
  return STORY_STRUCTURES.filter(s =>
    s.suggestedPageCounts.some(count => Math.abs(count - pageCount) <= 4)
  )
}

/**
 * Default structure for quick starts
 */
export const DEFAULT_STRUCTURE = STORY_SPINE
