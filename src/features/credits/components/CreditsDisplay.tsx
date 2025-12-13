"use client"

import { useEffect, useState } from 'react'
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
import { Coins, Plus, Loader2, Sparkles, Zap, Star, Crown, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/utils/utils'

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
                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl p-0">
                    {/* Compact Header */}
                    <div className="p-5 pb-4 border-b border-zinc-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/20 rounded-lg">
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                    <DialogHeader>
                                        <DialogTitle className="text-xl font-bold text-white">Token Store</DialogTitle>
                                    </DialogHeader>
                                    <p className="text-sm text-zinc-500">Power your creative workflow</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-zinc-500">Your Balance</div>
                                <div className="text-2xl font-bold font-mono text-amber-400">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatTokens(tokens)}
                                    <span className="text-sm text-zinc-500 ml-1">tokens</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Wide 3-column packages */}
                    <div className="p-5">
                        {loadingPackages ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                            </div>
                        ) : packages.length === 0 ? (
                            <div className="text-center py-8 text-zinc-500">
                                <Coins className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>No packages available</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-4">
                                {packages.map((pkg, index) => {
                                    const isPopular = index === 1 // Creator pack is most popular (middle)
                                    const colors = getTierColors(index, isPopular)
                                    const TierIcon = getTierIcon(index)
                                    const imgCount = estimateImages(pkg.total_credits)
                                    const isPurchasing = purchasingId === pkg.id

                                    return (
                                        <div
                                            key={pkg.id}
                                            className={cn(
                                                "relative rounded-xl border-2 transition-all p-4",
                                                colors.border,
                                                colors.bg,
                                                isPopular && "scale-[1.02] shadow-lg shadow-amber-500/10"
                                            )}
                                        >
                                            {isPopular && (
                                                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                                    <Badge className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500 text-black">
                                                        Most Popular
                                                    </Badge>
                                                </div>
                                            )}

                                            {/* Compact header */}
                                            <div className="flex items-center gap-2 mb-3">
                                                <TierIcon className={cn("w-4 h-4", colors.icon)} />
                                                <span className="font-semibold text-white">{pkg.name}</span>
                                            </div>

                                            {/* Price */}
                                            <div className="text-3xl font-bold text-white mb-1">
                                                {pkg.formatted_price}
                                            </div>

                                            {/* Tokens */}
                                            <div className="flex items-baseline gap-1 mb-3">
                                                <span className="text-xl font-bold font-mono text-amber-400">
                                                    {formatTokens(pkg.total_credits)}
                                                </span>
                                                <span className="text-xs text-zinc-500">tokens</span>
                                                {pkg.savings_percent > 0 && (
                                                    <Badge className={cn("ml-2 text-[10px] py-0", colors.badge)}>
                                                        +{pkg.savings_percent}%
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Quick stat */}
                                            <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-3">
                                                <ImageIcon className="w-3.5 h-3.5" />
                                                <span>~{imgCount} images</span>
                                            </div>

                                            {/* Buy button */}
                                            <Button
                                                size="sm"
                                                className={cn("w-full font-semibold", colors.button)}
                                                onClick={() => handlePurchase(pkg)}
                                                disabled={isPurchasing}
                                            >
                                                {isPurchasing ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    "Get Tokens"
                                                )}
                                            </Button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Compact footer */}
                        <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-zinc-800 text-[11px] text-zinc-500">
                            <span>Secure checkout</span>
                            <span>•</span>
                            <span>Tokens never expire</span>
                            <span>•</span>
                            <span>Instant delivery</span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
