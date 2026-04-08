'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

export function RenameSuggestionPill() {
  const { draft, seededFrom, suggestRename, setDraftName } = useArtistDnaStore()
  const [alternatives, setAlternatives] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const currentName = draft.identity.stageName
  const isRealName = !!seededFrom && currentName === seededFrom

  useEffect(() => {
    if (!isRealName || dismissed) return
    let cancelled = false
    setLoading(true)
    suggestRename(seededFrom!, draft.sound.genres, draft.identity.city).then((alts) => {
      if (!cancelled) {
        setAlternatives(alts)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [isRealName, seededFrom, dismissed, suggestRename, draft.sound.genres, draft.identity.city])

  if (!isRealName || dismissed) return null

  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 text-sm">
          <p className="font-medium text-amber-400">Rename suggested</p>
          <p className="text-muted-foreground mt-0.5">
            Saving the real name may impersonate a real artist. Pick a fictional alternative:
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Keep real name
        </button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Thinking of alternatives...
        </div>
      ) : alternatives.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {alternatives.map((name) => (
            <button
              key={name}
              onClick={() => {
                setDraftName(name)
                setDismissed(true)
              }}
              className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-sm text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              Use &quot;{name}&quot;
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
