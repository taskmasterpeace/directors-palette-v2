"use client"

import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth'
import { AdminDashboard } from '@/features/admin/components/AdminDashboard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, AlertTriangle, ArrowLeft } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import Link from 'next/link'

export default function AdminPage() {
    const { loading, isAuthenticated, isAdmin, email, error: _error } = useAdminAuth()

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <LoadingSpinner size="lg" className="mx-auto mb-4" />
                    <p className="text-muted-foreground">Verifying admin access...</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
                    <CardHeader className="text-center">
                        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                        <CardTitle className="text-white">Authentication Required</CardTitle>
                        <CardDescription>
                            You must be signed in to access the admin dashboard.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <Link href="/auth/signin">
                            <Button className="w-full bg-amber-500 text-black hover:bg-amber-600">
                                Sign In
                            </Button>
                        </Link>
                        <Link href="/">
                            <Button variant="outline" className="w-full">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Home
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
                    <CardHeader className="text-center">
                        <Shield className="w-12 h-12 text-red-500 mx-auto mb-2" />
                        <CardTitle className="text-white">Access Denied</CardTitle>
                        <CardDescription>
                            You do not have admin privileges.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-center text-sm text-zinc-500">
                            Signed in as: <span className="text-zinc-300">{email}</span>
                        </div>
                        <Link href="/">
                            <Button variant="outline" className="w-full">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Home
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto max-w-7xl p-4 sm:p-6">
                <div className="mb-4">
                    <Link href="/">
                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to App
                        </Button>
                    </Link>
                </div>
                <AdminDashboard currentUserEmail={email!} />
            </div>
        </div>
    )
}
