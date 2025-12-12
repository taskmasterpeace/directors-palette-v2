"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Users, DollarSign, TrendingUp, Gift, Search, RefreshCw, Shield, Loader2, Sparkles } from 'lucide-react'

// Cost per image generation in cents (matches FALLBACK_PRICING.image.price_cents)
const COST_PER_GENERATION = 20
import type { UserWithCredits, AdminStatsResponse } from '../types/admin.types'

interface AdminDashboardProps {
    currentUserEmail: string
}

export function AdminDashboard({ currentUserEmail }: AdminDashboardProps) {
    const [users, setUsers] = useState<(UserWithCredits & { formatted_balance: string; is_admin: boolean })[]>([])
    const [stats, setStats] = useState<AdminStatsResponse & { formatted: Record<string, string> } | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [grantDialogOpen, setGrantDialogOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<UserWithCredits | null>(null)
    const [grantAmount, setGrantAmount] = useState('')
    const [grantDescription, setGrantDescription] = useState('')
    const [granting, setGranting] = useState(false)

    const fetchUsers = useCallback(async () => {
        try {
            const params = new URLSearchParams()
            if (searchQuery) params.set('search', searchQuery)

            const res = await fetch(`/api/admin/users?${params}`)
            if (!res.ok) throw new Error('Failed to fetch users')
            const data = await res.json()
            setUsers(data.users || [])
        } catch (error) {
            console.error('Error fetching users:', error)
        }
    }, [searchQuery])

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/stats')
            if (!res.ok) throw new Error('Failed to fetch stats')
            const data = await res.json()
            setStats(data)
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }, [])

    const loadData = useCallback(async () => {
        setLoading(true)
        await Promise.all([fetchUsers(), fetchStats()])
        setLoading(false)
    }, [fetchUsers, fetchStats])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleGrantCredits = async () => {
        if (!selectedUser || !grantAmount) return

        const amount = parseInt(grantAmount)
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid positive amount')
            return
        }

        setGranting(true)
        try {
            const res = await fetch('/api/admin/grant-credits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: selectedUser.id,
                    amount,
                    description: grantDescription || undefined
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to grant credits')
            }

            alert(`Successfully granted ${amount} credits ($${(amount / 100).toFixed(2)}) to ${selectedUser.email}`)
            setGrantDialogOpen(false)
            setGrantAmount('')
            setGrantDescription('')
            setSelectedUser(null)
            await fetchUsers()
        } catch (error) {
            console.error('Error granting credits:', error)
            alert(error instanceof Error ? error.message : 'Failed to grant credits')
        } finally {
            setGranting(false)
        }
    }

    const openGrantDialog = (user: UserWithCredits) => {
        setSelectedUser(user)
        setGrantDialogOpen(true)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-amber-500" />
                        Admin Dashboard
                    </h1>
                    <p className="text-muted-foreground">
                        Manage users and credits
                    </p>
                </div>
                <Button onClick={loadData} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats?.total_users || 0}</div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Credits Purchased</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats?.formatted?.total_purchased || '$0.00'}</div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Credits Used</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats?.formatted?.total_used || '$0.00'}</div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats?.formatted?.total_revenue || '$0.00'}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Users Table */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white">Users</CardTitle>
                    <CardDescription>All registered users and their credit balances</CardDescription>
                    <div className="flex items-center gap-2 mt-4">
                        <Search className="w-4 h-4 text-zinc-500" />
                        <Input
                            placeholder="Search by email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                            className="max-w-sm bg-zinc-800 border-zinc-700"
                        />
                        <Button onClick={fetchUsers} variant="secondary" size="sm">
                            Search
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-zinc-800">
                                <TableHead className="text-zinc-400">Email</TableHead>
                                <TableHead className="text-zinc-400">Balance</TableHead>
                                <TableHead className="text-zinc-400">
                                    <div className="flex items-center gap-1">
                                        <Sparkles className="w-3 h-3 text-amber-500" />
                                        Gens
                                    </div>
                                </TableHead>
                                <TableHead className="text-zinc-400">Purchased</TableHead>
                                <TableHead className="text-zinc-400">Used</TableHead>
                                <TableHead className="text-zinc-400">Joined</TableHead>
                                <TableHead className="text-zinc-400">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id} className="border-zinc-800">
                                    <TableCell className="font-medium text-white">
                                        {user.email}
                                        {user.is_admin && (
                                            <Badge variant="outline" className="ml-2 border-amber-500 text-amber-500">
                                                Admin
                                            </Badge>
                                        )}
                                        {user.email === currentUserEmail && (
                                            <Badge variant="secondary" className="ml-2">
                                                You
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-green-400 font-mono">
                                        {user.formatted_balance}
                                    </TableCell>
                                    <TableCell className="text-amber-400 font-mono font-bold">
                                        {Math.floor((user.credits?.balance || 0) / COST_PER_GENERATION)}
                                    </TableCell>
                                    <TableCell className="text-zinc-400 font-mono">
                                        ${((user.credits?.lifetime_purchased || 0) / 100).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-zinc-400 font-mono">
                                        ${((user.credits?.lifetime_used || 0) / 100).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-zinc-500">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openGrantDialog(user)}
                                            className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                                        >
                                            <Gift className="w-4 h-4 mr-1" />
                                            Grant
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-zinc-500 py-8">
                                        No users found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Grant Credits Dialog */}
            <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="text-white">Grant Credits</DialogTitle>
                        <DialogDescription>
                            Grant credits to {selectedUser?.email}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount (in cents)</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="e.g., 500 = $5.00"
                                value={grantAmount}
                                onChange={(e) => setGrantAmount(e.target.value)}
                                className="bg-zinc-800 border-zinc-700"
                            />
                            {grantAmount && !isNaN(parseInt(grantAmount)) && (
                                <p className="text-sm text-zinc-500">
                                    = ${(parseInt(grantAmount) / 100).toFixed(2)}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description (optional)</Label>
                            <Input
                                id="description"
                                placeholder="e.g., Welcome bonus"
                                value={grantDescription}
                                onChange={(e) => setGrantDescription(e.target.value)}
                                className="bg-zinc-800 border-zinc-700"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setGrantDialogOpen(false)}
                            disabled={granting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleGrantCredits}
                            disabled={granting || !grantAmount}
                            className="bg-amber-500 text-black hover:bg-amber-600"
                        >
                            {granting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Granting...
                                </>
                            ) : (
                                <>
                                    <Gift className="w-4 h-4 mr-2" />
                                    Grant Credits
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
