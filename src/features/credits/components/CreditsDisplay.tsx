"use client"

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useCreditsStore } from '../store/credits.store'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { Plus, Sparkles, Zap, Star, Crown, Image as ImageIcon, Gift, Video, Coins } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { RedeemUsageDialog } from './RedeemUsageDialog'
import { logger } from '@/lib/logger'

interface CreditPackage {
    id: string
    name: string
    credits: number
    bonus_credits: number
    price_cents: number
    total_credits: number
    formatted_price: string
    savings_percent: number
}

function centsToTokens(cents: number): number {
    return cents
}

function formatTokens(tokens: number): string {
    if (tokens >= 1000) {
        return `${(tokens / 1000).toFixed(1)}K`
    }
    return tokens.toLocaleString()
}

function getTierIcon(index: number) {
    const icons = [Zap, Star, Crown, Sparkles]
    return icons[index] || Sparkles
}

function estimateImages(tokens: number): number {
    return Math.floor(tokens / 20)
}

function estimateVideoSeconds(tokens: number): number {
    return Math.floor(tokens / 5)
}

// Tier color system using OKLCH
const TIER_STYLES = [
    {
        // Starter — muted zinc
        border: 'oklch(0.4 0.02 200)',
        borderHover: 'oklch(0.5 0.04 200)',
        icon: 'oklch(0.7 0.04 200)',
        buttonBg: 'oklch(0.4 0.06 200)',
        buttonHover: 'oklch(0.5 0.08 200)',
        buttonText: 'oklch(0.95 0 0)',
        accent: 'oklch(0.5 0.06 200)',
        pts: 'oklch(0.75 0.12 200)',
    },
    {
        // Creator — amber/gold
        border: 'oklch(0.6 0.16 80)',
        borderHover: 'oklch(0.7 0.18 80)',
        icon: 'oklch(0.75 0.18 80)',
        buttonBg: 'oklch(0.7 0.18 80)',
        buttonHover: 'oklch(0.75 0.2 80)',
        buttonText: 'oklch(0.15 0.03 80)',
        accent: 'oklch(0.7 0.18 80)',
        pts: 'oklch(0.75 0.18 80)',
    },
    {
        // Pro — warm orange
        border: 'oklch(0.6 0.18 50)',
        borderHover: 'oklch(0.7 0.2 50)',
        icon: 'oklch(0.75 0.2 50)',
        buttonBg: 'oklch(0.65 0.2 50)',
        buttonHover: 'oklch(0.7 0.22 50)',
        buttonText: 'oklch(0.15 0.03 50)',
        accent: 'oklch(0.65 0.2 50)',
        pts: 'oklch(0.75 0.2 50)',
    },
    {
        // Studio — premium rose
        border: 'oklch(0.55 0.2 15)',
        borderHover: 'oklch(0.65 0.22 15)',
        icon: 'oklch(0.7 0.22 15)',
        buttonBg: 'oklch(0.6 0.22 15)',
        buttonHover: 'oklch(0.65 0.24 15)',
        buttonText: 'oklch(0.98 0 0)',
        accent: 'oklch(0.6 0.22 15)',
        pts: 'oklch(0.7 0.22 15)',
    },
]

export function CreditsDisplay() {
    const { balance, loading, error: creditsError, fetchBalance, showPurchaseDialog, openPurchaseDialog, closePurchaseDialog } = useCreditsStore()
    const [packages, setPackages] = useState<CreditPackage[]>([])
    const [loadingPackages, setLoadingPackages] = useState(false)
    const [purchasingId, setPurchasingId] = useState<string | null>(null)

    useEffect(() => {
        fetchBalance()
    }, [fetchBalance])

    // Surface credits fetch errors so users know why balance shows 0
    useEffect(() => {
        if (creditsError) {
            console.warn('[Credits] Failed to load balance:', creditsError)
        }
    }, [creditsError])

    useEffect(() => {
        if (showPurchaseDialog) {
            loadPackages()
        }
    }, [showPurchaseDialog])

    const loadPackages = async () => {
        setLoadingPackages(true)
        try {
            const res = await fetch('/api/credits/packages')
            if (res.ok) {
                const data = await res.json()
                const uniquePackages: CreditPackage[] = []
                const seenNames = new Set<string>()
                for (const pkg of data.packages || []) {
                    if (!seenNames.has(pkg.name)) {
                        seenNames.add(pkg.name)
                        uniquePackages.push(pkg)
                    }
                }
                setPackages(uniquePackages)
            }
        } catch (error) {
            logger.credits.error('Error loading packages', { error: error instanceof Error ? error.message : String(error) })
        } finally {
            setLoadingPackages(false)
        }
    }

    const handleOpenStore = () => {
        openPurchaseDialog()
    }

    const handleCloseStore = (open: boolean) => {
        if (!open) {
            closePurchaseDialog()
        }
    }

    const handlePurchase = async (pkg: CreditPackage) => {
        setPurchasingId(pkg.id)
        try {
            const res = await fetch('/api/payments/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ package_id: pkg.id })
            })

            const data = await res.json()

            if (data.url) {
                window.location.href = data.url
            } else {
                throw new Error(data.error || 'Failed to create checkout')
            }
        } catch (error) {
            logger.credits.error('Checkout error', { error: error instanceof Error ? error.message : String(error) })
            alert('Payment system not configured yet. Contact admin for pts.')
        } finally {
            setPurchasingId(null)
        }
    }

    const tokens = centsToTokens(balance)

    return (
        <>
            <Dialog open={showPurchaseDialog} onOpenChange={handleCloseStore}>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DialogTrigger asChild>
                                <button
                                    onClick={handleOpenStore}
                                    className="flex items-center gap-2 w-full rounded-[0.625rem] px-3 py-2 transition-all duration-200 hover:brightness-125 cursor-pointer"
                                    style={{
                                        background: 'oklch(0.18 0.04 200)',
                                        border: '1px solid oklch(0.32 0.06 200)',
                                        boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.04)',
                                    }}
                                >
                                    <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: 'oklch(0.7 0.18 200)' }} />
                                    <span className="font-mono font-bold text-sm" style={{ color: creditsError ? 'oklch(0.7 0.2 25)' : 'oklch(0.8 0.12 200)' }}>
                                        {loading ? (
                                            <LoadingSpinner size="xs" color="current" />
                                        ) : creditsError ? (
                                            '-- pts'
                                        ) : (
                                            `${formatTokens(tokens)} pts`
                                        )}
                                    </span>
                                    <Plus className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: 'oklch(0.5 0.06 200)' }} />
                                </button>
                            </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="right" style={{ background: 'oklch(0.15 0.02 200)', border: '1px solid oklch(0.3 0.04 200)', color: 'oklch(0.9 0.02 200)' }}>
                            <p className="font-mono text-xs">
                                {creditsError ? 'Failed to load balance — try refreshing' : `${tokens.toLocaleString()} pts`}
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <DialogContent
                    className="sm:rounded-2xl max-w-[520px] border p-0 overflow-hidden"
                    style={{
                        background: 'oklch(0.13 0.015 200)',
                        borderColor: 'oklch(0.25 0.03 200)',
                        boxShadow: '0 25px 60px oklch(0 0 0 / 0.6), 0 0 0 1px oklch(1 0 0 / 0.04) inset',
                    }}
                >
                    {/* Header */}
                    <div
                        className="px-6 pt-6 pb-5"
                        style={{
                            borderBottom: '1px solid oklch(0.22 0.025 200)',
                            background: 'linear-gradient(to bottom, oklch(0.17 0.025 200), oklch(0.13 0.015 200))',
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                                <div
                                    className="flex items-center justify-center w-10 h-10 rounded-xl"
                                    style={{
                                        background: 'linear-gradient(135deg, oklch(0.25 0.06 200), oklch(0.2 0.04 200))',
                                        border: '1px solid oklch(0.35 0.06 200)',
                                        boxShadow: '0 2px 8px oklch(0 0 0 / 0.3)',
                                    }}
                                >
                                    <Sparkles className="w-5 h-5" style={{ color: 'oklch(0.7 0.2 200)' }} />
                                </div>
                                <div>
                                    <DialogHeader>
                                        <DialogTitle className="text-lg font-bold tracking-[-0.025em]" style={{ color: 'oklch(0.95 0.01 200)' }}>
                                            Pts Store
                                        </DialogTitle>
                                    </DialogHeader>
                                    <p className="text-xs" style={{ color: 'oklch(0.5 0.03 200)' }}>Power your creative workflow</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-medium uppercase tracking-[0.08em] mb-0.5" style={{ color: 'oklch(0.45 0.03 200)' }}>Balance</div>
                                <div className="font-mono font-bold text-2xl tracking-tight" style={{ color: 'oklch(0.8 0.15 200)' }}>
                                    {loading ? <LoadingSpinner size="md" color="current" /> : formatTokens(tokens)}
                                    <span className="text-xs font-sans font-normal ml-1" style={{ color: 'oklch(0.5 0.04 200)' }}>pts</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Redeem Code */}
                    <div className="px-6 pt-4 pb-2">
                        <RedeemUsageDialog>
                            <button
                                className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-medium transition-all duration-200 hover:brightness-125"
                                style={{
                                    background: 'oklch(0.16 0.02 200)',
                                    border: '1px solid oklch(0.25 0.03 200)',
                                    color: 'oklch(0.6 0.04 200)',
                                }}
                            >
                                <Gift className="w-3.5 h-3.5" />
                                Have a code? Redeem it here
                            </button>
                        </RedeemUsageDialog>
                    </div>

                    {/* Packages */}
                    <div className="px-6 pt-2 pb-6">
                        {loadingPackages ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3" style={{ color: 'oklch(0.5 0.03 200)' }}>
                                <LoadingSpinner size="lg" />
                                <p className="text-sm">Loading offers...</p>
                            </div>
                        ) : packages.length === 0 ? (
                            <div
                                className="text-center py-12 rounded-xl border border-dashed"
                                style={{ borderColor: 'oklch(0.25 0.03 200)', color: 'oklch(0.5 0.03 200)' }}
                            >
                                <Coins className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p>No packages available right now</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {packages.map((pkg, index) => {
                                    const tier = TIER_STYLES[index] || TIER_STYLES[0]
                                    const TierIcon = getTierIcon(index)
                                    const imgCount = estimateImages(pkg.total_credits)
                                    const videoSeconds = estimateVideoSeconds(pkg.total_credits)
                                    const isPurchasing = purchasingId === pkg.id
                                    const hasBonus = pkg.bonus_credits > 0

                                    return (
                                        <motion.div
                                            key={pkg.id}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.06, duration: 0.25 }}
                                            whileHover={{ y: -3, scale: 1.03 }}
                                            className="rounded-xl flex flex-col overflow-hidden cursor-pointer group"
                                            style={{
                                                background: 'oklch(0.16 0.02 200)',
                                                border: `1.5px solid ${tier.border}`,
                                                boxShadow: `0 2px 12px oklch(0 0 0 / 0.3)`,
                                            }}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLElement).style.borderColor = tier.borderHover
                                                ;(e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px oklch(0 0 0 / 0.4), 0 0 20px ${tier.accent}20`
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLElement).style.borderColor = tier.border
                                                ;(e.currentTarget as HTMLElement).style.boxShadow = `0 2px 12px oklch(0 0 0 / 0.3)`
                                            }}
                                        >
                                            <div className="p-3 flex flex-col h-full">
                                                {/* Tier header */}
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <TierIcon className="w-3.5 h-3.5" style={{ color: tier.icon }} />
                                                    <span className="text-xs font-bold tracking-tight" style={{ color: 'oklch(0.9 0.01 200)' }}>
                                                        {pkg.name}
                                                    </span>
                                                </div>

                                                {/* Price */}
                                                <div className="text-xl font-bold mb-1.5" style={{ color: 'oklch(0.95 0.01 200)' }}>
                                                    {pkg.formatted_price}
                                                </div>

                                                {/* Pts amount */}
                                                <div className="mb-2 pb-2" style={{ borderBottom: '1px solid oklch(0.22 0.025 200)' }}>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-lg font-bold font-mono" style={{ color: tier.pts }}>
                                                            {formatTokens(pkg.total_credits)}
                                                        </span>
                                                        <span className="text-[10px]" style={{ color: 'oklch(0.5 0.03 200)' }}>pts</span>
                                                    </div>
                                                    {hasBonus && (
                                                        <div className="text-[10px] font-medium mt-0.5" style={{ color: 'oklch(0.7 0.18 150)' }}>
                                                            +{formatTokens(pkg.bonus_credits)} bonus
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Stats */}
                                                <div className="hidden sm:flex flex-col gap-0.5 mb-3 flex-1">
                                                    <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'oklch(0.5 0.03 200)' }}>
                                                        <ImageIcon className="w-3 h-3" />
                                                        <span>~{imgCount} images</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'oklch(0.5 0.03 200)' }}>
                                                        <Video className="w-3 h-3" />
                                                        <span>~{videoSeconds}s video</span>
                                                    </div>
                                                </div>

                                                {/* Buy button */}
                                                <button
                                                    className="w-full rounded-lg py-2 text-xs font-semibold transition-all duration-200 hover:brightness-110 mt-auto"
                                                    style={{
                                                        background: tier.buttonBg,
                                                        color: tier.buttonText,
                                                        boxShadow: '0 1px 3px oklch(0 0 0 / 0.3)',
                                                    }}
                                                    onClick={() => handlePurchase(pkg)}
                                                    disabled={isPurchasing}
                                                >
                                                    {isPurchasing ? (
                                                        <LoadingSpinner size="sm" color="current" />
                                                    ) : (
                                                        "Buy"
                                                    )}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-center gap-5 mt-6 pt-4 text-[10px] font-medium tracking-[0.05em] uppercase" style={{ borderTop: '1px solid oklch(0.22 0.025 200)', color: 'oklch(0.4 0.02 200)' }}>
                            <span className="flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full" style={{ background: 'oklch(0.35 0.03 200)' }} /> Secure checkout
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full" style={{ background: 'oklch(0.35 0.03 200)' }} /> Pts never expire
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full" style={{ background: 'oklch(0.35 0.03 200)' }} /> Instant delivery
                            </span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
