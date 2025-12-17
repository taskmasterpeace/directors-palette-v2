# Community Feature - Planning Document

## Overview

The Community feature allows users to share and discover **Wildcards, Recipes, Prompts, and Directors**. Users can browse community-submitted content, add items to their personal library with one click, rate items with star ratings, and submit their own content for review.

## Content Types

| Type | Description | Key Data |
|------|-------------|----------|
| **Wildcards** | Reusable lists of variations | entries[], category |
| **Recipes** | Fill-in-the-blank prompt templates | stages[], fields, referenceImages |
| **Prompts** | Ready-to-use prompt snippets | promptText, tags, useCase |
| **Directors** | AI director personas with fingerprints | DirectorFingerprint (full schema) |

## User Flow

### Browsing Community Content

1. User navigates to **Community** tab in sidebar
2. Content is displayed in categories:
   - **Wildcards** - Shared wildcard lists
   - **Recipes** - Shared prompt recipes
   - **Prompts** - Ready-to-use prompt snippets
   - **Directors** - AI director personas
3. Each item is displayed as a **card** showing:
   - Name/title
   - Description
   - Preview of content (first few entries for wildcards, fields for recipes)
   - Reference images (if applicable)
   - Author attribution
   - Category/tags
   - **Star rating** (average + count)
4. Items can be sorted by:
   - Most popular (add count)
   - Highest rated
   - Newest
   - Alphabetical

### Adding to Library

1. User clicks **+** button on any community item
2. Item is instantly added to their personal **Library**
3. If item with same name already exists:
   - **Overwrites** the existing item
   - This allows users to "reset" an item they've edited back to the original community version
4. Toast notification confirms addition

### Rating Items

1. User can rate any community item 1-5 stars
2. Rating appears after adding or using the item
3. User can change their rating at any time
4. Average rating displays on card (e.g., "4.2 (127 ratings)")
5. Rating breakdown shows distribution (optional hover)

### Submitting to Community

1. User goes to their Library (Wildcards, Recipes, Prompts, or Directors section)
2. User clicks **Submit to Community** on an item
3. Modal appears with:
   - Preview of what will be shared
   - Option to add description
   - Category selection
   - Tags input
   - Warning that submission is pending review
4. User confirms submission
5. Item status changes to **"Pending Review"**
6. User sees indicator that item is awaiting approval

### Admin Approval Workflow

1. Admin navigates to **Admin Panel > Community Submissions**
2. Admin sees list of pending submissions grouped by type:
   - Wildcards pending
   - Recipes pending
   - Prompts pending
   - Directors pending
3. Each submission shows:
   - Full content preview
   - Reference images (for recipes)
   - Director fingerprint details (for directors)
   - Submitter info
   - Submission date
4. Admin can:
   - **Approve** - Item becomes visible to all users
   - **Reject** - Item is removed from pending (optionally with reason)
   - **Edit** - Modify before approving (fix typos, improve description)

## Data Model

### Community Item (Base)

```typescript
type CommunityItemType = 'wildcard' | 'recipe' | 'prompt' | 'director'

interface CommunityItem {
  id: string
  type: CommunityItemType
  name: string
  description: string
  category: string
  tags: string[]

  // Submission info
  submittedBy: string        // User ID
  submittedByName: string    // Display name
  submittedAt: number

  // Approval status
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string        // Admin user ID
  approvedAt?: number
  rejectedReason?: string

  // Stats
  addCount: number           // How many users added this

  // Ratings
  ratingSum: number          // Sum of all ratings
  ratingCount: number        // Number of ratings
  averageRating: number      // Computed: ratingSum / ratingCount

  // Content (depends on type)
  content: WildcardContent | RecipeContent | PromptContent | DirectorContent
}
```

### Content Types

```typescript
interface WildcardContent {
  entries: string[]          // The wildcard options
}

interface RecipeContent {
  stages: RecipeStage[]
  suggestedAspectRatio?: string
  recipeNote?: string
  referenceImages: {
    url: string
    name: string
  }[]
}

interface PromptContent {
  promptText: string         // The actual prompt
  useCase: PromptUseCase     // What it's for
  module: ModuleType         // Which module it works with
  exampleOutput?: string     // Example of what it generates
  variables?: string[]       // Extractable variables like {character}
}

type PromptUseCase =
  | 'character'      // Character descriptions
  | 'environment'    // Location/setting prompts
  | 'action'         // Action sequences
  | 'lighting'       // Lighting setups
  | 'camera'         // Camera angles/movements
  | 'style'          // Style modifiers
  | 'complete'       // Full ready-to-use prompts

type ModuleType = 'storyboard' | 'musicLab' | 'shotCreator' | 'storybook' | 'any'

interface DirectorContent {
  fingerprint: DirectorFingerprint  // Full director fingerprint
  avatarUrl?: string                // Director avatar image
  sampleImages?: string[]           // Example outputs from this director
}
```

### Director Fingerprint (Full Schema)

```typescript
interface DirectorFingerprint {
  id: string
  name: string
  version: string
  description: string               // Single line summary

  // Core Intent (immutable)
  coreIntent: {
    primaryFocus: string[]
    riskTolerance: 'low' | 'medium' | 'high' | 'maximum'
    ambiguityPreference: 'explicit' | 'suggestive' | 'unresolved'
    emotionalTemperature: 'warm' | 'cool' | 'neutral' | 'warm_but_distant' | 'electric'
    controlVsSpontaneity: 'controlled' | 'adaptive' | 'exploratory' | 'stylized'
  }

  // Story Interpretation
  storyInterpretation: {
    readsFor: string[]
    themeExtractionStyle: 'explicit' | 'implicit' | 'visual'
    subtextSensitivity: 'low' | 'medium' | 'high'
    symbolismUsage: 'minimal' | 'restrained' | 'heavy' | 'iconic'
  }

  // Emotional Language
  emotionalLanguage: {
    preferredEmotionalStates: string[]
    contrastStrategy: 'subtle' | 'gradual' | 'sharp' | 'stark' | 'extreme'
    emotionalArcBias: 'build' | 'plateau' | 'oscillate' | 'resolve' | 'escalate'
    sentimentalityThreshold: 'avoids' | 'tolerates' | 'embraces'
  }

  // Actor Direction
  actorDirection: {
    directionMode: 'physical' | 'emotional_intention' | 'textual' | 'choreographed' | 'performance_focused'
    performancePreferences: string[]
    noteStyle: 'direct' | 'conceptual' | 'metaphorical' | 'precise' | 'hype'
    lineDeliveryBias: 'naturalistic' | 'stylized' | 'restrained' | 'flat' | 'energetic'
  }

  // Camera Philosophy
  cameraPhilosophy: {
    pointOfViewBias: 'subjective' | 'objective' | 'observational' | 'heroic'
    framingInstinct: string[]
    distanceBias: 'intimate' | 'mid-range' | 'detached' | 'wide' | 'extreme'
    stillnessVsMovement: 'stillness-dominant' | 'balanced' | 'movement-dominant' | 'static-or-tracking'
  }

  // Camera Motion Profile (swappable)
  cameraMotionProfile: {
    enabled: boolean
    motionBias: string[]
    motionFrequency: 'rare' | 'occasional' | 'frequent' | 'constant'
    escalationRule: 'none' | 'emotional' | 'story-driven' | 'rhythmic' | 'beat-driven'
    forbiddenMovements: string[]
  }

  // Visual Decision Biases
  visualDecisionBiases: {
    complexityPreference: 'minimal' | 'layered' | 'dense' | 'curated' | 'high-contrast'
    environmentRole: 'background' | 'character' | 'antagonist' | 'sci-fi-backdrop'
    iconicFrameTendency: 'rare' | 'selective' | 'frequent' | 'constant' | 'always'
    motifRepetition: 'avoids' | 'deliberate' | 'automatic' | 'obsessive' | 'loop-ready'
  }

  // Rhythm and Pacing
  rhythmAndPacing: {
    baselinePacing: 'measured' | 'controlled' | 'dynamic' | 'snappy' | 'frantic'
    sectionalVariation: {
      verse: string
      chorus: string
      bridge: string
    }
    shotDurationBias: 'short' | 'mixed' | 'long'
    cutMotivation: 'rhythmic' | 'emotional' | 'narrative' | 'visual_match' | 'beat'
  }

  // Communication Profile
  communicationProfile: {
    tone: 'calm' | 'reflective' | 'intense' | 'polite' | 'energetic'
    confidenceExpression: 'quiet' | 'assertive' | 'matter-of-fact' | 'loud'
    feedbackStyle: 'supportive' | 'surgical' | 'provocative' | 'specific' | 'hype-man'
    metaphorUsage: 'low' | 'medium' | 'high'
  }

  // Questioning Strategy
  questioningStrategy: {
    defaultMode: 'clarifying' | 'probing' | 'challenging' | 'aesthetic' | 'visual'
    preferredQuestions: string[]
    stopConditions: string[]
  }

  // Opinionation Model
  opinionationModel: {
    defaultStance: 'consultant' | 'interpreter' | 'auteur' | 'visionary'
    overrideThreshold: 'low' | 'medium' | 'high' | 'zero'
    conflictResponse: 'defer' | 'reframe' | 'insist' | 'ignore' | 'overwhelm'
  }

  // Spectacle Profile
  spectacleProfile: {
    vfxTolerance: 'none' | 'subtle' | 'moderate' | 'embraces' | 'stylized' | 'maximum'
    signatureMoments: string[]
    surrealTendency: 'grounded' | 'light-touch' | 'dreamlike' | 'surreal' | 'stylized' | 'high'
    practicalVsDigital: 'practical-only' | 'practical-preferred' | 'balanced' | 'digital-forward' | 'miniature-style' | 'hybrid-glossy'
    spectacleTypes: string[]
    budgetAssumption: 'indie' | 'mid' | 'blockbuster' | 'high' | 'unlimited'
  }

  // Image Generation (for UI)
  imagePrompt: {
    base: string
    variations: string[]
  }

  // Constraints
  constraints: {
    immutableSections: string[]
    swappableSections: string[]
    styleExcluded: boolean
  }
}
```

### User Ratings

```typescript
interface UserRating {
  id: string
  userId: string
  communityItemId: string
  rating: number              // 1-5 stars
  createdAt: number
  updatedAt: number
}
```

### User Library Item

```typescript
interface UserLibraryItem {
  id: string
  userId: string
  communityItemId?: string   // If sourced from community
  type: CommunityItemType
  name: string

  // Local modifications
  isModified: boolean        // True if user edited after adding

  // Submission status
  submittedToCommunity: boolean
  communityStatus?: 'pending' | 'approved' | 'rejected'

  // Content
  content: WildcardContent | RecipeContent | PromptContent | DirectorContent

  addedAt: number
  modifiedAt: number
}
```

## Database Tables

### `community_items`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| type | text | 'wildcard', 'recipe', 'prompt', or 'director' |
| name | text | Display name |
| description | text | Optional description |
| category | text | Category slug |
| tags | text[] | Array of tags |
| content | jsonb | Type-specific content |
| submitted_by | uuid | FK to auth.users |
| submitted_by_name | text | Cached display name |
| submitted_at | timestamp | Submission time |
| status | text | 'pending', 'approved', 'rejected' |
| approved_by | uuid | FK to auth.users (admin) |
| approved_at | timestamp | Approval time |
| rejected_reason | text | Optional rejection reason |
| add_count | int | Number of adds |
| rating_sum | int | Sum of all star ratings |
| rating_count | int | Number of ratings |
| created_at | timestamp | |
| updated_at | timestamp | |

### `community_ratings`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| community_item_id | uuid | FK to community_items |
| rating | int | 1-5 stars |
| created_at | timestamp | |
| updated_at | timestamp | |

**Unique constraint**: (user_id, community_item_id)

### `user_library_items`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| community_item_id | uuid | FK to community_items (nullable) |
| type | text | 'wildcard', 'recipe', 'prompt', or 'director' |
| name | text | Item name |
| content | jsonb | Full content |
| is_modified | boolean | If edited after adding |
| submitted_to_community | boolean | If submitted |
| community_status | text | Submission status |
| added_at | timestamp | |
| modified_at | timestamp | |

## UI Components

### Community Page

```
+-------------------------------------------------------------+
| Community                                      [Search...]   |
+-------------------------------------------------------------+
| [All] [Wildcards] [Recipes] [Prompts] [Directors]           |
|                                                             |
| Sort: [Most Popular v]  Filter: [All Categories v]         |
|                                                             |
| +---------------+ +---------------+ +---------------+       |
| | Hairstyles    | | Lighting     | | Street Style  |       |
| | WILDCARD      | | Setups       | | PROMPT        |       |
| | 45 options    | | WILDCARD     | |               |       |
| |               | | 32 options   | | "Urban film   |       |
| | "box braids,  | |              | | look with..." |       |
| |  cornrows..." | | "golden hour,| |               |       |
| |               | |  blue hour..." |               |       |
| | by @user123   | | by @filmguy  | | by @aesthetic |       |
| | **** (4.2)    | | ***** (4.8)  | | *** (3.5)     |       |
| |         [+]   | |         [+]  | |         [+]   |       |
| +---------------+ +---------------+ +---------------+       |
|                                                             |
| +---------------+ +---------------+ +---------------+       |
| | 9-Frame       | | Kubrick Mode | | Wong Kar-Wai  |       |
| | Cinematic     | | DIRECTOR     | | DIRECTOR      |       |
| | RECIPE        | |              | |               |       |
| |               | | [avatar]     | | [avatar]      |       |
| | [img] [img]   | | "Symmetry,   | | "Neon-soaked  |       |
| |               | | precision..."| | romance..."   |       |
| | by @director  | | by @cinephile| | by @hkcinema  |       |
| | ***** (4.9)   | | ***** (5.0)  | | **** (4.6)    |       |
| |         [+]   | |         [+]  | |         [+]   |       |
| +---------------+ +---------------+ +---------------+       |
|                                                             |
+-------------------------------------------------------------+
```

### Director Card (Expanded)

```
+-----------------------------------------------+
| Wong Kar-Wai Mode                   DIRECTOR  |
+-----------------------------------------------+
| [Avatar Image]                                |
|                                               |
| "Neon-soaked urban romance with              |
| dreamlike pacing and intimate                |
| handheld moments"                            |
|                                               |
| Core: emotional, intimate, stylized          |
| Camera: handheld, closeups, dutch angles     |
| Mood: melancholic, longing, electric         |
|                                               |
| Tags: romance, noir, urban, neon             |
|                                               |
| by @hkcinema                                  |
| **** 4.6 (89 ratings)                        |
|                                      [+]      |
+-----------------------------------------------+
```

### Rating Component

```
+-----------------------------------------------+
| Your Rating:                                  |
| [*] [*] [*] [*] [ ]  (You rated 4 stars)     |
|                                               |
| Average: 4.2 (127 ratings)                    |
| ***** 45%                                     |
| ****  32%                                     |
| ***   15%                                     |
| **     5%                                     |
| *      3%                                     |
+-----------------------------------------------+
```

### Admin Pending Review

```
+-------------------------------------------------------------+
| Community Submissions              Pending: 8                |
+-------------------------------------------------------------+
| [All] [Wildcards (2)] [Recipes (3)] [Prompts (1)] [Directors (2)]
|                                                             |
| +-----------------------------------------------------------+
| | "Wong Kar-Wai Mode"                DIRECTOR               |
| | Submitted by: @hkcinema - 2 hours ago                     |
| |                                                           |
| | Core Intent: emotional, intimate, stylized                |
| | Camera Philosophy: handheld, closeups                     |
| | Spectacle: neon lighting, urban environments              |
| |                                                           |
| | [View Full Fingerprint]                                   |
| |                                                           |
| | [Approve] [Reject] [Edit]                                 |
| +-----------------------------------------------------------+
|                                                             |
| +-----------------------------------------------------------+
| | "Cinematic Lighting Setups"        WILDCARD               |
| | Submitted by: @filmmaker - 5 hours ago                    |
| |                                                           |
| | 32 entries:                                               |
| | golden hour, blue hour, chiaroscuro, rim lighting...      |
| |                                                           |
| | [View Full] [Approve] [Reject] [Edit]                     |
| +-----------------------------------------------------------+
|                                                             |
+-------------------------------------------------------------+
```

## Categories

### Wildcard Categories
- Characters (hairstyles, clothing, expressions)
- Environments (locations, weather, time of day)
- Cinematography (shot types, angles, movements)
- Styles (art styles, color palettes)
- Props & Objects
- Actions & Poses

### Recipe Categories
- Character Sheets
- Style Guides
- Storyboards
- Product Photography
- Portraits
- Action Scenes
- Time-Based (time of day, seasons)

### Prompt Categories
- Character Descriptions
- Environment/Location
- Lighting Setups
- Camera Work
- Action Sequences
- Style Modifiers
- Complete Prompts

### Director Categories
- Classic Hollywood
- Independent/Arthouse
- Music Video
- Commercial/Fashion
- Documentary
- Horror/Thriller
- Action/Blockbuster
- Animation/Stylized

## Implementation Phases

### Phase 1: Read-Only Community
- Display community items (admin-seeded)
- Add to library functionality
- Categories and search
- All four content types

### Phase 2: Star Ratings
- User rating UI
- Average calculation
- Sort by rating
- Rating distribution display

### Phase 3: User Submissions
- Submit from library
- Pending status display
- Admin approval UI
- All four content types

### Phase 4: Enhanced Features
- User profiles
- Favorites list
- Comments
- Version history
- Featured/Staff picks

## Security Considerations

1. **Content Moderation**
   - All submissions require admin approval
   - Admin can edit before approving
   - Rejected items can include reason
   - Director fingerprints validated for completeness

2. **Rate Limiting**
   - Limit submissions per user per day
   - Limit ratings per hour
   - Prevent spam

3. **Content Validation**
   - Validate wildcard format
   - Validate recipe structure
   - Validate prompt format
   - Validate director fingerprint schema
   - Check for prohibited content

4. **Rating Integrity**
   - One rating per user per item
   - Users must be authenticated
   - Cannot rate own submissions

## API Endpoints

```
# Public
GET    /api/community                     # List approved items (with filters)
GET    /api/community/:id                 # Get single item
GET    /api/community/:id/ratings         # Get rating distribution

# Authenticated
POST   /api/community                     # Submit new item (pending)
POST   /api/community/:id/add             # Add to user library
POST   /api/community/:id/rate            # Rate an item (1-5)
GET    /api/community/my-ratings          # Get user's ratings

# Admin only
GET    /api/admin/community/pending       # List pending submissions
POST   /api/admin/community/:id/approve
POST   /api/admin/community/:id/reject
PUT    /api/admin/community/:id           # Edit submission
DELETE /api/admin/community/:id           # Remove item
```

## File Structure

```
src/features/community/
├── types/
│   ├── community.types.ts
│   └── rating.types.ts
├── services/
│   ├── community.service.ts
│   └── rating.service.ts
├── store/
│   └── community.store.ts
├── components/
│   ├── CommunityPage.tsx
│   ├── CommunityGrid.tsx
│   ├── CommunityCard.tsx
│   ├── CommunityFilters.tsx
│   ├── SubmitDialog.tsx
│   ├── RatingStars.tsx
│   ├── RatingDistribution.tsx
│   ├── cards/
│   │   ├── WildcardCard.tsx
│   │   ├── RecipeCard.tsx
│   │   ├── PromptCard.tsx
│   │   └── DirectorCard.tsx
│   └── admin/
│       ├── PendingSubmissions.tsx
│       ├── SubmissionReview.tsx
│       └── DirectorReview.tsx
├── hooks/
│   ├── useCommunity.ts
│   └── useRating.ts
└── index.ts
```

## Notes

- "Library" is the new name for the user's personal collection (was "Prompt Tools")
- Re-adding an item resets it to the community version (useful if user edited and wants to restore)
- Reference images in recipes are preserved when adding to library
- Items show "Pending Review" badge when submitted but not yet approved
- Directors include full fingerprint schema for complete persona replication
- Prompts can have extractable variables like {character} for customization
- Star ratings are aggregated server-side for performance
- Average rating is pre-computed and stored on the item for fast sorting
