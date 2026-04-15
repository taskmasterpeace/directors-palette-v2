import { getClient, getAPIClient } from '@/lib/db/client'
import type { Announcement, CreateAnnouncementInput, AnnouncementPreferences } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAnnouncementClient(): Promise<any> {
    return await getClient()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAdminClient(): Promise<any> {
    return await getAPIClient()
}

export const announcementService = {
    /** Get announcements for the current user via RPC (handles targeting + segments) */
    async getUserAnnouncements(userId: string): Promise<Announcement[]> {
        const supabase = await getAnnouncementClient()
        const { data, error } = await supabase.rpc('get_user_announcements', {
            p_user_id: userId
        })
        if (error) throw new Error(error.message)
        return data || []
    },

    /** Dismiss an announcement for the current user */
    async dismiss(announcementId: string, userId: string): Promise<void> {
        const supabase = await getAnnouncementClient()
        const { error } = await supabase
            .from('announcement_dismissals')
            .upsert({ announcement_id: announcementId, user_id: userId }, { onConflict: 'announcement_id,user_id' })
        if (error) throw new Error(error.message)
    },

    /** Get user preferences */
    async getPreferences(userId: string): Promise<AnnouncementPreferences | null> {
        const supabase = await getAnnouncementClient()
        const { data, error } = await supabase
            .from('announcement_preferences')
            .select('*')
            .eq('user_id', userId)
            .single()
        if (error && error.code !== 'PGRST116') throw new Error(error.message)
        return data
    },

    /** Update mute_all preference */
    async setMuteAll(userId: string, muteAll: boolean): Promise<void> {
        const supabase = await getAnnouncementClient()
        const { error } = await supabase
            .from('announcement_preferences')
            .upsert({ user_id: userId, mute_all: muteAll, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        if (error) throw new Error(error.message)
    },

    // --- Admin operations (service role) ---

    /** Create a new announcement (admin) */
    async create(input: CreateAnnouncementInput, adminEmail: string): Promise<Announcement> {
        const supabase = await getAdminClient()
        const { data, error } = await supabase
            .from('announcements')
            .insert({ ...input, created_by: adminEmail })
            .select()
            .single()
        if (error) throw new Error(error.message)
        return data
    },

    /** List all announcements (admin) */
    async listAll(): Promise<Announcement[]> {
        const supabase = await getAdminClient()
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false })
        if (error) throw new Error(error.message)
        return data || []
    },

    /** Update an announcement (admin) */
    async update(id: string, updates: Partial<CreateAnnouncementInput>): Promise<Announcement> {
        const supabase = await getAdminClient()
        const { data, error } = await supabase
            .from('announcements')
            .update(updates)
            .eq('id', id)
            .select()
            .single()
        if (error) throw new Error(error.message)
        return data
    },

    /** Delete an announcement (admin) */
    async remove(id: string): Promise<void> {
        const supabase = await getAdminClient()
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id)
        if (error) throw new Error(error.message)
    },

    /** Get dismissal stats for an announcement (admin) */
    async getDismissalCount(announcementId: string): Promise<number> {
        const supabase = await getAdminClient()
        const { count, error } = await supabase
            .from('announcement_dismissals')
            .select('*', { count: 'exact', head: true })
            .eq('announcement_id', announcementId)
        if (error) throw new Error(error.message)
        return count || 0
    }
}
