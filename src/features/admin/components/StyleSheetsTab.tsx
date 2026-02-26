"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Palette, Plus, Pencil, Trash2, RefreshCw, Image as ImageIcon } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { createBrowserClient } from '@supabase/ssr'
import { createLogger } from '@/lib/logger'


const log = createLogger('Admin')
interface StyleSheet {
  id: string
  name: string
  description: string | null
  style_prompt: string | null
  image_url: string | null
  is_system: boolean
  created_at: string
  updated_at: string
}

export function StyleSheetsTab() {
  const [styles, setStyles] = useState<StyleSheet[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStyle, setEditingStyle] = useState<StyleSheet | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [stylePrompt, setStylePrompt] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  const fetchStyles = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch('/api/admin/style-sheets', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })

      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setStyles(data.styles || [])
    } catch (error) {
      log.error('Error fetching styles', { error: error instanceof Error ? error.message : String(error) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStyles()
  }, [fetchStyles])

  const resetForm = () => {
    setName('')
    setDescription('')
    setStylePrompt('')
    setImageUrl('')
    setEditingStyle(null)
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(body)
      })

      if (!res.ok) throw new Error('Failed to save')

      setDialogOpen(false)
      resetForm()
      fetchStyles()
    } catch (error) {
      log.error('Error saving style', { error: error instanceof Error ? error.message : String(error) })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this style sheet?')) return

    setDeleting(id)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(`/api/admin/style-sheets?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })

      if (!res.ok) throw new Error('Failed to delete')
      fetchStyles()
    } catch (error) {
      log.error('Error deleting style', { error: error instanceof Error ? error.message : String(error) })
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                System Style Sheets
              </CardTitle>
              <CardDescription>
                Manage style sheets available to all users in the Storyboard
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
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
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner color="muted" />
            </div>
          ) : styles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No system style sheets yet. Click &quot;Add Style&quot; to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Preview</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Style Prompt</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {styles.map((style) => (
                  <TableRow key={style.id}>
                    <TableCell>
                      {style.image_url ? (
                        
                        <img
                          src={style.image_url}
                          alt={style.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{style.name}</div>
                        {style.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {style.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                        {style.style_prompt || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {new Date(style.created_at).toLocaleDateString()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(style)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(style.id)}
                          disabled={deleting === style.id}
                          className="text-destructive hover:text-destructive"
                        >
                          {deleting === style.id ? (
                            <LoadingSpinner size="sm" color="current" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingStyle ? 'Edit Style Sheet' : 'Add Style Sheet'}
            </DialogTitle>
            <DialogDescription>
              {editingStyle
                ? 'Update the style sheet details below.'
                : 'Create a new system style sheet available to all users.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Claymation, Film Noir"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the style"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stylePrompt">Style Prompt</Label>
              <Textarea
                id="stylePrompt"
                value={stylePrompt}
                onChange={(e) => setStylePrompt(e.target.value)}
                placeholder="e.g., in the Claymation style of the reference image"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This text will be appended to image generation prompts
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Preview Image URL</Label>
              <Input
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
              {imageUrl && (
                
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || saving}>
              {saving ? (
                <>
                  <LoadingSpinner size="sm" color="current" className="mr-2" />
                  Saving...
                </>
              ) : editingStyle ? (
                'Update'
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
