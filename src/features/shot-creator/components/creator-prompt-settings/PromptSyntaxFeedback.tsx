'use client';

import { useEffect, useState } from 'react';

import { AlertCircle, CheckCircle, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { parseDynamicPrompt, validateBracketSyntax } from "../../helpers/prompt-syntax-feedback";
import { useWildCardStore } from "../../store/wildcard.store";

interface PromptSyntaxFeedbackProps {
    prompt: string;
    model?: string;
    rawPromptMode?: boolean;
    disablePipeSyntax?: boolean;
    disableBracketSyntax?: boolean;
    disableWildcardSyntax?: boolean;
    onToggleRawMode?: (enabled: boolean) => void;
    onTogglePipeSyntax?: (disabled: boolean) => void;
    onToggleBracketSyntax?: (disabled: boolean) => void;
    onToggleWildcardSyntax?: (disabled: boolean) => void;
}

export function PromptSyntaxFeedback({
    prompt,
    rawPromptMode,
    disablePipeSyntax,
    disableBracketSyntax,
    disableWildcardSyntax,
    onToggleRawMode,
    onTogglePipeSyntax,
    onToggleBracketSyntax,
    onToggleWildcardSyntax
}: PromptSyntaxFeedbackProps) {
    const { wildcards, loadWildCards } = useWildCardStore();
    const [feedback, setFeedback] = useState<{
        type: 'info' | 'warning' | 'error' | 'success';
        message: string;
        details?: string;
        syntaxType?: 'pipe' | 'bracket' | 'wildcard';
    } | null>(null);

    // Load wildcards on mount
    useEffect(() => {
        void loadWildCards();
    }, [loadWildCards]);

    useEffect(() => {
        // Show different feedback if raw prompt mode is enabled
        if (rawPromptMode) {
            setFeedback({
                type: 'info',
                message: 'Raw Prompt Mode Active',
                details: 'All special syntax will be sent as literal text'
            });
            return;
        }

        if (!prompt || prompt.trim().length === 0) {
            setFeedback(null);
            return;
        }

        // Check for pipe syntax (chaining)
        const hasPipes = prompt.includes('|');
        if (hasPipes) {
            if (disablePipeSyntax) {
                setFeedback({
                    type: 'info',
                    message: 'Pipe syntax disabled',
                    details: '| characters will be sent as literal text',
                    syntaxType: 'pipe'
                });
            } else {
                const steps = prompt.split('|').filter(s => s.trim());
                setFeedback({
                    type: 'info',
                    message: `Chain Mode: ${steps.length} sequential steps`,
                    details: 'Each step builds on the previous result',
                    syntaxType: 'pipe'
                });
            }
            return;
        }

        // Check for wildcards
        const wildcardMatches = prompt.match(/_[a-zA-Z0-9_]+_/g);
        if (wildcardMatches && wildcardMatches.length > 0) {
            if (disableWildcardSyntax) {
                setFeedback({
                    type: 'info',
                    message: 'Wildcard syntax disabled',
                    details: '_underscored_ words will be sent as literal text',
                    syntaxType: 'wildcard'
                });
                return;
            }

            // Parse with actual wildcards to get accurate info
            const result = parseDynamicPrompt(prompt, { disableWildcardSyntax: false }, wildcards);

            if (result.hasWildCards && result.isValid) {
                // Extract option counts from warnings
                const infoMessage = result.warnings?.find(w => w.includes('Random selection from'));
                const details = infoMessage?.replace('🎲 Random selection from: ', '') || 'Random selection';

                setFeedback({
                    type: 'success',
                    message: `Wild Cards: Will randomly select from options`,
                    details: details,
                    syntaxType: 'wildcard'
                });
            } else if (result.hasWildCards && !result.isValid) {
                setFeedback({
                    type: 'warning',
                    message: result.warnings?.[0] || 'Some wildcards not found',
                    details: 'Create wildcards in Wild Card Manager',
                    syntaxType: 'wildcard'
                });
            } else {
                setFeedback({
                    type: 'info',
                    message: `Wild Cards: ${wildcardMatches.join(', ')} detected`,
                    details: 'Create wildcards to enable expansion',
                    syntaxType: 'wildcard'
                });
            }
            return;
        }

        // Check for brackets
        const openBrackets = (prompt.match(/\[/g) || []).length;
        const closeBrackets = (prompt.match(/\]/g) || []).length;

        if (openBrackets > 0 || closeBrackets > 0) {
            if (disableBracketSyntax) {
                setFeedback({
                    type: 'info',
                    message: 'Bracket syntax disabled',
                    details: '[brackets] will be sent as literal text',
                    syntaxType: 'bracket'
                });
                return;
            }

            // Validate bracket syntax
            const validation = validateBracketSyntax(prompt);

            if (!validation.isValid) {
                setFeedback({
                    type: 'warning',
                    message: validation.error || 'Invalid bracket syntax',
                    details: validation.suggestion,
                    syntaxType: 'bracket'
                });
                return;
            }

            // Parse to get variation count
            const result = parseDynamicPrompt(prompt, { disableBracketSyntax: false });

            if (result.hasBrackets && result.isValid) {
                const optionCount = result.options?.length || 0;
                setFeedback({
                    type: 'success',
                    message: `Will generate ${optionCount} variations`,
                    details: optionCount > 1 ? 'One image per option' : undefined,
                    syntaxType: 'bracket'
                });
            } else if (openBrackets === 1 && closeBrackets === 0) {
                setFeedback({
                    type: 'warning',
                    message: 'Missing closing bracket ]',
                    details: 'Complete your options list',
                    syntaxType: 'bracket'
                });
            } else if (openBrackets === 1 && prompt.endsWith('[')) {
                setFeedback({
                    type: 'info',
                    message: 'Add your options',
                    details: 'Format: [option1, option2, option3]',
                    syntaxType: 'bracket'
                });
            }
            return;
        }

        // Regular prompt
        setFeedback(null);
    }, [prompt, wildcards, rawPromptMode, disablePipeSyntax, disableBracketSyntax, disableWildcardSyntax]);

    // Show disabled syntax badges if any are disabled
    const disabledBadges = [];
    if (disablePipeSyntax) disabledBadges.push({ label: 'Pipes |', toggle: () => onTogglePipeSyntax?.(false) });
    if (disableBracketSyntax) disabledBadges.push({ label: 'Brackets []', toggle: () => onToggleBracketSyntax?.(false) });
    if (disableWildcardSyntax) disabledBadges.push({ label: 'Wildcards _', toggle: () => onToggleWildcardSyntax?.(false) });

    if (!feedback && disabledBadges.length === 0) return null;

    const getIcon = () => {
        if (!feedback) return null;
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
        if (!feedback) return 'text-slate-400 bg-slate-950/50 border-slate-700';
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

    // Get the toggle function for the current syntax type
    const getSyntaxToggle = () => {
        if (!feedback?.syntaxType) return null;
        switch (feedback.syntaxType) {
            case 'pipe':
                return onTogglePipeSyntax ? () => onTogglePipeSyntax(!disablePipeSyntax) : null;
            case 'bracket':
                return onToggleBracketSyntax ? () => onToggleBracketSyntax(!disableBracketSyntax) : null;
            case 'wildcard':
                return onToggleWildcardSyntax ? () => onToggleWildcardSyntax(!disableWildcardSyntax) : null;
        }
    };

    const isCurrentSyntaxDisabled = () => {
        if (!feedback?.syntaxType) return false;
        switch (feedback.syntaxType) {
            case 'pipe': return disablePipeSyntax;
            case 'bracket': return disableBracketSyntax;
            case 'wildcard': return disableWildcardSyntax;
        }
    };

    const syntaxToggle = getSyntaxToggle();

    return (
        <div className="space-y-1.5">
            {/* Main feedback */}
            {feedback && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs ${getColorClass()}`}>
                    {getIcon()}
                    <div className="flex-1">
                        <span className="font-medium">{feedback.message}</span>
                        {feedback.details && (
                            <span className="opacity-75 ml-1">• {feedback.details}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Syntax-specific toggle */}
                        {syntaxToggle && !rawPromptMode && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={syntaxToggle}
                                className="h-6 px-2 text-xs hover:bg-white/10"
                            >
                                {isCurrentSyntaxDisabled() ? 'Enable' : 'Treat as Literal'}
                            </Button>
                        )}
                        {/* Raw mode toggle */}
                        {onToggleRawMode && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onToggleRawMode(!rawPromptMode)}
                                className="h-6 px-2 text-xs hover:bg-white/10"
                            >
                                {rawPromptMode ? 'Exit Raw Mode' : 'Raw Mode'}
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Disabled syntax badges (when not showing feedback for that syntax) */}
            {disabledBadges.length > 0 && !rawPromptMode && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span>Disabled:</span>
                    {disabledBadges.map(badge => (
                        <Badge
                            key={badge.label}
                            variant="outline"
                            className="h-5 px-1.5 text-xs bg-slate-800/50 border-slate-700 hover:bg-slate-700 cursor-pointer"
                            onClick={badge.toggle}
                        >
                            {badge.label}
                            <X className="h-3 w-3 ml-1" />
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
