'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ListMusic,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Dna,
  Loader2,
  Check,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { CatalogEntryDialog } from '../CatalogEntryDialog'
import { useArtistDnaStore } from '../../../store/artist-dna.store'
import type { CatalogEntry, GenomeTrait } from '../../../types/artist-dna.types'

function AnalysisStatusIcon({ entry }: { entry: CatalogEntry }) {
  if (!entry.lyrics) return null

  switch (entry.analysisStatus) {
    case 'analyzing':
      return <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
    case 'done':
      return <Check className="w-3.5 h-3.5 text-emerald-400" />
    case 'error':
      return <AlertCircle className="w-3.5 h-3.5 text-destructive" />
    case 'pending':
      return <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
    default:
      return null
  }
}

function TraitBadges({ traits, variant }: { traits: GenomeTrait[]; variant: 'signature' | 'tendency' | 'experiment' }) {
  const colors = {
    signature: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    tendency: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    experiment: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  }
  const icons = { signature: '●', tendency: '○', experiment: '◦' }

  if (traits.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {traits.slice(0, 6).map((t, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${colors[variant]}`}
        >
          <span className="text-[9px]">{icons[variant]}</span>
          {t.trait}
        </span>
      ))}
      {traits.length > 6 && (
        <span className="text-[11px] text-muted-foreground px-1">+{traits.length - 6}</span>
      )}
    </div>
  )
}

function GenomePanel() {
  const { draft, recalculateGenome, analyzeCatalog } = useArtistDnaStore()
  const genome = draft.catalog.genome
  const genomeStatus = draft.catalog.genomeStatus
  const entries = draft.catalog.entries
  const analyzedCount = entries.filter((e) => e.analysis).length
  const hasUnanalyzed = entries.some((e) => e.lyrics && (!e.analysis || e.analysisStatus === 'error'))
  const [genomeOpen, setGenomeOpen] = useState(true)

  if (entries.length === 0) return null

  return (
    <Collapsible open={genomeOpen} onOpenChange={setGenomeOpen}>
      <div className="border rounded-lg mb-4 bg-gradient-to-br from-amber-500/5 to-purple-500/5">
        <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 hover:bg-muted/30 transition-colors rounded-t-lg">
          <div className="flex items-center gap-2">
            <Dna className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold">Catalog Genome</span>
            <span className="text-xs text-muted-foreground">
              ({analyzedCount} song{analyzedCount !== 1 ? 's' : ''})
            </span>
            {genomeStatus === 'calculating' && (
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            )}
          </div>
          {genomeOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            {genome ? (
              <>
                {/* Essence Statement */}
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap bg-black/20 rounded-md p-2">
                  {genome.essenceStatement}
                </div>

                {/* Trait Badges */}
                {genome.signatures.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                      Signatures (80%+)
                    </p>
                    <TraitBadges traits={genome.signatures} variant="signature" />
                  </div>
                )}
                {genome.tendencies.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                      Tendencies (40-79%)
                    </p>
                    <TraitBadges traits={genome.tendencies} variant="tendency" />
                  </div>
                )}
                {genome.experiments.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                      Experiments (&lt;40%)
                    </p>
                    <TraitBadges traits={genome.experiments} variant="experiment" />
                  </div>
                )}

                {/* Blueprint */}
                {genome.blueprint && (
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {genome.blueprint.mustInclude.length > 0 && (
                      <div>
                        <p className="font-medium text-emerald-400 mb-0.5">Must Include</p>
                        <ul className="text-muted-foreground space-y-0.5">
                          {genome.blueprint.mustInclude.map((item, i) => (
                            <li key={i}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {genome.blueprint.suggestExploring.length > 0 && (
                      <div>
                        <p className="font-medium text-purple-400 mb-0.5">Explore</p>
                        <ul className="text-muted-foreground space-y-0.5">
                          {genome.blueprint.suggestExploring.map((item, i) => (
                            <li key={i}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : genomeStatus === 'calculating' ? (
              <div className="flex items-center gap-2 py-4 justify-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculating genome...
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                {analyzedCount === 0
                  ? 'Add songs with lyrics to build a genome.'
                  : 'Genome will calculate after analysis completes.'}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {hasUnanalyzed && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => analyzeCatalog()}
                  className="text-xs h-7"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Analyze Catalog
                </Button>
              )}
              {analyzedCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => recalculateGenome()}
                  disabled={genomeStatus === 'calculating'}
                  className="text-xs h-7"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${genomeStatus === 'calculating' ? 'animate-spin' : ''}`} />
                  Recalculate
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function SongAnalysisSummary({ entry }: { entry: CatalogEntry }) {
  if (!entry.analysis) return null

  const a = entry.analysis
  return (
    <div className="mt-2 space-y-1.5 text-[11px] text-muted-foreground bg-muted/30 p-2 rounded">
      <div className="flex flex-wrap gap-1">
        {a.themes.map((theme, i) => (
          <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
            {theme}
          </Badge>
        ))}
      </div>
      <p><span className="text-foreground/70 font-medium">Storytelling:</span> {a.storytellingApproach} · <span className="text-foreground/70 font-medium">Vocabulary:</span> {a.vocabularyLevel}</p>
      <p><span className="text-foreground/70 font-medium">Rhyme:</span> {a.rhymeSchemes.join(', ')}</p>
      <p><span className="text-foreground/70 font-medium">Mood:</span> {a.moodProgression}</p>
      {a.notableDevices.length > 0 && (
        <p><span className="text-foreground/70 font-medium">Devices:</span> {a.notableDevices.slice(0, 3).join('; ')}</p>
      )}
    </div>
  )
}

export function CatalogTab() {
  const { draft, removeCatalogEntry, analyzeSong } = useArtistDnaStore()
  const [showDialog, setShowDialog] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const entries = draft.catalog.entries

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <ListMusic className="w-5 h-5" />
            Catalog
          </span>
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Song
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <GenomePanel />

        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No songs in catalog yet. Add songs to help generate unique lyrics.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{entry.title}</span>
                    {entry.mood && <Badge variant="secondary">{entry.mood}</Badge>}
                    {entry.tempo && <Badge variant="outline">{entry.tempo}</Badge>}
                    <AnalysisStatusIcon entry={entry} />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {entry.lyrics && !entry.analysis && entry.analysisStatus !== 'analyzing' && entry.analysisStatus !== 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => analyzeSong(entry.id)}
                        title="Analyze this song"
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    )}
                    {entry.analysisStatus === 'error' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => analyzeSong(entry.id)}
                        title="Retry analysis"
                      >
                        <RefreshCw className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                    {(entry.lyrics || entry.analysis) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      >
                        {expandedId === entry.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCatalogEntry(entry.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {expandedId === entry.id && (
                  <>
                    <SongAnalysisSummary entry={entry} />
                    {entry.lyrics && (
                      <pre className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 p-2 rounded">
                        {entry.lyrics}
                      </pre>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <CatalogEntryDialog open={showDialog} onOpenChange={setShowDialog} />
      </CardContent>
    </Card>
  )
}
