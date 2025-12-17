'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth'
import {
    Layout,
    Sparkles,
    Film,
    Images,
    FlaskConical,
    Music,
    BookOpen,
    ChevronLeft,
    HelpCircle,
    Menu,
    ShieldCheck,
    Users
} from 'lucide-react'
import { useLayoutStore, TabValue } from '@/store/layout.store'
import { cn } from '@/utils/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { createBrowserClient } from '@supabase/ssr'
import { CreditsDisplay } from '@/features/credits/components/CreditsDisplay'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { useIsMobile } from '@/hooks/use-mobile'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'

interface NavItem {
    id: TabValue
    label: string
    icon: React.ElementType
    comingSoon?: boolean
}

const NAV_ITEMS: NavItem[] = [
    { id: 'shot-creator', label: 'Shot Creator', icon: Sparkles },
    { id: 'shot-animator', label: 'Shot Animator', icon: Film },
    { id: 'layout-annotation', label: 'Layout & Annotation', icon: Layout },
    { id: 'storyboard', label: 'Storyboard', icon: BookOpen },
    { id: 'music-lab', label: 'Music Lab', icon: Music },
    { id: 'prompt-tools', label: 'Prompt Tools', icon: FlaskConical },
    { id: 'gallery', label: 'Gallery', icon: Images },
    { id: 'community', label: 'Community', icon: Users },
]

export function SidebarNavigation() {
    const { activeTab, setActiveTab } = useLayoutStore()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [user, setUser] = useState<{ email?: string, avatar_url?: string } | null>(null)
    const { balance } = useCreditsStore()
    const isMobile = useIsMobile()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    // Load collapsed state from local storage
    useEffect(() => {
        const saved = localStorage.getItem('sidebar-collapsed')
        if (saved) {
            setIsCollapsed(saved === 'true')
        }
    }, [])

    // Persist collapsed state
    const toggleCollapse = () => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
        localStorage.setItem('sidebar-collapsed', String(newState))
    }

    // Keyboard shortcut for collapse
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault()
                toggleCollapse()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isCollapsed])

    // Fetch User
    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setUser({
                    email: data.user.email,
                    avatar_url: data.user.user_metadata?.avatar_url
                })
            }
        })
    }, [])

    const handleSignOut = async () => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        await supabase.auth.signOut()
        window.location.href = "/auth/signin"
    }

    const handleMobileNavSelect = (tab: TabValue) => {
        setActiveTab(tab)
        setMobileMenuOpen(false)
    }

    // Mobile: Floating logo button + Sheet menu
    if (isMobile) {
        return (
            <MobileNavigation
                open={mobileMenuOpen}
                onOpenChange={setMobileMenuOpen}
                activeTab={activeTab}
                onNavSelect={handleMobileNavSelect}
                user={user}
                onSignOut={handleSignOut}
            />
        )
    }

    // Desktop: Original sidebar
    return (
        <motion.div
            initial={false}
            animate={{ width: isCollapsed ? 64 : 240 }}
            className="h-full border-r border-border bg-card/50 backdrop-blur-xl flex flex-col z-50 relative overflow-hidden"
        >
            {/* Sidebar Background Banner */}
            <div
                className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'url(/banners/sidebar.webp)',
                    filter: 'brightness(0.6) saturate(0.7)'
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/80 pointer-events-none" />
            {/* Header / Collapse Toggle */}
            <div className="h-14 flex items-center justify-between px-3 border-b border-border/50">
                {!isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 font-bold text-lg overflow-hidden whitespace-nowrap"
                    >
                        {/* App Icon */}
                        <div className="w-8 h-8 flex items-center justify-center">
                            <img src="/favicon.ico" alt="App Icon" className="w-full h-full object-contain filter grayscale brightness-200" />
                        </div>
                        <span>Director&apos;s Palette</span>
                    </motion.div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleCollapse}
                    className={cn("h-8 w-8", isCollapsed && "mx-auto")}
                >
                    {isCollapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </Button>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden space-y-1 px-2">
                <AdminNavItem isCollapsed={isCollapsed} />
                <TooltipProvider delayDuration={0}>
                    {NAV_ITEMS.map((item) => {
                        const isActive = activeTab === item.id
                        // Rename Layout & Annotation to Canvas Editor in UI
                        const label = item.id === 'layout-annotation' ? 'Canvas Editor' : item.label

                        return (
                            <Tooltip key={item.id}>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => !item.comingSoon && setActiveTab(item.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all relative group overflow-hidden",
                                            item.comingSoon
                                                ? "text-muted-foreground/50 cursor-not-allowed"
                                                : isActive
                                                    ? "bg-gradient-to-r from-violet-500/20 via-fuchsia-500/15 to-transparent text-foreground font-medium"
                                                    : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {/* Hover gradient background */}
                                        {!isActive && !item.comingSoon && (
                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent" />
                                        )}
                                        <item.icon className={cn("w-5 h-5 flex-shrink-0 relative z-10", isActive && !item.comingSoon && "text-violet-400")} />
                                        {!isCollapsed && (
                                            <motion.span
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="truncate flex items-center gap-2 relative z-10"
                                            >
                                                {label}
                                                {item.comingSoon && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                                                        Soon
                                                    </span>
                                                )}
                                            </motion.span>
                                        )}
                                        {isActive && !item.comingSoon && (
                                            <>
                                                {/* Animated Gradient Indicator */}
                                                <motion.div
                                                    layoutId="activeTabIndicator"
                                                    className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full overflow-hidden"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                >
                                                    <motion.div
                                                        className="absolute inset-0 bg-gradient-to-b from-violet-500 via-fuchsia-500 to-amber-500"
                                                        animate={{
                                                            backgroundPosition: ['0% 0%', '0% 100%', '0% 0%'],
                                                        }}
                                                        transition={{
                                                            duration: 3,
                                                            repeat: Infinity,
                                                            ease: 'linear',
                                                        }}
                                                        style={{ backgroundSize: '100% 200%' }}
                                                    />
                                                </motion.div>
                                                {/* Glow Effect */}
                                                <motion.div
                                                    layoutId="activeTabGlow"
                                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-violet-500/30 via-fuchsia-500/20 to-transparent blur-lg pointer-events-none"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                />
                                            </>
                                        )}
                                    </button>
                                </TooltipTrigger>
                                {isCollapsed && (
                                    <TooltipContent side="right" className="font-medium bg-popover text-popover-foreground border-border">
                                        {label}{item.comingSoon && ' (Coming Soon)'}
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        )
                    })}
                </TooltipProvider>
            </div>

            {/* Footer Area */}
            <div className="border-t border-border/50 p-2 space-y-2 bg-background/20">

                {/* Help Menu Item */}
                <TooltipProvider>
                    <Tooltip key="help">
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setActiveTab('help')}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all relative group overflow-hidden",
                                    activeTab === 'help'
                                        ? "bg-gradient-to-r from-violet-500/20 via-fuchsia-500/15 to-transparent text-foreground font-medium"
                                        : "text-muted-foreground hover:text-foreground",
                                    isCollapsed && "justify-center px-0"
                                )}
                            >
                                {/* Hover gradient background */}
                                {activeTab !== 'help' && (
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent" />
                                )}
                                <HelpCircle className={cn("w-5 h-5 flex-shrink-0 relative z-10", activeTab === 'help' && "text-violet-400")} />
                                {!isCollapsed && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="truncate relative z-10"
                                    >
                                        Help & Manual
                                    </motion.span>
                                )}
                                {activeTab === 'help' && (
                                    <>
                                        <motion.div
                                            layoutId="activeTabIndicatorFooter"
                                            className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full overflow-hidden"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <motion.div
                                                className="absolute inset-0 bg-gradient-to-b from-violet-500 via-fuchsia-500 to-amber-500"
                                                animate={{
                                                    backgroundPosition: ['0% 0%', '0% 100%', '0% 0%'],
                                                }}
                                                transition={{
                                                    duration: 3,
                                                    repeat: Infinity,
                                                    ease: 'linear',
                                                }}
                                                style={{ backgroundSize: '100% 200%' }}
                                            />
                                        </motion.div>
                                        <motion.div
                                            layoutId="activeTabGlowFooter"
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-violet-500/30 via-fuchsia-500/20 to-transparent blur-lg pointer-events-none"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        />
                                    </>
                                )}
                            </button>
                        </TooltipTrigger>
                        {isCollapsed && (
                            <TooltipContent side="right" className="font-medium bg-popover text-popover-foreground border-border">
                                Help & Manual
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>

                {/* Credits Display (Simplified for Sidebar) */}
                <div className={cn("flex flex-col gap-1", isCollapsed ? "items-center" : "px-2")}>
                    {!isCollapsed ? (
                        <div className="w-full">
                            <CreditsDisplay />
                        </div>
                    ) : (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center cursor-help border border-amber-500/20">
                                        <Sparkles className="w-4 h-4 text-amber-500" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    <p>{balance} Tokens</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>

                {/* User Profile */}
                {user && (
                    <div className={cn("flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer", isCollapsed && "justify-center")} onClick={isCollapsed ? undefined : () => { }}>
                        <Avatar className="w-8 h-8 border border-border">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {user.email?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>

                        {!isCollapsed && (
                            <div className="flex-1 overflow-hidden flex flex-col justify-center">
                                <AdminLink />
                                <p className="text-sm font-medium truncate">{user.email?.split('@')[0]}</p>
                                <p className="text-xs text-muted-foreground cursor-pointer hover:text-destructive transition-colors" onClick={(e) => {
                                    e.stopPropagation()
                                    handleSignOut()
                                }}>Sign out</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    )
}

function AdminLink() {
    const { isAdmin } = useAdminAuth()
    if (!isAdmin) return null

    return (
        <a href="/admin/coupons" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-500 hover:text-amber-400 mb-1 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Admin Panel
        </a>
    )
}

function AdminNavItem({ isCollapsed }: { isCollapsed: boolean }) {
    const { isAdmin } = useAdminAuth()

    // Only show if user is admin
    if (!isAdmin) return null

    return (
        <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <a
                        href="/admin/coupons"
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all relative group text-amber-500 mb-2 font-medium overflow-hidden",
                            isCollapsed ? "justify-center px-0" : ""
                        )}
                    >
                        {/* Hover gradient background */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent" />
                        {/* Left border accent */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-amber-400 via-orange-500 to-amber-600" />
                        </div>
                        <ShieldCheck className={cn("w-5 h-5 flex-shrink-0 relative z-10", isCollapsed ? "" : "mr-0")} />
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="truncate uppercase tracking-wider text-xs font-bold relative z-10"
                            >
                                Admin Panel
                            </motion.span>
                        )}
                    </a>
                </TooltipTrigger>
                {isCollapsed && (
                    <TooltipContent side="right" className="font-medium bg-amber-950 text-amber-500 border-amber-900">
                        Admin Panel
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    )
}

// ============================================
// MOBILE NAVIGATION COMPONENTS
// ============================================

interface MobileNavigationProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    activeTab: TabValue
    onNavSelect: (tab: TabValue) => void
    user: { email?: string, avatar_url?: string } | null
    onSignOut: () => void
}

function MobileNavigation({ open, onOpenChange, activeTab, onNavSelect, user, onSignOut }: MobileNavigationProps) {
    const { isAdmin } = useAdminAuth()

    return (
        <>
            {/* Floating Logo Button - Fixed position, top-right */}
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-3 right-3 z-50 h-12 w-12 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
                onClick={() => onOpenChange(true)}
            >
                <img
                    src="/favicon.ico"
                    alt="Menu"
                    className="w-7 h-7 object-contain filter grayscale brightness-200"
                />
            </Button>

            {/* Sheet Menu - Slides from right */}
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="right" className="w-[280px] p-0 flex flex-col bg-card/95 backdrop-blur-xl">
                    {/* Header */}
                    <SheetHeader className="p-4 border-b border-border/50">
                        <div className="flex items-center gap-2">
                            <img
                                src="/favicon.ico"
                                className="w-7 h-7 object-contain filter grayscale brightness-200"
                                alt="Logo"
                            />
                            <SheetTitle className="text-lg font-bold">Director&apos;s Palette</SheetTitle>
                        </div>
                    </SheetHeader>

                    {/* Navigation Items */}
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {/* Admin Panel Link (if admin) */}
                            {isAdmin && (
                                <a
                                    href="/admin/coupons"
                                    className="w-full flex items-center gap-3 px-3 py-3 rounded-md transition-all text-amber-500 font-medium min-h-[48px] relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent" />
                                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-gradient-to-b from-amber-400 via-orange-500 to-amber-600" />
                                    <ShieldCheck className="w-5 h-5 relative z-10" />
                                    <span className="uppercase tracking-wider text-xs font-bold relative z-10">Admin Panel</span>
                                </a>
                            )}

                            {/* Main Navigation Items */}
                            {NAV_ITEMS.map((item) => {
                                const label = item.id === 'layout-annotation' ? 'Canvas Editor' : item.label
                                return (
                                    <MobileNavButton
                                        key={item.id}
                                        icon={item.icon}
                                        label={label}
                                        isActive={activeTab === item.id}
                                        comingSoon={item.comingSoon}
                                        onClick={() => !item.comingSoon && onNavSelect(item.id)}
                                    />
                                )
                            })}

                            {/* Help & Manual */}
                            <MobileNavButton
                                icon={HelpCircle}
                                label="Help & Manual"
                                isActive={activeTab === 'help'}
                                onClick={() => onNavSelect('help')}
                            />
                        </div>
                    </ScrollArea>

                    {/* Footer - Credits & User */}
                    <div className="border-t border-border/50 p-3 space-y-3 bg-background/30">
                        {/* Credits Display */}
                        <div className="px-1">
                            <CreditsDisplay />
                        </div>

                        {/* User Profile */}
                        {user && (
                            <div className="flex items-center gap-3 p-2 rounded-lg bg-accent/30">
                                <Avatar className="w-9 h-9 border border-border">
                                    <AvatarImage src={user.avatar_url} />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                        {user.email?.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-medium truncate">{user.email?.split('@')[0]}</p>
                                    <button
                                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                                        onClick={onSignOut}
                                    >
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    )
}

interface MobileNavButtonProps {
    icon: React.ElementType
    label: string
    isActive: boolean
    comingSoon?: boolean
    onClick: () => void
}

function MobileNavButton({ icon: Icon, label, isActive, comingSoon, onClick }: MobileNavButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={comingSoon}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-md transition-all min-h-[48px] relative overflow-hidden group",
                comingSoon
                    ? "text-muted-foreground/50 cursor-not-allowed"
                    : isActive
                        ? "bg-gradient-to-r from-violet-500/20 via-fuchsia-500/15 to-transparent text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
            )}
        >
            {/* Hover gradient background */}
            {!isActive && !comingSoon && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent" />
            )}

            {/* Active indicator */}
            {isActive && !comingSoon && (
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-gradient-to-b from-violet-500 via-fuchsia-500 to-amber-500" />
            )}

            <Icon className={cn("w-5 h-5 flex-shrink-0 relative z-10", isActive && !comingSoon && "text-violet-400")} />
            <span className="relative z-10 flex items-center gap-2">
                {label}
                {comingSoon && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                        Soon
                    </span>
                )}
            </span>

            {/* Active dot indicator */}
            {isActive && !comingSoon && (
                <div className="ml-auto w-2 h-2 rounded-full bg-violet-500 relative z-10" />
            )}
        </button>
    )
}
