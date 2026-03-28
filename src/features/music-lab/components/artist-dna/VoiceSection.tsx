'use client'

import { useState } from 'react'
import { Star, Trash2, Pencil, Plus, Wand2, X } from 'lucide-react'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import { generateVoiceDescription } from '../../utils/voice-description-generator'

interface VoiceFormState {
  name: string
  description: string
}

const emptyForm: VoiceFormState = { name: '', description: '' }

export function VoiceSection() {
  const { draft, addVoice, updateVoice, removeVoice, setDefaultVoice } =
    useArtistDnaStore()

  const voices = draft.voices || []

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<VoiceFormState>(emptyForm)

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (id: string) => {
    const voice = voices.find((v) => v.id === id)
    if (!voice) return
    setEditingId(id)
    setForm({ name: voice.name, description: voice.description })
    setShowForm(true)
  }

  const handleSave = () => {
    const trimmedName = form.name.trim()
    const trimmedDesc = form.description.trim()
    if (!trimmedName) return

    if (editingId) {
      updateVoice(editingId, { name: trimmedName, description: trimmedDesc })
    } else {
      addVoice({ name: trimmedName, description: trimmedDesc, isDefault: false })
    }

    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  const handleCancel = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  const handleGenerateFromDna = () => {
    const desc = generateVoiceDescription(draft)
    setForm((prev) => ({ ...prev, description: desc }))
  }

  return (
    <div className="space-y-3 rounded-lg border border-cyan-500/20 bg-cyan-950/10 p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-cyan-300 tracking-tight">
          Voices
        </h4>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Voice
        </button>
      </div>

      {/* Voice cards */}
      {voices.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground/60 italic">
          No voices yet. Add one to define how this artist sounds.
        </p>
      )}

      <div className="space-y-2">
        {voices.map((voice) => (
          <div
            key={voice.id}
            className="flex items-start gap-2 rounded-md border border-border/40 bg-muted/10 px-3 py-2"
          >
            {/* Star for default */}
            <button
              type="button"
              onClick={() => setDefaultVoice(voice.id)}
              title={voice.isDefault ? 'Default voice' : 'Set as default'}
              className="mt-0.5 shrink-0 transition-colors"
            >
              <Star
                className={`w-4 h-4 ${
                  voice.isDefault
                    ? 'fill-cyan-400 text-cyan-400'
                    : 'text-muted-foreground/40 hover:text-cyan-400/60'
                }`}
              />
            </button>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-tight truncate">
                {voice.name}
              </p>
              {voice.description && (
                <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">
                  {voice.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => openEdit(voice.id)}
                className="p-1 rounded hover:bg-muted/30 text-muted-foreground/50 hover:text-foreground transition-colors"
                title="Edit voice"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => removeVoice(voice.id)}
                className="p-1 rounded hover:bg-red-500/20 text-muted-foreground/50 hover:text-red-400 transition-colors"
                title="Delete voice"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Inline add/edit form */}
      {showForm && (
        <div className="space-y-2 rounded-md border border-cyan-500/30 bg-cyan-950/20 p-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Voice Name
            </label>
            <input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder='e.g. "Dark Raspy Trap", "Singing Drake"'
              className="w-full px-3 py-1.5 text-sm bg-muted/20 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Description
              </label>
              <button
                type="button"
                onClick={handleGenerateFromDna}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                title="Auto-generate from DNA"
              >
                <Wand2 className="w-3 h-3" />
                Generate from DNA
              </button>
            </div>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder='e.g. "deep male voice, aggressive, Southern drawl"'
              rows={2}
              className="w-full px-3 py-1.5 text-sm bg-muted/20 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={!form.name.trim()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-cyan-500 text-background hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {editingId ? 'Update' : 'Add'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
