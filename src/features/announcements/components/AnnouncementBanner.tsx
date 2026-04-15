'use client'

import { useEffect } from 'react'
import { X, Megaphone, Gift, Wrench, AlertTriangle, Info } from 'lucide-react'
import { useAnnouncementStore } from '../store'
import { cn } from '@/utils/utils'

const TYPE_CONFIG = {
    info: { icon: Info, bg: 'oklch(0.22 0.04 220)', border: 'oklch(0.35 0.08 220)', accent: 'oklch(0.7 0.15 220)' },
    feature: { icon: Megaphone, bg: 'oklch(0.22 0.04 270)', border: 'oklch(0.35 0.08 270)', accent: 'oklch(0.7 0.15 270)' },
    refund: { icon: Gift, bg: 'oklch(0.22 0.04 155)', border: 'oklch(0.35 0.08 155)', accent: 'oklch(0.7 0.18 155)' },
    maintenance: { icon: Wrench, bg: 'oklch(0.22 0.04 60)', border: 'oklch(0.35 0.08 60)', accent: 'oklch(0.7 0.15 60)' },
    warning: { icon: AlertTriangle, bg: 'oklch(0.22 0.04 30)', border: 'oklch(0.35 0.08 30)', accent: 'oklch(0.7 0.18 30)' },
}

export function AnnouncementBanner() {
    const { latestUrgent, muteAll, fetch: fetchAnnouncements, dismissAnnouncement, loaded } = useAnnouncementStore()

    useEffect(() => {
        if (!loaded) {
            fetchAnnouncements()
        }
    }, [loaded, fetchAnnouncements])

    if (muteAll || !latestUrgent) return null

    const config = TYPE_CONFIG[latestUrgent.type] || TYPE_CONFIG.info
    const Icon = config.icon

    return (
        <div
            className="w-full px-4 py-2.5 flex items-center gap-3 relative z-50 animate-in slide-in-from-top-2 duration-300"
            style={{
                background: config.bg,
                borderBottom: `1px solid ${config.border}`,
            }}
        >
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: config.accent }} />
            <div className="flex-1 min-w-0">
                <span className="text-sm font-medium" style={{ color: 'oklch(0.9 0.02 200)' }}>
                    {latestUrgent.title}
                </span>
                <span className="text-xs ml-2" style={{ color: 'oklch(0.65 0.03 200)' }}>
                    {latestUrgent.body.length > 120 ? latestUrgent.body.slice(0, 120) + '...' : latestUrgent.body}
                </span>
            </div>
            <button
                onClick={() => dismissAnnouncement(latestUrgent.id)}
                className={cn(
                    "w-6 h-6 flex items-center justify-center rounded-md flex-shrink-0",
                    "transition-colors duration-200 hover:bg-white/10"
                )}
                style={{ color: 'oklch(0.6 0.03 200)' }}
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}
