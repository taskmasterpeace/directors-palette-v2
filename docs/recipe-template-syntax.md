# Recipe Template Syntax

This document describes the token syntax used when authoring recipe stage templates
(the `template` string inside a `RecipeStage`). Recipe authors write templates with
`<<FIELD>>` tokens that the app parses into form fields and substitutes at runtime.

---

## Basic Syntax

```
<<FIELD_NAME:type[!][:annotation1][:annotation2]>>
```

- `FIELD_NAME` — uppercase identifier, e.g. `WHO`, `ARTIST_NAME`, `CONTEXT`. Must
  match `[A-Z_0-9]+`. The same field name reused across stages shares a single
  value in the form.
- `type` — one of the base types listed below.
- `!` — optional required marker. Append `!` directly after the type (before any
  annotations) to mark the field as required.
- `:annotation` — optional layout annotations (zero or more). See "Layout
  Annotations" below.

---

## Base Types

| Type | Syntax | Rendered As |
|------|--------|-------------|
| `text` | `<<FOO:text>>` | Single-line text input (multi-line for longer content). |
| `name` | `<<FOO:name>>` | Text input with `@` autocomplete pulling from the user's character-sheet reference library. |
| `select` | `<<FOO:select(Opt1,Opt2,Opt3)>>` | Dropdown with the listed options (comma-separated, trimmed). |
| `wildcard` | `<<FOO:wildcard(wildcard_name, browse)>>` or `<<FOO:wildcard(wildcard_name, random)>>` | Wildcard picker. `browse` mode lets the user pick an entry; `random` auto-picks one at generate time. |

Add `!` after the type (before colons) to mark required:

```
<<ARTIST_NAME:text!>>
<<VIBE:select(Dramatic,Cinematic,Gritty)!>>
<<WHO:name!>>
```

---

## Layout Annotations

Layout annotations are opt-in **per-field** hints that control how the recipe form
is rendered. They do **not** appear in the final prompt sent to the image model —
the parser strips them before substitution.

### `:rowN` — 2-column row pairing

Fields that share the same row number render side-by-side in a 2-column grid. Use
this to pair related short fields (e.g. a name + its label).

```
@<<WHO:name!:row1>>
"<<ARTIST_NAME:text!:row1>>"
```

Both fields will render in the same horizontal row. You can use any integer:
`row1`, `row2`, `row10`, etc. Fields without `:rowN` render full-width as before.

### `:collapsed` — hide inside "Optional details" section

Fields marked `:collapsed` render inside a collapsible "Optional details" panel
below the required fields. This keeps the primary form short while still exposing
the full set of optional refinements.

```
<<TAGLINE:text:collapsed>>
<<BACKGROUND:text:collapsed>>
<<ADDITIONAL_ASSETS:text:collapsed>>
```

Only `required: false` fields honor `:collapsed`. The collapsible header shows a
count (e.g. "Optional details (4)") and toggles open/closed.

### Combining annotations

Annotations stack — order doesn't matter:

```
<<SUPPORTING_1:name:collapsed:row10>>
<<SUPPORTING_1_LABEL:text:collapsed:row10>>
```

Both fields go into the collapsed section AND pair up in the same row inside it.

---

## Full Example

```
Design a thumbnail for this artist.

CONTEXT:
<<CONTEXT:text!>>

MAIN SUBJECT:
@<<WHO:name!:row1>>

ARTIST NAME:
"<<ARTIST_NAME:text!:row1>>"

VIBE:
<<VIBE:select(Dramatic,Cinematic,Gritty)!>>

OPTIONAL TAGLINE:
<<TAGLINE:text:collapsed>>

OPTIONAL BACKGROUND:
<<BACKGROUND:text:collapsed>>

SUPPORTING (optional):
- @<<SUPPORTING_1:name:collapsed:row10>> — "<<SUPPORTING_1_LABEL:text:collapsed:row10>>"
- @<<SUPPORTING_2:name:collapsed:row11>> — "<<SUPPORTING_2_LABEL:text:collapsed:row11>>"
```

Rendered form structure:

1. **Required section:**
   - `Context` (full width)
   - `Who` | `Artist Name` (side-by-side, row 1)
   - `Vibe` (full width)
2. **Optional details** (collapsible panel, 5 fields):
   - `Tagline` (full width)
   - `Background` (full width)
   - `Supporting 1` | `Supporting 1 Label` (side-by-side, row 10)
   - `Supporting 2` | `Supporting 2 Label` (side-by-side, row 11)

---

## Notes for Recipe Authors

- **Backward compatible:** templates without annotations behave exactly as before.
  A stage that uses zero `:rowN` or `:collapsed` annotations renders full-width
  fields, with the legacy 2+ select-fields auto-pair fallback for optionals.
- **Annotations never leak to the model:** `buildStagePrompt` strips `:rowN` and
  `:collapsed` before running substitution. The image model only sees the value
  the user typed (or nothing, if the optional field is empty).
- **Required + collapsed is ignored:** only optional fields are eligible for the
  collapsible section. A required field with `:collapsed` is still shown in the
  main (required) section.
- **Same field name across stages shares a value.** Layout annotations on any
  instance of a shared field apply to its single form input.
- **Mobile layout is not optimized.** The 2-column grid stays 2-column on mobile
  by design — recipes using layout annotations are intended for desktop-first
  forms.

---

## Related Files

- Parser: `src/features/shot-creator/types/recipe-utils.ts`
- Field type: `src/features/shot-creator/types/recipe-field.types.ts`
- Form renderer: `src/features/shot-creator/components/recipe/RecipeFormInline.tsx`
- Example recipe using annotations: AIOBR in `src/features/shot-creator/constants/recipe-samples.ts`
