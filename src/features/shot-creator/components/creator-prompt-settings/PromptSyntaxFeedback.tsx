'use client';

import { useEffect, useState } from 'react';

import { AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseDynamicPrompt, validateBracketSyntax } from "../../helpers/prompt-syntax-feedback";
import { useWildCardStore } from "../../store/wildcard.store";

interface PromptSyntaxFeedbackProps {
    prompt: string;
    model?: string;
    rawPromptMode?: boolean;
    onToggleRawMode?: (enabled: boolean) => void;
}

export function PromptSyntaxFeedback({ prompt, rawPromptMode, onToggleRawMode }: PromptSyntaxFeedbackProps) {
    const { wildcards, loadWildCards } = useWildCardStore();
    const [feedback, setFeedback] = useState<{
        type: 'info' | 'warning' | 'error' | 'success';
        message: string;
        details?: string;
    } | null>(null);

    // Load wildcards on mount
    useEffect(() => {
        void loadWildCards();
    }, [loadWildCards]);

    useEffect(() => {
        // Skip feedback if raw prompt mode is enabled
        if (rawPromptMode) {
            setFeedback(null);
            return;
        }

        if (!prompt || prompt.trim().length === 0) {
            setFeedback(null);
            return;
        }

        // Check for pipe syntax (chaining)
        const hasPipes = prompt.includes('|');
        if (hasPipes) {
            const steps = prompt.split('|').filter(s => s.trim());
            setFeedback({
                type: 'info',
                message: `Chain Mode: ${steps.length} sequential steps`,
                details: 'Each step builds on the previous result'
            });
            return;
        }

        // Check for wildcards
        const wildcardMatches = prompt.match(/_[a-zA-Z0-9_]+_/g);
        if (wildcardMatches && wildcardMatches.length > 0) {
            // Parse with actual wildcards to get accurate info
            const result = parseDynamicPrompt(prompt, {}, wildcards);

            if (result.hasWildCards && result.isValid) {
                // Extract option counts from warnings
                const infoMessage = result.warnings?.find(w => w.includes('Random selection from'));
                const details = infoMessage?.replace('🎲 Random selection from: ', '') || 'Random selection';

                setFeedback({
                    type: 'success',
                    message: `Wild Cards: Will randomly select from options`,
                    details: details
                });
            } else if (result.hasWildCards && !result.isValid) {
                setFeedback({
                    type: 'warning',
                    message: result.warnings?.[0] || 'Some wildcards not found',
                    details: 'Create wildcards in Wild Card Manager'
                });
            } else {
                setFeedback({
                    type: 'info',
                    message: `Wild Cards: ${wildcardMatches.join(', ')} detected`,
                    details: 'Create wildcards to enable expansion'
                });
            }
            return;
        }

        // Check for brackets
        const openBrackets = (prompt.match(/\[/g) || []).length;
        const closeBrackets = (prompt.match(/\]/g) || []).length;

        if (openBrackets > 0 || closeBrackets > 0) {
            // Validate bracket syntax
            const validation = validateBracketSyntax(prompt);

            if (!validation.isValid) {
                setFeedback({
                    type: 'warning',
                    message: validation.error || 'Invalid bracket syntax',
                    details: validation.suggestion
                });
                return;
            }

            // Parse to get variation count
            const result = parseDynamicPrompt(prompt);

            if (result.hasBrackets && result.isValid) {
                const optionCount = result.options?.length || 0;
                setFeedback({
                    type: 'success',
                    message: `Will generate ${optionCount} variations`,
                    details: optionCount > 1 ? 'One image per option' : undefined
                });
            } else if (openBrackets === 1 && closeBrackets === 0) {
                setFeedback({
                    type: 'warning',
                    message: 'Missing closing bracket ]',
                    details: 'Complete your options list'
                });
            } else if (openBrackets === 1 && prompt.endsWith('[')) {
                setFeedback({
                    type: 'info',
                    message: 'Add your options',
                    details: 'Format: [option1, option2, option3]'
                });
            }
            return;
        }

        // Regular prompt
        setFeedback(null);
    }, [prompt, wildcards, rawPromptMode]);

    if (!feedback) return null;

    const getIcon = () => {
        switch (feedback.type) {
            case 'success':
                return <CheckCircle className="h-3.5 w-3.5" />;
            case 'warning':
                return <AlertCircle className="h-3.5 w-3.5" />;
            case 'error':
                return <AlertCircle className="h-3.5 w-3.5" />;
            case 'info':
                return <Sparkles className="h-3.5 w-3.5" />;
        }
    };

    const getColorClass = () => {
        switch (feedback.type) {
            case 'success':
                return 'text-green-400 bg-green-950/50 border-green-800';
            case 'warning':
                return 'text-yellow-400 bg-yellow-950/50 border-yellow-800';
            case 'error':
                return 'text-red-400 bg-red-950/50 border-red-800';
            case 'info':
                return 'text-blue-400 bg-blue-950/50 border-blue-800';
        }
    };

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs ${getColorClass()}`}>
            {getIcon()}
            <div className="flex-1">
                <span className="font-medium">{feedback.message}</span>
                {feedback.details && (
                    <span className="opacity-75 ml-1">• {feedback.details}</span>
                )}
            </div>
            {onToggleRawMode && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleRawMode(true)}
                    className="h-6 px-2 text-xs hover:bg-white/10"
                >
                    Send as Literal Text
                </Button>
            )}
        </div>
    );
}