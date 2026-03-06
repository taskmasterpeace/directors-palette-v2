# Brand Studio Audit & Professional Redesign

**Date:** 2026-03-06
**Status:** Approved

---

## Problem

Brand Studio Phase 1 is functional but feels like a developer prototype:
- Too much vertical scrolling (6 sections stacked in a single column)
- No brand completeness or quality scoring
- Prototype artifacts: numbered section badges, raw JSON collapsible, version badge
- Dead code (unused BrandSelector.tsx)
- No visual hierarchy between working and placeholder tabs
- Brand data not scannable at a glance

## Research

Analyzed professional brand tools: Brandfolder, Frontify, Brandpad, Canva Brand Kit, Looka.

Key patterns extracted:
- **Multi-column layouts** (Frontify/Brandpad) - Colors + Typography side by side
- **Tab-based grouping** (Frontify) - Group related sections into sub-tabs
- **Brand-colored UI** (Canva/Brandfolder) - Reflect brand's primary color in page header
- **Large color swatches** (Brandpad) - Rectangular blocks with HEX + RGB, not tiny circles
- **Dark typography specimens** (Brandpad) - Show fonts on dark backgrounds with weight demos
- **Completeness indicators** (all tools) - Ring/bar showing profile completeness
- **Progressive disclosure** (Brandpad/Corebook) - Summary by default, expand for details

## Design

### 1. Brand Hero (Top of BrandTab)

Full-width brand-colored banner:
- Gradient background using brand's primary color (`from-[primary]/15 to-[primary]/5`)
- Logo (20x20, white shadow ring) on left
- Brand name (xl bold), tagline, industry badge on right
- Brand guide image as card overlay sitting partially on banner
- Regenerate button always visible (not hover-only)

### 2. Brand Score Ring

Two scores side-by-side below the hero:

**Completeness Score (left):**
- Circular SVG progress ring showing % complete
- 7 items: Logo, Colors, Typography, Voice, Audience, Visual Style, Music
- Shows check/gap per item
- Copy: "5/7 sections complete" + names missing items

**Quality Score (right):**
- Letter grade (A+ through D)
- Scoring criteria:
  - Color count: 3+ good, 5+ great
  - Both heading + body fonts defined
  - Voice: 3+ tone words + persona
  - Audience: primary + secondary defined
  - Visual style: subjects + composition
  - Music: genres + BPM range
- Brief explanation text

Both update live as users edit.

### 3. Sub-Tabs Layout

Three pill-style sub-tabs replace the single vertical scroll:

**Visual Identity tab:**
- 2-column grid: Colors (left) | Typography (right)
- Full-width below: Visual Style
- Colors: Large rectangular swatches (~80px tall) grouped by role, HEX + RGB
- Typography: Dark specimen block, "Aa Bb Cc" in multiple weights, font hierarchy

**Voice & Messaging tab:**
- 2-column grid: Voice & Tone (left) | Audience (right)

**Audio tab:**
- Full-width: Music section (genre pills, mood pills, BPM bar)

Each tab fits ~1 screen. Multi-column cuts scroll ~50%.

### 4. Section Cards (Updated)

- Remove section numbering
- Keep section icon (subtle circle, colored)
- Title: base font (bigger than current sm)
- Edit button: always visible, subtle text link (not hover-only)
- Editing: card gets subtle ring/glow
- Save/Cancel at bottom of edit form
- Unsaved changes dot indicator

### 5. Cleanup

- Delete `BrandSelector.tsx` (dead code, never imported)
- Remove Raw JSON collapsible
- Remove "Brand Studio v1.0" version badge from sidebar
- Dim placeholder tabs (Library, Create, Campaigns) - reduced opacity, locked icon
- Add sub-tab transition animations (slide direction-aware)

## Approach

Approach B: Professional Reorganization. Medium effort, high impact.
Restructure BrandTab into tabbed + multi-column layout inspired by Frontify/Brandpad.

## Out of Scope

- Hub overview with clickable tiles (Phase 2+)
- Auto-generated brand application mockups (Phase 2+)
- Brand comparison view
- Deep-linking to sections
- Filter/search within brand data
