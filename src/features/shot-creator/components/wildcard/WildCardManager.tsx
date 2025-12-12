'use client';

import { useEffect, useState } from 'react';
import { useWildCardStore } from '../../store/wildcard.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Upload, Trash2, Edit, FileText, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { parseTextFile, validateWildCardName, validateWildCardContent } from '../../services/wildcard.service';
import { WildCard } from '../../helpers/wildcard/parser';

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
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">Wild Card Manager</h1>
                <p className="text-muted-foreground">
                    Create and manage wild cards for dynamic prompt variations. Use them in prompts like: _wildcard_name_
                </p>
            </div>

            {/* Create Button */}
            <div className="mb-6">
                <Button
                    onClick={() => {
                        setIsEditing(false);
                        setDialogOpen(true);
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Wild Card
                </Button>
            </div>

            {/* Wildcards Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : wildcards.length === 0 ? (
                <Card className="bg-card/50 border-border">
                    <CardContent className="py-12 text-center">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">No wild cards yet</p>
                        <Button
                            onClick={() => {
                                setIsEditing(false);
                                setDialogOpen(true);
                            }}
                            variant="outline"
                        >
                            Create Your First Wild Card
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {wildcards.map((wildcard) => (
                        <Card key={wildcard.id} className="bg-card/50 border-border hover:border-border transition-colors">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center justify-between">
                                    <span className="text-lg font-mono">_{wildcard.name}_</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopyName(wildcard.name)}
                                        className="h-8 w-8 p-0"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </CardTitle>
                                {wildcard.category && (
                                    <CardDescription className="text-muted-foreground">
                                        Category: {wildcard.category}
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {wildcard.description && (
                                    <p className="text-sm text-muted-foreground">{wildcard.description}</p>
                                )}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <FileText className="w-4 h-4" />
                                    <span>{getLineCount(wildcard.content)} options</span>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(wildcard)}
                                        className="flex-1"
                                    >
                                        <Edit className="w-4 h-4 mr-1" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(wildcard)}
                                        className="flex-1"
                                    >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
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
                                {getLineCount(formData.content)} options • Each line becomes one variation
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
