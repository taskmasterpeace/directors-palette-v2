# Work Request 002: Battle Rap recipe — character references not injecting

**Filed:** 2026-04-20 (same day as WR 001, after verification revealed deeper issues)
**Filed by:** Robert (AIOBR) via Claude
**Severity:** Blocker — character identity from `@tag` sheets is not reaching the model even though WR 001 is fixed
**Related:** builds on WR 001 (`001_battle_rap_recipe_ignores_style.md`) which fixed the style hardcode. Style is now working. Character refs are not.
**Affected endpoint:** `POST /api/v2/recipes/execute` with `recipe_id = 16c2b9cc-ff46-4f0c-a251-8c4d2aac1101` (Battle Rap)

## Summary

Style overrides now work (great, WR 001 done). But the characters in the output never look like the `@king` / `@yunus` character sheets we uploaded. K1NG's dreads + Nike hoodie don't carry. Yunus's red durag + black hoodie don't carry. The generator invents generic characters and slaps names on them.

Robert pulled the actual prompt being sent to nano-banana-2 and handed it over. Comparing that prompt against the request body reveals **four distinct bugs**, any one of which would break character identity on its own.

## Evidence — actual prompt that reached the model

Robert shared this verbatim (Battle Rap recipe, STYLE = "Boondocks...", fields.PERSON_A = "@king", fields.PERSON_B = "@yunus"):

```
A professional high-definition Wide master shot of an acappella battle rap event.
The camera is positioned behind Person B, looking over their shoulder at Person A
who is standing face-to-face in a high-intensity verbal battle. Crucially, there
are NO microphones; both performers have completely empty hands, using wild hand
gestures and aggressive facial expressions.

PERSON A: @@king
PERSON A ACTION: Pointing aggressively at opponent
PERSON A OUTFIT:
PERSON A HAIR:

PERSON B: @@yunus
PERSON B ACTION: Smirking with arms crossed
PERSON B OUTFIT:
PERSON B HAIR:

SETTING: Small packed club stage, crowd pressed in shoulder to shoulder, Twitch
stream rig on a tripod in foreground visible on backdrop banners behind the
battlers.

STYLE: Boondocks-style cel-shaded animation with bold black outlines and flat colors
LIGHTING: Harsh overhead spotlight.

Surround them with a dense, diverse crowd of spectators with blurred faces.
Authentic hip-hop aesthetic. Hands visible and empty. No microphones anywhere
in the scene.
```

## Bug 1 — double @ on character tags

Prompt contains `PERSON A: @@king` and `PERSON B: @@yunus`. Double at-sign.

Root cause: the recipe template already hardcodes a `@` prefix before `<<PERSON_A>>`, and the caller (following the recipe_note's own instruction: "Tag your characters with @ to pull from your character library") passes `@king` as the field value. The interpolator concatenates to `@@king`, which matches no gallery entry, so the tag never resolves to a reference image upstream of the model call.

Either strip a leading `@` from user-supplied `name`-type field values before interpolating, or remove the hardcoded `@` from the template and normalize on resolver-side.

## Bug 2 — OUTFIT_A / HAIR_A / OUTFIT_B / HAIR_B emit blank lines when unset

When these fields aren't populated, the prompt contains:

```
PERSON A OUTFIT:
PERSON A HAIR:
```

Empty trailing colons. Two problems:
1. Gives the model nothing to bind visual identity to (even ignoring Bugs 1/3/4), these are exactly where character details should come from
2. Bare "OUTFIT:" with no value reads as noise or ambiguous to the model

Suggested fix: the template should either (a) omit the line entirely when the field is blank, or (b) default to "(pull from reference image)" / "(unspecified — use character reference)". Option (b) pairs with Bug 3 below.

## Bug 3 — prompt never instructs the model to use the reference image for identity

Even if the reference is attached at the API transport layer, the text prompt refers to characters only by label (`@@king`) or by the name field. There is no "PERSON A is the character depicted in the first reference image" or "use the attached reference for PERSON A's face, hair, and outfit" language anywhere.

Evidence this is real: probe P3 (see below) passed `reference_image = <yunus sheet URL>` at top level and produced a character with a **red durag** — Yunus's signature element from the sheet. So the reference IS being attached to the nano-banana-2 call. But the character's **skin tone and facial features still don't match the sheet** — only the most prominent wardrobe element (the durag) bled through. This is a clear signature of the model treating the attached ref as a loose "style/mood" influence rather than a "use this as PERSON B's identity" lock, because the prompt contains no language instructing otherwise.

Fix: the template should include an explicit reference-binding sentence like "Use the attached reference image(s) to set PERSON A's face, skin tone, hair, and outfit. Use the second reference image for PERSON B in the same way. These references must drive character identity, not just style." Without this, even a correctly-forwarded ref ends up as a weak hint.

## Bug 4 — `reference_images` (plural) is silently dropped on `/recipes/execute`

Battle Rap has two characters. One `reference_image` (singular) can only bind one. So we tried passing `reference_images: [kingUrl, yunusUrl]` (plural array, same shape that works elsewhere).

Probe P2 output: generic characters, neither has dreads or a durag. Refs were dropped.

Either:
- Accept `reference_images` as an array and forward all of them to the model (nano-banana-2 supports up to 14 refs), or
- Add named ref slots: `reference_images: { PERSON_A: "<url>", PERSON_B: "<url>" }` so the template can bind each explicitly

## Bug 5 — job response exposes no metadata

`GET /api/v2/jobs/<id>` returns only `{ job_id, status, type, cost, created_at, completed_at, result: { image_urls, final_image_url }, error_message }`.

No `metadata`, no `input`, no `resolved_prompt`, no `reference_images_used`. This makes debugging the above bugs impossible from the caller side — we only caught Bug 1 because Robert was able to pull the prompt from the DP UI directly.

Fix: return `metadata.resolved_prompt` and `metadata.reference_images` on completed jobs. Gated on auth/ownership is fine.

## Repro

Scripts in AIOBR repo:
- `scripts/probe_recipe_refs.js` — fires P1/P2/P3 below with full job-response dump

```js
// P1: @tags in PERSON fields only, no top-level ref
{ recipe_id: "16c2b9cc-...", fields: { ..., PERSON_A: "@king", PERSON_B: "@yunus" } }

// P2: reference_images plural array
{ recipe_id: "16c2b9cc-...", fields: {...}, reference_images: [kingUrl, yunusUrl] }

// P3: reference_image singular = yunus sheet URL
{ recipe_id: "16c2b9cc-...", fields: {...}, reference_image: yunusUrl }
```

## Evidence images

- P1 (tags only): https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/generations/d3a01f94-671e-483a-89f6-0284f7aaaf85/92m19v300hrmy0cxngvr0829nr.png — characters generic, no durag, no Nike hoodie
- P2 (plural array, dropped): https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/generations/d3a01f94-671e-483a-89f6-0284f7aaaf85/93fry8r8t5rmt0cxngwb6wdbc0.png — characters generic, same as P1
- P3 (singular yunus ref): https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/generations/d3a01f94-671e-483a-89f6-0284f7aaaf85/5cpzaf3z5xrmr0cxngw94bf0r8.png — **one character is in a red durag**, confirming `reference_image` (singular) does forward to model, but identity bleeds randomly because no binding language in prompt

Local PNGs + full job JSON dumps:
- `D:/git/aiobr/stories/_pending/recipe_tests/05_P1_refprobe.png` + `.job.json`
- `D:/git/aiobr/stories/_pending/recipe_tests/05_P2_refprobe.png` + `.job.json`
- `D:/git/aiobr/stories/_pending/recipe_tests/05_P3_refprobe.png` + `.job.json`

## Acceptance criteria

Given `@king` and `@yunus` are uploaded as character sheets with `reference_category=people`, when the Battle Rap recipe is executed with:

```json
{
  "recipe_id": "16c2b9cc-ff46-4f0c-a251-8c4d2aac1101",
  "fields": {
    "PERSON_A": "@king",
    "PERSON_B": "@yunus",
    "STYLE": "Boondocks-style cel-shaded animation with bold black outlines and flat colors",
    "ACTION_A": "Pointing aggressively at opponent",
    "ACTION_B": "Smirking with arms crossed",
    "CAMERA_ANGLE": "Wide master shot",
    "LIGHTING_STYLE": "Harsh overhead spotlight",
    "CUSTOM_LOCATION": "..."
  }
}
```

The output image should show:
- PERSON_A rendered with K1NG's dreads + black Nike hoodie + dark jeans (from the @king sheet)
- PERSON_B rendered with Yunus's red durag + black hoodie (from the @yunus sheet)
- Coondocks/Boondocks cel-shaded style (already working after WR 001)
- Face-to-face, no microphones (already working)

And `GET /api/v2/jobs/<id>` should return `metadata.resolved_prompt` and `metadata.reference_images_used` so we can audit future regressions without needing to scrape the UI.

## Proposed fix order

1. **Bug 1 (double @)** — one-line fix in the tag interpolator, strip leading `@` from user input before concatenation. Highest impact, lowest effort.
2. **Bug 4 (plural reference_images)** — forward the array to the model. Medium effort.
3. **Bug 3 (binding language)** — update the Battle Rap template to include "Use reference image 1 for PERSON A's face/hair/outfit. Use reference image 2 for PERSON B." Low effort once Bug 4 is in.
4. **Bug 2 (empty field lines)** — conditional omission or "(use reference)" default in the template. Low effort.
5. **Bug 5 (metadata in job response)** — medium effort, high value for future debugging. Not blocking.

Fixes 1+3+4 together should fully satisfy the acceptance criteria. Fix 2 is polish. Fix 5 is operational.

## Business impact

Same as WR 001: AIOBR ships a battle scene weekly and every one needs real character identity. Until character refs inject properly, we still can't use the Battle Rap recipe for production — we'd have to hand-describe every character's outfit/hair via the OUTFIT_A/HAIR_A/OUTFIT_B/HAIR_B fields on every single shot, which defeats the "set them once, reuse forever" value promised by the recipe_note.

## Contact

Robert @ AIOBR. All scripts, full job dumps, and head-to-head images in `D:/git/aiobr/stories/_pending/recipe_tests/`. Same test account + recipe as WR 001. Happy to re-run once any of the fixes land.
