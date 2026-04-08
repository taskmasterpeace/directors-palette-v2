'use client'

import { Label } from '@/components/ui/label'
import { getGenres, getSubgenres, getMicrogenres } from '../../../data/genre-taxonomy.data'

export interface GenrePickerValue {
  base?: string
  sub?: string
  micro?: string
}

interface Props {
  value: GenrePickerValue
  onChange: (v: GenrePickerValue) => void
  requireBase?: boolean
}

export function GenrePickerStandalone({ value, onChange, requireBase }: Props) {
  const allGenres = getGenres()
  const subgenres = value.base ? getSubgenres([value.base]) : []
  const microgenres = value.sub ? getMicrogenres([value.sub]) : []

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          Genre{requireBase && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <div className="flex flex-wrap gap-2">
          {allGenres.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onChange({ base: value.base === g ? undefined : g, sub: undefined, micro: undefined })}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                value.base === g
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:border-primary/50'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {value.base && subgenres.length > 0 && (
        <div className="space-y-2">
          <Label className="text-muted-foreground">Subgenre (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {subgenres.map((sg) => (
              <button
                key={sg}
                type="button"
                onClick={() => onChange({ ...value, sub: value.sub === sg ? undefined : sg, micro: undefined })}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  value.sub === sg
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:border-primary/50'
                }`}
              >
                {sg}
              </button>
            ))}
          </div>
        </div>
      )}

      {value.sub && microgenres.length > 0 && (
        <div className="space-y-2">
          <Label className="text-muted-foreground">Microgenre (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {microgenres.map((mg) => (
              <button
                key={mg}
                type="button"
                onClick={() => onChange({ ...value, micro: value.micro === mg ? undefined : mg })}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  value.micro === mg
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:border-primary/50'
                }`}
              >
                {mg}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
