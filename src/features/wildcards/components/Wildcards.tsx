'use client'

import { WildcardSidebar } from './WildcardSidebar'
import { WildcardEditor } from './WildcardEditor'
import { Card } from '@/components/ui/card'

/**
 * Wildcards Browser Tab
 *
 * A dedicated tab for managing wildcards with AI-assisted generation.
 * - Left sidebar: List of user's wildcards
 * - Right panel: Editor for viewing/editing wildcard content
 * - AI Assistant: Generate more entries using OpenRouter
 */
const Wildcards = () => {
    return (
        <Card className="bg-card border-border overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] h-[calc(100vh-220px)] min-h-[500px]">
                {/* Left Sidebar - Wildcard List */}
                <div className="hidden md:block">
                    <WildcardSidebar />
                </div>

                {/* Mobile Sidebar - Shows as dropdown/drawer on small screens */}
                <div className="md:hidden border-b border-border">
                    <WildcardSidebar />
                </div>

                {/* Right Panel - Editor */}
                <div className="flex flex-col min-h-0">
                    <WildcardEditor />
                </div>
            </div>
        </Card>
    )
}

export default Wildcards
