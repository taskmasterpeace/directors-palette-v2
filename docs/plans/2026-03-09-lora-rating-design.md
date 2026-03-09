# LoRA Rating System Design

**Date:** 2026-03-09

---

## Overview

After using a LoRA for image generation, users can rate it 1-5 stars. Rating UI appears in two places: the sidebar LoRA card and the community browser.

## Data Model

Add to `lora.store.ts`:
- `loraRatings: Record<string, { rating: number, ratedAt: number }>` — user's ratings
- `usedLoraIds: string[]` — LoRAs used for at least one generation
- `markLoraUsed(id: string)` — called after successful generation
- `rateLora(id: string, rating: number)` — save rating
- `getLoraRating(id: string)` — get rating or null

Storage version bump to 9.

## Sidebar LoRA Card (A)

- After a LoRA has been used: show star icon on the card
- Unrated: outlined star, subtle glow
- Click star: inline 1-5 star picker appears
- Rated: filled star with rating, no glow
- Can re-rate by clicking again

## Community Browser (C)

- Used but unrated: "Rate" badge on card
- Rated: star rating displayed below name
- Not used: no rating UI

## Mark Used Trigger

After successful image generation with active LoRA, call `markLoraUsed(id)`.
