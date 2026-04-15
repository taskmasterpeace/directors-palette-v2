export interface Announcement {
    id: string
    title: string
    body: string
    type: 'info' | 'refund' | 'feature' | 'maintenance' | 'warning'
    priority: 'normal' | 'urgent'
    targeting: AnnouncementTargeting
    created_by: string | null
    published_at: string | null
    expires_at: string | null
    created_at: string
    is_dismissed?: boolean
}

export type AnnouncementTargeting =
    | { type: 'global' }
    | { type: 'user'; user_ids: string[] }
    | { type: 'segment'; filter: SegmentFilter; value?: string }

export type SegmentFilter = 'has_purchased' | 'signed_up_after' | 'signed_up_before' | 'min_spend' | 'min_balance'

export interface AnnouncementPreferences {
    user_id: string
    mute_all: boolean
    updated_at: string
}

export interface CreateAnnouncementInput {
    title: string
    body: string
    type: Announcement['type']
    targeting: AnnouncementTargeting
    priority: Announcement['priority']
    published_at?: string | null
    expires_at?: string | null
}
