/**
 * Lightweight action logger — module-level singleton.
 * Tracks the last 5 user actions for bug report context.
 * No persistence, no localStorage — purely in-memory.
 */

const MAX_ACTIONS = 5
const actions: string[] = []

export function logAction(description: string) {
  actions.push(description)
  if (actions.length > MAX_ACTIONS) {
    actions.shift()
  }
}

export function getRecentActions(): string[] {
  return [...actions]
}

export function clearActions() {
  actions.length = 0
}
