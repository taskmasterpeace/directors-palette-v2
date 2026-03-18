"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Image as ImageIcon, Sparkles, TrendingUp, Users, BarChart3 } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { GenerationStatsResponse } from '../types/generation-events.types'
import { createLogger } from '@/lib/logger'
import { ADMIN_EMAILS } from '../constants'


const log = createLogger('Admin')

interface GenerationStatsProps {
    hideAdminAccounts?: boolean
}

export function GenerationStats({ hideAdminAccounts = false }: GenerationStatsProps) {
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
                    <CardTitle className="text-sm font-medium text-zinc-400">Pts Used</CardTitle>
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
                    <Users className="h-4 w-4 text-cyan-500" />
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
                            {stats.topUsers
                                .filter((user) => !hideAdminAccounts || !ADMIN_EMAILS.some(e => user.user_email?.startsWith(e)))
                                .slice(0, 5).map((user) => (
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

            {/* Daily Timeline */}
            {stats?.daily && stats.daily.length > 0 && (
                <Card className="bg-zinc-900 border-zinc-800 md:col-span-4">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-cyan-500" />
                            <CardTitle className="text-sm font-medium text-zinc-400">Daily Generations (Last 30 Days)</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <DailyChart data={stats.daily} />
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

/** Simple CSS bar chart — no chart library needed */
function DailyChart({ data }: { data: { date: string; count: number; credits: number; uniqueUsers: number }[] }) {
    const maxCount = Math.max(...data.map(d => d.count), 1)

    return (
        <div className="space-y-1">
            {/* Chart bars */}
            <div className="flex items-end gap-[2px] h-32">
                {data.map((day) => {
                    const height = Math.max((day.count / maxCount) * 100, 2)
                    const dateObj = new Date(day.date + 'T00:00:00')
                    const isToday = day.date === new Date().toISOString().substring(0, 10)
                    return (
                        <div
                            key={day.date}
                            className="group relative flex-1 flex flex-col justify-end"
                        >
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-lg">
                                    <div className="font-medium text-white">
                                        {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </div>
                                    <div className="text-cyan-400">{day.count} generations</div>
                                    <div className="text-amber-400">{day.credits} pts</div>
                                    <div className="text-zinc-400">{day.uniqueUsers} user{day.uniqueUsers !== 1 ? 's' : ''}</div>
                                </div>
                            </div>
                            {/* Bar */}
                            <div
                                className={`rounded-t-sm transition-colors ${isToday ? 'bg-cyan-500' : 'bg-cyan-700 group-hover:bg-cyan-500'}`}
                                style={{ height: `${height}%` }}
                            />
                        </div>
                    )
                })}
            </div>
            {/* X-axis labels — show first, middle, last */}
            <div className="flex justify-between text-[10px] text-zinc-500 pt-1">
                {data.length > 0 && (
                    <>
                        <span>{new Date(data[0].date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        {data.length > 2 && (
                            <span>{new Date(data[Math.floor(data.length / 2)].date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        )}
                        <span>{new Date(data[data.length - 1].date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </>
                )}
            </div>
        </div>
    )
}
