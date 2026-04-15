'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Megaphone, Plus, Trash2, Edit3, Send, Eye, EyeOff, Gift, Wrench, AlertTriangle, Info } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { Announcement, AnnouncementTargeting } from '@/features/announcements/types'

const TYPE_OPTIONS = [
    { value: 'info', label: 'Info', icon: Info },
    { value: 'feature', label: 'Feature', icon: Megaphone },
    { value: 'refund', label: 'Refund', icon: Gift },
    { value: 'maintenance', label: 'Maintenance', icon: Wrench },
    { value: 'warning', label: 'Warning', icon: AlertTriangle },
]

const SEGMENT_OPTIONS = [
    { value: 'has_purchased', label: 'Users who purchased' },
    { value: 'signed_up_after', label: 'Signed up after date' },
    { value: 'signed_up_before', label: 'Signed up before date' },
    { value: 'min_spend', label: 'Minimum total spend (pts)' },
    { value: 'min_balance', label: 'Minimum balance (pts)' },
]

export function AnnouncementsTab() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editing, setEditing] = useState<Announcement | null>(null)
    const [saving, setSaving] = useState(false)

    // Form state
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [type, setType] = useState<string>('info')
    const [priority, setPriority] = useState<string>('normal')
    const [targetType, setTargetType] = useState<string>('global')
    const [targetUserIds, setTargetUserIds] = useState('')
    const [segmentFilter, setSegmentFilter] = useState('has_purchased')
    const [segmentValue, setSegmentValue] = useState('')
    const [publishNow, setPublishNow] = useState(true)
    const [expiresAt, setExpiresAt] = useState('')

    const fetchAnnouncements = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/announcements')
            if (res.ok) {
                const data = await res.json()
                setAnnouncements(data.announcements || [])
            }
        } catch {
            // silent
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAnnouncements() }, [fetchAnnouncements])

    const resetForm = () => {
        setTitle('')
        setBody('')
        setType('info')
        setPriority('normal')
        setTargetType('global')
        setTargetUserIds('')
        setSegmentFilter('has_purchased')
        setSegmentValue('')
        setPublishNow(true)
        setExpiresAt('')
        setEditing(null)
    }

    const openCreate = () => {
        resetForm()
        setDialogOpen(true)
    }

    const openEdit = (a: Announcement) => {
        setEditing(a)
        setTitle(a.title)
        setBody(a.body)
        setType(a.type)
        setPriority(a.priority)
        setPublishNow(!!a.published_at)
        setExpiresAt(a.expires_at || '')

        if (a.targeting.type === 'global') {
            setTargetType('global')
        } else if (a.targeting.type === 'user') {
            setTargetType('user')
            setTargetUserIds(a.targeting.user_ids.join(', '))
        } else if (a.targeting.type === 'segment') {
            setTargetType('segment')
            setSegmentFilter(a.targeting.filter)
            setSegmentValue(a.targeting.value || '')
        }
        setDialogOpen(true)
    }

    const buildTargeting = (): AnnouncementTargeting => {
        if (targetType === 'user') {
            return { type: 'user', user_ids: targetUserIds.split(',').map(s => s.trim()).filter(Boolean) }
        }
        if (targetType === 'segment') {
            const needsValue = !['has_purchased'].includes(segmentFilter)
            return {
                type: 'segment',
                filter: segmentFilter as AnnouncementTargeting extends { type: 'segment' } ? AnnouncementTargeting['filter'] : never,
                ...(needsValue && segmentValue ? { value: segmentValue } : {})
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any
        }
        return { type: 'global' }
    }

    const handleSave = async () => {
        if (!title || !body) return
        setSaving(true)
        try {
            const payload = {
                title,
                body,
                type,
                priority,
                targeting: buildTargeting(),
                published_at: publishNow ? new Date().toISOString() : null,
                expires_at: expiresAt || null,
            }

            if (editing) {
                await fetch('/api/admin/announcements', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editing.id, ...payload })
                })
            } else {
                await fetch('/api/admin/announcements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
            }
            setDialogOpen(false)
            resetForm()
            fetchAnnouncements()
        } catch {
            // silent
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this announcement?')) return
        await fetch(`/api/admin/announcements?id=${id}`, { method: 'DELETE' })
        fetchAnnouncements()
    }

    const formatDate = (d: string | null) => {
        if (!d) return '—'
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    const getTargetLabel = (t: AnnouncementTargeting) => {
        if (t.type === 'global') return 'All users'
        if (t.type === 'user') return `${t.user_ids.length} user(s)`
        if (t.type === 'segment') return `Segment: ${t.filter}`
        return 'Unknown'
    }

    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-amber-500" />
                        Announcements
                    </CardTitle>
                    <Button onClick={openCreate} size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">
                        <Plus className="w-4 h-4 mr-1" /> New Announcement
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-8"><LoadingSpinner /></div>
                ) : announcements.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">
                        <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>No announcements yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {announcements.map(a => (
                            <div
                                key={a.id}
                                className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-white text-sm">{a.title}</span>
                                        <Badge variant="outline" className="text-[10px] h-5">
                                            {a.type}
                                        </Badge>
                                        {a.priority === 'urgent' && (
                                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] h-5">
                                                urgent
                                            </Badge>
                                        )}
                                        {a.published_at ? (
                                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] h-5">
                                                <Eye className="w-3 h-3 mr-1" /> published
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 text-[10px] h-5">
                                                <EyeOff className="w-3 h-3 mr-1" /> draft
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{a.body}</p>
                                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-500">
                                        <span>Target: {getTargetLabel(a.targeting)}</span>
                                        <span>Created: {formatDate(a.created_at)}</span>
                                        {a.expires_at && <span>Expires: {formatDate(a.expires_at)}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-400 hover:text-white" onClick={() => openEdit(a)}>
                                        <Edit3 className="w-3.5 h-3.5" />
                                    </Button>
                                    {!a.published_at && (
                                        <Button
                                            variant="ghost" size="sm"
                                            className="h-7 w-7 p-0 text-green-400 hover:text-green-300"
                                            onClick={async () => {
                                                await fetch('/api/admin/announcements', {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ id: a.id, published_at: new Date().toISOString() })
                                                })
                                                fetchAnnouncements()
                                            }}
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300" onClick={() => handleDelete(a.id)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {editing ? 'Edit Announcement' : 'New Announcement'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="We fixed the storyboard bug" className="bg-zinc-800 border-zinc-700" />
                        </div>
                        <div className="space-y-2">
                            <Label>Message</Label>
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                placeholder="Write the announcement body..."
                                rows={4}
                                className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <select value={type} onChange={e => setType(e.target.value)} className="w-full h-9 rounded-md bg-zinc-800 border border-zinc-700 px-2 text-sm text-white">
                                    {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Priority</Label>
                                <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full h-9 rounded-md bg-zinc-800 border border-zinc-700 px-2 text-sm text-white">
                                    <option value="normal">Normal</option>
                                    <option value="urgent">Urgent (shows banner)</option>
                                </select>
                            </div>
                        </div>

                        {/* Targeting */}
                        <div className="space-y-2">
                            <Label>Target Audience</Label>
                            <select value={targetType} onChange={e => setTargetType(e.target.value)} className="w-full h-9 rounded-md bg-zinc-800 border border-zinc-700 px-2 text-sm text-white">
                                <option value="global">All Users</option>
                                <option value="user">Specific User(s)</option>
                                <option value="segment">Segment</option>
                            </select>
                            {targetType === 'user' && (
                                <Input
                                    value={targetUserIds}
                                    onChange={e => setTargetUserIds(e.target.value)}
                                    placeholder="User ID(s), comma-separated"
                                    className="bg-zinc-800 border-zinc-700 text-xs"
                                />
                            )}
                            {targetType === 'segment' && (
                                <div className="space-y-2">
                                    <select value={segmentFilter} onChange={e => setSegmentFilter(e.target.value)} className="w-full h-9 rounded-md bg-zinc-800 border border-zinc-700 px-2 text-sm text-white">
                                        {SEGMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                    {segmentFilter !== 'has_purchased' && (
                                        <Input
                                            value={segmentValue}
                                            onChange={e => setSegmentValue(e.target.value)}
                                            placeholder={segmentFilter.includes('date') ? '2026-04-01' : '500'}
                                            className="bg-zinc-800 border-zinc-700 text-xs"
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <input type="checkbox" checked={publishNow} onChange={e => setPublishNow(e.target.checked)} className="rounded" />
                                    Publish immediately
                                </Label>
                            </div>
                            <div className="space-y-2">
                                <Label>Expires (optional)</Label>
                                <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="bg-zinc-800 border-zinc-700 text-xs" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving || !title || !body} className="bg-amber-500 hover:bg-amber-600 text-black">
                            {saving ? <LoadingSpinner /> : editing ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
