import { create } from 'zustand'
import { logger } from '@/lib/logger'

interface CreditsState {
    balance: number
    lifetimePurchased: number
    lifetimeUsed: number
    loading: boolean
    error: string | null
    lastFetched: number | null
    showPurchaseDialog: boolean
}

interface CreditsActions {
    setBalance: (balance: number) => void
    setCredits: (data: { balance: number; lifetimePurchased: number; lifetimeUsed: number }) => void
    deductCredits: (amount: number) => void
    addCredits: (amount: number) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    fetchBalance: (force?: boolean) => Promise<void>
    openPurchaseDialog: () => void
    closePurchaseDialog: () => void
    reset: () => void
}

type CreditsStore = CreditsState & CreditsActions

const initialState: CreditsState = {
    balance: 0,
    lifetimePurchased: 0,
    lifetimeUsed: 0,
    loading: false,
    error: null,
    lastFetched: null,
    showPurchaseDialog: false,
}

export const useCreditsStore = create<CreditsStore>((set, get) => ({
    ...initialState,

    setBalance: (balance) => set({ balance }),

    setCredits: (data) => set({
        balance: data.balance,
        lifetimePurchased: data.lifetimePurchased,
        lifetimeUsed: data.lifetimeUsed,
        lastFetched: Date.now(),
    }),

    deductCredits: (amount) => set((state) => ({
        balance: Math.max(0, state.balance - amount),
        lifetimeUsed: state.lifetimeUsed + amount,
    })),

    addCredits: (amount) => set((state) => ({
        balance: state.balance + amount,
        lifetimePurchased: state.lifetimePurchased + amount,
    })),

    setLoading: (loading) => set({ loading }),

    setError: (error) => set({ error }),

    fetchBalance: async (force = false) => {
        const state = get()

        // Don't refetch if we fetched in the last 30 seconds (unless forced)
        if (!force && state.lastFetched && Date.now() - state.lastFetched < 30000) {
            return
        }

        set({ loading: true, error: null })

        try {
            const res = await fetch('/api/credits')

            if (!res.ok) {
                if (res.status === 401) {
                    // Not authenticated, reset to default
                    set({ ...initialState, lastFetched: Date.now() })
                    return
                }
                throw new Error('Failed to fetch credits')
            }

            const data = await res.json()

            set({
                balance: data.balance,
                lifetimePurchased: data.lifetime_purchased,
                lifetimeUsed: data.lifetime_used,
                loading: false,
                lastFetched: Date.now(),
            })
        } catch (error) {
            logger.credits.error('Error fetching credits', { error: error instanceof Error ? error.message : String(error) })
            set({
                loading: false,
                error: error instanceof Error ? error.message : 'Failed to fetch credits',
            })
        }
    },

    openPurchaseDialog: () => set({ showPurchaseDialog: true }),

    closePurchaseDialog: () => set({ showPurchaseDialog: false }),

    reset: () => set(initialState),
}))
