# Landing Page Redesign

**Date:** 2026-03-03
**Status:** Approved

## Overview

Redesign the landing page to showcase all 6 major features with dedicated sections. Shorten the hero scroll, add a sticky nav, and use alternating split layouts (video + text) for each feature.

## Page Structure

### 1. Clapperboard Hero (250vh scroll)
- Existing scroll-driven flipbook animation, reduced from 400vh to 250vh
- Text crossfade overlay at ~65% progress
- "Director's Palette" (Bebas Neue) + "AI Creative Studio" + CTA

### 2. Sticky Navigation Bar
- Fixed top bar, appears after scrolling past hero
- Left: "Director's Palette" logo text (Bebas Neue)
- Right: "Start Creating" amber button → /auth/signin
- Dark semi-transparent with backdrop-blur
- Fades in on scroll

### 3. Feature Sections (6 alternating split layouts)

Each section: video one side, text the other, alternating left/right.

| # | Feature | Video Side | Headline | Description |
|---|---------|-----------|----------|-------------|
| 1 | Shot Creator | Left | One Prompt. Ten Images. | Advanced syntax — brackets, pipes, wildcards, anchors. One prompt generates multiple variations automatically. |
| 2 | Storyboard | Right | Paste a Story. Get a Shot List. | Drop in any script or outline. AI extracts characters, locations, and breaks it into cinematic shots. |
| 3 | Music Lab | Left | Build AI Artists. Write Songs. | Create virtual artists with DNA profiles — voice, style, lexicon. Collaborative songwriting and beat production. |
| 4 | Storybook | Right | Create Children's Books. | Illustrated stories from text to print-ready KDP books. Multiple styles, page layouts, and audio narration. |
| 5 | Shot Animator | Left | Turn Stills Into Motion. | Animate any image with camera moves, character action, and atmospheric effects. Export to MP4. |

5 features total. VFX Bay removed (not a real standalone feature).

Each section includes:
- Autoplay/muted/looped video (banner image as poster until videos exist)
- Bebas Neue headline
- DM Sans description (1-2 lines)
- 2-3 bullet feature highlights
- Amber "Try It Free" CTA button

### 4. Prompt Visualizer (compact)
- Existing autoplay video of the prompting language
- Brief caption below

### 5. Pricing
- 4-column credit packs: Starter ($5.99), Creator ($11.99), Pro ($23.99), Studio ($47.99)

### 6. Final CTA
- "Your Vision. Rendered." headline
- Amber glow CTA button
- Social proof (3 free generations, no credit card)

## Sections Removed
- Style Showcase grid (4 style images)
- "As Seen At" partners marquee
- Detailed prompt syntax cards (Batch, Pipe, Wildcard, Anchor)
- VFX Bay walkthrough
- "How It Works" 3-step section
- "Mix and Match" and "Anchor Transform" detail boxes

## Design System
- Fonts: Bebas Neue (headings), DM Sans (body)
- Colors: Black/neutral-900/neutral-950 backgrounds, amber-500 accents, emerald for checkmarks
- No purple anywhere
- Amber glow CTAs: `shadow-[0_0_30px_rgba(245,158,11,0.3)]`

## Video Strategy
- Use existing banner images from `public/banners/` as video poster placeholders
- Generate feature demo videos later (16:9, ~5-10 seconds each, looped)
- Videos slot in without code changes (just add files to public/landing/videos/)

## Implementation
- Modify `src/app/landing/page.tsx` (full rewrite)
- Modify `src/app/landing/ClapperboardHero.tsx` (reduce 400vh → 250vh)
- Add new `StickyNav` component or inline in page
- No new dependencies needed
