"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, RefreshCw, Ticket } from "lucide-react"
import { toast } from "sonner"

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

export function CouponsTab() {
    const [loading, setLoading] = useState(false)
    const [coupons, setCoupons] = useState<Coupon[]>([])

    const fetchCoupons = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/coupons')
            const data = await res.json()
            if (res.ok) {
                setCoupons(data.coupons || [])
            }
        } catch (error) {
            console.error('Error fetching coupons:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchCoupons()
    }, [fetchCoupons])

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Never'
        return new Date(dateStr).toLocaleDateString()
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-semibold text-white">Coupon Management</h2>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchCoupons} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <CreateCouponDialog onSuccess={fetchCoupons} />
                </div>
            </div>

            {/* Coupons Table */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white">Active Coupons</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-zinc-800">
                                <TableHead className="text-zinc-400">Code</TableHead>
                                <TableHead className="text-zinc-400">Points</TableHead>
                                <TableHead className="text-zinc-400">Uses</TableHead>
                                <TableHead className="text-zinc-400">Status</TableHead>
                                <TableHead className="text-zinc-400">Expires</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" />
                                    </TableCell>
                                </TableRow>
                            ) : coupons.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                                        No coupons found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                coupons.map((coupon) => (
                                    <TableRow key={coupon.id} className="border-zinc-800">
                                        <TableCell className="font-mono font-bold text-amber-400">
                                            {coupon.code}
                                        </TableCell>
                                        <TableCell className="text-white">
                                            {coupon.points} pts
                                        </TableCell>
                                        <TableCell className="text-zinc-400">
                                            {coupon.used_count} / {coupon.max_uses || '∞'}
                                        </TableCell>
                                        <TableCell>
                                            {coupon.is_active ? (
                                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                                    Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">
                                                    Inactive
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-zinc-500">
                                            {formatDate(coupon.expires_at)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
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
                body: JSON.stringify({
                    code: formData.code,
                    points: parseInt(formData.points),
                    max_uses: formData.max_uses ? parseInt(formData.max_uses) : undefined
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create coupon')
            }

            toast.success(`Coupon "${formData.code}" created!`)
            setOpen(false)
            setFormData({ code: '', points: '100', max_uses: '' })
            onSuccess()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create coupon")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-amber-500 text-black hover:bg-amber-600">
                    <Plus className="w-4 h-4 mr-2" /> New Coupon
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-white">Create New Coupon</DialogTitle>
                    <DialogDescription>
                        Create a coupon code that users can redeem for free credits.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="code">Coupon Code</Label>
                        <Input
                            id="code"
                            placeholder="e.g. WELCOME2025"
                            required
                            className="bg-zinc-800 border-zinc-700 uppercase"
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="points">Points Amount</Label>
                            <Input
                                id="points"
                                type="number"
                                required
                                min="1"
                                className="bg-zinc-800 border-zinc-700"
                                value={formData.points}
                                onChange={e => setFormData({ ...formData, points: e.target.value })}
                            />
                            <p className="text-xs text-zinc-500">
                                = ${(parseInt(formData.points) / 100).toFixed(2)} value
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="max_uses">Max Uses</Label>
                            <Input
                                id="max_uses"
                                type="number"
                                placeholder="Unlimited"
                                min="1"
                                className="bg-zinc-800 border-zinc-700"
                                value={formData.max_uses}
                                onChange={e => setFormData({ ...formData, max_uses: e.target.value })}
                            />
                            <p className="text-xs text-zinc-500">
                                Leave empty for unlimited
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !formData.code}
                            className="bg-amber-500 text-black hover:bg-amber-600"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Coupon'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
