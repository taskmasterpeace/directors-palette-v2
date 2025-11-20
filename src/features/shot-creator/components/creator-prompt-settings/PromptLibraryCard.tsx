import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TablePromptLibrary } from './TablePromptLibrary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// Import to trigger module-level initialization
import '@/features/shot-creator/helpers/prompt-library-init'
import {
    Search,
    Plus,
    BookOpen,
    Grid,
    Table,
    Download,
    Upload
} from 'lucide-react'
import { useState } from "react"
import { usePromptLibraryManager } from "../../hooks/usePromptLibraryManager"
import { PromptCard } from '../prompt-library/PromptCard'
import { CategoryCard } from '../prompt-library/CategoryCard'
import { EditPromptDialog } from '../prompt-library/dialogs/EditPromptDialog'
import { SavedPrompt } from "../../store/prompt-library-store"

interface PromptLibraryCardProps {
    onSelectPrompt?: (prompt: string) => void
    setIsAddPromptOpen?: (open: boolean) => void
    showQuickAccess?: boolean
}

const PromptLibraryCard = ({ onSelectPrompt, setIsAddPromptOpen, showQuickAccess }: PromptLibraryCardProps) => {
    const [activeTab, setActiveTab] = useState('categories')
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
    const [isEditPromptOpen, setIsEditPromptOpen] = useState(false)
    const [editingPrompt, setEditingPrompt] = useState<SavedPrompt | null>(null)

    const {
        prompts,
        categories,
        quickPrompts,
        filteredPrompts,
        categoryPrompts,
        handleExportPrompts,
        handleImportPrompts,
        setSearchQuery,
        setSelectedCategory,
        searchQuery,
        selectedCategory,
        getPromptsByCategory,
        handleSelectPrompt,
        toggleQuickAccess,
        deletePrompt,
        processPromptReplacements,
        handleUpdatePrompt,
    } = usePromptLibraryManager(onSelectPrompt)

    // Handle edit prompt
    const handleEdit = (prompt: SavedPrompt) => {
        setEditingPrompt(prompt)
        setIsEditPromptOpen(true)
    }

    const handleEditSave = async (updatedPrompt: SavedPrompt) => {
        const success = await handleUpdatePrompt(updatedPrompt)
        if (success) {
            setIsEditPromptOpen(false)
            setEditingPrompt(null)
        }
    }



    return (
        <Card className="bg-slate-900/90 border-slate-700 flex-1 flex flex-col">
            <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-400" />
                        <Badge variant="outline" className="text-xs">
                            {prompts.length} prompts
                        </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* View Mode Toggle */}
                        <div className="flex rounded-lg border border-slate-700 bg-slate-800 p-1">
                            <Button
                                size="sm"
                                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                                onClick={() => setViewMode('cards')}
                                className={`h-7 px-2 ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Grid className="w-4 h-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant={viewMode === 'table' ? 'default' : 'ghost'}
                                onClick={() => setViewMode('table')}
                                className={`h-7 px-2 ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Table className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="h-6 w-px bg-slate-700" />

                        <Button
                            size="sm"
                            onClick={() => handleExportPrompts()}
                            variant="outline"
                            className="border-slate-600 hover:bg-slate-800"
                        >
                            <Download className="w-4 h-4 mr-1" />
                            Export
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => document.getElementById('import-prompts')?.click()}
                            variant="outline"
                            className="border-slate-600 hover:bg-slate-800"
                        >
                            <Upload className="w-4 h-4 mr-1" />
                            Import
                        </Button>

                        <input
                            id="import-prompts"
                            type="file"
                            accept=".json,.csv"
                            className="hidden"
                            onChange={handleImportPrompts}
                        />

                        <Button
                            size="sm"
                            onClick={() => setIsAddPromptOpen?.(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                        </Button>
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-4">
                {/* Conditional rendering based on view mode */}
                {viewMode === 'table' ? (
                    <TablePromptLibrary
                        onSelectPrompt={onSelectPrompt}
                        showQuickAccess={showQuickAccess}
                        className="flex-1"
                    />
                ) : (
                    <>
                        {/* Search Bar */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Search prompts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-gray-400"
                            />
                        </div>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                            <TabsList className="bg-slate-800 border-slate-700">
                                <TabsTrigger value="all">All Prompts</TabsTrigger>
                                {showQuickAccess && <TabsTrigger value="quick">Quick Access</TabsTrigger>}
                                <TabsTrigger value="categories">Categories</TabsTrigger>
                            </TabsList>

                            <TabsContent value="all" className="flex-1 mt-4">
                                <ScrollArea className="h-[500px]">
                                    <div className="grid gap-3">
                                        {filteredPrompts.map(prompt => {
                                            const category = categories.find(c => c.id === prompt.categoryId)
                                            return (
                                                <PromptCard
                                                    key={prompt.id}
                                                    prompt={prompt}
                                                    categoryName={category?.name}
                                                    onToggleStar={toggleQuickAccess}
                                                    onDelete={deletePrompt}
                                                    onEdit={handleEdit}
                                                    onUsePrompt={handleSelectPrompt}
                                                    processPromptReplacements={processPromptReplacements}
                                                />
                                            )
                                        })}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            {showQuickAccess && (
                                <TabsContent value="quick" className="flex-1 mt-4">
                                    <ScrollArea className="h-[500px]">
                                        <div className="grid gap-3">
                                            {quickPrompts.map(prompt => {
                                                const category = categories.find(c => c.id === prompt.categoryId)
                                                return (
                                                    <PromptCard
                                                        key={prompt.id}
                                                        prompt={prompt}
                                                        categoryName={category?.name}
                                                        onToggleStar={toggleQuickAccess}
                                                        onDelete={deletePrompt}
                                                        onEdit={handleEdit}
                                                        onUsePrompt={handleSelectPrompt}
                                                        processPromptReplacements={processPromptReplacements}
                                                    />
                                                )
                                            })}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            )}

                            <TabsContent value="categories" className="flex-1 mt-4">
                                {!selectedCategory ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {categories.map(category => {
                                            const promptCount = getPromptsByCategory(category.id).length
                                            return (
                                                <CategoryCard
                                                    key={category.id}
                                                    id={category.id}
                                                    name={category.name}
                                                    icon={category.icon}
                                                    promptCount={promptCount}
                                                    onClick={setSelectedCategory}
                                                />
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedCategory(null)}
                                                    className="text-slate-400 hover:text-white"
                                                >
                                                    ← Back to Categories
                                                </Button>
                                                <div className="flex items-center gap-2 ml-2">
                                                    <span className="text-xl">
                                                        {categories.find(c => c.id === selectedCategory)?.icon}
                                                    </span>
                                                    <h3 className="font-medium text-white">
                                                        {categories.find(c => c.id === selectedCategory)?.name}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>
                                        <ScrollArea className="h-[450px]">
                                            <div className="grid gap-3">
                                                {categoryPrompts.length > 0 ? (
                                                    categoryPrompts.map(prompt => {
                                                        const category = categories.find(c => c.id === prompt.categoryId)
                                                        return (
                                                            <PromptCard
                                                                key={prompt.id}
                                                                prompt={prompt}
                                                                categoryName={category?.name}
                                                                onToggleStar={toggleQuickAccess}
                                                                onDelete={deletePrompt}
                                                                onEdit={handleEdit}
                                                                onUsePrompt={handleSelectPrompt}
                                                                processPromptReplacements={processPromptReplacements}
                                                            />
                                                        )
                                                    })
                                                ) : (
                                                    <div className="text-center py-8 text-gray-400">
                                                        No prompts in this category yet
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </CardContent>

            {/* Edit Prompt Dialog */}
            <EditPromptDialog
                open={isEditPromptOpen}
                onOpenChange={setIsEditPromptOpen}
                prompt={editingPrompt}
                categories={categories}
                onUpdate={handleEditSave}
            />
        </Card>
    )
}

export default PromptLibraryCard
