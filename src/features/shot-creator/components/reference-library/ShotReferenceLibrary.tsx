import React, { useEffect, useState, Fragment } from 'react'
import { LibraryCategory, useLibraryStore } from "../../store/shot-library.store"
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Maximize2, Edit3, Users, MapPin, Package, ImageIcon, Layout, Trash2, Grid3x3, List, Tag, Palette, Brush } from "lucide-react"
import Image from "next/image"
import { useShotCreatorStore } from "../../store"
import { Pagination } from "../unified-gallery/Pagination"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import InlineTagEditor from "../creator-reference-manager/InlineTagEditor"

const categoryConfig = {
    'all': { icon: ImageIcon, label: 'All', color: 'slate' },
    'people': { icon: Users, label: 'People', color: 'blue' },
    'places': { icon: MapPin, label: 'Places', color: 'green' },
    'props': { icon: Package, label: 'Props', color: 'orange' },
    'layouts': { icon: Layout, label: 'Layouts', color: 'red' },
    'styles': { icon: Brush, label: 'Styles', color: 'purple' },
    'unorganized': { icon: Palette, label: 'Unorganized', color: 'gray' },
}

const ShotReferenceLibrary = () => {
    const { setFullscreenImage } = useShotCreatorStore()
    const {
        libraryItems,
        libraryCategory,
        setLibraryCategory,
        libraryLoading,
        loadLibraryItems,
        updateItemCategory,
        deleteItem,
        updateItemTags,
        currentPage,
        totalPages,
        setCurrentPage
    } = useLibraryStore()

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [editingTagsId, setEditingTagsId] = useState<string | null>(null)

    // Load library items on mount
    useEffect(() => {
        loadLibraryItems()
    }, [loadLibraryItems])
    
    const onCategoryChange = async (itemId: string, newCategory: string) => {
        await updateItemCategory(itemId, newCategory)
    }

    const onDeleteItem = async (itemId: string) => {
        await deleteItem(itemId)
    }

    return (
        <Card className="bg-background border-border">
            <CardHeader className="pb-0">
                <CardTitle className="text-white flex items-center justify-between">
                    <span>Reference Library</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="my-2 flex justify-end">
                    <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'list')}>
                        <TabsList className="bg-card border border-border rounded-lg h-9">
                            <TabsTrigger
                                value="grid"
                                className="flex items-center gap-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-white text-foreground"
                            >
                                <Grid3x3 className="w-4 h-4" />
                                Grid
                            </TabsTrigger>
                            <TabsTrigger
                                value="list"
                                className="flex items-center gap-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-white text-foreground"
                            >
                                <List className="w-4 h-4" />
                                List
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(categoryConfig).map(([key, config]) => {
                        const IconComponent = config.icon
                        const isActive = libraryCategory === key

                        return (
                            <Button
                                key={key}
                                size="sm"
                                variant={isActive ? "default" : "outline"}
                                onClick={() => setLibraryCategory(key as LibraryCategory)}
                                className={`h-8 ${isActive ? 'bg-primary hover:bg-primary/90' : 'border-border text-foreground'}`}
                            >
                                <IconComponent className="w-3 h-3 mr-1" />
                                {config.label}
                            </Button>
                        )
                    })}
                </div>

                {/* Library Grid */}
                {libraryLoading ? (
                    <div className="text-center py-8">
                        <LoadingSpinner size="md" className="mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">Loading library...</p>
                    </div>
                ) : libraryItems.length === 0 ? (
                    <div className="text-center py-8">
                        <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">Library is empty</p>
                    </div>
                ) : (
                    <Fragment>
                        <ScrollArea className="h-[600px]">
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-3 gap-3">
                                    {libraryItems.map((item) => (
                                        <div key={item.id} className="relative group">
                                            <div
                                                className="rounded-md border border-border overflow-hidden bg-card cursor-pointer hover:border-primary transition-colors"
                                                onClick={() => setFullscreenImage(item)}
                                            >
                                                <Image
                                                    src={item.preview || item.imageData}
                                                    alt={item.prompt || 'Library image'}
                                                    className="w-full h-32 object-cover rounded-md bg-background"
                                                    width={200}
                                                    height={200}
                                                />

                                                {/* Tag pills - bottom left (click to edit) */}
                                                {editingTagsId === item.id ? (
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/90 p-1.5 rounded-b-md" onClick={(e) => e.stopPropagation()}>
                                                        <InlineTagEditor
                                                            initialTags={item.tags || []}
                                                            onSave={(newTags) => {
                                                                updateItemTags(item.id, newTags)
                                                                setEditingTagsId(null)
                                                            }}
                                                            onCancel={() => setEditingTagsId(null)}
                                                            autoFocus
                                                        />
                                                    </div>
                                                ) : item.tags && item.tags.length > 0 ? (
                                                    <div
                                                        className="absolute bottom-1 left-1 flex gap-1 max-w-[calc(100%-2rem)] cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setEditingTagsId(item.id)
                                                        }}
                                                        title="Click to edit tags"
                                                    >
                                                        {item.tags.slice(0, 2).map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="bg-black/70 text-white text-[10px] leading-tight px-1.5 py-0.5 rounded-full truncate max-w-[5rem] hover:bg-violet-500/70 transition-colors"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                        {item.tags.length > 2 && (
                                                            <span className="bg-violet-500/70 text-white text-[10px] leading-tight px-1.5 py-0.5 rounded-full">
                                                                +{item.tags.length - 2}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setEditingTagsId(item.id)
                                                        }}
                                                    >
                                                        <span className="bg-black/70 text-white/60 text-[10px] leading-tight px-1.5 py-0.5 rounded-full flex items-center gap-1 hover:text-white transition-colors">
                                                            <Tag className="w-2.5 h-2.5" />
                                                            + tag
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Category icon */}
                                                <div className="absolute bottom-1 right-1 bg-black/80 rounded p-1">
                                                    {item.category === 'people' && <Users className="w-3 h-3 text-accent" />}
                                                    {item.category === 'places' && <MapPin className="w-3 h-3 text-emerald-400" />}
                                                    {item.category === 'props' && <Package className="w-3 h-3 text-orange-400" />}
                                                    {item.category === 'layouts' && <Layout className="w-3 h-3 text-red-400" />}
                                                    {item.category === 'styles' && <Brush className="w-3 h-3 text-purple-400" />}
                                                    {(!item.category || item.category === 'unorganized') && <ImageIcon className="w-3 h-3 text-muted-foreground" />}
                                                </div>

                                                {/* Hover overlay */}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-white hover:bg-white/20"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setFullscreenImage(item)
                                                        }}
                                                    >
                                                        <Maximize2 className="w-4 h-4" />
                                                    </Button>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0 text-white hover:bg-accent bg-accent/80"
                                                                onClick={(e) => e.stopPropagation()}
                                                                title="Edit Category"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                                            <DropdownMenuItem onSelect={() => onCategoryChange(item.id, 'people')}>
                                                                <Users className="w-4 h-4 mr-2" /> People
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => onCategoryChange(item.id, 'places')}>
                                                                <MapPin className="w-4 h-4 mr-2" /> Places
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => onCategoryChange(item.id, 'props')}>
                                                                <Package className="w-4 h-4 mr-2" /> Props
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => onCategoryChange(item.id, 'layouts')}>
                                                                <Layout className="w-4 h-4 mr-2" /> Layouts
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => onCategoryChange(item.id, 'styles')}>
                                                                <Brush className="w-4 h-4 mr-2" /> Styles
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => onCategoryChange(item.id, 'unorganized')}>
                                                                <ImageIcon className="w-4 h-4 mr-2" /> Unorganized
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-white hover:bg-primary bg-primary/80"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onDeleteItem(item.id)
                                                        }}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 pr-4">
                                    {libraryItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-3 p-2 rounded-md border border-border bg-card hover:border-primary transition-colors group cursor-pointer"
                                            onClick={() => setFullscreenImage(item)}
                                        >
                                            <div className="relative w-20 h-20 rounded overflow-hidden bg-background flex-shrink-0">
                                                <Image
                                                    src={item.preview || item.imageData}
                                                    alt={item.prompt || 'Library image'}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 53vw"
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-foreground truncate">{item.prompt || 'Untitled'}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-xs text-muted-foreground capitalize">{item.category || 'unorganized'}</p>
                                                    {editingTagsId === item.id ? (
                                                        <div onClick={(e) => e.stopPropagation()}>
                                                            <InlineTagEditor
                                                                initialTags={item.tags || []}
                                                                onSave={(newTags) => {
                                                                    updateItemTags(item.id, newTags)
                                                                    setEditingTagsId(null)
                                                                }}
                                                                onCancel={() => setEditingTagsId(null)}
                                                                autoFocus
                                                            />
                                                        </div>
                                                    ) : item.tags && item.tags.length > 0 ? (
                                                        <div
                                                            className="flex gap-1 flex-wrap cursor-pointer"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setEditingTagsId(item.id)
                                                            }}
                                                            title="Click to edit tags"
                                                        >
                                                            {item.tags.map((tag) => (
                                                                <span
                                                                    key={tag}
                                                                    className="bg-violet-500/20 text-violet-300 text-[10px] leading-tight px-1.5 py-0.5 rounded-full hover:bg-violet-500/30 transition-colors"
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span
                                                            className="text-[10px] text-muted-foreground cursor-pointer hover:text-violet-300 transition-colors flex items-center gap-1"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setEditingTagsId(item.id)
                                                            }}
                                                        >
                                                            <Tag className="w-2.5 h-2.5" />
                                                            + tag
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions (show on hover or always visible on large screens) */}
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setFullscreenImage(item)
                                                    }}
                                                >
                                                    <Maximize2 className="w-4 h-4" />
                                                </Button>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-white hover:bg-accent bg-accent/80"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                                        <DropdownMenuItem onSelect={() => onCategoryChange(item.id, 'people')}>
                                                            <Users className="w-4 h-4 mr-2" /> People
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => onCategoryChange(item.id, 'places')}>
                                                            <MapPin className="w-4 h-4 mr-2" /> Places
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => onCategoryChange(item.id, 'props')}>
                                                            <Package className="w-4 h-4 mr-2" /> Props
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => onCategoryChange(item.id, 'layouts')}>
                                                            <Layout className="w-4 h-4 mr-2" /> Layouts
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => onCategoryChange(item.id, 'styles')}>
                                                            <Brush className="w-4 h-4 mr-2" /> Styles
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => onCategoryChange(item.id, 'unorganized')}>
                                                            <ImageIcon className="w-4 h-4 mr-2" /> Unorganized
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>

                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 text-white hover:bg-primary bg-primary/80"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onDeleteItem(item.id)
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>

                        {/* Pagination */}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </Fragment>
                )}
            </CardContent>
        </Card>
    )
}

export default ShotReferenceLibrary