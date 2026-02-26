
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Gift, Check } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useCreditsStore } from "@/features/credits/store/credits.store"
import { toast } from "sonner"
import { logger } from '@/lib/logger'

export function RedeemUsageDialog({ children }: { children?: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [code, setCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [successData, setSuccessData] = useState<{ points: number } | null>(null)
    const { fetchBalance } = useCreditsStore()

    const handleRedeem = async () => {
        if (!code.trim()) return

        setLoading(true)
        setSuccessData(null)

        try {
            const res = await fetch('/api/coupons/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code.trim() })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Redemption failed')
            }

            // Success!
            setSuccessData({ points: data.pointsAdded })
            toast.success("Coupon redeemed successfully!")
            fetchBalance(true)

            // Clear input after a delay or close?
            // Let user see the success message first
        } catch (error) {
            logger.credits.error('value', { data: error })
            toast.error(error instanceof Error ? error.message : "Failed to redeem code")
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setOpen(false)
        setCode("")
        setSuccessData(null)
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) handleClose()
            else setOpen(true)
        }}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Gift className="w-4 h-4" />
                        Redeem Code
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Redeem Code</DialogTitle>
                    <DialogDescription>
                        Enter your coupon code to receive extra credits.
                    </DialogDescription>
                </DialogHeader>

                {!successData ? (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="code">Coupon Code</Label>
                            <Input
                                id="code"
                                placeholder="ENTER-CODE-HERE"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                disabled={loading}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                            <Check className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold">Success!</h3>
                            <p className="text-muted-foreground">
                                You&apos;ve received <span className="text-foreground font-bold">{successData.points} credits</span>.
                            </p>
                        </div>
                    </div>
                )}

                <DialogFooter className="sm:justify-between">
                    {!successData ? (
                        <>
                            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                            <Button onClick={handleRedeem} disabled={!code.trim() || loading}>
                                {loading ? <LoadingSpinner size="sm" color="current" /> : "Redeem"}
                            </Button>
                        </>
                    ) : (
                        <Button className="w-full" onClick={handleClose}>Awesome</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
