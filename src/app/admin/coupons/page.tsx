
"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, RefreshCw, Search } from "lucide-react"
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth"
import { toast } from "sonner"
import { format } from "date-fns"

export default function AdminCouponsPage() {
    const { isAdmin, loading: authLoading } = useAdminAuth()
    const [loading, setLoading] = useState(false)
    const [coupons, setCoupons] = useState<{ id: string; code: string; credits: number; used: boolean; expires_at: string | null }[]>([])

    // User Stats State
    const [userStats, setUserStats] = useState<{ user_id: string; email: string; total_generations: number; credits_used: number }[]>([])
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
                const mappedUsers = data.users.map((u: { id: string; email: string; credits?: { balance: number; lifetime_used: number } }) => ({
                    user_id: u.id,
                    email: u.email,
                    total_generations: 0, // Not available from this endpoint
                    credits_used: u.credits?.lifetime_used || 0
                }))
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
                                    <TableHead>Credits</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Expires</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {coupons.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No coupons found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    coupons.map((coupon) => (
                                        <TableRow key={coupon.id}>
                                            <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                                            <TableCell>{coupon.credits}</TableCell>
                                            <TableCell>
                                                <Badge variant={coupon.used ? 'secondary' : 'default'}>
                                                    {coupon.used ? 'Used' : 'Available'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {coupon.expires_at ? format(new Date(coupon.expires_at), 'PPP') : 'No expiry'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="users" className="space-y-4">
                    <div className="flex gap-4 items-center mb-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search email..."
                                className="pl-8"
                                value={statsSearch}
                                onChange={(e) => setStatsSearch(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchUserStats} disabled={loadingStats}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loadingStats ? 'animate-spin' : ''}`} />
                            Refresh Stats
                        </Button>
                    </div>

                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead className="text-right">Generations</TableHead>
                                    <TableHead className="text-right">Credits Used</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStats.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                            {loadingStats ? "Loading user stats..." : "No users found."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredStats.map((user, index) => (
                                        <TableRow key={user.user_id || `user-${index}`}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{user.email || 'Unknown'}</span>
                                                    <span className="text-xs text-muted-foreground font-mono">{user.user_id?.slice(0, 8) || 'N/A'}...</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {user.total_generations}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {user.credits_used}
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
    const [formData, setFormData] = useState({
        code: '',
        points: '100',
        max_uses: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch('/api/coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            if (!res.ok) throw new Error('Failed')

            toast.success("Coupon created!")
            setOpen(false)
            setFormData({ code: '', points: '100', max_uses: '' })
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
            <DialogContent>
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
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={loading}>Create Coupon</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
