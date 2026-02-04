"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Key, Copy, RefreshCw, Activity, Clock, Zap, AlertCircle, Check, Eye, EyeOff } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ApiKey {
  id: string
  keyPrefix: string
  name: string
  scopes: string[]
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
  expiresAt: string | null
  userEmail?: string
}

interface UsageStats {
  period: string
  totalRequests: number
  totalCreditsUsed: number
  averageResponseTime: number
  requestsByEndpoint: Record<string, number>
  requestsByDay: { date: string; count: number; credits: number }[]
  apiKeys?: ApiKey[]
  recentRequests?: {
    endpoint: string
    method: string
    statusCode: number
    creditsUsed: number
    responseTimeMs: number | null
    createdAt: string
  }[]
}

export function ApiUsageTab() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [myKeys, setMyKeys] = useState<ApiKey[]>([])
  const [error, setError] = useState<string | null>(null)

  // Key generation
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newRawKey, setNewRawKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch admin stats
      const statsRes = await fetch('/api/v1/usage?admin=true&days=30')
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      // Fetch my keys
      const keysRes = await fetch('/api/v1/keys')
      if (keysRes.ok) {
        const keysData = await keysRes.json()
        setMyKeys(keysData.keys || [])
      } else if (keysRes.status === 403) {
        setError('Only admins can manage API keys')
      }
    } catch (err) {
      console.error('Error fetching API data:', err)
      setError('Failed to load API data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateKey = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || 'API Key' }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create API key')
      }

      setNewRawKey(data.key.rawKey)
      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/v1/keys?id=${keyId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to revoke key')
      }

      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revoke key')
    }
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const closeCreateDialog = () => {
    setCreateDialogOpen(false)
    setNewKeyName('')
    setNewRawKey(null)
    setShowKey(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">API Requests</CardTitle>
            <Activity className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalRequests || 0}</div>
            <p className="text-xs text-zinc-500">{stats?.period || 'Last 30 days'}</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Credits Used</CardTitle>
            <Zap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {(stats?.totalCreditsUsed || 0).toFixed(2)}
            </div>
            <p className="text-xs text-zinc-500">Via API</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Avg Response</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.averageResponseTime || 0}ms
            </div>
            <p className="text-xs text-zinc-500">Response time</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Active Keys</CardTitle>
            <Key className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {myKeys.filter(k => k.isActive).length}
            </div>
            <p className="text-xs text-zinc-500">API keys</p>
          </CardContent>
        </Card>
      </div>

      {/* My API Keys */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Your API Keys</CardTitle>
            <CardDescription>Manage your API keys for external access</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={() => setCreateDialogOpen(true)}
                      size="sm"
                      className="bg-amber-500 text-black hover:bg-amber-600"
                      disabled={myKeys.some(k => k.isActive)}
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Create Key
                    </Button>
                  </span>
                </TooltipTrigger>
                {myKeys.some(k => k.isActive) && (
                  <TooltipContent>
                    <p>You already have an active API key. Revoke it first to create a new one.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          {myKeys.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No API keys yet</p>
              <p className="text-sm">Create an API key to access the Director&apos;s Palette API</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Key</TableHead>
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Last Used</TableHead>
                  <TableHead className="text-zinc-400">Created</TableHead>
                  <TableHead className="text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myKeys.map((key) => (
                  <TableRow key={key.id} className="border-zinc-800">
                    <TableCell className="font-mono text-amber-400">
                      {key.keyPrefix}...
                    </TableCell>
                    <TableCell className="text-white">{key.name}</TableCell>
                    <TableCell>
                      <Badge variant={key.isActive ? "default" : "secondary"}>
                        {key.isActive ? 'Active' : 'Revoked'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {key.lastUsedAt
                        ? new Date(key.lastUsedAt).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {key.isActive && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRevokeKey(key.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Requests by Endpoint */}
      {stats?.requestsByEndpoint && Object.keys(stats.requestsByEndpoint).length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Requests by Endpoint</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.requestsByEndpoint)
                .sort(([, a], [, b]) => b - a)
                .map(([endpoint, count]) => (
                  <div key={endpoint} className="flex items-center justify-between">
                    <span className="font-mono text-sm text-zinc-400">{endpoint}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All API Keys (Admin View) */}
      {stats?.apiKeys && stats.apiKeys.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">All API Keys (Admin View)</CardTitle>
            <CardDescription>All API keys across all users</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Key</TableHead>
                  <TableHead className="text-zinc-400">User</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Last Used</TableHead>
                  <TableHead className="text-zinc-400">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.apiKeys.map((key) => (
                  <TableRow key={key.id} className="border-zinc-800">
                    <TableCell className="font-mono text-amber-400">
                      {key.keyPrefix}...
                    </TableCell>
                    <TableCell className="text-white">{key.userEmail || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant={key.isActive ? "default" : "secondary"}>
                        {key.isActive ? 'Active' : 'Revoked'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {key.lastUsedAt
                        ? new Date(key.lastUsedAt).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Key Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={closeCreateDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              {newRawKey ? 'API Key Created!' : 'Create API Key'}
            </DialogTitle>
            <DialogDescription>
              {newRawKey
                ? 'Save this key now - it will not be shown again!'
                : 'Create a new API key for external access'}
            </DialogDescription>
          </DialogHeader>

          {newRawKey ? (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-zinc-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Your API Key</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="font-mono text-sm text-amber-400 break-all">
                  {showKey ? newRawKey : newRawKey.replace(/./g, '•')}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => copyToClipboard(newRawKey)}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
              <p className="text-sm text-red-400 text-center">
                This key will NOT be shown again. Save it securely!
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">Key Name (optional)</Label>
                <Input
                  id="keyName"
                  placeholder="e.g., Production Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {newRawKey ? (
              <Button onClick={closeCreateDialog} className="bg-amber-500 text-black hover:bg-amber-600">
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeCreateDialog} disabled={creating}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateKey}
                  disabled={creating}
                  className="bg-amber-500 text-black hover:bg-amber-600"
                >
                  {creating ? (
                    <>
                      <LoadingSpinner size="sm" color="current" className="mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Create Key
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
