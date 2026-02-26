"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Check,
  X,
  Star,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Pencil,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CommunityItem, CommunityItemType } from '@/features/community/types/community.types'
import { createLogger } from '@/lib/logger'


const log = createLogger('Admin')
const TYPE_LABELS: Record<CommunityItemType, string> = {
  wildcard: 'Wildcard',
  recipe: 'Recipe',
  prompt: 'Prompt',
  director: 'Director',
}

const TYPE_COLORS: Record<CommunityItemType, string> = {
  wildcard: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  recipe: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  prompt: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  director: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

const STATUS_ICONS = {
  pending: <Clock className="w-4 h-4 text-yellow-500" />,
  approved: <CheckCircle className="w-4 h-4 text-green-500" />,
  rejected: <XCircle className="w-4 h-4 text-red-500" />,
}

export function CommunityModerationTab() {
  const [items, setItems] = useState<CommunityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Rejection dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectingItem, setRejectingItem] = useState<CommunityItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Preview dialog
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewItem, setPreviewItem] = useState<CommunityItem | null>(null)

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CommunityItem | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    category: '',
    tags: [] as string[],
    content: {} as unknown,
  })

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/community?status=${statusFilter}`)
      if (!res.ok) throw new Error('Failed to fetch items')
      const data = await res.json()
      setItems(data.items || [])
    } catch (error) {
      log.error('Error fetching community items', { error: error instanceof Error ? error.message : String(error) })
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleAction = async (action: string, itemId: string, reason?: string, updates?: Record<string, unknown>) => {
    setActionLoading(itemId)
    try {
      const res = await fetch('/api/admin/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, itemId, reason, updates }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Action failed')
      }

      await fetchItems()
    } catch (error) {
      log.error('Error performing action', { error: error instanceof Error ? error.message : String(error) })
      alert(error instanceof Error ? error.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const openRejectDialog = (item: CommunityItem) => {
    setRejectingItem(item)
    setRejectReason('')
    setRejectDialogOpen(true)
  }

  const confirmReject = async () => {
    if (!rejectingItem || !rejectReason.trim()) return
    await handleAction('reject', rejectingItem.id, rejectReason)
    setRejectDialogOpen(false)
    setRejectingItem(null)
  }

  const openPreview = (item: CommunityItem) => {
    setPreviewItem(item)
    setPreviewDialogOpen(true)
  }

  const openEditDialog = (item: CommunityItem) => {
    setEditingItem(item)
    setEditFormData({
      name: item.name,
      description: item.description || '',
      category: item.category,
      tags: item.tags || [],
      content: item.content,
    })
    setEditDialogOpen(true)
  }

  const saveEdit = async () => {
    if (!editingItem) return
    await handleAction('edit', editingItem.id, undefined, editFormData)
    setEditDialogOpen(false)
    setEditingItem(null)
  }

  // Stats
  const pendingCount = items.filter(i => statusFilter === 'all' ? i.status === 'pending' : true).length
  const featuredCount = items.filter(i => i.isFeatured).length

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Featured Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500 flex items-center gap-1">
              <Star className="w-5 h-5" />
              {featuredCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
        <TabsList className="bg-zinc-800">
          <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
            <Clock className="w-4 h-4 mr-2" />
            Pending
          </TabsTrigger>
          <TabsTrigger value="approved" className="data-[state=active]:bg-green-500 data-[state=active]:text-black">
            <CheckCircle className="w-4 h-4 mr-2" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" className="data-[state=active]:bg-red-500 data-[state=active]:text-black">
            <XCircle className="w-4 h-4 mr-2" />
            Rejected
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-zinc-500 data-[state=active]:text-white">
            All
          </TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Community Submissions</CardTitle>
              <CardDescription>
                {statusFilter === 'pending' && 'Review and approve or reject submissions'}
                {statusFilter === 'approved' && 'Manage approved items and featured status'}
                {statusFilter === 'rejected' && 'View rejected submissions'}
                {statusFilter === 'all' && 'All community submissions'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  No {statusFilter !== 'all' ? statusFilter : ''} items found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">Type</TableHead>
                      <TableHead className="text-zinc-400">Name</TableHead>
                      <TableHead className="text-zinc-400">Category</TableHead>
                      <TableHead className="text-zinc-400">Submitted By</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-zinc-400">Featured</TableHead>
                      <TableHead className="text-zinc-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="border-zinc-800">
                        <TableCell>
                          <Badge className={TYPE_COLORS[item.type]}>
                            {TYPE_LABELS[item.type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-white">
                          <button
                            onClick={() => openPreview(item)}
                            className="hover:text-amber-400 transition-colors text-left"
                          >
                            {item.name}
                          </button>
                        </TableCell>
                        <TableCell className="text-zinc-400">{item.category}</TableCell>
                        <TableCell className="text-zinc-400 text-sm">
                          {item.submittedByName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {STATUS_ICONS[item.status]}
                            <span className="capitalize text-sm">{item.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.isFeatured && (
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openPreview(item)}
                              className="h-8 w-8"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditDialog(item)}
                              className="h-8 w-8 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            {item.status === 'pending' && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleAction('approve', item.id)}
                                  disabled={actionLoading === item.id}
                                  className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                                  title="Approve"
                                >
                                  {actionLoading === item.id ? (
                                    <LoadingSpinner size="sm" color="current" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openRejectDialog(item)}
                                  disabled={actionLoading === item.id}
                                  className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                  title="Reject"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}

                            {item.status === 'approved' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleAction(item.isFeatured ? 'unfeature' : 'feature', item.id)}
                                disabled={actionLoading === item.id}
                                className={`h-8 w-8 ${
                                  item.isFeatured
                                    ? 'text-amber-500 hover:text-amber-400'
                                    : 'text-zinc-500 hover:text-amber-400'
                                }`}
                                title={item.isFeatured ? 'Remove from featured' : 'Set as featured'}
                              >
                                {actionLoading === item.id ? (
                                  <LoadingSpinner size="sm" color="current" />
                                ) : (
                                  <Star className={`w-4 h-4 ${item.isFeatured ? 'fill-current' : ''}`} />
                                )}
                              </Button>
                            )}

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this item?')) {
                                  handleAction('delete', item.id)
                                }
                              }}
                              disabled={actionLoading === item.id}
                              className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Submission</DialogTitle>
            <DialogDescription>
              Rejecting &quot;{rejectingItem?.name}&quot;. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="bg-zinc-800 border-zinc-700 min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmReject}
              disabled={!rejectReason.trim() || actionLoading !== null}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {actionLoading ? (
                <LoadingSpinner size="sm" color="current" className="mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {previewItem?.name}
              {previewItem?.isFeatured && (
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              )}
            </DialogTitle>
            <DialogDescription>
              <Badge className={TYPE_COLORS[previewItem?.type || 'wildcard']}>
                {TYPE_LABELS[previewItem?.type || 'wildcard']}
              </Badge>
              <span className="ml-2">{previewItem?.category}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Description */}
            {previewItem?.description && (
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-1">Description</h4>
                <p className="text-white">{previewItem.description}</p>
              </div>
            )}

            {/* Tags */}
            {previewItem?.tags && previewItem.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-1">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {previewItem.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Content Preview */}
            <div>
              <h4 className="text-sm font-medium text-zinc-400 mb-1">Content</h4>
              <pre className="bg-zinc-800 rounded-lg p-4 text-sm text-zinc-300 overflow-x-auto">
                {JSON.stringify(previewItem?.content, null, 2)}
              </pre>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-400">Submitted by: </span>
                <span className="text-white">{previewItem?.submittedByName}</span>
              </div>
              <div>
                <span className="text-zinc-400">Submitted: </span>
                <span className="text-white">
                  {previewItem?.submittedAt && new Date(previewItem.submittedAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">Status: </span>
                <span className="capitalize text-white">{previewItem?.status}</span>
              </div>
              <div>
                <span className="text-zinc-400">Added: </span>
                <span className="text-white">{previewItem?.addCount || 0} times</span>
              </div>
            </div>

            {/* Rejection reason */}
            {previewItem?.status === 'rejected' && previewItem?.rejectedReason && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-400 mb-1">Rejection Reason</h4>
                <p className="text-red-300">{previewItem.rejectedReason}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            {previewItem?.status === 'pending' && (
              <>
                <Button
                  onClick={() => {
                    handleAction('approve', previewItem.id)
                    setPreviewDialogOpen(false)
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => {
                    setPreviewDialogOpen(false)
                    openRejectDialog(previewItem)
                  }}
                  variant="destructive"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            {previewItem?.status === 'approved' && (
              <Button
                onClick={() => {
                  handleAction(previewItem.isFeatured ? 'unfeature' : 'feature', previewItem.id)
                  setPreviewDialogOpen(false)
                }}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                <Star className="w-4 h-4 mr-2" />
                {previewItem.isFeatured ? 'Remove Featured' : 'Set as Featured'}
              </Button>
            )}
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Community Item</DialogTitle>
            <DialogDescription>
              Editing: {editingItem?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                value={editFormData.category}
                onChange={(e) => setEditFormData(prev => ({ ...prev, category: e.target.value }))}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-tags"
                value={editFormData.tags.join(', ')}
                onChange={(e) => setEditFormData(prev => ({
                  ...prev,
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                }))}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-content">Content (JSON)</Label>
              <Textarea
                id="edit-content"
                value={JSON.stringify(editFormData.content, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    setEditFormData(prev => ({ ...prev, content: parsed }))
                  } catch {
                    // Invalid JSON, don't update
                  }
                }}
                className="bg-zinc-800 border-zinc-700 font-mono text-sm min-h-[200px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveEdit}
              disabled={actionLoading !== null}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {actionLoading ? (
                <LoadingSpinner size="sm" color="current" className="mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
