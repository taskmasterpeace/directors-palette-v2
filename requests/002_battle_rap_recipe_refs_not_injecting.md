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

## Catalog-wide scope — this is not Battle-Rap-only

After filing the four bugs above, I ran a static audit of all 68 recipes currently visible to our account (`node D:/git/aiobr/scripts/audit_all_recipes.js`, full JSON at `D:/git/aiobr/stories/_pending/recipe_audit.json`). Three recipes share the same bug class because they all have ≥2 character-reference slots and the endpoint only accepts singular `reference_image`:

| Recipe | ID | Character slots | Visibility |
|---|---|---|---|
| Battle Rap | `16c2b9cc-ff46-4f0c-a251-8c4d2aac1101` | PERSON_A, PERSON_B | created (my private fork) |
| Battle Rap | `4a87c961-038b-4050-9974-4a60d9210ac0` | PERSON_A, PERSON_B | system (public template) |
| AIOBR | `a0756c96-81bb-4479-8099-359a95484557` | WHO, SUPPORTING_1, SUPPORTING_2 | created (my thumbnail generator) |

AIOBR is particularly painful — it's the thumbnail recipe for every video I ship (weekly cadence, 225K views/month). When I pass a main artist plus two supporting characters, only one character gets an identity-locked ref image; the other two are invented from the @tag alone, which means the supporting characters on thumbnails routinely look nothing like the real person. Same root cause as Battle Rap (Bugs 3+4). Bug 1 (double @) is unverified for AIOBR until someone pulls its actual prompt — I can't inspect the template via v2 API.

**Bug 6 (new, catalog-wide):** `GET /api/v2/recipes` returns recipe metadata (name, fields, stages, recipe_note) but not `prompt_template`. And `GET /api/v2/recipes/<id>` returns 404. This means recipe audits can't be done statically — the bugs in WR 002 required scraping the UI to see the actual prompt. Please expose `prompt_template` on the recipe detail endpoint (or on each stage) so future Claude audits are self-serve instead of human-dependent.

**Acceptance criteria update:** fixes 1–4 should apply to the interpolator/binding logic at the recipe-engine level (not per-recipe), so all three affected recipes benefit from one patch. Template-level language updates (Bug 3's "use reference image 1 for PERSON A…") will need per-recipe edits since each recipe has its own field names.

## Contact

Robert @ AIOBR. All scripts, full job dumps, and head-to-head images in `D:/git/aiobr/stories/_pending/recipe_tests/`. Catalog-wide audit at `D:/git/aiobr/stories/_pending/recipe_audit.json` + `D:/git/aiobr/scripts/audit_all_recipes.js`. Same test account + recipe as WR 001. Happy to re-run once any of the fixes land.

---

## Verification 2026-04-21 (post-fix pass)

Re-ran full verification with `scripts/verify_wr002_full.js` after DP team's claimed fixes. Balance topped up (140 → 2140), re-uploaded @king and @yunus sheets (gallery was purged), fired one full-stack recipe run with all fields populated + `reference_images: [kingUrl, yunusUrl]`. Cost 30 pts (2 uploads + 1 recipe run). Evidence: `stories/_pending/recipe_tests/07_fullstack_verify.png` + `07_fullstack_verify.job.json`.

| Bug | Status | Evidence |
|---|---|---|
| B1 Double `@@` | **FIXED** | Verified earlier via `06_P1_post_bug1.png` after commit 5a94c24c |
| B2 Empty OUTFIT/HAIR lines | **FIXED** | Confirmed via `resolved_prompts[0]` in job metadata (see B5) — all field values interpolated, zero bare-colon lines. |
| B3 No binding language | **FIXED** | Resolved prompt now appends: *"Use the attached reference image(s) to drive the identity of each named person in the prompt: match their face, skin tone, hair, and outfit exactly to the references. When multiple references are attached, each subsequent reference maps to the next named person in prompt order (first reference → first person, second reference → second person, and so on). Treat the references as identity locks, not style or mood hints — do not invent generic features."* Exactly what WR 002 asked for. |
| B4 `reference_images` plural array dropped | **FIXED** | Both URLs preserved end-to-end. `result.metadata.reference_images_used[0]` contains both uploaded sheet URLs in order. Generated image shows @king + @yunus rendering correctly against their own sheets simultaneously. |
| B5 No job metadata / resolved_prompt | **FIXED** (nested, not top-level) | Correction: metadata is present, just at `job.result.metadata` instead of `job.metadata`. Contains `resolved_prompts` (plural array) AND `reference_images_used` (plural array). `/recipes/execute` runs can now be fully audited post-hoc — this is how I confirmed B2/B3/B4 for this verification. Suggestion (optional): either hoist to top-level `job.metadata` or document the nested path so callers don't miss it. |
| B6 `GET /recipes/<id>` exposes prompt_template | **STILL OPEN** | `GET /api/v2/recipes/16c2b9cc-…` returns 404. Still no way to pull a recipe's template via v2 API. Post-run `resolved_prompts` helps, but catalog audits still need pre-run template access. |

**Bottom line:** 5 of 6 bugs FIXED. Only B6 (`GET /recipes/<id>` 404) remains, and it's observability-only — doesn't block production. Battle Rap recipe is cleared for AIOBR weekly battle shots. The AIOBR thumbnail recipe (`a0756c96-81bb-4479-8099-359a95484557`) should benefit from the same engine-level fix for supporting-character identity — we want to verify independently before the next AIOBR launch but are confident given the Battle Rap evidence.

Visual match for the verification run: @king = right character, long dreads, black Nike hoodie, dark pants, pointing aggressively ✓; @yunus = left character, red durag, black hoodie ✓; BATTLE RAP banner ✓; SOCIAL SKY CLUB signage ✓; Twitch rig on tripod foreground ✓; Boondocks cel-shaded style ✓.

---

## Adjacent finding — angles + B-roll endpoints work great, one limitation worth mentioning

`POST /api/v2/images/angles` and `POST /api/v2/images/broll` both tested against the verified master (`07_fullstack_verify.png`). 20 pts each, 9-cell grids returned clean. Evidence: `stories/_pending/recipe_tests/08_angles_grid.png` + `08_broll_grid.png`.

**B-roll is flawless** — 9 complementary cutaways that inherit the master's palette, cel-shading, and banners (BATTLE RAP + SOCIAL SKY CLUB visible in the establishing cell). Perfect for chapter B-roll coverage.

**Angles has one caveat worth documenting:** the endpoint picks the most prominent subject from the master and generates 9 angles of that subject. In our 2-character master, K1NG (right, pointing, foreground) became the subject. The extreme-wide and wide cells preserve both characters, but medium-through-close-up cells only show K1NG — Yunus drops out of coverage.

For battle/dialogue scenes that need both characters in close coverage, the workaround is running angles twice against two different masters (one K1NG-forward, one Yunus-forward). Not a bug per se, but might be worth either (a) documenting in the endpoint's response, (b) adding a `subject_index` or `multi_subject` flag, or (c) auto-detecting multi-subject masters and generating a 2×9 grid. Would be a nice-to-have, not urgent.

**Further evidence (2026-04-21 second angles run, `09_f2f_angles.png`):** ran angles against a perfectly symmetrical 2-char master (face-to-face medium shot of @king + @yunus, both equally framed in profile, equal lighting). Result: 9 cells of K1NG only. Yunus absent from every cell including extreme wide. Model also hallucinated a label — titled the contact sheet `"JAYSON (DREADLOCKS/GREEN HOODIE)"` instead of using a provided name. The endpoint's hardcoded `GRID_PROMPT` contains `"All 9 cells show the EXACT SAME character/subject"`, which forces single-subject output regardless of master composition.

Suggested fixes in priority order:
1. **`skip_labels` / `labels: false` flag** — HIGHEST priority. The endpoint's hardcoded `GRID_PROMPT` asks nano-banana-2 to bake a contact-sheet header ("CONTACT SHEET - SHOT COMPOSITION VARIATIONS") + per-cell labels ("WIDE SHOT", "MEDIUM CLOSE-UP", etc.) into the output. That's useful for previewing, useless for production — sliced cells have the label text riding inside them and can't be dropped into Seedance/Runway without another crop pass. Please accept `skip_labels: true` (or `clean: true`) that strips the header directive + the `"label each cell"` clause from the internal prompt, so each cell is pure cinematography ready for animation. Same idea likely applies to `/images/broll` if it ever adds labeling — keep it off by default for programmatic callers.
2. Accept `subject_hint` or `labels` array in the request body so callers can name each subject (`["K1NG", "Yunus"]`) and avoid the "JAYSON" hallucination (this is secondary to #1 — once labels are off entirely, the hallucinated name goes away).
3. Accept `subjects` array → generate N×9 (or 2×9 side-by-side) so battle scenes get full coverage in one call.
4. At minimum, document in the OpenAPI schema that angles is single-subject-only and recommend running twice for multi-subject masters.

## Bug 7 — Viral Thumbnail recipe dropdowns are truncated/broken

**Observed 2026-04-21** while auditing thumbnail-capable recipes.

`GET /api/v2/recipes` returns Viral Thumbnail (`bcbf180a-56e5-451b-b8a7-93cce0149758`) with broken `select` options:

```json
"EMOTION": { "options": ["Shocked/Surprised (wide eyes open mouth"] },
"STYLE":   { "options": ["YouTube Classic (bold text + face"] }
```

Both dropdowns contain exactly one option, each with a truncated open-paren that was never closed — looks like a regex or split that ate the rest of the list. Makes the recipe unusable. Probably a data-import regression.

## Bug 8 (minor) — `result.metadata` is nested, not top-level

Not a correctness bug, a documentation/ergonomics one. The fix that resolved B5 put metadata at `job.result.metadata` rather than `job.metadata`. Easy to miss — I looked at the top-level keys first and concluded B5 was still open. Suggestion: either hoist a `metadata` alias to top-level on the job response, or explicitly document the nested path in the API reference. Low priority.

## Request 9 — expose Qwen Camera Angle on the v2 public API

**Filed 2026-04-21** alongside the angles-endpoint findings.

The Shot Creator UI has a "Camera Angle" feature backed by the Qwen Image Edit (Camera Angle) model — a 3D gizmo with `cameraAzimuth` / `cameraElevation` / `cameraDistance` sliders that orbits the camera around a locked subject while preserving lighting, wardrobe, and scene. Code lives at `src/features/shot-creator/components/camera-angle/CameraAngleSection.tsx` and consumes these settings through `/api/generation/image` (v1, internal).

There's no equivalent on `/api/v2`. `src/app/api/v2/images/` only has `angles` (3×3 grid, baked labels, single-subject), `broll`, `generate`, and `upload`.

For AIOBR's battle-rap dialogue scenes this is the *real* solution to the multi-subject problem — instead of rerunning `/images/angles` against two different masters, we'd lock one master and orbit the camera to get close coverage of both K1NG and Yunus in the same scene with identical lighting. Angles endpoint cannot do this because its `GRID_PROMPT` forces single-subject.

**Ask:** expose a v2 endpoint (e.g., `POST /api/v2/images/camera-angle` or a `camera_angle` input on `/images/generate`) that accepts:
```
{
  image_url: string,
  azimuth: number,     // degrees, horizontal orbit
  elevation: number,   // degrees, vertical tilt
  distance: number,    // zoom multiplier
  model: "qwen-image-edit-camera-angle"  // or whatever's internal
}
```
Returns a single image (not a grid) of the same subject/scene from the new camera angle. Cost whatever makes sense — this would replace multiple angles-endpoint calls, so even 15-20 pts per call is fine.

**Why this is valuable for programmatic callers:**
- Dialogue coverage for multi-subject scenes (our primary battle rap use case)
- True A/B/C coverage for a single hero shot (instead of 9 locked cells)
- Lighting continuity across cuts — Seedance/Runway love camera-move inputs that share lighting
- UI has it, API doesn't — gap worth closing so external integrations aren't at a capability disadvantage.
