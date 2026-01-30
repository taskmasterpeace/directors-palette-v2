# Adhub Architecture Guide

## Overview

Adhub is an AI-powered ad generation system that combines **templates**, **styles**, and **brand context** to create professional marketing images. The system uses a prompt injection architecture where multiple pieces of content are composed together before being sent to the image generation model.

---

## Core Concepts

### The Three Pillars

1. **Templates** - Define the ad's purpose and required inputs (what the ad does)
2. **Styles** - Define visual/creative direction (how the ad looks)
3. **Brands** - Provide context and reference images (who the ad is for)

---

## 1. Templates

Templates are the structural foundation of an ad. They contain a **goal prompt** with placeholder fields that users fill in.

### Database Schema

```sql
adhub_templates
├── id (uuid)
├── user_id (uuid)           -- Owner of the template
├── name (text)              -- "Quick Sale Promo"
├── goal_prompt (text)       -- Contains {{fieldName}} placeholders
├── is_public (boolean)      -- Public templates visible to all users
├── created_at, updated_at

adhub_template_fields
├── id (uuid)
├── template_id (uuid)       -- Foreign key to template
├── field_type (text)        -- 'text' or 'image'
├── field_name (text)        -- Used in placeholder (e.g., 'product_name')
├── field_label (text)       -- Display label (e.g., 'Product Name')
├── is_required (boolean)
├── placeholder (text)       -- UI hint text
├── field_order (number)     -- Display order in form
```

### Field Types

| Type | Description | How It's Used |
|------|-------------|---------------|
| `text` | User enters text | Substituted directly into goal_prompt |
| `image` | User provides URL | Added to reference images array |

### Example Template

**Name:** Quick Sale Promo

**Goal Prompt:**
```
Create a promotional ad for {{product_name}} with {{discount_percent}}% off.
The ad should create urgency and drive immediate action.
Use the product image as the hero element.
CTA: {{cta_text}}
```

**Fields:**
| Field Name | Type | Required | Example Value |
|------------|------|----------|---------------|
| product_name | text | Yes | "Premium Wireless Headphones" |
| discount_percent | text | Yes | "25" |
| cta_text | text | No | "Shop Now" |
| product_image | image | No | "https://example.com/headphones.jpg" |

### Placeholder Syntax

- Format: `{{fieldName}}` (double curly braces)
- Case-sensitive matching
- Regex pattern: `\{\{fieldName\}\}`

---

## 2. Styles

Styles define the visual and creative direction for the generated ad. Each style contains detailed **prompt modifiers** - comprehensive instructions that guide the AI model.

### Database Schema

```sql
adhub_styles
├── id (uuid)
├── name (text)              -- Internal ID: 'concept-punch-minimalism'
├── display_name (text)      -- User-facing: 'Concept-Punch Minimalism'
├── icon_url (text)          -- Optional icon
├── prompt_modifiers (text)  -- The detailed style instructions (300-1000+ words)
├── is_active (boolean)      -- Only active styles shown to users
├── created_at, updated_at
```

### Prompt Modifiers Structure

Each style's `prompt_modifiers` follows a consistent pattern with 10+ instruction categories:

```
[CORE IDEA] - The fundamental concept/philosophy
[VISUAL STRUCTURE] - Composition rules, element counts, spacing
[TYPOGRAPHY] - Font choices, hierarchy, sizing
[COLOR STRATEGY] - Palette guidelines, contrast, mood
[TONE & VOICE] - Writing style, word choices
[HOOK MECHANICS] - How to capture attention
[PROOF DEVICE] - How to demonstrate credibility
[BRAND INTEGRATION] - Logo placement, product visibility
[CTA] - Call-to-action guidelines
[SOCIAL FIT] - Aspect ratios, mobile optimization
[ACCESSIBILITY] - Contrast, legibility requirements
[PRODUCTION] - Technical specs, reusability
[AVOID] - What NOT to do
```

### Pre-Built Styles

| Style | Purpose | Key Characteristics |
|-------|---------|---------------------|
| **Concept-Punch Minimalism** | Fast, single-idea ads | Ultra-simple, high contrast, visual gag/twist |
| **Bold Testimonial** | Social proof ads | Customer quote is headline, authentic voice |
| **Product Spotlight** | Product-focused ads | Clean photography, minimal text, sculptural |
| **Urgency Flash** | Time-sensitive promos | Countdown/deadline focus, high energy colors |
| **Lifestyle Aspiration** | Brand building | Emotional scenes, product integrated naturally |

### Example Style: Concept-Punch Minimalism

```
A zero-fluff, one-idea ad style that lands a single insight with a visual gag
or contrast. Wins by being faster than the scroll and smarter than the average post.

CORE IDEA: One sentence of truth that can be seen without reading. If the line
vanished, the visual would still deliver the concept.

VISUAL STRUCTURE: Ultra-simple composition (1–2 elements max). Big subject.
Big negative space. Clear figure/ground separation. Works at phone-lock size.

TYPOGRAPHY: One heavyweight display face. 3 sizes max (hook / support / logo).
Brutal hierarchy. No italics, no letter-jumble tricks.

COLOR STRATEGY: High-contrast palette with 1 brand accent. Prefer flat backgrounds.
Colors signal the emotion (speed, urgency, warmth) before the words do.

[... continues with 8 more sections ...]

AVOID: More than one idea, too many words, clever that needs explaining,
weak contrast, logo fighting the hook.
```

---

## 3. Brands

Brands provide context and visual identity for the ad generation.

### Database Schema

```sql
adhub_brands
├── id (uuid)
├── user_id (uuid)           -- Owner
├── name (text)              -- "Acme Corp"
├── logo_url (text)          -- Brand logo URL
├── context_text (text)      -- Brand description/guidelines
├── created_at, updated_at

adhub_brand_images
├── id (uuid)
├── brand_id (uuid)          -- Foreign key
├── image_url (text)         -- Reference image URL
├── description (text)       -- What this image represents
├── created_at
```

### Brand Context Example

```
Our brand targets 25-45 year old professionals who value quality and innovation.
We use warm, premium aesthetics with a focus on simplicity and sophistication.
Our tone is confident but approachable. We emphasize durability and craftsmanship
over price.
```

---

## 4. Prompt Composition (The Magic)

When a user generates an ad, the system composes a final prompt from multiple sources:

### Composition Formula

```
FINAL_PROMPT = [
    PART 1: Goal Prompt (with field values substituted)
    +
    PART 2: Brand Context Text (if exists)
    +
    PART 3: Style Prompt Modifiers
]

Joined with: '\n\n' (double newline separator)
```

### Step-by-Step Process

#### Step 1: Start with Template Goal Prompt
```
"Create a promotional ad for {{product_name}} with {{discount_percent}}% off.
The ad should create urgency and drive immediate action.
Use the product image as the hero element.
CTA: {{cta_text}}"
```

#### Step 2: Replace Field Placeholders
```javascript
// For each field in the template
goalPrompt = goalPrompt.replace(
    new RegExp(`\\{\\{${field.fieldName}\\}\\}`, 'g'),
    fieldValues[field.fieldName]
)
```

Result:
```
"Create a promotional ad for Premium Wireless Headphones with 25% off.
The ad should create urgency and drive immediate action.
Use the product image as the hero element.
CTA: Shop Now"
```

#### Step 3: Add Brand Context (if exists)
```
"Our brand targets 25-45 year old professionals who value quality..."
```

#### Step 4: Add Style Prompt Modifiers
```
"A zero-fluff, one-idea ad style that lands a single insight...
CORE IDEA: One sentence of truth...
VISUAL STRUCTURE: Ultra-simple composition...
[Full style instructions]"
```

#### Step 5: Final Composed Prompt
```
Create a promotional ad for Premium Wireless Headphones with 25% off.
The ad should create urgency and drive immediate action.
Use the product image as the hero element.
CTA: Shop Now

Our brand targets 25-45 year old professionals who value quality and innovation.
We use warm, premium aesthetics with a focus on simplicity and sophistication.

A zero-fluff, one-idea ad style that lands a single insight with a visual gag
or contrast. Wins by being faster than the scroll and smarter than the average post.

CORE IDEA: One sentence of truth that can be seen without reading...
VISUAL STRUCTURE: Ultra-simple composition (1–2 elements max)...
TYPOGRAPHY: One heavyweight display face...
COLOR STRATEGY: High-contrast palette with 1 brand accent...
[... full style guide ...]
```

---

## 5. Reference Images Collection

Reference images are gathered from multiple sources and sent to the AI model for visual guidance:

```javascript
referenceImages = []

// 1. Brand logo (always auto-included if exists)
if (brand.logoUrl) {
    referenceImages.push(brand.logoUrl)
}

// 2. User-selected brand reference images
if (selectedReferenceImages.length > 0) {
    referenceImages.push(...selectedReferenceImages)
}

// 3. Image-type template fields
for (const field of template.fields) {
    if (field.fieldType === 'image') {
        const imageUrl = fieldValues[field.fieldName]
        if (imageUrl) {
            referenceImages.push(imageUrl)
        }
    }
}
```

---

## 6. Generation Flow

### User Journey (5 Steps)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. SELECT      │ ──► │  2. SELECT      │ ──► │  3. SELECT      │
│     BRAND       │     │     TEMPLATE    │     │     STYLE       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐
│  5. VIEW        │ ◄── │  4. FILL        │
│     RESULT      │     │     TEMPLATE    │
└─────────────────┘     └─────────────────┘
```

### Backend Flow

```
User clicks "Generate"
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /api/adhub/generate                                   │
│  ├── Validate brand/template/style exist                    │
│  ├── Verify user owns the brand                             │
│  └── Call AdhubGenerationService.generateAd()               │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  AdhubGenerationService.generateAd()                        │
│  ├── composePrompt()                                        │
│  │   ├── Fetch brand, style, template from database         │
│  │   ├── Replace {{placeholders}} with field values         │
│  │   ├── Concatenate: goal + brand context + style mods     │
│  │   └── Gather all reference images                        │
│  ├── Create adhub_ads record (status='generating')          │
│  └── Call /api/generation/image                             │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  /api/generation/image                                      │
│  ├── Send to Replicate nano-banana-pro API                  │
│  │   ├── prompt: (composed prompt)                          │
│  │   ├── image_input: [reference images]                    │
│  │   ├── aspect_ratio: user selection                       │
│  │   └── extraMetadata: { source: 'adhub', adId, ... }      │
│  └── Wait for completion                                    │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  Update adhub_ads record                                    │
│  ├── Success: status='completed', gallery_id=<new_id>       │
│  └── Failure: status='failed'                               │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
    Return to frontend: { adId, galleryId, imageUrl, prompt }
```

---

## 7. Aspect Ratio Support

| Ratio | Name | Use Case |
|-------|------|----------|
| `1:1` | Square | Instagram post, Facebook |
| `4:5` | Portrait | Instagram feed optimal |
| `9:16` | Story | Instagram/TikTok Stories, Reels |
| `16:9` | Landscape | YouTube, Twitter, LinkedIn |
| `4:3` | Classic | Traditional presentations |

---

## 8. API Routes Reference

### Generation
- `POST /api/adhub/generate` - Generate an ad

### Brands
- `GET /api/adhub/brands` - List user's brands
- `POST /api/adhub/brands` - Create brand
- `GET/PATCH/DELETE /api/adhub/brands/[brandId]` - CRUD operations
- `GET/POST /api/adhub/brands/[brandId]/images` - Brand reference images
- `DELETE /api/adhub/brands/[brandId]/images/[imageId]` - Remove image

### Templates
- `GET /api/adhub/templates` - List templates (public + user's)
- `POST /api/adhub/templates` - Create template
- `GET/PATCH /api/adhub/templates/[templateId]` - CRUD operations
- `POST /api/adhub/templates/[templateId]/fields` - Add field
- `PATCH/DELETE /api/adhub/templates/[templateId]/fields/[fieldId]` - Field CRUD

### Styles
- `GET /api/adhub/styles` - List active styles
- `POST/PATCH /api/adhub/styles/[styleId]` - Admin operations

### Ads
- `GET /api/adhub/ads` - List user's generated ads
- `GET/DELETE /api/adhub/ads/[adId]` - CRUD operations

---

## 9. Creating Custom Templates

### Template Design Guidelines

1. **Be Specific in Goal Prompt** - Describe exactly what the ad should achieve
2. **Use Descriptive Field Names** - `product_name` not `name`
3. **Include Context Hints** - Tell the AI how to use each element
4. **Balance Required/Optional** - Core fields required, enhancements optional

### Example Custom Template

**Name:** Event Announcement

**Goal Prompt:**
```
Create an event announcement ad for {{event_name}}.
Date: {{event_date}}
Location: {{event_location}}
The design should build excitement and encourage sign-ups.
Feature the event banner prominently.
Highlight: {{key_highlight}}
CTA: {{cta_text}}
```

**Fields:**
| Field | Type | Required | Placeholder |
|-------|------|----------|-------------|
| event_name | text | Yes | "Annual Tech Summit 2024" |
| event_date | text | Yes | "March 15-17, 2024" |
| event_location | text | Yes | "San Francisco, CA" |
| key_highlight | text | No | "50+ Expert Speakers" |
| cta_text | text | No | "Register Now" |
| event_banner | image | No | "Upload event banner image" |

---

## 10. Creating Custom Styles

### Style Design Guidelines

Follow the 13-section pattern for comprehensive coverage:

1. **CORE IDEA** - The fundamental philosophy (1-2 sentences)
2. **VISUAL STRUCTURE** - Composition rules
3. **TYPOGRAPHY** - Font choices and hierarchy
4. **COLOR STRATEGY** - Palette and contrast
5. **TONE & VOICE** - Writing style
6. **HOOK MECHANICS** - How to grab attention
7. **PROOF DEVICE** - Credibility elements
8. **BRAND INTEGRATION** - Logo and product placement
9. **CTA** - Call-to-action guidelines
10. **SOCIAL FIT** - Platform optimization
11. **ACCESSIBILITY** - Legibility requirements
12. **PRODUCTION** - Technical specs
13. **AVOID** - Anti-patterns

### Example: Professional B2B Style

```
A clean, authoritative style for B2B marketing that builds trust through
clarity and expertise. Professional without being boring.

CORE IDEA: Demonstrate competence through visual organization. Let the
solution speak for itself.

VISUAL STRUCTURE: Grid-based layout with clear sections. Data visualization
when relevant. Professional photography or clean illustrations. Ample
whitespace.

TYPOGRAPHY: Clean sans-serif (Inter, Helvetica, SF Pro). Clear hierarchy
with bold headlines and readable body. Stats and figures in contrasting
weight.

COLOR STRATEGY: Navy, slate, or charcoal primary. Single accent color
(blue, teal, or brand color). White/light backgrounds. Charts use
accessible color palette.

TONE & VOICE: Confident, direct, professional. Lead with benefit,
support with proof. Avoid jargon unless industry-specific.

HOOK MECHANICS: Lead with a compelling statistic or bold claim.
Support with visual proof.

PROOF DEVICE: Customer logos, case study numbers, certifications,
awards. Real data over generic claims.

BRAND INTEGRATION: Logo in header or footer. Consistent with
corporate brand guidelines.

CTA: Action-oriented but professional: "Schedule Demo", "Get Pricing",
"Download Report", "Learn More".

SOCIAL FIT: LinkedIn-optimized. Works in email headers. Professional
contexts.

ACCESSIBILITY: High contrast for data. Clear labels on charts.
Text over image needs sufficient contrast.

PRODUCTION: Works in dark mode. Scales to presentation slides.
Print-friendly.

AVOID: Trendy effects, oversized text, emoji, casual language,
stock photo clichés, cluttered layouts.
```

---

## Summary

Adhub's power comes from its **composable architecture**:

- **Templates** define the ad's purpose with flexible placeholders
- **Styles** provide detailed creative direction
- **Brands** add context and visual identity
- **Prompt injection** combines all three into a comprehensive instruction

This modular approach allows users to:
- Reuse templates across different brands
- Apply different styles to the same template
- Maintain brand consistency across all ads
- Quickly generate variations by swapping components
