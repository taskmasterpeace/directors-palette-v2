"use client"

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useCreditsStore } from '../store/credits.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Coins, Plus, Loader2, Sparkles, Zap, Star, Crown, Image as ImageIcon, Gift } from 'lucide-react'
import { cn } from '@/utils/utils'
import { RedeemUsageDialog } from './RedeemUsageDialog'

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
    const icons = [Zap, Star, Crown]
    return icons[index] || Sparkles
}

// Get tier color classes - all amber/orange tones, no purple
function getTierColors(index: number, isPopular: boolean) {
    if (isPopular) {
        return {
            border: 'border-amber-500',
            bg: 'bg-gradient-to-br from-amber-500/15 to-amber-600/5',
            icon: 'text-amber-400',
            badge: 'bg-amber-500 text-black',
            button: 'bg-amber-500 hover:bg-amber-400 text-black',
        }
    }
    const colors = [
        { border: 'border-zinc-700 hover:border-zinc-600', bg: 'bg-zinc-800/50', icon: 'text-zinc-400', badge: 'bg-zinc-700 text-zinc-300', button: 'bg-zinc-700 hover:bg-zinc-600 text-white' },
        { border: 'border-amber-600/40 hover:border-amber-600/60', bg: 'bg-amber-900/20', icon: 'text-amber-500', badge: 'bg-amber-600/20 text-amber-400', button: 'bg-amber-600 hover:bg-amber-500 text-black' },
        { border: 'border-orange-500/40 hover:border-orange-500/60', bg: 'bg-orange-900/20', icon: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-400', button: 'bg-orange-500 hover:bg-orange-400 text-black' },
    ]
    return colors[index] || colors[0]
}

// Estimate images from tokens (20 tokens per image avg)
function estimateImages(tokens: number): number {
    return Math.floor(tokens / 20)
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
                // Only take first 3 unique packages by name
                const uniquePackages: CreditPackage[] = []
                const seenNames = new Set<string>()
                for (const pkg of data.packages || []) {
                    if (!seenNames.has(pkg.name) && uniquePackages.length < 3) {
                        seenNames.add(pkg.name)
                        uniquePackages.push(pkg)
                    }
                }
                setPackages(uniquePackages)
            }
        } catch (error) {
            console.error('Error loading packages:', error)
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
            console.error('Checkout error:', error)
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
                                            <Loader2 className="w-3 h-3 animate-spin" />
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
                <DialogContent className="bg-zinc-950/90 border-zinc-800 max-w-4xl p-0 overflow-hidden backdrop-blur-xl">
                    {/* Glossy Background Effect */}
                    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black/90 z-10" />
                        <img
                            src="/landing/login-bg-1.png"
                            alt=""
                            className="w-full h-full object-cover opacity-30 blur-3xl scale-110"
                        />
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
                                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : formatTokens(tokens)}
                                        <span className="text-sm text-zinc-500 ml-1 font-sans font-normal">tokens</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Wide 3-column packages */}
                        <div className="p-6">
                            {loadingPackages ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-500">
                                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                                    <p className="text-sm">Loading best offers...</p>
                                </div>
                            ) : packages.length === 0 ? (
                                <div className="text-center py-12 text-zinc-500 bg-white/5 rounded-xl border border-white/5 border-dashed">
                                    <Coins className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p>No packages available right now</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    {packages.map((pkg, index) => {
                                        const isPopular = index === 1 // Creator pack is most popular (middle)
                                        const colors = getTierColors(index, isPopular)
                                        const TierIcon = getTierIcon(index)
                                        const imgCount = estimateImages(pkg.total_credits)
                                        const isPurchasing = purchasingId === pkg.id

                                        return (
                                            <motion.div
                                                key={pkg.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1, duration: 0.4 }}
                                                whileHover={{ y: -4 }}
                                                className={cn(
                                                    "relative rounded-2xl border transition-all duration-300 p-5 flex flex-col group",
                                                    colors.border,
                                                    colors.bg,
                                                    isPopular ? "shadow-xl shadow-amber-900/20 bg-amber-900/10" : "bg-zinc-900/40 hover:bg-zinc-800/40"
                                                )}
                                            >
                                                {isPopular && (
                                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 shadow-lg shadow-amber-500/20">
                                                        <Badge className="px-3 py-1 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-black border-none uppercase tracking-wide">
                                                            Most Popular
                                                        </Badge>
                                                    </div>
                                                )}

                                                {/* Hover Glow */}
                                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                                {/* Compact header */}
                                                <div className="flex items-center gap-2.5 mb-4">
                                                    <div className={cn("p-1.5 rounded-lg bg-black/30 backdrop-blur-md", colors.icon)}>
                                                        <TierIcon className="w-5 h-5" />
                                                    </div>
                                                    <span className="font-bold text-lg text-white tracking-tight">{pkg.name}</span>
                                                </div>

                                                {/* Price */}
                                                <div className="mb-2">
                                                    <span className="text-4xl font-bold text-white tracking-tighter">{pkg.formatted_price}</span>
                                                </div>

                                                {/* Tokens */}
                                                <div className="flex items-baseline gap-1.5 mb-6 pb-6 border-b border-white/10">
                                                    <span className="text-xl font-bold font-mono text-amber-400">
                                                        {formatTokens(pkg.total_credits)}
                                                    </span>
                                                    <span className="text-xs text-zinc-400 font-medium uppercase">tokens</span>
                                                    {pkg.savings_percent > 0 && (
                                                        <Badge className={cn("ml-auto text-[10px] py-0 border-0", colors.badge)}>
                                                            SAVE {pkg.savings_percent}%
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Quick stat */}
                                                <div className="space-y-3 mb-6 flex-1">
                                                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                                                        <ImageIcon className="w-4 h-4 text-zinc-500" />
                                                        <span>Generates ~{imgCount} images</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                                                        <Zap className="w-4 h-4 text-zinc-500" />
                                                        <span>Priority Generation</span>
                                                    </div>
                                                </div>

                                                {/* Buy button */}
                                                <Button
                                                    size="lg"
                                                    className={cn("w-full font-bold shadow-lg transition-all duration-300", colors.button, "group-hover:scale-[1.02]")}
                                                    onClick={() => handlePurchase(pkg)}
                                                    disabled={isPurchasing}
                                                >
                                                    {isPurchasing ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        "Buy Now"
                                                    )}
                                                </Button>
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

                            {/* Redemption Section */}
                            <div className="mt-6 pt-4 border-t border-white/5 text-center flex justify-center">
                                <RedeemUsageDialog>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 bg-black/20 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                                    >
                                        <Gift className="w-4 h-4" />
                                        Have a code? Redeem it here
                                    </Button>
                                </RedeemUsageDialog>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
