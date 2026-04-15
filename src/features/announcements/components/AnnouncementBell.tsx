'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useAnnouncementStore } from '../store'
import { AnnouncementPanel } from './AnnouncementPanel'
import { cn } from '@/utils/utils'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface AnnouncementBellProps {
    isCollapsed: boolean
}

export function AnnouncementBell({ isCollapsed }: AnnouncementBellProps) {
    const { unreadCount, fetch: fetchAnnouncements, loaded } = useAnnouncementStore()
    const [panelOpen, setPanelOpen] = useState(false)

    useEffect(() => {
        if (!loaded) {
            fetchAnnouncements()
        }
    }, [loaded, fetchAnnouncements])

    return (
        <>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => setPanelOpen(!panelOpen)}
                            className={cn(
                                "relative flex items-center justify-center rounded-[0.625rem] transition-all duration-200 hover:brightness-125",
                                isCollapsed ? "w-8 h-8" : "w-9 h-9"
                            )}
                            style={{
                                background: 'oklch(0.18 0.04 200)',
                                border: '1px solid oklch(0.32 0.06 200)',
                            }}
                        >
                            <Bell className="w-4 h-4" style={{ color: 'oklch(0.7 0.18 200)' }} />
                            {unreadCount > 0 && (
                                <span
                                    className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold animate-in zoom-in duration-200"
                                    style={{
                                        background: 'oklch(0.6 0.22 200)',
                                        color: 'oklch(0.98 0 0)',
                                    }}
                                >
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                    </TooltipTrigger>
                    {isCollapsed && (
                        <TooltipContent side="right" style={{ background: 'oklch(0.15 0.02 200)', border: '1px solid oklch(0.3 0.04 200)', color: 'oklch(0.85 0.06 200)' }}>
                            Announcements{unreadCount > 0 ? ` (${unreadCount} new)` : ''}
                        </TooltipContent>
                    )}
                </Tooltip>
            </TooltipProvider>
            <AnnouncementPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
        </>
    )
}
