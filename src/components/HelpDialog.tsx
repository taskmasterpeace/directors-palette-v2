"use client"

import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HelpCircle } from "lucide-react"
import { UserManual } from "@/features/help/components/UserManual"
import { ScrollArea } from "@/components/ui/scroll-area"

export function HelpDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full w-8 h-8 md:w-10 md:h-10 hover:bg-muted"
                    title="Help & Manual"
                >
                    <HelpCircle className="w-5 h-5 md:w-6 md:h-6" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden">
                <ScrollArea className="h-full max-h-[85vh] p-6">
                    <UserManual />
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
