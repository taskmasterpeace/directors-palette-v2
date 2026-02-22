'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth'
import {
    Layout,
    Sparkles,
    Film,
    Images,
    FlaskConical,
    Music,
    BookOpen,
    BookHeart,
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    HelpCircle,
    Menu,
    ShieldCheck,
    Users,
    Workflow,
    Check,
    Circle,
    ArrowRight,
    Megaphone,
    Clapperboard,
    Dna
} from 'lucide-react'
import { useLayoutStore, TabValue } from '@/store/layout.store'
import { useSidebarWizardSteps, useNavigateToWizardStep } from '@/features/storybook/hooks/useSidebarWizardSteps'
import type { SidebarWizardStep } from '@/features/storybook/hooks/useSidebarWizardSteps'
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
    icon: React.ComponentType<{ className?: string }>
    banner: string
    comingSoon?: boolean
    children?: NavItem[]  // Support nesting
    tooltipExpanded?: string
}

interface NavSection {
    id: string
    label: string
    items: NavItem[]
    defaultExpanded?: boolean
}

const NAV_SECTIONS: NavSection[] = [
    {
        id: 'creation-tools',
        label: 'CREATION TOOLS',
        defaultExpanded: true,
        items: [
            {
                id: 'shot-creator',
                label: 'Shot Creator',
                icon: Sparkles,
                banner: '/banners/shot-creator.webp',
                tooltipExpanded: 'Generate single images with recipes and presets'
            },
            {
                id: 'layout-annotation',
                label: 'Canvas Editor',
                icon: Layout,
                banner: '/banners/canvas-editor.webp',
                tooltipExpanded: 'Annotate and inpaint specific areas'
            },
            {
                id: 'shot-animator',
                label: 'Shot Animator',
                icon: Film,
                banner: '/banners/shot-animator.webp',
                tooltipExpanded: 'Animate still images into video'
            },
            {
                id: 'node-workflow',
                label: 'Node Workflow',
                icon: Workflow,
                banner: '/banners/shot-creator.webp',
                tooltipExpanded: 'Visual workflow editor for complex generation pipelines'
            }
        ]
    },
    {
        id: 'projects',
        label: 'PROJECTS',
        defaultExpanded: true,
        items: [
            {
                id: 'storyboard',
                label: 'Storyboard',
                icon: BookOpen,
                banner: '/banners/storyboard.webp',
                tooltipExpanded: 'Cinematic shot sequences'
            },
            {
                id: 'storybook',
                label: 'Storybook',
                icon: BookHeart,
                banner: '/banners/storybook-banner.webp',
                tooltipExpanded: "Children's illustrated books"
            },
            {
                id: 'music-lab',
                label: 'Music Lab',
                icon: Music,
                banner: '/banners/music-lab.webp',
                tooltipExpanded: 'Music video treatments'
            },
            {
                id: 'artist-dna',
                label: 'Artist DNA',
                icon: Dna,
                banner: '/banners/music-lab.webp',
                tooltipExpanded: 'Create and manage artist profiles'
            },
            {
                id: 'ad-lab',
                label: 'Ad Lab',
                icon: Clapperboard,
                banner: '/banners/adhub.webp',
                tooltipExpanded: 'Video ad prompt matrix generator'
            },
            {
                id: 'adhub',
                label: 'Adhub',
                icon: Megaphone,
                banner: '/banners/adhub.webp',
                tooltipExpanded: 'Create branded static ads'
            }
        ]
    },
    {
        id: 'library',
        label: 'LIBRARY',
        defaultExpanded: true,
        items: [
            {
                id: 'gallery',
                label: 'Gallery',
                icon: Images,
                banner: '/banners/gallery.webp',
                tooltipExpanded: 'Browse all generations'
            },
            {
                id: 'community',
                label: 'Community',
                icon: Users,
                banner: '/banners/community.webp',
                tooltipExpanded: 'Explore and share'
            }
        ]
    },
    {
        id: 'utilities',
        label: 'UTILITIES',
        defaultExpanded: false,
        items: [
            {
                id: 'prompt-tools',
                label: 'Prompt Tools',
                icon: FlaskConical,
                banner: '/banners/prompt-tools.webp',
                tooltipExpanded: 'Wildcards and style guides'
            }
        ]
    }
]

// Flatten all items for mobile (backward compatibility)
const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap(section => {
    const flattenItems = (items: NavItem[]): NavItem[] => {
        return items.flatMap(item => {
            const children = item.children ? flattenItems(item.children) : []
            return [item, ...children]
        })
    }
    return flattenItems(section.items)
})

export function SidebarNavigation() {
    const { activeTab, setActiveTab } = useLayoutStore()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [user, setUser] = useState<{ email?: string, avatar_url?: string } | null>(null)
    const { balance } = useCreditsStore()
    const isMobile = useIsMobile()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    // Section collapse state
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

    // Load collapsed state from local storage
    useEffect(() => {
        if (typeof window === 'undefined') return
        const saved = localStorage.getItem('sidebar-collapsed')
        if (saved) {
            setIsCollapsed(saved === 'true')
        }

        // Load section collapsed states
        NAV_SECTIONS.forEach(section => {
            const sectionSaved = localStorage.getItem(`sidebar-section-${section.id}`)
            if (sectionSaved !== null) {
                setCollapsedSections(prev => ({
                    ...prev,
                    [section.id]: sectionSaved === 'true'
                }))
            } else if (section.defaultExpanded === false) {
                setCollapsedSections(prev => ({
                    ...prev,
                    [section.id]: true
                }))
            }
        })
    }, [])

    // Persist collapsed state
    const toggleCollapse = useCallback(() => {
        setIsCollapsed(prev => {
            const newState = !prev
            if (typeof window !== 'undefined') {
                localStorage.setItem('sidebar-collapsed', String(newState))
            }
            return newState
        })
    }, [])

    // Toggle section collapse
    const toggleSection = useCallback((sectionId: string) => {
        setCollapsedSections(prev => {
            const newState = !prev[sectionId]
            if (typeof window !== 'undefined') {
                localStorage.setItem(`sidebar-section-${sectionId}`, String(newState))
            }
            return {
                ...prev,
                [sectionId]: newState
            }
        })
    }, [])

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
    }, [toggleCollapse])

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
                            <img src="/favicon.ico" alt="App Icon" className="w-full h-full object-contain" />
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
            <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden space-y-1.5 px-2">
                <AdminNavItem isCollapsed={isCollapsed} />
                <TooltipProvider delayDuration={0}>
                    {NAV_SECTIONS.map((section) => (
                        <NavSectionComponent
                            key={section.id}
                            section={section}
                            isCollapsed={isCollapsed}
                            isSectionCollapsed={collapsedSections[section.id] || false}
                            onToggleSection={() => toggleSection(section.id)}
                            activeTab={activeTab}
                            onSetActiveTab={setActiveTab}
                        />
                    ))}
                </TooltipProvider>
            </div>

            {/* Footer Area - Always visible */}
            <div className="flex-shrink-0 border-t border-border/50 p-2 space-y-2 bg-background/95 backdrop-blur-sm relative z-10">

                {/* Help Menu Item */}
                <TooltipProvider>
                    <Tooltip key="help">
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setActiveTab('help')}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group overflow-hidden",
                                    activeTab === 'help'
                                        ? "text-foreground font-medium shadow-lg"
                                        : "text-muted-foreground hover:text-foreground hover:shadow-md",
                                    isCollapsed && "justify-center px-0"
                                )}
                            >
                                {/* Banner image background */}
                                <div
                                    className={cn(
                                        "absolute inset-0 bg-cover bg-center transition-opacity duration-300",
                                        activeTab === 'help' ? "opacity-40" : "opacity-0 group-hover:opacity-30"
                                    )}
                                    style={{
                                        backgroundImage: 'url(/banners/help.webp)',
                                        filter: 'brightness(0.8) saturate(1.2)'
                                    }}
                                />
                                {/* Gradient overlay */}
                                <div className={cn(
                                    "absolute inset-0 transition-opacity duration-300",
                                    activeTab === 'help'
                                        ? "bg-gradient-to-r from-amber-900/80 via-orange-900/60 to-red-900/40 opacity-100"
                                        : "bg-gradient-to-r from-background/90 via-background/70 to-background/50 opacity-0 group-hover:opacity-100"
                                )} />
                                {/* Active state warm glow border */}
                                {activeTab === 'help' && (
                                    <div className="absolute inset-0 rounded-lg ring-1 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]" />
                                )}
                                <HelpCircle className={cn(
                                    "w-5 h-5 flex-shrink-0 relative z-10 transition-colors",
                                    activeTab === 'help' ? "text-amber-400" : "group-hover:text-amber-300"
                                )} />
                                {!isCollapsed && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="truncate relative z-10 drop-shadow-sm"
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
                                                className="absolute inset-0 bg-gradient-to-b from-amber-400 via-orange-500 to-red-500"
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
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-amber-500/40 via-orange-500/20 to-transparent blur-lg pointer-events-none"
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
                    <div className={cn("flex items-center gap-3 p-2 rounded-lg bg-zinc-900/90 hover:bg-accent/50 transition-colors cursor-pointer border border-zinc-800/50", isCollapsed && "justify-center")} onClick={isCollapsed ? undefined : () => { }}>
                        <Avatar className="w-8 h-8 border border-border">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {user.email?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>

                        {!isCollapsed && (
                            <div className="flex-1 overflow-hidden flex flex-col justify-center">
                                <AdminLink />
                                <p className="text-sm font-medium truncate text-white">{user.email?.split('@')[0]}</p>
                                <p className="text-xs text-zinc-400 cursor-pointer hover:text-destructive transition-colors" onClick={(e) => {
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

// ============================================
// NAVIGATION SECTION COMPONENT
// ============================================

interface NavSectionComponentProps {
    section: NavSection
    isCollapsed: boolean
    isSectionCollapsed: boolean
    onToggleSection: () => void
    activeTab: TabValue
    onSetActiveTab: (tab: TabValue) => void
}

function NavSectionComponent({
    section,
    isCollapsed,
    isSectionCollapsed,
    onToggleSection,
    activeTab,
    onSetActiveTab
}: NavSectionComponentProps) {
    // Get wizard steps for storybook (only when on storybook tab)
    const wizardData = useSidebarWizardSteps()
    const showWizardSteps = activeTab === 'storybook' && wizardData && !isCollapsed

    // When sidebar is collapsed, show abbreviated section header
    if (isCollapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={onToggleSection}
                        className="w-full flex items-center justify-center px-2 py-2 text-xs font-semibold uppercase text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {section.label.charAt(0)}
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                    {section.label}
                </TooltipContent>
            </Tooltip>
        )
    }

    // Full section rendering when sidebar is expanded
    return (
        <div className="space-y-1">
            {/* Section Header */}
            <button
                onClick={onToggleSection}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
                {isSectionCollapsed ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>{section.label}</span>
            </button>

            {/* Section Items */}
            {!isSectionCollapsed && (
                <div className="space-y-0.5">
                    {section.items.map((item) => (
                        <React.Fragment key={item.id}>
                            <NavItemComponent
                                item={item}
                                depth={0}
                                isCollapsed={false}
                                activeTab={activeTab}
                                onSetActiveTab={onSetActiveTab}
                            />
                            {/* Show wizard steps under Storybook when active */}
                            {item.id === 'storybook' && showWizardSteps && wizardData && (
                                <WizardStepsSubMenu
                                    steps={wizardData.steps}
                                    isExpanded={true}
                                />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    )
}

// ============================================
// NAVIGATION ITEM COMPONENT (Recursive)
// ============================================

interface NavItemComponentProps {
    item: NavItem
    depth: number
    isCollapsed: boolean
    activeTab: TabValue
    onSetActiveTab: (tab: TabValue) => void
}

function NavItemComponent({
    item,
    depth,
    isCollapsed,
    activeTab,
    onSetActiveTab
}: NavItemComponentProps) {
    const isActive = activeTab === item.id
    const Icon = item.icon

    // Calculate indentation based on depth
    const paddingLeft = depth === 0 ? 12 : 12 + (depth * 16)

    return (
        <div>
            {/* Main Item */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={() => !item.comingSoon && onSetActiveTab(item.id)}
                        disabled={item.comingSoon}
                        className={cn(
                            "w-full flex items-center gap-3 py-2.5 rounded-lg transition-all relative group overflow-hidden",
                            item.comingSoon
                                ? "text-muted-foreground/50 cursor-not-allowed"
                                : isActive
                                    ? "text-foreground font-medium shadow-lg"
                                    : "text-muted-foreground hover:text-foreground hover:shadow-md",
                            depth === 0 ? "px-3" : ""
                        )}
                        style={{
                            paddingLeft: depth > 0 ? `${paddingLeft}px` : undefined
                        }}
                    >
                        {/* Banner image background */}
                        <div
                            className={cn(
                                "absolute inset-0 bg-cover bg-center transition-opacity duration-300",
                                isActive ? "opacity-40" : "opacity-0 group-hover:opacity-30"
                            )}
                            style={{
                                backgroundImage: `url(${item.banner})`,
                                filter: 'brightness(0.8) saturate(1.2)'
                            }}
                        />
                        {/* Gradient overlay */}
                        <div className={cn(
                            "absolute inset-0 transition-opacity duration-300",
                            isActive
                                ? "bg-gradient-to-r from-amber-900/80 via-orange-900/60 to-red-900/40 opacity-100"
                                : "bg-gradient-to-r from-background/90 via-background/70 to-background/50 opacity-0 group-hover:opacity-100"
                        )} />
                        {/* Active state warm glow border */}
                        {isActive && !item.comingSoon && (
                            <div className="absolute inset-0 rounded-lg ring-1 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]" />
                        )}
                        {/* Icon */}
                        <Icon className={cn(
                            "flex-shrink-0 relative z-10 transition-colors",
                            depth === 0 ? "w-5 h-5" : "w-4 h-4",
                            isActive && !item.comingSoon ? "text-amber-400" : "group-hover:text-amber-300"
                        )} />
                        {/* Label */}
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={cn(
                                "truncate relative z-10 drop-shadow-sm flex items-center gap-2",
                                depth > 0 ? "text-sm" : ""
                            )}
                        >
                            {item.label}
                            {item.comingSoon && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                                    Soon
                                </span>
                            )}
                        </motion.span>
                        {/* Active indicator */}
                        {isActive && !item.comingSoon && (
                            <>
                                <motion.div
                                    layoutId="activeTabIndicator"
                                    className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full overflow-hidden"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-b from-amber-400 via-orange-500 to-red-500"
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
                                    layoutId="activeTabGlow"
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-amber-500/40 via-orange-500/20 to-transparent blur-lg pointer-events-none"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                />
                            </>
                        )}
                    </button>
                </TooltipTrigger>
                {item.tooltipExpanded && (
                    <TooltipContent side="right" className="font-medium bg-popover text-popover-foreground border-border">
                        {item.tooltipExpanded}
                    </TooltipContent>
                )}
            </Tooltip>

            {/* Nested Children */}
            {item.children && item.children.length > 0 && (
                <div className="mt-0.5 space-y-0.5 relative">
                    {/* Connection line for nested items */}
                    {depth === 0 && (
                        <div className="absolute left-6 top-0 bottom-0 w-px bg-border/40" />
                    )}
                    {item.children.map((child) => (
                        <NavItemComponent
                            key={child.id}
                            item={child}
                            depth={depth + 1}
                            isCollapsed={isCollapsed}
                            activeTab={activeTab}
                            onSetActiveTab={onSetActiveTab}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// ============================================
// WIZARD STEPS SUBMENU COMPONENT
// ============================================

interface WizardStepsSubMenuProps {
    steps: SidebarWizardStep[]
    isExpanded: boolean
}

function WizardStepsSubMenu({ steps, isExpanded }: WizardStepsSubMenuProps) {
    const navigateToStep = useNavigateToWizardStep()

    if (!isExpanded) return null

    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="ml-4 mt-1 space-y-0.5 relative"
            >
                {/* Connection line */}
                <div className="absolute left-2 top-0 bottom-2 w-px bg-border/40" />

                {steps.map((step) => {
                    const isCompleted = step.status === 'completed'
                    const isCurrent = step.status === 'current'
                    const isLocked = step.status === 'locked'

                    return (
                        <button
                            key={step.id}
                            onClick={() => step.canNavigate && navigateToStep(step.id as Parameters<typeof navigateToStep>[0])}
                            disabled={isLocked}
                            className={cn(
                                "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-all relative group",
                                isLocked
                                    ? "text-zinc-600 cursor-not-allowed"
                                    : isCurrent
                                        ? "text-amber-400 bg-amber-500/10 font-medium"
                                        : isCompleted
                                            ? "text-green-400 hover:bg-green-500/10 cursor-pointer"
                                            : "text-zinc-400 hover:text-zinc-300 cursor-pointer"
                            )}
                        >
                            {/* Status indicator */}
                            <div className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                                isCurrent && "bg-amber-500/20 ring-1 ring-amber-500/50",
                                isCompleted && "bg-green-500/20",
                                isLocked && "bg-zinc-800"
                            )}>
                                {isCompleted ? (
                                    <Check className="w-3 h-3 text-green-400" />
                                ) : isCurrent ? (
                                    <ArrowRight className="w-3 h-3 text-amber-400" />
                                ) : (
                                    <Circle className="w-2 h-2 text-zinc-600" />
                                )}
                            </div>

                            {/* Step label */}
                            <span className="truncate">{step.label}</span>
                        </button>
                    )
                })}
            </motion.div>
        </AnimatePresence>
    )
}

function AdminLink() {
    const { isAdmin } = useAdminAuth()
    if (!isAdmin) return null

    return (
        <a href="/admin" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-500 hover:text-amber-400 mb-1 transition-colors">
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
                        href="/admin"
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
            {/* Floating Logo Button - Fixed position, top-right - RED theme */}
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-3 right-3 z-50 h-12 w-12 rounded-full bg-red-600/90 hover:bg-red-500 backdrop-blur-md border border-red-500/50 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
                onClick={() => onOpenChange(true)}
            >
                <img
                    src="/favicon.ico"
                    alt="Menu"
                    className="w-7 h-7 object-contain"
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
                                className="w-7 h-7 object-contain"
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
                                    href="/admin"
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
    icon: React.ComponentType<{ className?: string }>
    label: string
    isActive: boolean
    comingSoon?: boolean
    onClick: () => void
}

interface MobileNavButtonWithBannerProps extends MobileNavButtonProps {
    banner?: string
}

function MobileNavButton({ icon: Icon, label, isActive, comingSoon, onClick, banner }: MobileNavButtonWithBannerProps) {
    // Find banner from NAV_ITEMS if not provided
    const navItem = NAV_ITEMS.find(item => item.label === label || (item.id === 'layout-annotation' && label === 'Canvas Editor'))
    const bannerUrl = banner || navItem?.banner || '/banners/help.webp'

    return (
        <button
            onClick={onClick}
            disabled={comingSoon}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all min-h-[48px] relative overflow-hidden group",
                comingSoon
                    ? "text-muted-foreground/50 cursor-not-allowed"
                    : isActive
                        ? "text-foreground font-medium shadow-lg"
                        : "text-muted-foreground hover:text-foreground"
            )}
        >
            {/* Banner image background */}
            <div
                className={cn(
                    "absolute inset-0 bg-cover bg-center transition-opacity duration-300",
                    isActive ? "opacity-40" : "opacity-0 group-hover:opacity-30"
                )}
                style={{
                    backgroundImage: `url(${bannerUrl})`,
                    filter: 'brightness(0.8) saturate(1.2)'
                }}
            />
            {/* Gradient overlay */}
            <div className={cn(
                "absolute inset-0 transition-opacity duration-300",
                isActive
                    ? "bg-gradient-to-r from-amber-900/80 via-orange-900/60 to-red-900/40 opacity-100"
                    : "bg-gradient-to-r from-background/90 via-background/70 to-background/50 opacity-0 group-hover:opacity-100"
            )} />

            {/* Active state warm glow border */}
            {isActive && !comingSoon && (
                <div className="absolute inset-0 rounded-lg ring-1 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]" />
            )}

            {/* Active indicator */}
            {isActive && !comingSoon && (
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-gradient-to-b from-amber-400 via-orange-500 to-red-500" />
            )}

            <Icon className={cn(
                "w-5 h-5 flex-shrink-0 relative z-10 transition-colors",
                isActive && !comingSoon ? "text-amber-400" : "group-hover:text-amber-300"
            )} />
            <span className="relative z-10 flex items-center gap-2 drop-shadow-sm">
                {label}
                {comingSoon && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                        Soon
                    </span>
                )}
            </span>

            {/* Active dot indicator - warm color */}
            {isActive && !comingSoon && (
                <div className="ml-auto w-2 h-2 rounded-full bg-amber-500 relative z-10" />
            )}
        </button>
    )
}
