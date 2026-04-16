"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Palette, Plus, Pencil, Trash2, RefreshCw, Image as ImageIcon, Upload, Copy, TrendingUp, AlignLeft, Clock } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { createBrowserClient } from '@supabase/ssr'
import { createLogger } from '@/lib/logger'
import { toast } from '@/hooks/use-toast'
import { safeJsonParse } from '@/features/shared/utils/safe-fetch'

const log = createLogger('Admin')

interface StyleSheet {
  id: string
  name: string
  description: string | null
  style_prompt: string | null
  image_url: string | null
  usage_count: number
  is_system: boolean
  created_at: string
  updated_at: string
}

type SortMode = 'name' | 'usage' | 'recent'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function StyleSheetsTab() {
  const [styles, setStyles] = useState<StyleSheet[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortMode>('usage')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStyle, setEditingStyle] = useState<StyleSheet | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [stylePrompt, setStylePrompt] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchStyles = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch('/api/admin/style-sheets', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setStyles(data.styles || [])
    } catch (error) {
      log.error('Error fetching styles', { error: error instanceof Error ? error.message : String(error) })
      toast({ title: 'Failed to load styles', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStyles() }, [fetchStyles])

  const sortedStyles = useMemo(() => {
    return [...styles].sort((a, b) => {
      if (sort === 'usage') return b.usage_count - a.usage_count || a.name.localeCompare(b.name)
      if (sort === 'recent') return b.created_at.localeCompare(a.created_at)
      return a.name.localeCompare(b.name)
    })
  }, [styles, sort])

  const totalUsage = useMemo(() => styles.reduce((sum, s) => sum + s.usage_count, 0), [styles])

  const resetForm = () => {
    setName('')
    setDescription('')
    setStylePrompt('')
    setImageUrl('')
    setEditingStyle(null)
    setUploading(false)
    setDragging(false)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (style: StyleSheet) => {
    setEditingStyle(style)
    setName(style.name)
    setDescription(style.description || '')
    setStylePrompt(style.style_prompt || '')
    setImageUrl(style.image_url || '')
    setDialogOpen(true)
  }

  const uploadFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Use JPEG, PNG, or WebP', variant: 'destructive' })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: `Max 5MB. Yours is ${(file.size / 1024 / 1024).toFixed(1)}MB`, variant: 'destructive' })
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload-file', { method: 'POST', body: formData })
      const data = await safeJsonParse<{ url: string; error?: string; details?: string }>(res)
      if (!res.ok) throw new Error(data.details || data.error || 'Upload failed')
      setImageUrl(data.url)
      toast({ title: 'Image uploaded' })
    } catch (err) {
      log.error('Upload failed', { error: err instanceof Error ? err.message : String(err) })
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { session } } = await supabase.auth.getSession()

      const method = editingStyle ? 'PUT' : 'POST'
      const body = editingStyle
        ? { id: editingStyle.id, name, description, style_prompt: stylePrompt, image_url: imageUrl }
        : { name, description, style_prompt: stylePrompt, image_url: imageUrl }

      const res = await fetch('/api/admin/style-sheets', {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error('Failed to save')
      toast({ title: editingStyle ? 'Style updated' : 'Style created' })
      setDialogOpen(false)
      resetForm()
      fetchStyles()
    } catch (error) {
      log.error('Error saving style', { error: error instanceof Error ? error.message : String(error) })
      toast({ title: 'Save failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (style: StyleSheet) => {
    if (!confirm(`Delete "${style.name}"? This affects all users.`)) return
    setDeleting(style.id)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/admin/style-sheets?id=${style.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast({ title: `Deleted "${style.name}"` })
      fetchStyles()
    } catch (error) {
      log.error('Error deleting style', { error: error instanceof Error ? error.message : String(error) })
      toast({ title: 'Delete failed', variant: 'destructive' })
    } finally {
      setDeleting(null)
    }
  }

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
    toast({ title: 'ID copied', description: id })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                System Style Sheets
              </CardTitle>
              <CardDescription>
                {styles.length} {styles.length === 1 ? 'style' : 'styles'} · {totalUsage.toLocaleString()} total uses · available to all users and the API
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center rounded-md border bg-background p-0.5">
                <Button
                  variant={sort === 'usage' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => setSort('usage')}
                >
                  <TrendingUp className="w-3 h-3" />
                  Most Used
                </Button>
                <Button
                  variant={sort === 'name' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => setSort('name')}
                >
                  <AlignLeft className="w-3 h-3" />
                  A–Z
                </Button>
                <Button
                  variant={sort === 'recent' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => setSort('recent')}
                >
                  <Clock className="w-3 h-3" />
                  Recent
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={fetchStyles} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Style
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner color="muted" />
            </div>
          ) : styles.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Palette className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No system styles yet. Click &quot;Add Style&quot; to create one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sortedStyles.map((style) => (
                <div
                  key={style.id}
                  className="group relative rounded-lg border bg-card overflow-hidden hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <div className="relative aspect-video bg-muted overflow-hidden">
                    {style.image_url ? (
                      <img
                        src={style.image_url}
                        alt={style.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
                      </div>
                    )}

                    <div className="absolute top-2 left-2">
                      <Badge variant={style.usage_count > 0 ? 'default' : 'secondary'} className="text-xs font-medium">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {style.usage_count.toLocaleString()} {style.usage_count === 1 ? 'use' : 'uses'}
                      </Badge>
                    </div>

                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 shadow-md"
                        onClick={() => openEditDialog(style)}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 shadow-md"
                        onClick={() => copyId(style.id)}
                        title="Copy ID"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8 shadow-md"
                        onClick={() => handleDelete(style)}
                        disabled={deleting === style.id}
                        title="Delete"
                      >
                        {deleting === style.id ? (
                          <LoadingSpinner size="sm" color="current" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div>
                      <div className="font-semibold text-base">{style.name}</div>
                      {style.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {style.description}
                        </div>
                      )}
                    </div>
                    {style.style_prompt && (
                      <div className="pt-2 border-t">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Prompt</div>
                        <p className="text-xs text-foreground/80 line-clamp-4 leading-relaxed">
                          {style.style_prompt}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingStyle ? 'Edit Style' : 'Add Style'}</DialogTitle>
            <DialogDescription>
              {editingStyle
                ? `Changes affect all users and API consumers immediately.`
                : 'Create a style available to all users and the public API.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Thumbnail Image</Label>
              <div
                className={`
                  relative border-2 border-dashed rounded-lg transition-colors cursor-pointer overflow-hidden
                  ${dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                `}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  const file = e.dataTransfer.files[0]
                  if (file) uploadFile(file)
                }}
                onDragOver={(e) => { e.preventDefault(); if (!dragging) setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onClick={() => fileInputRef.current?.click()}
              >
                {imageUrl ? (
                  <div className="relative aspect-video">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {uploading ? 'Uploading…' : 'Click or drop to change'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video flex flex-col items-center justify-center text-muted-foreground p-6">
                    {uploading ? (
                      <>
                        <LoadingSpinner color="muted" />
                        <p className="text-sm mt-2">Uploading…</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mb-2" />
                        <p className="text-sm font-medium">Drop image or click to upload</p>
                        <p className="text-xs mt-1">PNG, JPG, WebP (max 5MB)</p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) uploadFile(f)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="…or paste an image URL"
                  className="text-xs"
                />
                {imageUrl && (
                  <Button variant="ghost" size="sm" onClick={() => setImageUrl('')}>Clear</Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Claymation, Film Noir, 32 Bit"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short tagline users will see"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stylePrompt">Style Prompt</Label>
              <Textarea
                id="stylePrompt"
                value={stylePrompt}
                onChange={(e) => setStylePrompt(e.target.value)}
                placeholder="e.g., in the Claymation style of the reference image…"
                rows={5}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                This text is appended to user prompts whenever this style is selected. The thumbnail is also passed as a reference image.
              </p>
            </div>

            {editingStyle && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-muted/30">
                <div className="text-xs text-muted-foreground">
                  Used <strong className="text-foreground">{editingStyle.usage_count.toLocaleString()}</strong> times
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyId(editingStyle.id)} className="h-7 text-xs">
                  <Copy className="w-3 h-3 mr-1" />
                  Copy ID
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim() || saving || uploading}>
              {saving ? (
                <>
                  <LoadingSpinner size="sm" color="current" className="mr-2" />
                  Saving…
                </>
              ) : editingStyle ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
