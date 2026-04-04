'use client'

import { useState, useEffect } from 'react'
import { getClient } from '@/lib/db/client'
import { BugReportModal } from './BugReportModal'

export function BugReportFab() {
  const [open, setOpen] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const supabase = await getClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!cancelled) setAuthenticated(!!user)
      } catch {
        if (!cancelled) setAuthenticated(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  if (!authenticated) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Report a bug"
        title="Report a bug"
        className="fixed bottom-5 left-5 z-40 flex items-center justify-center w-11 h-11 rounded-[0.625rem] border transition-all duration-200 hover:scale-110 group"
        style={{
          background: 'oklch(0.2 0.04 200)',
          borderColor: 'oklch(0.35 0.06 200)',
          boxShadow: '0 2px 8px oklch(0 0 0 / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.05)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <svg
          width="20" height="20" viewBox="0 0 24 24" fill="none"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="transition-colors"
          style={{ stroke: 'oklch(0.7 0.18 200)' }}
        >
          <path d="m8 2 1.88 1.88" /><path d="M14.12 3.88 16 2" />
          <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
          <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
          <path d="M12 20v-9" /><path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
          <path d="M6 13H2" /><path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
          <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" /><path d="M22 13h-4" />
          <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
        </svg>
      </button>
      <BugReportModal open={open} onOpenChange={setOpen} />
    </>
  )
}
