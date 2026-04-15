'use client'

import { useEffect } from 'react'
import { X, Gift, Megaphone, Wrench, AlertTriangle, Info, BellOff, Bell } from 'lucide-react'
import { useAnnouncementStore } from '../store'
import type { Announcement } from '../types'
import { cn } from '@/utils/utils'

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    info: Info,
    feature: Megaphone,
    refund: Gift,
    maintenance: Wrench,
    warning: AlertTriangle,
}

const TYPE_COLORS: Record<string, string> = {
    info: 'oklch(0.65 0.12 220)',
    feature: 'oklch(0.65 0.12 270)',
    refund: 'oklch(0.65 0.15 155)',
    maintenance: 'oklch(0.65 0.12 60)',
    warning: 'oklch(0.65 0.15 30)',
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function AnnouncementItem({ announcement, onDismiss }: { announcement: Announcement; onDismiss: (id: string) => void }) {
    const Icon = TYPE_ICONS[announcement.type] || Info
    const color = TYPE_COLORS[announcement.type] || TYPE_COLORS.info
    const isDismissed = announcement.is_dismissed

    return (
        <div
            className={cn(
                "px-3 py-3 rounded-[0.625rem] transition-all duration-200 group",
                isDismissed ? "opacity-50" : "opacity-100"
            )}
            style={{
                background: isDismissed ? 'oklch(0.16 0.01 200)' : 'oklch(0.20 0.02 200)',
                border: `1px solid ${isDismissed ? 'oklch(0.25 0.02 200)' : 'oklch(0.30 0.03 200)'}`,
            }}
        >
            <div className="flex items-start gap-2.5">
                <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `color-mix(in oklch, ${color} 20%, transparent)` }}
                >
                    <span style={{ color }}><Icon className="w-3.5 h-3.5" /></span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-medium truncate" style={{ color: 'oklch(0.9 0.02 200)' }}>
                            {announcement.title}
                        </h4>
                        <span className="text-[10px] flex-shrink-0" style={{ color: 'oklch(0.5 0.02 200)' }}>
                            {formatDate(announcement.published_at || announcement.created_at)}
                        </span>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: 'oklch(0.65 0.03 200)' }}>
                        {announcement.body}
                    </p>
                </div>
                {!isDismissed && (
                    <button
                        onClick={() => onDismiss(announcement.id)}
                        className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 flex-shrink-0 mt-0.5"
                        style={{ color: 'oklch(0.5 0.02 200)' }}
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>
        </div>
    )
}

interface AnnouncementPanelProps {
    open: boolean
    onClose: () => void
}

export function AnnouncementPanel({ open, onClose }: AnnouncementPanelProps) {
    const { announcements, muteAll, fetch: fetchAnnouncements, dismissAnnouncement, toggleMuteAll, loaded, unreadCount } = useAnnouncementStore()

    useEffect(() => {
        if (open && !loaded) {
            fetchAnnouncements()
        }
    }, [open, loaded, fetchAnnouncements])

    if (!open) return null

    const undismissed = announcements.filter(a => !a.is_dismissed)
    const dismissed = announcements.filter(a => a.is_dismissed)

    return (
        <div
            className="fixed inset-0 z-[60]"
            onClick={onClose}
        >
            <div
                className="absolute left-[240px] bottom-[140px] w-[360px] max-h-[480px] rounded-xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-2 fade-in duration-200"
                style={{
                    background: 'oklch(0.14 0.015 200)',
                    border: '1px solid oklch(0.28 0.03 200)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid oklch(0.25 0.02 200)' }}>
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" style={{ color: 'oklch(0.7 0.15 200)' }} />
                        <h3 className="text-sm font-semibold" style={{ color: 'oklch(0.9 0.02 200)' }}>
                            Announcements
                        </h3>
                        {unreadCount > 0 && (
                            <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: 'oklch(0.55 0.2 200)', color: 'oklch(0.98 0 0)' }}
                            >
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={toggleMuteAll}
                            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/10"
                            title={muteAll ? 'Unmute announcements' : 'Mute all announcements'}
                        >
                            {muteAll ? (
                                <BellOff className="w-3.5 h-3.5" style={{ color: 'oklch(0.5 0.03 200)' }} />
                            ) : (
                                <Bell className="w-3.5 h-3.5" style={{ color: 'oklch(0.6 0.06 200)' }} />
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/10"
                        >
                            <X className="w-3.5 h-3.5" style={{ color: 'oklch(0.5 0.03 200)' }} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {muteAll && (
                        <div className="text-center py-8">
                            <BellOff className="w-8 h-8 mx-auto mb-2" style={{ color: 'oklch(0.4 0.02 200)' }} />
                            <p className="text-xs" style={{ color: 'oklch(0.5 0.03 200)' }}>Announcements are muted</p>
                            <button
                                onClick={toggleMuteAll}
                                className="text-xs mt-2 px-3 py-1 rounded-md transition-colors"
                                style={{ color: 'oklch(0.7 0.15 200)', background: 'oklch(0.22 0.03 200)' }}
                            >
                                Unmute
                            </button>
                        </div>
                    )}

                    {!muteAll && announcements.length === 0 && (
                        <div className="text-center py-8">
                            <Megaphone className="w-8 h-8 mx-auto mb-2" style={{ color: 'oklch(0.35 0.02 200)' }} />
                            <p className="text-xs" style={{ color: 'oklch(0.5 0.03 200)' }}>No announcements yet</p>
                        </div>
                    )}

                    {!muteAll && undismissed.length > 0 && (
                        <>
                            <p className="text-[10px] font-semibold uppercase tracking-wider px-1" style={{ color: 'oklch(0.5 0.03 200)' }}>
                                New
                            </p>
                            {undismissed.map(a => (
                                <AnnouncementItem key={a.id} announcement={a} onDismiss={dismissAnnouncement} />
                            ))}
                        </>
                    )}

                    {!muteAll && dismissed.length > 0 && (
                        <>
                            <p className="text-[10px] font-semibold uppercase tracking-wider px-1 mt-3" style={{ color: 'oklch(0.4 0.02 200)' }}>
                                Earlier
                            </p>
                            {dismissed.map(a => (
                                <AnnouncementItem key={a.id} announcement={a} onDismiss={dismissAnnouncement} />
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
