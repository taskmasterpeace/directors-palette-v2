# Director's Palette v2

> **Turn stories into images.** Professional AI image generation with advanced prompt engineering for visual storytelling.

**The Challenge**: Generate 100+ images for a story while keeping characters, locations, and style consistent.

**The Solution**: Director's Palette with a powerful prompting language that gives you control.

---

## Features

### Shot Creator
- **6 AI Models**: Nano Banana, Seedream-4, Gen4 Image, Gen4 Turbo, Qwen Image, Qwen Edit
- **Advanced Syntax**: Brackets for variations, pipes for sequences, wildcards for randomization
- **Reference Management**: Upload, tag, and reuse images with @references
- **Custom Styles**: Create and save your own visual styles with reference images
- **Real-time Settings**: Aspect ratio, resolution, guidance per model

### Storyboard
Complete 6-step workflow for visual storytelling:
1. **Story** - Paste your script, AI extracts characters and locations
2. **Style** - Choose or create visual styles
3. **Characters** - Define and generate character sheets
4. **Shots** - Break story into individual shots with prompts
5. **Generate** - Batch generate all images
6. **Results** - Review and export your storyboard

### Shot Animator
Turn images into videos with AI-powered animation.

### Layout & Annotation
Annotate images with text, arrows, and markers for presentations.

### Gallery
- Search & filter by prompt, model, tags
- Batch operations and mobile-optimized viewing
- Full metadata tracking

---

## The Prompting Language

### Bracket Variations
One prompt, multiple images:
```
Hero fights villain in [rainy street, burning building, snowy mountain]
```
**Generates 3 images** with each location.

### Pipe Chaining
Sequential image generation:
```
Hero stands ready | Hero draws sword | Hero charges forward | Hero strikes
```
**Generates 4 sequential images** showing the action progression.

### Wild Cards
Dynamic randomization with `_wildcards_`:
```
_character_ standing in _location_ at _lighting_
```
Built-in wildcards: `_character_`, `_location_`, `_lighting_`, `_mood_`, `_camera_`, `_object_`

### @ References
Tag and reuse images:
```
@hero_john fighting in warehouse
```
Automatically loads your tagged "hero_john" reference image.

---

## Character Consistency

Maintain consistent characters across hundreds of shots:

1. **Character Sheets** - Generate multi-angle reference sheets
2. **Reference Images** - Tag and attach to prompts
3. **Custom Styles** - Create styles like Muppet, Claymation, Anime
4. **Consistent Seeds** - Same seed + same description = consistent appearance

---

## Points System

Pay-as-you-go credits for AI generations:

| Package | Price | Points | Bonus | ~Images |
|---------|-------|--------|-------|---------|
| Starter | $5 | 500 | - | 25 |
| Creator | $10 | 1,200 | +20% | 60 |
| Pro | $20 | 2,750 | +37% | 135 |
| Studio | $40 | 6,000 | +50% | 300 |

- 1 image ≈ 20 points
- 1 video ≈ 40 points
- New users get 3 free generations

---

## Quick Start

### Prerequisites

1. **[Replicate](https://replicate.com)** - AI image generation
2. **[Supabase](https://supabase.com)** - Database & authentication
3. **[Stripe](https://stripe.com)** (optional) - Payment processing

### Installation

```bash
git clone https://github.com/yourusername/directors-palette-v2.git
cd directors-palette-v2
npm install
cp .env.example .env.local
```

### Environment Variables

```bash
# Replicate API (REQUIRED)
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxx

# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Stripe (OPTIONAL - for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Setup

Run migrations in Supabase SQL Editor:
1. `supabase/migrations/20251211000000_create_credits_schema.sql`
2. `supabase/migrations/20251211000001_add_stripe_price_ids.sql`

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Tech Stack

- **Framework**: Next.js 15.5 with App Router & Turbopack
- **React**: 19.1.0
- **TypeScript**: Strict mode
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **State**: Zustand
- **Backend**: Supabase (Auth, Database, Storage)
- **Payments**: Stripe
- **AI**: Replicate API

---

## Project Structure

```
src/
├── app/                              # Next.js App Router
│   ├── api/
│   │   ├── generation/               # Image/video generation
│   │   ├── credits/                  # Points system
│   │   ├── payments/                 # Stripe checkout
│   │   └── webhooks/                 # Replicate & Stripe webhooks
│   ├── landing/                      # Public landing page
│   └── auth/                         # Authentication pages
├── features/
│   ├── shot-creator/                 # Main image generation
│   ├── storyboard/                   # Full storyboard workflow
│   ├── shot-animator/                # Video generation
│   ├── layout-annotation/            # Image annotation
│   ├── credits/                      # Points system
│   └── admin/                        # Admin dashboard
```

---

## Admin Dashboard

Access at `/admin` (requires admin email in config):
- View all users and their credits
- Grant bonus credits
- Monitor usage statistics

---

## Use Cases

- **Comic Books** - Generate consistent characters across panels
- **Storyboards** - Visualize scripts with sequential images
- **Visual Novels** - Create character sprites and backgrounds
- **Concept Art** - Explore visual directions quickly
- **Film Pre-viz** - Plan shots and camera angles

---

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

---

## License

MIT License - Machine King Labs

---

**Machine King Labs** - "With AI anything is possible"
