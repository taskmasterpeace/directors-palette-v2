"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Image as ImageIcon, Sparkles, TrendingUp, Users } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { GenerationStatsResponse } from '../types/generation-events.types'
import { createLogger } from '@/lib/logger'


const log = createLogger('Admin')
export function GenerationStats() {
    const [stats, setStats] = useState<GenerationStatsResponse | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/admin/generations/stats')
                if (!res.ok) throw new Error('Failed to fetch stats')
                const data = await res.json()
                setStats(data)
            } catch (error) {
                log.error('Error fetching generation stats', { error: error instanceof Error ? error.message : String(error) })
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="bg-zinc-900 border-zinc-800">
                        <CardContent className="flex items-center justify-center py-8">
                            <LoadingSpinner />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Total Generations</CardTitle>
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">{stats?.total || 0}</div>
                    <p className="text-xs text-zinc-500">
                        {stats?.today || 0} today
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">This Week</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">{stats?.thisWeek || 0}</div>
                    <p className="text-xs text-zinc-500">
                        generations
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Credits Used</CardTitle>
                    <Sparkles className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">
                        ${((stats?.totalCreditsUsed || 0) / 100).toFixed(2)}
                    </div>
                    <p className="text-xs text-zinc-500">
                        from generations
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Active Users</CardTitle>
                    <Users className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">{stats?.uniqueUsers || 0}</div>
                    <p className="text-xs text-zinc-500">
                        unique generators
                    </p>
                </CardContent>
            </Card>

            {/* Top Models */}
            {stats?.byModel && stats.byModel.length > 0 && (
                <Card className="bg-zinc-900 border-zinc-800 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-zinc-400">Top Models</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {stats.byModel.slice(0, 5).map((model) => (
                                <div key={model.model_id} className="flex items-center justify-between">
                                    <span className="text-sm text-zinc-300">{model.model_name || model.model_id}</span>
                                    <span className="text-sm text-amber-400 font-mono">{model.count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Top Users */}
            {stats?.topUsers && stats.topUsers.length > 0 && (
                <Card className="bg-zinc-900 border-zinc-800 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-zinc-400">Top Generators</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {stats.topUsers.slice(0, 5).map((user) => (
                                <div key={user.user_id} className="flex items-center justify-between">
                                    <span className="text-sm text-zinc-300 truncate max-w-[150px]">
                                        {user.user_email || user.user_id.slice(0, 8)}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-amber-400 font-mono">{user.count}</span>
                                        <span className="text-xs text-zinc-500">
                                            (${(user.credits_used / 100).toFixed(2)})
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
