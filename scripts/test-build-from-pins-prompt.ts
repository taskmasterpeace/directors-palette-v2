/**
 * Unit-ish test for the build-from-pins prompt builder.
 * Runs directly against the compiled-on-the-fly TS source via tsx.
 *
 * Covers the behind-the-scenes prompting for:
 *   1. Base-only (legacy path)
 *   2. Full hierarchy (base + sub + micro)
 *   3. Standalone sub (no base selected in UI → ancestry hydrated from taxonomy)
 *   4. Standalone micro (no base/sub selected → ancestry hydrated, PRIMARY LOCK emitted)
 *   5. Custom free-form genre (not in taxonomy)
 *   6. No genre at all (other pins still work)
 */

import { buildUserPrompt } from '../src/features/music-lab/services/build-from-pins.prompt'
import { searchGenres, findGenreEntry } from '../src/features/music-lab/data/genre-taxonomy.data'

let failed = 0
let passed = 0

function assert(label: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++
    console.log(`  ok  ${label}`)
  } else {
    failed++
    console.log(`  FAIL ${label}${detail ? '\n       ' + detail : ''}`)
  }
}

function section(name: string, fn: () => void) {
  console.log(`\n▸ ${name}`)
  fn()
}

section('1. base only', () => {
  const out = buildUserPrompt({
    pins: { genre: { base: 'Hip-Hop/Rap', lockedLevel: 'base' } },
  })
  assert('emits Hip-Hop/Rap', out.includes('Hip-Hop/Rap'))
  assert('labels as primary: base', out.includes('primary: Hip-Hop/Rap'))
})

section('2. full hierarchy', () => {
  const out = buildUserPrompt({
    pins: { genre: { base: 'Hip-Hop/Rap', sub: 'Trap', micro: 'Phonk', lockedLevel: 'micro' } },
  })
  assert('shows full chain', out.includes('Hip-Hop/Rap → Trap → Phonk'))
  assert('emits PRIMARY LOCK for micro', out.includes('PRIMARY LOCK: Phonk'))
  assert('mentions microgenre lock phrasing', out.includes('microgenre'))
})

section('3. standalone sub (UI never picked base)', () => {
  const out = buildUserPrompt({
    pins: { genre: { sub: 'Trap', lockedLevel: 'sub' } },
  })
  assert('hydrates base from taxonomy', out.includes('Hip-Hop/Rap → Trap'))
  assert('emits PRIMARY LOCK: Trap', out.includes('PRIMARY LOCK: Trap'))
  assert('mentions subgenre lock phrasing', out.includes('subgenre the artist MUST belong to'))
})

section('4. standalone micro (only "Drill (UK)" chosen)', () => {
  const out = buildUserPrompt({
    pins: { genre: { micro: 'Drill (UK)', lockedLevel: 'micro' } },
  })
  assert('hydrates full ancestry', out.includes('Hip-Hop/Rap → Trap → Drill (UK)'))
  assert('PRIMARY LOCK is the micro name', out.includes('PRIMARY LOCK: Drill (UK)'))
  assert('does NOT generalize to parent', !/primary: Hip-Hop/.test(out))
})

section('5. custom free-form genre', () => {
  const out = buildUserPrompt({
    pins: { genre: { base: 'Glitchcore Sea Shanty', custom: true, lockedLevel: 'base' } },
  })
  assert('marks as CUSTOM', out.includes('CUSTOM'))
  assert('keeps user text verbatim', out.includes('Glitchcore Sea Shanty'))
  assert('does not try to hydrate non-existent ancestry', !out.includes('→'))
})

section('6. no genre, other pins only', () => {
  const out = buildUserPrompt({
    pins: { vibe: 'menacing', region: { city: 'Houston', state: 'TX' } },
  })
  assert('no genre line', !/- genre:/.test(out))
  assert('includes region', out.includes('Houston'))
  assert('includes vibe', out.includes('menacing'))
})

section('7. standalone micro PLUS description', () => {
  const out = buildUserPrompt({
    description: 'knee-length dreads, raspy melodic delivery',
    pins: { genre: { micro: 'Drill (Brooklyn)', lockedLevel: 'micro' } },
  })
  assert('includes description section', out.includes('User description'))
  assert('hydrates Drill (Brooklyn) ancestry', out.includes('Hip-Hop/Rap → Trap → Drill (Brooklyn)'))
  assert('PRIMARY LOCK: Drill (Brooklyn)', out.includes('PRIMARY LOCK: Drill (Brooklyn)'))
})

section('8. standalone sub (actual sub, not a mislabeled micro)', () => {
  // "Gangsta Rap" is a true sub of Hip-Hop/Rap
  const out = buildUserPrompt({
    pins: { genre: { sub: 'Gangsta Rap', lockedLevel: 'sub' } },
  })
  assert('hydrates base', out.includes('Hip-Hop/Rap → Gangsta Rap'))
  assert('PRIMARY LOCK: Gangsta Rap', out.includes('PRIMARY LOCK: Gangsta Rap'))
})

section('9. search across punctuation and tokens', () => {
  // "drill uk" must find "Drill (UK)" (parens stripped)
  const r1 = searchGenres('drill uk', 5)
  assert('finds Drill (UK)', r1.some((x) => x.name === 'Drill (UK)'))

  // "phonk" must find it
  const r2 = searchGenres('phonk', 5)
  assert('finds Phonk', r2.some((x) => x.name === 'Phonk'))

  // "hip hop" must find Hip-Hop/Rap (dash and slash stripped)
  const r3 = searchGenres('hip hop', 5)
  assert('finds Hip-Hop/Rap', r3.some((x) => x.name === 'Hip-Hop/Rap'))

  // Out-of-order tokens: "uk drill" should still find Drill (UK)
  const r4 = searchGenres('uk drill', 5)
  assert('finds Drill (UK) with reversed tokens', r4.some((x) => x.name === 'Drill (UK)'))

  // Nonsense returns empty
  const r5 = searchGenres('xyzabc nothingreal', 5)
  assert('empty for nonsense', r5.length === 0)
})

section('10. findGenreEntry resolves all levels', () => {
  const phonk = findGenreEntry('Phonk')
  assert('Phonk is micro under Trap', phonk?.level === 'micro' && phonk?.sub === 'Trap')

  const trap = findGenreEntry('Trap')
  assert('Trap is sub under Hip-Hop/Rap', trap?.level === 'sub' && trap?.base === 'Hip-Hop/Rap')

  const hh = findGenreEntry('Hip-Hop/Rap')
  assert('Hip-Hop/Rap is base', hh?.level === 'base')
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
