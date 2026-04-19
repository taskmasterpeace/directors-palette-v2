// Minimal logger with color + timestamps.
const gray = (s) => `\x1b[90m${s}\x1b[0m`
const cyan = (s) => `\x1b[36m${s}\x1b[0m`
const green = (s) => `\x1b[32m${s}\x1b[0m`
const yellow = (s) => `\x1b[33m${s}\x1b[0m`
const red = (s) => `\x1b[31m${s}\x1b[0m`
const bold = (s) => `\x1b[1m${s}\x1b[0m`

function stamp() {
  return gray(new Date().toISOString().slice(11, 19))
}

export const log = {
  info: (...a) => console.log(stamp(), ...a),
  step: (msg) => console.log(stamp(), cyan('▶'), bold(msg)),
  ok: (...a) => console.log(stamp(), green('✓'), ...a),
  warn: (...a) => console.log(stamp(), yellow('⚠'), ...a),
  err: (...a) => console.error(stamp(), red('✗'), ...a),
  dim: (...a) => console.log(stamp(), gray(a.join(' '))),
}

// Append a section to findings.md.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { SPIKE } from './paths.mjs'

export function recordFinding(sectionHeading, body) {
  // Replace the existing placeholder section in findings.md.
  try {
    const md = readFileSync(SPIKE.findings, 'utf8')
    const startRe = new RegExp(`^(## ${escapeRe(sectionHeading)}.*)$`, 'm')
    const startMatch = md.match(startRe)
    if (!startMatch) {
      appendFileSync(SPIKE.findings, `\n\n## ${sectionHeading}\n\n${body}\n`)
      return
    }
    const startIdx = md.indexOf(startMatch[1])
    const afterHeading = startIdx + startMatch[1].length
    // Next section starts at next "^## " or EOF.
    const rest = md.slice(afterHeading)
    const nextIdx = rest.search(/^## /m)
    const endIdx = nextIdx === -1 ? md.length : afterHeading + nextIdx
    const updated =
      md.slice(0, afterHeading) +
      `\n\n${body}\n\n` +
      md.slice(endIdx)
    writeFileSync(SPIKE.findings, updated)
  } catch (e) {
    appendFileSync(SPIKE.findings, `\n\n## ${sectionHeading}\n\n${body}\n`)
  }
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
