"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, RefreshCw, Loader2, CheckCircle, XCircle, Clock, Download } from 'lucide-react'
import type { GenerationEvent, GenerationEventsListResponse } from '../types/generation-events.types'

interface GenerationsTableProps {
    onExportLogs?: () => void
}

export function GenerationsTable({ onExportLogs }: GenerationsTableProps) {
    const [generations, setGenerations] = useState<GenerationEvent[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [userFilter, setUserFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const pageSize = 25

    const fetchGenerations = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.set('page', page.toString())
            params.set('pageSize', pageSize.toString())
            if (userFilter) params.set('user_email', userFilter)
            if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)

            const res = await fetch(`/api/admin/generations?${params}`)
            if (!res.ok) throw new Error('Failed to fetch generations')
            const data: GenerationEventsListResponse = await res.json()
            setGenerations(data.generations)
            setTotal(data.total)
        } catch (error) {
            console.error('Error fetching generations:', error)
        } finally {
            setLoading(false)
        }
    }, [page, userFilter, statusFilter])

    useEffect(() => {
        fetchGenerations()
    }, [fetchGenerations])

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-4 h-4 text-green-500" />
            case 'failed':
                return <XCircle className="w-4 h-4 text-red-500" />
            default:
                return <Clock className="w-4 h-4 text-amber-500" />
        }
    }

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        return date.toLocaleDateString()
    }

    const totalPages = Math.ceil(total / pageSize)

    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-white">Activity Log</CardTitle>
                        <CardDescription>Who generated what and when ({total} total)</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {onExportLogs && (
                            <Button onClick={onExportLogs} variant="outline" size="sm">
                                <Download className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Export</span>
                            </Button>
                        )}
                        <Button onClick={fetchGenerations} variant="outline" size="sm" disabled={loading}>
                            <RefreshCw className={`w-4 h-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </Button>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
                    <div className="flex items-center gap-2 flex-1">
                        <Search className="w-4 h-4 text-zinc-500 hidden sm:block" />
                        <Input
                            placeholder="Filter by email..."
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value)}
                            className="bg-zinc-800 border-zinc-700"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[150px] bg-zinc-800 border-zinc-700">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                    </div>
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-zinc-800">
                                    <TableHead className="text-zinc-400">User</TableHead>
                                    <TableHead className="text-zinc-400 hidden sm:table-cell">Model</TableHead>
                                    <TableHead className="text-zinc-400">Cost</TableHead>
                                    <TableHead className="text-zinc-400">Status</TableHead>
                                    <TableHead className="text-zinc-400">Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {generations.map((gen) => (
                                    <TableRow key={gen.id} className="border-zinc-800">
                                        <TableCell className="text-white">
                                            <div className="flex flex-col">
                                                <span className="text-sm truncate max-w-[100px] sm:max-w-[150px]">
                                                    {gen.user_email || gen.user_id.slice(0, 8)}
                                                </span>
                                                {gen.is_admin_generation && (
                                                    <Badge variant="outline" className="w-fit text-xs border-amber-500 text-amber-500">
                                                        Admin
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-zinc-300 text-sm hidden sm:table-cell">
                                            {gen.model_name || gen.model_id}
                                        </TableCell>
                                        <TableCell className={`font-mono text-sm ${gen.credits_cost === 0 ? 'text-zinc-500' : 'text-green-400'}`}>
                                            {gen.credits_cost === 0 ? '$0' : `$${(gen.credits_cost / 100).toFixed(2)}`}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {getStatusIcon(gen.status)}
                                                <span className="text-sm capitalize text-zinc-400 hidden sm:inline">{gen.status}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-zinc-500 text-sm">
                                            {formatTimeAgo(gen.created_at)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {generations.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-zinc-500 py-8">
                                            No generations found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                                <span className="text-sm text-zinc-500">
                                    Page {page} of {totalPages}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}
