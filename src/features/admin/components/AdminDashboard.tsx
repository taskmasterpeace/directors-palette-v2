"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Users, DollarSign, TrendingUp, Gift, Search, RefreshCw, Shield, Sparkles, Ticket, FileText, UsersRound, Key, Banknote, Palette } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { GenerationsTable } from './GenerationsTable'
import { GenerationStats } from './GenerationStats'
import { CouponsTab } from './CouponsTab'
import { CommunityModerationTab } from './CommunityModerationTab'
import { ApiUsageTab } from './ApiUsageTab'
import { FinancialsTab } from './FinancialsTab'
import { RecipesTab } from './RecipesTab'
import { StyleSheetsTab } from './StyleSheetsTab'
import { PromptTemplateEditor } from '@/features/prompt-templates'

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
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    const handleExportLogs = () => {
        const today = new Date()
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        const since = thirtyDaysAgo.toISOString().split('T')[0]
        const until = today.toISOString().split('T')[0]
        window.open(`/api/admin/export-logs?since=${since}&until=${until}`, '_blank')
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                        Admin Dashboard
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage users, credits, and view analytics
                    </p>
                </div>
                <Button onClick={loadData} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="users" className="space-y-6">
                <TabsList className="bg-zinc-800 flex-wrap h-auto gap-1 p-1">
                    <TabsTrigger value="users" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                        <Users className="w-4 h-4 mr-2" />
                        Users
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Activity
                    </TabsTrigger>
                    <TabsTrigger value="coupons" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                        <Ticket className="w-4 h-4 mr-2" />
                        Coupons
                    </TabsTrigger>
                    <TabsTrigger value="templates" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                        <FileText className="w-4 h-4 mr-2" />
                        Templates
                    </TabsTrigger>
                    <TabsTrigger value="community" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                        <UsersRound className="w-4 h-4 mr-2" />
                        Community
                    </TabsTrigger>
                    <TabsTrigger value="api" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                        <Key className="w-4 h-4 mr-2" />
                        API
                    </TabsTrigger>
                    <TabsTrigger value="financials" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                        <Banknote className="w-4 h-4 mr-2" />
                        Financials
                    </TabsTrigger>
                    <TabsTrigger value="recipes" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Recipes
                    </TabsTrigger>
                    <TabsTrigger value="styles" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                        <Palette className="w-4 h-4 mr-2" />
                        Styles
                    </TabsTrigger>
                </TabsList>

                {/* Users Tab */}
                <TabsContent value="users" className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
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
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
                        <div className="flex items-center gap-2 flex-1">
                            <Search className="w-4 h-4 text-zinc-500 hidden sm:block" />
                            <Input
                                placeholder="Search by email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                                className="bg-zinc-800 border-zinc-700"
                            />
                        </div>
                        <Button onClick={fetchUsers} variant="secondary" size="sm" className="w-full sm:w-auto">
                            Search
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-zinc-800">
                                <TableHead className="text-zinc-400">Email</TableHead>
                                <TableHead className="text-zinc-400">Balance</TableHead>
                                <TableHead className="text-zinc-400 hidden sm:table-cell">
                                    <div className="flex items-center gap-1">
                                        <Sparkles className="w-3 h-3 text-amber-500" />
                                        Gens
                                    </div>
                                </TableHead>
                                <TableHead className="text-zinc-400 hidden md:table-cell">Purchased</TableHead>
                                <TableHead className="text-zinc-400 hidden md:table-cell">Used</TableHead>
                                <TableHead className="text-zinc-400 hidden lg:table-cell">Joined</TableHead>
                                <TableHead className="text-zinc-400">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id} className="border-zinc-800">
                                    <TableCell className="font-medium text-white">
                                        <div className="flex flex-col">
                                            <span className="truncate max-w-[120px] sm:max-w-none">{user.email}</span>
                                            <div className="flex gap-1 flex-wrap">
                                                {user.is_admin && (
                                                    <Badge variant="outline" className="border-amber-500 text-amber-500 text-xs">
                                                        Admin
                                                    </Badge>
                                                )}
                                                {user.email === currentUserEmail && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        You
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-green-400 font-mono text-sm">
                                        {user.formatted_balance}
                                    </TableCell>
                                    <TableCell className="text-amber-400 font-mono font-bold hidden sm:table-cell">
                                        {Math.floor((user.credits?.balance || 0) / COST_PER_GENERATION)}
                                    </TableCell>
                                    <TableCell className="text-zinc-400 font-mono hidden md:table-cell">
                                        ${((user.credits?.lifetime_purchased || 0) / 100).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-zinc-400 font-mono hidden md:table-cell">
                                        ${((user.credits?.lifetime_used || 0) / 100).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-zinc-500 hidden lg:table-cell">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openGrantDialog(user)}
                                            className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                                        >
                                            <Gift className="w-4 h-4 sm:mr-1" />
                                            <span className="hidden sm:inline">Grant</span>
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
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="space-y-6">
                    <GenerationStats />
                    <GenerationsTable onExportLogs={handleExportLogs} />
                </TabsContent>

                {/* Coupons Tab */}
                <TabsContent value="coupons" className="space-y-6">
                    <CouponsTab />
                </TabsContent>

                {/* Templates Tab */}
                <TabsContent value="templates" className="space-y-6">
                    <PromptTemplateEditor />
                </TabsContent>

                {/* Community Tab */}
                <TabsContent value="community" className="space-y-6">
                    <CommunityModerationTab />
                </TabsContent>

                {/* API Tab */}
                <TabsContent value="api" className="space-y-6">
                    <ApiUsageTab />
                </TabsContent>

                {/* Financials Tab */}
                <TabsContent value="financials" className="space-y-6">
                    <FinancialsTab />
                </TabsContent>

                {/* Recipes Tab */}
                <TabsContent value="recipes" className="space-y-6">
                    <RecipesTab />
                </TabsContent>

                {/* Styles Tab */}
                <TabsContent value="styles" className="space-y-6">
                    <StyleSheetsTab />
                </TabsContent>
            </Tabs>

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
                                    <LoadingSpinner size="sm" color="current" className="mr-2" />
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
