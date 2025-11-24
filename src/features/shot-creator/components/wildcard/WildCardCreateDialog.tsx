'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useWildCardStore } from '../../store/wildcard.store';
import { parseTextFile, validateWildCardName, validateWildCardContent } from '../../services/wildcard.service';

interface WildCardCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function WildCardCreateDialog({ open, onOpenChange }: WildCardCreateDialogProps) {
    const { createWildCard } = useWildCardStore();
    const [formData, setFormData] = useState({
        name: '',
        content: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.txt')) {
            toast({
                title: 'Invalid File',
                description: 'Please upload a .txt file',
                variant: 'destructive'
            });
            return;
        }

        try {
            const content = await parseTextFile(file);
            setFormData(prev => ({ ...prev, content }));

            const lineCount = content.split('\n').filter(l => l.trim()).length;
            toast({
                title: 'File Loaded',
                description: `Found ${lineCount} prompts in ${file.name}`
            });
        } catch (error) {
            console.error('Error reading file:', error);
            toast({
                title: 'Error',
                description: 'Failed to read file',
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

        setIsSubmitting(true);
        const result = await createWildCard(formData);
        setIsSubmitting(false);

        if (result.success) {
            setFormData({ name: '', content: '' });
            onOpenChange(false);
        }
    };

    const getLineCount = () => {
        return formData.content.split('\n').filter(line => line.trim()).length;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create Wild Card</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Upload a text file with one prompt per line
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label>Wild Card Name *</Label>
                        <Input
                            placeholder="e.g., black_girl_hairstyles (no spaces!)"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="bg-slate-900 border-slate-600 font-mono"
                        />
                        <p className="text-xs text-slate-500">
                            Use in prompts as: <span className="font-mono text-blue-400">_{formData.name || 'name'}_</span>
                        </p>
                    </div>

                    {/* File Upload */}
                    <div className="space-y-2">
                        <Label>Upload Text File *</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="file"
                                accept=".txt"
                                onChange={handleFileUpload}
                                className="bg-slate-900 border-slate-600 flex-1"
                            />
                            <Button variant="outline" size="icon" asChild>
                                <label className="cursor-pointer">
                                    <Upload className="w-4 h-4" />
                                </label>
                            </Button>
                        </div>
                        {formData.content && (
                            <p className="text-xs text-green-400">
                                ✓ Found {getLineCount()} prompts
                            </p>
                        )}
                        <p className="text-xs text-slate-500">
                            One prompt per line. Each line will be randomly selected.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!formData.name || !formData.content || isSubmitting}
                        className="bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-700 hover:to-blue-700"
                    >
                        {isSubmitting ? 'Creating...' : 'Create Wild Card'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
