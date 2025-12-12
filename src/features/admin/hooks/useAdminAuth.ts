"use client"

import { useState, useEffect } from 'react'
import { getClient } from '@/lib/db/client'
import { isAdminEmail } from '../types/admin.types'

interface AdminAuthState {
    loading: boolean
    isAuthenticated: boolean
    isAdmin: boolean
    email: string | null
    userId: string | null
    error: string | null
}

export function useAdminAuth(): AdminAuthState {
    const [state, setState] = useState<AdminAuthState>({
        loading: true,
        isAuthenticated: false,
        isAdmin: false,
        email: null,
        userId: null,
        error: null
    })

    useEffect(() => {
        async function checkAuth() {
            try {
                const supabase = await getClient()
                const { data: { user }, error } = await supabase.auth.getUser()

                if (error || !user) {
                    setState({
                        loading: false,
                        isAuthenticated: false,
                        isAdmin: false,
                        email: null,
                        userId: null,
                        error: 'Not authenticated'
                    })
                    return
                }

                const email = user.email || ''
                const admin = isAdminEmail(email)

                setState({
                    loading: false,
                    isAuthenticated: true,
                    isAdmin: admin,
                    email,
                    userId: user.id,
                    error: admin ? null : 'Not authorized as admin'
                })
            } catch (error) {
                console.error('Auth check failed:', error)
                setState({
                    loading: false,
                    isAuthenticated: false,
                    isAdmin: false,
                    email: null,
                    userId: null,
                    error: 'Failed to check authentication'
                })
            }
        }

        checkAuth()
    }, [])

    return state
}
