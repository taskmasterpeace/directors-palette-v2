/**
 * Rhyme Detector
 * Groups end-of-line words by rhyme (suffix match on last 2-3 chars)
 * Returns a color map: word -> color class
 */

const RHYME_COLORS = [
  'text-amber-400',
  'text-cyan-400',
  'text-pink-400',
  'text-green-400',
  'text-violet-400',
  'text-orange-400',
  'text-blue-400',
  'text-rose-400',
]

function getEndWord(line: string): string | null {
  const trimmed = line.replace(/[.,!?;:'")\]]+$/, '').trim()
  const words = trimmed.split(/\s+/)
  const last = words[words.length - 1]
  return last && last.length > 1 ? last.toLowerCase() : null
}

function getSuffix(word: string, len: number): string {
  return word.slice(-len)
}

function wordsRhyme(a: string, b: string): boolean {
  if (a === b) return false
  // Match on last 3 chars, or last 2 if words are short
  if (a.length >= 4 && b.length >= 4 && getSuffix(a, 3) === getSuffix(b, 3)) return true
  if (getSuffix(a, 2) === getSuffix(b, 2)) return true
  return false
}

export interface RhymeMap {
  [lineIndex: number]: string // color class for end word
}

export function detectRhymes(lyrics: string): RhymeMap {
  const lines = lyrics.split('\n')
  const endWords: { word: string; lineIdx: number }[] = []

  lines.forEach((line, i) => {
    if (line.startsWith('[') || !line.trim()) return
    const w = getEndWord(line)
    if (w) endWords.push({ word: w, lineIdx: i })
  })

  // Group by rhyme
  const groups: number[][] = []
  const assigned = new Set<number>()

  for (let i = 0; i < endWords.length; i++) {
    if (assigned.has(i)) continue
    const group = [i]
    assigned.add(i)
    for (let j = i + 1; j < endWords.length; j++) {
      if (assigned.has(j)) continue
      if (wordsRhyme(endWords[i].word, endWords[j].word)) {
        group.push(j)
        assigned.add(j)
      }
    }
    if (group.length >= 2) groups.push(group)
  }

  // Build map: lineIndex -> color
  const result: RhymeMap = {}
  groups.forEach((group, gi) => {
    const color = RHYME_COLORS[gi % RHYME_COLORS.length]
    group.forEach((idx) => {
      result[endWords[idx].lineIdx] = color
    })
  })

  return result
}

/**
 * Given a line of lyrics and a color class, wraps the last word in a colored span.
 */
export function colorLastWord(line: string, colorClass: string): { before: string; word: string; colorClass: string } | null {
  const match = line.match(/^(.*?)(\S+)(\s*)$/)
  if (!match) return null
  return { before: match[1], word: match[2], colorClass }
}
