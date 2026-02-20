'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useArtistDnaStore } from '../../store/artist-dna.store'

const MOOD_OPTIONS = ['Hype', 'Melancholy', 'Aggressive', 'Chill', 'Romantic', 'Introspective', 'Party', 'Motivational']
const TEMPO_OPTIONS = ['Slow', 'Mid', 'Upbeat', 'Fast']

interface CatalogEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CatalogEntryDialog({ open, onOpenChange }: CatalogEntryDialogProps) {
  const { addCatalogEntry } = useArtistDnaStore()
  const [title, setTitle] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [mood, setMood] = useState('')
  const [tempo, setTempo] = useState('')

  const handleSave = () => {
    if (!title.trim()) return
    addCatalogEntry({ title: title.trim(), lyrics, mood, tempo })
    setTitle('')
    setLyrics('')
    setMood('')
    setTempo('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Song to Catalog</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="song-title">Title</Label>
            <Input
              id="song-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Song title..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="song-lyrics">Lyrics</Label>
            <Textarea
              id="song-lyrics"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Paste lyrics..."
              className="min-h-[120px] font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mood</Label>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mood..." />
                </SelectTrigger>
                <SelectContent>
                  {MOOD_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tempo</Label>
              <Select value={tempo} onValueChange={setTempo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tempo..." />
                </SelectTrigger>
                <SelectContent>
                  {TEMPO_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim()}>Add Song</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
