
"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Plus, RefreshCw, Search, Calendar, Users } from "lucide-react"
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth"
import { toast } from "sonner"
import { format, addDays, addMonths } from "date-fns"

interface Coupon {
    id: string
    code: string
    points: number
    max_uses: number | null
    used_count: number
    expires_at: string | null
    is_active: boolean
    created_at: string
}

interface Redemption {
    id: string
    coupon_id: string
    user_id: string
    redeemed_at: string
    user_email?: string
}

export default function AdminCouponsPage() {
    const { isAdmin, loading: authLoading } = useAdminAuth()
    const [loading, setLoading] = useState(false)
    const [coupons, setCoupons] = useState<Coupon[]>([])

    // User Stats State
    const [userStats, setUserStats] = useState<{
        user_id: string
        email: string
        balance: number
        lifetime_purchased: number
        lifetime_used: number
        created_at?: string
    }[]>([])
    const [loadingStats, setLoadingStats] = useState(false)
    const [statsSearch, setStatsSearch] = useState("")

    useEffect(() => {
        if (isAdmin) {
            fetchCoupons()
            fetchUserStats()
        }
    }, [isAdmin])

    const fetchCoupons = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/coupons')
            if (!res.ok) {
                console.error('Failed to fetch coupons:', res.status)
                return
            }
            const text = await res.text()
            if (!text) {
                setCoupons([])
                return
            }
            const data = JSON.parse(text)
            setCoupons(data.coupons || [])
        } catch (error) {
            console.error('Error fetching coupons:', error)
            toast.error('Failed to load coupons')
        } finally {
            setLoading(false)
        }
    }

    const fetchUserStats = async () => {
        setLoadingStats(true)
        try {
            const res = await fetch('/api/admin/users')
            if (!res.ok) {
                console.error('Failed to fetch user stats:', res.status)
                return
            }
            const text = await res.text()
            if (!text) {
                setUserStats([])
                return
            }
            const data = JSON.parse(text)
            if (data.users) {
                // Map API response to expected format
                const mappedUsers = data.users.map((u: {
                    id: string
                    email: string
                    created_at?: string
                    credits?: { balance: number; lifetime_used: number; lifetime_purchased: number }
                }) => ({
                    user_id: u.id,
                    email: u.email,
                    balance: u.credits?.balance || 0,
                    lifetime_purchased: u.credits?.lifetime_purchased || 0,
                    lifetime_used: u.credits?.lifetime_used || 0,
                    created_at: u.created_at
                }))
                // Sort by lifetime_purchased descending (biggest spenders first)
                mappedUsers.sort((a: { lifetime_purchased: number }, b: { lifetime_purchased: number }) =>
                    b.lifetime_purchased - a.lifetime_purchased
                )
                setUserStats(mappedUsers)
            }
        } catch (error) {
            console.error('Error fetching user stats:', error)
        } finally {
            setLoadingStats(false)
        }
    }

    if (authLoading) return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin" /></div>
    if (!isAdmin) return <div className="p-8 text-center text-red-500">Unauthorized</div>

    const filteredStats = userStats.filter(u =>
        u.email?.toLowerCase().includes(statsSearch.toLowerCase()) ||
        u.user_id?.includes(statsSearch)
    )

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Manage coupons and view user activity.</p>
                </div>
            </div>

            <Tabs defaultValue="coupons" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="coupons">Coupon Management</TabsTrigger>
                    <TabsTrigger value="users">User Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="coupons" className="space-y-4">
                    <div className="flex justify-between items-center bg-card p-4 rounded-lg border">
                        <h2 className="text-xl font-semibold">Active Coupons</h2>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={fetchCoupons} disabled={loading}>
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <CreateCouponDialog onSuccess={fetchCoupons} />
                        </div>
                    </div>

                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Points</TableHead>
                                    <TableHead>Usage</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead>Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {coupons.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No coupons found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    coupons.map((coupon) => {
                                        const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date()
                                        const isExhausted = coupon.max_uses !== null && coupon.used_count >= coupon.max_uses
                                        const isAvailable = coupon.is_active && !isExpired && !isExhausted

                                        return (
                                            <TableRow key={coupon.id} className={!isAvailable ? 'opacity-60' : ''}>
                                                <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                                                <TableCell>{coupon.points}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Users className="h-3 w-3 text-muted-foreground" />
                                                        <span>{coupon.used_count}</span>
                                                        {coupon.max_uses !== null && (
                                                            <span className="text-muted-foreground">/ {coupon.max_uses}</span>
                                                        )}
                                                        {coupon.max_uses === null && (
                                                            <span className="text-muted-foreground">/ ∞</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {!coupon.is_active ? (
                                                        <Badge variant="secondary">Inactive</Badge>
                                                    ) : isExpired ? (
                                                        <Badge variant="destructive">Expired</Badge>
                                                    ) : isExhausted ? (
                                                        <Badge variant="secondary">Exhausted</Badge>
                                                    ) : coupon.max_uses === 1 ? (
                                                        <Badge variant="outline" className="border-amber-500 text-amber-500">One-Time</Badge>
                                                    ) : (
                                                        <Badge variant="default">Active</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {coupon.expires_at ? (
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {format(new Date(coupon.expires_at), 'PP')}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground/50">No expiry</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {format(new Date(coupon.created_at), 'PP')}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="users" className="space-y-4">
                    <div className="flex justify-between items-center bg-card p-4 rounded-lg border">
                        <div>
                            <h2 className="text-xl font-semibold">User Purchase Tracking</h2>
                            <p className="text-sm text-muted-foreground">
                                {userStats.length} users • Sorted by lifetime purchases
                            </p>
                        </div>
                        <div className="flex gap-2 items-center">
                            <div className="relative max-w-xs">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search email..."
                                    className="pl-8 w-64"
                                    value={statsSearch}
                                    onChange={(e) => setStatsSearch(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="sm" onClick={fetchUserStats} disabled={loadingStats}>
                                <RefreshCw className={`w-4 h-4 mr-2 ${loadingStats ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card className="p-4">
                            <div className="text-sm text-muted-foreground">Total Revenue</div>
                            <div className="text-2xl font-bold text-green-500">
                                ${(userStats.reduce((sum, u) => sum + u.lifetime_purchased, 0) / 100).toFixed(2)}
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="text-sm text-muted-foreground">Total Used</div>
                            <div className="text-2xl font-bold text-amber-500">
                                ${(userStats.reduce((sum, u) => sum + u.lifetime_used, 0) / 100).toFixed(2)}
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="text-sm text-muted-foreground">Total Balance</div>
                            <div className="text-2xl font-bold">
                                ${(userStats.reduce((sum, u) => sum + u.balance, 0) / 100).toFixed(2)}
                            </div>
                        </Card>
                    </div>

                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                    <TableHead className="text-right">Purchased</TableHead>
                                    <TableHead className="text-right">Used</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStats.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            {loadingStats ? "Loading user stats..." : "No users found."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredStats.map((user, index) => (
                                        <TableRow key={user.user_id || `user-${index}`}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{user.email || 'Unknown'}</span>
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {user.user_id?.slice(0, 8) || 'N/A'}...
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                ${(user.balance / 100).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {user.lifetime_purchased > 0 ? (
                                                    <span className="text-green-500 font-medium">
                                                        ${(user.lifetime_purchased / 100).toFixed(2)}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">$0.00</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {user.lifetime_used > 0 ? (
                                                    <span className="text-amber-500">
                                                        ${(user.lifetime_used / 100).toFixed(2)}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">$0.00</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function CreateCouponDialog({ onSuccess }: { onSuccess: () => void }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isOneTime, setIsOneTime] = useState(false)
    const [expirationPreset, setExpirationPreset] = useState<'none' | '7days' | '30days' | '90days' | 'custom'>('none')
    const [formData, setFormData] = useState({
        code: '',
        points: '100',
        max_uses: '',
        expires_at: ''
    })

    // Update max_uses when one-time checkbox changes
    const handleOneTimeChange = (checked: boolean) => {
        setIsOneTime(checked)
        if (checked) {
            setFormData({ ...formData, max_uses: '1' })
        } else {
            setFormData({ ...formData, max_uses: '' })
        }
    }

    // Update expires_at when preset changes
    const handleExpirationPresetChange = (preset: typeof expirationPreset) => {
        setExpirationPreset(preset)
        let expiresAt = ''
        if (preset === '7days') {
            expiresAt = addDays(new Date(), 7).toISOString()
        } else if (preset === '30days') {
            expiresAt = addMonths(new Date(), 1).toISOString()
        } else if (preset === '90days') {
            expiresAt = addMonths(new Date(), 3).toISOString()
        }
        setFormData({ ...formData, expires_at: expiresAt })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const payload = {
                code: formData.code,
                points: formData.points,
                max_uses: formData.max_uses || undefined,
                expires_at: formData.expires_at || undefined
            }

            const res = await fetch('/api/coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            if (!res.ok) throw new Error('Failed')

            toast.success("Coupon created!")
            setOpen(false)
            setFormData({ code: '', points: '100', max_uses: '', expires_at: '' })
            setIsOneTime(false)
            setExpirationPreset('none')
            onSuccess()
        } catch {
            toast.error("Failed to create coupon")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-2" /> New Coupon</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <h3 className="text-lg font-medium">Create New Coupon</h3>
                        <p className="text-sm text-muted-foreground">Issues a code for free credits.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Code</label>
                        <Input
                            placeholder="e.g. SUMMER2025"
                            required
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Points Amount</label>
                        <Input
                            type="number"
                            required
                            min="1"
                            value={formData.points}
                            onChange={e => setFormData({ ...formData, points: e.target.value })}
                        />
                    </div>

                    <div className="space-y-3 border border-border rounded-lg p-3">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="one-time"
                                checked={isOneTime}
                                onCheckedChange={(checked) => handleOneTimeChange(checked === true)}
                            />
                            <label htmlFor="one-time" className="text-sm font-medium cursor-pointer">
                                One-time use only
                            </label>
                        </div>

                        {!isOneTime && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Max Uses (Optional)</label>
                                <Input
                                    type="number"
                                    placeholder="Unlimited"
                                    min="1"
                                    value={formData.max_uses}
                                    onChange={e => setFormData({ ...formData, max_uses: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 border border-border rounded-lg p-3">
                        <label className="text-sm font-medium">Expiration</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { value: 'none', label: 'Never' },
                                { value: '7days', label: '7 Days' },
                                { value: '30days', label: '30 Days' },
                                { value: '90days', label: '90 Days' },
                            ].map(opt => (
                                <Button
                                    key={opt.value}
                                    type="button"
                                    size="sm"
                                    variant={expirationPreset === opt.value ? 'default' : 'outline'}
                                    onClick={() => handleExpirationPresetChange(opt.value as typeof expirationPreset)}
                                    className="text-xs"
                                >
                                    {opt.label}
                                </Button>
                            ))}
                        </div>
                        {formData.expires_at && (
                            <p className="text-xs text-muted-foreground">
                                Expires: {format(new Date(formData.expires_at), 'PPP')}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end pt-4 gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Create Coupon
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
