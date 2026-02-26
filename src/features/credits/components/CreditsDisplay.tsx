"use client"

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useCreditsStore } from '../store/credits.store'
import { Button } from '@/components/ui/button'
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
import { Coins, Plus, Sparkles, Zap, Star, Crown, Image as ImageIcon, Gift, Video } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/utils/utils'
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

// Convert cents to tokens (1 cent = 1 token, but we display it abstractly)
function centsToTokens(cents: number): number {
    return cents // 1:1 mapping, just called "tokens" instead of cents
}

// Format tokens for display
function formatTokens(tokens: number): string {
    if (tokens >= 1000) {
        return `${(tokens / 1000).toFixed(1)}K`
    }
    return tokens.toLocaleString()
}

// Get tier icon based on package index
function getTierIcon(index: number) {
    const icons = [Zap, Star, Crown, Sparkles]
    return icons[index] || Sparkles
}

// Background images for each tier (lightweight, optimized)
const TIER_BACKGROUNDS = [
    '/credits/starter-bg.png',   // Starter - subtle energy/spark
    '/credits/creator-bg.png',   // Creator - creative/artistic
    '/credits/pro-bg.png',       // Pro - professional/dynamic
    '/credits/studio-bg.png',    // Studio - premium/cinematic
]

// Get tier color classes - distinct colors for each tier
function getTierColors(index: number) {
    const colors = [
        {
            border: 'border-zinc-600/50 hover:border-zinc-500',
            glow: 'shadow-zinc-500/10',
            icon: 'text-zinc-300',
            button: 'bg-zinc-600 hover:bg-zinc-500 text-white',
            accent: 'from-zinc-400/20 to-zinc-600/10',
        },
        {
            border: 'border-amber-500/60 hover:border-amber-400',
            glow: 'shadow-amber-500/20',
            icon: 'text-amber-400',
            button: 'bg-amber-500 hover:bg-amber-400 text-black font-semibold',
            accent: 'from-amber-400/30 to-amber-600/10',
        },
        {
            border: 'border-orange-500/60 hover:border-orange-400',
            glow: 'shadow-orange-500/20',
            icon: 'text-orange-400',
            button: 'bg-orange-500 hover:bg-orange-400 text-black font-semibold',
            accent: 'from-orange-400/30 to-orange-600/10',
        },
        {
            border: 'border-rose-500/60 hover:border-rose-400',
            glow: 'shadow-rose-500/20',
            icon: 'text-rose-400',
            button: 'bg-rose-500 hover:bg-rose-400 text-white font-semibold',
            accent: 'from-rose-400/30 to-rose-600/10',
        },
    ]
    return colors[index] || colors[0]
}

// Estimate images from tokens (20 tokens per image avg)
function estimateImages(tokens: number): number {
    return Math.floor(tokens / 20)
}

// Estimate video seconds from tokens (5 tokens per second at 720p for Seedance Lite)
function estimateVideoSeconds(tokens: number): number {
    return Math.floor(tokens / 5)
}

export function CreditsDisplay() {
    const { balance, loading, fetchBalance, showPurchaseDialog, openPurchaseDialog, closePurchaseDialog } = useCreditsStore()
    const [packages, setPackages] = useState<CreditPackage[]>([])
    const [loadingPackages, setLoadingPackages] = useState(false)
    const [purchasingId, setPurchasingId] = useState<string | null>(null)

    useEffect(() => {
        fetchBalance()
    }, [fetchBalance])

    // Load packages when dialog opens
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
                // Get all unique packages by name (sorted by sort_order from API)
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
            alert('Payment system not configured yet. Contact admin for points.')
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
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/10"
                                    onClick={handleOpenStore}
                                >
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    <span className="font-mono text-amber-500 font-bold">
                                        {loading ? (
                                            <LoadingSpinner size="xs" color="current" />
                                        ) : (
                                            `${formatTokens(tokens)} tokens`
                                        )}
                                    </span>
                                    <Plus className="w-3 h-3 text-zinc-500" />
                                </Button>
                            </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="bg-zinc-900 border-zinc-700 text-white">
                            <p className="font-mono">{tokens.toLocaleString()} tokens exactly</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <DialogContent className="bg-zinc-950 border-zinc-800 max-w-5xl p-0 overflow-hidden">
                    {/* Subtle Background */}
                    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 to-zinc-950 z-10" />
                    </div>

                    <div className="relative z-10">
                        {/* Compact Header */}
                        <div className="p-6 pb-4 border-b border-white/5 bg-white/5 backdrop-blur-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-xl border border-amber-500/20 shadow-inner">
                                        <Sparkles className="w-6 h-6 text-amber-400" />
                                    </div>
                                    <div>
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl font-bold text-white tracking-tight">Token Store</DialogTitle>
                                        </DialogHeader>
                                        <p className="text-sm text-zinc-400">Power your creative workflow</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Your Balance</div>
                                    <div className="text-3xl font-bold font-mono text-amber-400 drop-shadow-sm">
                                        {loading ? <LoadingSpinner size="md" color="current" /> : formatTokens(tokens)}
                                        <span className="text-sm text-zinc-500 ml-1 font-sans font-normal">tokens</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Coupon Redemption - Mobile Accessible */}
                        <div className="px-6 pt-4 pb-2 border-b border-white/5">
                            <RedeemUsageDialog>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full gap-2 bg-black/20 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                                >
                                    <Gift className="w-4 h-4" />
                                    Have a code? Redeem it here
                                </Button>
                            </RedeemUsageDialog>
                        </div>

                        {/* Wide 3-column packages */}
                        <div className="p-6">
                            {loadingPackages ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-500">
                                    <LoadingSpinner size="lg" />
                                    <p className="text-sm">Loading best offers...</p>
                                </div>
                            ) : packages.length === 0 ? (
                                <div className="text-center py-12 text-zinc-500 bg-white/5 rounded-xl border border-white/5 border-dashed">
                                    <Coins className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p>No packages available right now</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {packages.map((pkg, index) => {
                                        const colors = getTierColors(index)
                                        const TierIcon = getTierIcon(index)
                                        const imgCount = estimateImages(pkg.total_credits)
                                        const videoSeconds = estimateVideoSeconds(pkg.total_credits)
                                        const isPurchasing = purchasingId === pkg.id
                                        const hasBonus = pkg.bonus_credits > 0
                                        const bgImage = TIER_BACKGROUNDS[index]

                                        return (
                                            <motion.div
                                                key={pkg.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.08, duration: 0.3 }}
                                                whileHover={{ y: -2, scale: 1.02 }}
                                                className={cn(
                                                    "relative rounded-xl border transition-all duration-300 p-3 sm:p-4 flex flex-col group overflow-hidden",
                                                    colors.border,
                                                    "bg-zinc-900/90 backdrop-blur-sm",
                                                    `shadow-lg ${colors.glow}`,
                                                    "hover:shadow-xl"
                                                )}
                                            >
                                                {/* Background Image with Gradient Overlay */}
                                                <div className="absolute inset-0 z-0">
                                                    <div
                                                        className="absolute inset-0 bg-cover bg-center opacity-50 group-hover:opacity-60 transition-opacity"
                                                        style={{ backgroundImage: `url(${bgImage})` }}
                                                    />
                                                    <div className={cn(
                                                        "absolute inset-0 bg-gradient-to-t",
                                                        colors.accent,
                                                        "to-zinc-900/95"
                                                    )} />
                                                </div>

                                                {/* Content */}
                                                <div className="relative z-10 flex flex-col h-full">
                                                    {/* Header with Icon */}
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={cn("p-1.5 rounded-lg bg-black/50 backdrop-blur-sm", colors.icon)}>
                                                            <TierIcon className="w-4 h-4" />
                                                        </div>
                                                        <span className="font-bold text-sm text-white tracking-tight">{pkg.name}</span>
                                                    </div>

                                                    {/* Price - prominent */}
                                                    <div className="mb-2">
                                                        <span className="text-xl sm:text-2xl font-bold text-white">{pkg.formatted_price}</span>
                                                    </div>

                                                    {/* Tokens */}
                                                    <div className="mb-2 sm:mb-3 pb-2 sm:pb-3 border-b border-white/10">
                                                        <div className="flex items-baseline gap-1.5">
                                                            <span className="text-lg sm:text-xl font-bold font-mono text-amber-400">
                                                                {formatTokens(pkg.total_credits)}
                                                            </span>
                                                            <span className="text-[10px] sm:text-xs text-zinc-400">tokens</span>
                                                        </div>
                                                        {hasBonus && (
                                                            <div className="text-[10px] text-green-400 font-medium mt-0.5">
                                                                +{formatTokens(pkg.bonus_credits)} bonus
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Stats - compact (hidden on mobile for space) */}
                                                    <div className="hidden sm:block space-y-1 mb-3 flex-1 text-[10px] sm:text-xs text-zinc-400">
                                                        <div className="flex items-center gap-1.5">
                                                            <ImageIcon className="w-3 h-3" />
                                                            <span>~{imgCount} images</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Video className="w-3 h-3" />
                                                            <span>~{videoSeconds}s video</span>
                                                        </div>
                                                    </div>

                                                    {/* Buy button */}
                                                    <Button
                                                        size="sm"
                                                        className={cn(
                                                            "w-full shadow-md transition-all duration-200",
                                                            colors.button
                                                        )}
                                                        onClick={() => handlePurchase(pkg)}
                                                        disabled={isPurchasing}
                                                    >
                                                        {isPurchasing ? (
                                                            <LoadingSpinner size="sm" color="current" />
                                                        ) : (
                                                            "Buy"
                                                        )}
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Compact footer */}
                            <div className="flex items-center justify-center gap-6 mt-8 pt-4 border-t border-white/10 text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
                                <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-zinc-600" /> Secure checkout</span>
                                <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-zinc-600" /> Tokens never expire</span>
                                <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-zinc-600" /> Instant delivery</span>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
