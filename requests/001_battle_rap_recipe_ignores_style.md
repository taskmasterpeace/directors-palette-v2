# Work Request 001: Battle Rap recipe ignores style overrides

**Filed:** 2026-04-20
**Filed by:** Robert (AIOBR) via Claude
**Severity:** Blocker for any story using the Battle Rap recipe in a non-photoreal style (Coondocks, Comic Book, Action Figure, GI Joe, etc.)
**Affected endpoint:** `POST /api/v2/recipes/execute` with `recipe_id = 16c2b9cc-ff46-4f0c-a251-8c4d2aac1101` (Battle Rap)

## Summary

The Battle Rap recipe always renders photoreal output, regardless of the `style_id`, `style_prompt`, or custom `STYLE` field passed to it. Character reference tags (`@king`, `@yunus`) are recognised for name/identity purposes, but the illustration style baked into the character sheet is not preserved — the recipe's server-side prompt template forces a photorealistic club-photography look and overrides everything.

This blocks AIOBR from using the Battle Rap recipe, because every AIOBR story has a non-photoreal visual identity (Coondocks, Saturday cartoon, Boondocks influence, etc.). The recipe is the most relevant one for our library of battle-rap scenes, and we cannot use it at all right now.

## Repro

Reference characters must exist first: `@king`, `@yunus`, both uploaded as Coondocks-style character sheets via `POST /api/v2/images/upload` with `reference_category=people`.

Then execute the recipe with any of the following style-override shapes — all return a job, all produce photoreal output:

```js
// Shape A: top-level style_id
POST /api/v2/recipes/execute
{
  "recipe_id": "16c2b9cc-ff46-4f0c-a251-8c4d2aac1101",
  "fields": {
    "PERSON_A": "@king", "ACTION_A": "Pointing aggressively at opponent",
    "PERSON_B": "@yunus", "ACTION_B": "Smirking with arms crossed",
    "CAMERA_ANGLE": "Wide master shot",
    "LIGHTING_STYLE": "Harsh overhead spotlight",
    "CUSTOM_LOCATION": "Small packed club stage, crowd shoulder to shoulder..."
  },
  "style_id": "d30f79de-ab81-4c65-8114-c0b01aef1510",   // Coondocks
  "reference_tag": "king",
  "reference_category": "people"
}

// Shape B: top-level style_prompt
{
  ...same fields,
  "style_prompt": "in the modern comic illustration style with clean lines, muted tones, expressive characters, and detailed urban backdrops",
  "reference_tag": "king", "reference_category": "people"
}

// Shape C: STYLE field inside fields + style_id at top
{
  ...same fields, "fields": { ..., "STYLE": "Coondocks comic illustration" },
  "style_id": "d30f79de-ab81-4c65-8114-c0b01aef1510",
  "reference_tag": "king", "reference_category": "people"
}
```

All four runs (including the baseline with no style override) produced photorealistic club photos. Evidence URLs:

- Baseline (no style): https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/generations/d3a01f94-671e-483a-89f6-0284f7aaaf85/8dmfrw2senrmt0cxnft9k7xmb0.png
- Shape A: https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/generations/d3a01f94-671e-483a-89f6-0284f7aaaf85/g7s6kea75drmr0cxnfyvat965r.png
- Shape B: https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/generations/d3a01f94-671e-483a-89f6-0284f7aaaf85/4dw9c8xmx5rmw0cxnfyt5by3eg.png
- Shape C: https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/generations/d3a01f94-671e-483a-89f6-0284f7aaaf85/a1ewx2gn81rmr0cxnfz9dg586r.png

Reproduction scripts in the AIOBR repo:
- `scripts/test_justbusiness2_recipe.js` (baseline)
- `scripts/test_recipe_style_override.js` (shapes A/B/C)

## Root cause hypothesis

The Battle Rap recipe's prompt template on the server hardcodes photoreal language ("cinematic photography", "photojournalistic", "35mm", or equivalent). The recipe schema returned by `GET /api/v2/recipes` has no STYLE field, so there is no documented way to influence it. Top-level `style_id` and `style_prompt` appear to be silently dropped by the recipes/execute handler (the request is accepted and billed, but the style is never inserted into the final prompt).

For comparison, the `Character Sheet` recipe exposes a STYLE field in its schema, and respects it.

## Proposed fix

Three acceptable options, in order of preference:

1. **Add a STYLE field to the Battle Rap recipe schema.** `type: select` with the 9 built-in styles as options (Coondocks, Comic Book, Action Figure, etc.), plus the default "Photoreal" option. The recipe's server-side prompt template should pick up `fields.STYLE` and either (a) switch to the matching style's `style_prompt`, or (b) resolve a style_id from the field value. This matches the pattern already used in the Character Sheet recipe.

2. **Honor top-level `style_id` on `/recipes/execute`.** If a `style_id` is passed alongside `recipe_id`, the server should fetch that style's `style_prompt` and append/replace the hardcoded photoreal language in the recipe's template. This would fix every recipe at once, not just Battle Rap.

3. **At minimum, make the photoreal language in the Battle Rap template conditional.** If any character reference has a non-photoreal source style (which the sheet metadata should know), skip the photoreal language and let the reference carry the style.

Option 1 is the cheapest and matches existing patterns. Option 2 is the right long-term design.

## Acceptance criteria

Given the reference characters `@king` and `@yunus` are both Coondocks-style sheets, when we execute the Battle Rap recipe with Coondocks selected (via whichever of the three shapes above is supported), the output image should be rendered in the Coondocks illustration style — not photoreal — and both characters should be recognisable from their sheets (dreads + Nike hoodie for K1NG, red durag + black hoodie for Yunus).

## Business impact

AIOBR ships a video with a battle scene roughly once a week. Every one of those scenes currently has to be hand-built through the generic `/images/generate` endpoint plus prompt engineering, instead of leveraging the purpose-built recipe. Fixing this unlocks ~8 recipe shots per story at 10 pts each = one batch per story that we can fire in one script. Also applies to future AIOBR Mixtape volumes and the planned RBE vs URL and K1NG vs Yunus stories.

## Contact

Robert @ AIOBR. Scripts and test output are in the AIOBR repo at `scripts/test_justbusiness2_recipe.js` and `scripts/test_recipe_style_override.js`. Happy to re-run the probes on any branch you want to verify a fix.

---

## Resolution (2026-04-20)

**Status:** PARTIALLY FIXED — immediate unblock applied, larger API fix still outstanding.

**Root cause:** same drift pattern as the 2026-04-20 Character Sheet outage (`6a3ce6f4`). The DB recipe was last updated 2026-03-03 and had the old template with hardcoded "Cinematic realism" / "high contrast, gritty texture" language and no STYLE field. The code-side template in `src/features/shot-creator/constants/recipe-samples.ts` had been updated later with a full STYLE select (Boondocks, Comic Book, Anime, Pixar, etc.) and the photoreal hardcode removed — but the DB row never got synced. Seed scripts are insert-only, so updates to `SAMPLE_RECIPES` never propagate to existing user-owned recipes.

**What was done:**
- Migrated the Battle Rap DB row (id `16c2b9cc...`, owner `d3a01f94...`) to the current code template via `scripts/update-battle-rap-recipe.js`.
- Template grew from 2454 → 7433 chars. Added STYLE, STAGE_BANNER, OUTFIT_A, OUTFIT_B, HAIR_A, HAIR_B fields. Removed photoreal-forcing language.

**What AIOBR needs to do:**
- Re-fetch the recipe schema from `GET /api/v2/recipes/16c2b9cc-...` — the STYLE field should now be present.
- Pass `fields.STYLE = "Boondocks-style cel-shaded animation with bold black outlines and flat colors"` (or any other option from the select). The "Match character reference style" option is the first choice — useful when your `@king` / `@yunus` sheets already carry the Coondocks style.
- Re-run `scripts/test_recipe_style_override.js` using **Shape C** (STYLE as a field). Shapes A and B (top-level `style_id` / `style_prompt`) will still be silently ignored — see below.

**Still outstanding:** proposed fix #2 (honor top-level `style_id` on `/recipes/execute`) was NOT implemented. The handler at `src/app/api/v2/recipes/execute/route.ts:33` doesn't destructure `style_id` or `style_prompt` — any top-level style params remain silent drops. This is a larger API-surface change that needs separate design work (decide: append-to-prompt vs. replace-STYLE-field vs. inject-via-reference-image). Filed as follow-up work, not blocking AIOBR.

---

## Verification (2026-04-20, AIOBR side)

**Status:** FULLY RESOLVED. Re-ran all four shapes after the DP team's second pass. All four produce non-photoreal output. Battle Rap recipe is unblocked for AIOBR.

**Recipe schema fetch confirms new STYLE field:**
```
fields: CAMERA_ANGLE, PERSON_A, ACTION_A, OUTFIT_A, HAIR_A, PERSON_B, ACTION_B, OUTFIT_B, HAIR_B, LOCATION, STAGE_BANNER, STYLE, LIGHTING_STYLE
STYLE options:
  - Match character reference style
  - Photoreal cinematic realism
  - Documentary photography 35mm grain
  - Boondocks-style cel-shaded animation with bold black outlines and flat colors
  - Saturday-morning cartoon flat colors with thick outlines
  - Comic book illustration with halftone dots and ink lines
  - Anime illustration
  - Pixar-style 3D rendered
```

**Head-to-head evidence URLs (same fields, Coondocks selected via each shape):**
- Shape A (top-level `style_id` UUID): https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/generations/d3a01f94-671e-483a-89f6-0284f7aaaf85/d5ts80dq1drmt0cxngg8pt56g4.png
- Shape B (top-level `style` by name): https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/generations/d3a01f94-671e-483a-89f6-0284f7aaaf85/tb3rda8r4xrmt0cxnggrrq1xfm.png
- Shape C (top-level `style_prompt` raw): https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/generations/d3a01f94-671e-483a-89f6-0284f7aaaf85/rsdf2n4k91rmy0cxnggr67abhr.png
- Shape D (`fields.STYLE`): https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/generations/d3a01f94-671e-483a-89f6-0284f7aaaf85/6xt66ptgy1rmw0cxnghazmyzpg.png

**Observations:**
- All four now animated. Core fix confirmed.
- Shape D (STYLE field) produces the richest composition: new `OUTFIT_A/B`, `HAIR_A/B`, `STAGE_BANNER` fields are clearly pulling weight. Shape D has "The Battleground / twitch.tv" banner, "The Crown Battle" shirt on K1NG, Yunus 019 hoodie. Best of the four.
- Shape B and D best preserve @king identity (dreads from sheet carry through).
- Character identity from `@king`/`@yunus` refs is not 100% locked — Shape A gave Yunus curly hair instead of his sheet's red durag. Likely fixed by populating `OUTFIT_B`/`HAIR_B` fields or passing `@yunus` as a second reference. Separate concern from the style fix, not blocking.

**Naming drift to note:** Styles library still has `Coondocks` (id `d30f79de-...`); the recipe STYLE dropdown uses "Boondocks-style cel-shaded..." as the option label. Small alignment opportunity, not blocking.

**Cost of re-verification:** 120 pts (4 runs at 10 pts, no re-uploads needed).

**AIOBR next step:** Battle Rap recipe is now the default path for battle scene generation. Will standardize on Shape D (STYLE as a field) for readability and also leverage the new OUTFIT/HAIR/STAGE_BANNER fields.

**Structural fix needed:** this is the second drift incident in one day. CLAUDE.md now carries a rule requiring centralized URLs + upsert-capable seed scripts (commit `e2b2bea0`). The seed-recipes script should get an upsert mode so future `SAMPLE_RECIPES` updates propagate to existing DB rows automatically.
