"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Users,
    Coins,
    Download,
    RefreshCw,
    Image,
    Video,
    Wallet
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { FinancialStatsResponse, TimePeriod } from '../types/financials.types'

export function FinancialsTab() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<FinancialStatsResponse | null>(null)
    const [period, setPeriod] = useState<TimePeriod>('all_time')
    const [customFrom, setCustomFrom] = useState('')
    const [customTo, setCustomTo] = useState('')

    const fetchStats = useCallback(async () => {
        setLoading(true)
        try {
            let url = `/api/admin/financials?period=${period}`
            if (period === 'custom' && customFrom && customTo) {
                url += `&from=${customFrom}&to=${customTo}`
            }
            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setStats(data)
            }
        } catch (error) {
            console.error('Error fetching financials:', error)
        } finally {
            setLoading(false)
        }
    }, [period, customFrom, customTo])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    const handleExport = () => {
        const from = customFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const to = customTo || new Date().toISOString().split('T')[0]
        window.open(`/api/admin/financials/export?from=${from}&to=${to}`, '_blank')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header with Period Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <h2 className="text-lg font-semibold text-white">Financial Dashboard</h2>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
                        <SelectTrigger className="w-[140px] bg-zinc-800 border-zinc-700">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="all_time">All Time</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={fetchStats} className="bg-zinc-800 border-zinc-700">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExport} className="bg-zinc-800 border-zinc-700">
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Custom Date Range (conditional) */}
            {period === 'custom' && (
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="pt-4">
                        <div className="flex items-end gap-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-400">From</Label>
                                <Input
                                    type="date"
                                    value={customFrom}
                                    onChange={(e) => setCustomFrom(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400">To</Label>
                                <Input
                                    type="date"
                                    value={customTo}
                                    onChange={(e) => setCustomTo(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700"
                                />
                            </div>
                            <Button onClick={fetchStats}>Apply</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Revenue & Costs Cards (Row 1) */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats?.formatted.total_revenue}</div>
                        <p className="text-xs text-zinc-500">from purchases</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">API Costs</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats?.formatted.total_cost}</div>
                        <p className="text-xs text-zinc-500">{stats?.revenue.total_generations} generations</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Gross Profit</CardTitle>
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats?.formatted.gross_profit}</div>
                        <p className="text-xs text-zinc-500">{stats?.revenue.gross_margin_percent}% margin</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Avg Cost/Gen</CardTitle>
                        <Coins className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            ${((stats?.revenue.average_cost_per_generation || 0) / 100).toFixed(2)}
                        </div>
                        <p className="text-xs text-zinc-500">per generation</p>
                    </CardContent>
                </Card>
            </div>

            {/* User Economics Cards (Row 2) */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Paying Users</CardTitle>
                        <Users className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats?.users.paying_users}</div>
                        <p className="text-xs text-zinc-500">
                            of {stats?.users.total_users} total ({stats?.users.conversion_rate_percent}%)
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">ARPU</CardTitle>
                        <Wallet className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats?.formatted.avg_revenue_per_user}</div>
                        <p className="text-xs text-zinc-500">revenue per user</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">LTV</CardTitle>
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            ${((stats?.users.lifetime_value || 0) / 100).toFixed(2)}
                        </div>
                        <p className="text-xs text-zinc-500">avg per paying user</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Unused Credits</CardTitle>
                        <Coins className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats?.formatted.tokens_unused}</div>
                        <p className="text-xs text-zinc-500">
                            {stats?.tokens.usage_rate_percent}% usage rate
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Generation Type Breakdown */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Image className="w-4 h-4 text-blue-500" />
                            Image Generations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-zinc-400">Count</span>
                                <span className="text-white font-mono">{stats?.byType.image.count}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-400">Revenue</span>
                                <span className="text-green-400 font-mono">
                                    ${((stats?.byType.image.revenue_cents || 0) / 100).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-400">Cost</span>
                                <span className="text-red-400 font-mono">
                                    ${((stats?.byType.image.cost_cents || 0) / 100).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-zinc-800 pt-2">
                                <span className="text-zinc-400">Profit</span>
                                <span className="text-amber-400 font-mono font-bold">
                                    ${(((stats?.byType.image.revenue_cents || 0) - (stats?.byType.image.cost_cents || 0)) / 100).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Video className="w-4 h-4 text-purple-500" />
                            Video Generations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-zinc-400">Count</span>
                                <span className="text-white font-mono">{stats?.byType.video.count}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-400">Revenue</span>
                                <span className="text-green-400 font-mono">
                                    ${((stats?.byType.video.revenue_cents || 0) / 100).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-400">Cost</span>
                                <span className="text-red-400 font-mono">
                                    ${((stats?.byType.video.cost_cents || 0) / 100).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-zinc-800 pt-2">
                                <span className="text-zinc-400">Profit</span>
                                <span className="text-amber-400 font-mono font-bold">
                                    ${(((stats?.byType.video.revenue_cents || 0) - (stats?.byType.video.cost_cents || 0)) / 100).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue by Model Table */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white">Revenue by Model</CardTitle>
                    <CardDescription>Which models generate the most revenue</CardDescription>
                </CardHeader>
                <CardContent>
                    {stats?.byModel && stats.byModel.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-zinc-800">
                                    <TableHead className="text-zinc-400">Model</TableHead>
                                    <TableHead className="text-zinc-400">Type</TableHead>
                                    <TableHead className="text-zinc-400 text-right">Generations</TableHead>
                                    <TableHead className="text-zinc-400 text-right">Revenue</TableHead>
                                    <TableHead className="text-zinc-400 text-right">Cost</TableHead>
                                    <TableHead className="text-zinc-400 text-right">Margin</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.byModel.slice(0, 10).map((model) => (
                                    <TableRow key={model.model_id} className="border-zinc-800">
                                        <TableCell className="text-white font-medium">
                                            {model.model_name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={
                                                model.generation_type === 'video'
                                                    ? 'border-purple-500 text-purple-400'
                                                    : 'border-blue-500 text-blue-400'
                                            }>
                                                {model.generation_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-zinc-400 font-mono text-right">
                                            {model.generation_count}
                                        </TableCell>
                                        <TableCell className="text-green-400 font-mono text-right">
                                            ${(model.revenue_cents / 100).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-red-400 font-mono text-right">
                                            ${(model.cost_cents / 100).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className={model.margin_percent >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                {model.margin_percent}%
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8 text-zinc-500">
                            No generation data for this period
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
