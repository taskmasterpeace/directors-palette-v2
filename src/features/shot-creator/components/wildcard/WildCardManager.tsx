'use client';

import { useEffect, useState } from 'react';
import { useWildCardStore } from '../../store/wildcard.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Upload, Trash2, Edit, FileText, Copy } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from '@/hooks/use-toast';
import { parseTextFile, validateWildCardName, validateWildCardContent } from '../../services/wildcard.service';
import { WildCard } from '../../helpers/wildcard/parser';
import {
    useFloating,
    useHover,
    useInteractions,
    offset,
    flip,
    shift,
    autoUpdate,
    FloatingPortal,
} from '@floating-ui/react';

// Individual wildcard card with floating preview
function WildCardCard({
    wildcard,
    onEdit,
    onDelete,
    onCopy,
}: {
    wildcard: WildCard;
    onEdit: (wc: WildCard) => void;
    onDelete: (wc: WildCard) => void;
    onCopy: (name: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);

    const { refs, floatingStyles, context } = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        placement: 'right-start',
        middleware: [offset(8), flip(), shift({ padding: 8 })],
        whileElementsMounted: autoUpdate,
    });

    const hover = useHover(context, {
        delay: { open: 200, close: 100 },
    });

    const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

    const getLineCount = (content: string) => {
        return content.split('\n').filter(line => line.trim()).length;
    };

    // Get first few lines for preview
    const getPreviewLines = (content: string, maxLines = 3) => {
        const lines = content.split('\n').filter(line => line.trim());
        return lines.slice(0, maxLines);
    };

    // Get all lines for floating preview
    const getAllLines = (content: string, maxLines = 15) => {
        const lines = content.split('\n').filter(line => line.trim());
        return {
            lines: lines.slice(0, maxLines),
            hasMore: lines.length > maxLines,
            total: lines.length,
        };
    };

    const previewLines = getPreviewLines(wildcard.content);
    const floatingData = getAllLines(wildcard.content);

    return (
        <>
            <Card
                ref={refs.setReference}
                {...getReferenceProps()}
                className="bg-card/50 border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer group"
            >
                <CardHeader className="pb-2">
                    <CardTitle className="text-white flex items-center justify-between">
                        <span className="text-sm font-mono truncate">_{wildcard.name}_</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCopy(wildcard.name);
                            }}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Copy className="w-3 h-3" />
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                    {/* Preview of first lines */}
                    <div className="text-xs text-muted-foreground font-mono space-y-0.5 bg-background/50 rounded p-2 max-h-[60px] overflow-hidden">
                        {previewLines.map((line, i) => (
                            <div key={i} className="truncate">
                                {line}
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {getLineCount(wildcard.content)} options
                        </span>
                        {wildcard.category && (
                            <span className="text-primary/70">{wildcard.category}</span>
                        )}
                    </div>

                    <div className="flex gap-1.5 pt-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(wildcard);
                            }}
                            className="flex-1 h-7 text-xs"
                        >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(wildcard);
                            }}
                            className="flex-1 h-7 text-xs"
                        >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Floating preview on hover (desktop only) */}
            {isOpen && (
                <FloatingPortal>
                    <div
                        ref={refs.setFloating}
                        style={floatingStyles}
                        {...getFloatingProps()}
                        className="z-50 hidden md:block"
                    >
                        <div className="bg-popover border border-border rounded-lg shadow-xl p-3 max-w-xs">
                            <div className="text-xs font-medium text-white mb-2">
                                _{wildcard.name}_ entries:
                            </div>
                            <div className="text-xs font-mono text-muted-foreground space-y-0.5 max-h-[250px] overflow-y-auto">
                                {floatingData.lines.map((line, i) => (
                                    <div key={i} className="py-0.5 border-b border-border/30 last:border-0">
                                        {line}
                                    </div>
                                ))}
                                {floatingData.hasMore && (
                                    <div className="text-primary/70 pt-1">
                                        ... and {floatingData.total - floatingData.lines.length} more
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </FloatingPortal>
            )}
        </>
    );
}

export function WildCardManager() {
    const {
        wildcards,
        isLoading,
        dialogOpen,
        selectedWildCard,
        loadWildCards,
        createWildCard,
        updateWildCard,
        deleteWildCard,
        setDialogOpen,
        setSelectedWildCard
    } = useWildCardStore();

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        content: '',
        description: ''
    });
    const [isEditing, setIsEditing] = useState(false);

    // Load wildcards on mount
    useEffect(() => {
        void loadWildCards();
    }, [loadWildCards]);

    // Reset form when dialog closes
    useEffect(() => {
        if (!dialogOpen) {
            setFormData({ name: '', category: '', content: '', description: '' });
            setIsEditing(false);
            setSelectedWildCard(null);
        }
    }, [dialogOpen, setSelectedWildCard]);

    // Populate form when editing
    useEffect(() => {
        if (selectedWildCard && isEditing) {
            setFormData({
                name: selectedWildCard.name,
                category: selectedWildCard.category || '',
                content: selectedWildCard.content,
                description: selectedWildCard.description || ''
            });
        }
    }, [selectedWildCard, isEditing]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.txt')) {
            toast({
                title: 'Invalid File Type',
                description: 'Please upload a .txt file',
                variant: 'destructive'
            });
            return;
        }

        try {
            const content = await parseTextFile(file);
            setFormData(prev => ({ ...prev, content }));

            toast({
                title: 'File Loaded',
                description: `Loaded ${content.split('\n').filter(l => l.trim()).length} lines from ${file.name}`
            });
        } catch (error) {
            console.error('Error reading file:', error);
            toast({
                title: 'Error Reading File',
                description: 'Failed to read file content',
                variant: 'destructive'
            });
        }
    };

    const handleSubmit = async () => {
        // Validate name
        const nameValidation = validateWildCardName(formData.name);
        if (!nameValidation.isValid) {
            toast({
                title: 'Invalid Name',
                description: nameValidation.error,
                variant: 'destructive'
            });
            return;
        }

        // Validate content
        const contentValidation = validateWildCardContent(formData.content);
        if (!contentValidation.isValid) {
            toast({
                title: 'Invalid Content',
                description: contentValidation.error,
                variant: 'destructive'
            });
            return;
        }

        if (isEditing && selectedWildCard) {
            // Update existing wildcard
            const result = await updateWildCard(selectedWildCard.id, formData);
            if (result.success) {
                setDialogOpen(false);
            }
        } else {
            // Create new wildcard
            const result = await createWildCard(formData);
            if (result.success) {
                setDialogOpen(false);
            }
        }
    };

    const handleEdit = (wildcard: WildCard) => {
        setSelectedWildCard(wildcard);
        setIsEditing(true);
        setDialogOpen(true);
    };

    const handleDelete = async (wildcard: WildCard) => {
        if (!confirm(`Are you sure you want to delete "_${wildcard.name}_"?`)) {
            return;
        }

        await deleteWildCard(wildcard.id);
    };

    const handleCopyName = (name: string) => {
        navigator.clipboard.writeText(`_${name}_`);
        toast({
            title: 'Copied',
            description: `"_${name}_" copied to clipboard`
        });
    };

    const getLineCount = (content: string) => {
        return content.split('\n').filter(line => line.trim()).length;
    };

    return (
        <div className="h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-white">Wild Cards</h2>
                    <p className="text-xs text-muted-foreground">
                        Use in prompts like: _wildcard_name_
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setIsEditing(false);
                        setDialogOpen(true);
                    }}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                    <Plus className="w-4 h-4 mr-1" />
                    New
                </Button>
            </div>

            {/* Wildcards Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="lg" />
                </div>
            ) : wildcards.length === 0 ? (
                <Card className="bg-card/50 border-border">
                    <CardContent className="py-8 text-center">
                        <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground mb-3 text-sm">No wild cards yet</p>
                        <Button
                            onClick={() => {
                                setIsEditing(false);
                                setDialogOpen(true);
                            }}
                            variant="outline"
                            size="sm"
                        >
                            Create Your First Wild Card
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {wildcards.map((wildcard) => (
                        <WildCardCard
                            key={wildcard.id}
                            wildcard={wildcard}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onCopy={handleCopyName}
                        />
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-card border-border text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit Wild Card' : 'Create New Wild Card'}</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            {isEditing
                                ? 'Update your wild card details'
                                : 'Create a wild card by pasting content or uploading a text file'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label>Wild Card Name *</Label>
                            <Input
                                placeholder="e.g., black_girl_hairstyles (no spaces)"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="bg-background border-border font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                                Use it in prompts as: <span className="font-mono text-accent">_{formData.name || 'name'}_</span>
                            </p>
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                            <Label>Category (optional)</Label>
                            <Input
                                placeholder="e.g., hairstyles, locations, characters"
                                value={formData.category}
                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                className="bg-background border-border"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label>Description (optional)</Label>
                            <Input
                                placeholder="What is this wild card for?"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="bg-background border-border"
                            />
                        </div>

                        {/* File Upload */}
                        <div className="space-y-2">
                            <Label>Upload Text File</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="file"
                                    accept=".txt"
                                    onChange={handleFileUpload}
                                    className="bg-background border-border"
                                />
                                <Button variant="outline" size="sm" asChild>
                                    <label className="cursor-pointer">
                                        <Upload className="w-4 h-4" />
                                    </label>
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Upload a .txt file with one option per line</p>
                        </div>

                        {/* Content */}
                        <div className="space-y-2">
                            <Label>Content * (one option per line)</Label>
                            <Textarea
                                placeholder="box braids&#10;cornrows&#10;locs&#10;afro puffs&#10;twist out"
                                value={formData.content}
                                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                className="bg-background border-border min-h-[200px] font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                                {getLineCount(formData.content)} options - Each line becomes one variation
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            {isEditing ? 'Update' : 'Create'} Wild Card
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
