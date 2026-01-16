'use client';

import { useEffect, useState } from 'react';

import { AlertCircle, CheckCircle, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseDynamicPrompt, validateBracketSyntax } from "../../helpers/prompt-syntax-feedback";
import { useWildCardStore } from "../../store/wildcard.store";

interface PromptSyntaxFeedbackProps {
    prompt: string;
    model?: string;
    disablePipeSyntax?: boolean;
    disableBracketSyntax?: boolean;
    disableWildcardSyntax?: boolean;
    enableAnchorTransform?: boolean;
    referenceImageCount?: number;
    onTogglePipeSyntax?: (disabled: boolean) => void;
    onToggleBracketSyntax?: (disabled: boolean) => void;
    onToggleWildcardSyntax?: (disabled: boolean) => void;
    onToggleAnchorTransform?: (enabled: boolean) => void;
}

export function PromptSyntaxFeedback({
    prompt,
    disablePipeSyntax,
    disableBracketSyntax,
    disableWildcardSyntax,
    enableAnchorTransform,
    referenceImageCount = 0,
    onTogglePipeSyntax,
    onToggleBracketSyntax,
    onToggleWildcardSyntax,
    onToggleAnchorTransform
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
    }, [prompt, wildcards, disablePipeSyntax, disableBracketSyntax, disableWildcardSyntax]);

    // Check if any syntax is disabled (for displaying disabled state)
    const hasAnyDisabled = disablePipeSyntax || disableBracketSyntax || disableWildcardSyntax;

    // Show toggle bar when there's a prompt OR when Anchor Transform could be enabled (2+ images)
    const showToggleBar = (prompt && prompt.trim().length > 0) || referenceImageCount >= 2;

    if (!feedback && !showToggleBar) return null;

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
        if (!feedback) return 'text-muted-foreground bg-background/50 border-border';
        switch (feedback.type) {
            case 'success':
                return 'text-emerald-400 bg-green-950/50 border-green-800';
            case 'warning':
                return 'text-yellow-400 bg-yellow-950/50 border-yellow-800';
            case 'error':
                return 'text-primary bg-primary/15/50 border-primary/30';
            case 'info':
                return 'text-accent bg-blue-950/50 border-blue-800';
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
                    {/* Syntax-specific toggle */}
                    {syntaxToggle && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={syntaxToggle}
                            className="h-6 px-2 text-xs hover:bg-white/10"
                        >
                            {isCurrentSyntaxDisabled() ? 'Enable' : 'Treat as Literal'}
                        </Button>
                    )}
                </div>
            )}

            {/* Always-visible syntax toggle bar - shows when there's a prompt */}
            {showToggleBar && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {hasAnyDisabled && <span>Syntax:</span>}
                    {/* Pipe toggle */}
                    <button
                        type="button"
                        onClick={() => onTogglePipeSyntax?.(!disablePipeSyntax)}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-all cursor-pointer ${disablePipeSyntax
                                ? 'border-border bg-card/30 opacity-50 hover:opacity-75'
                                : 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                            }`}
                        title={disablePipeSyntax
                            ? 'Pipe syntax disabled - Click to enable. Use prompt1 | prompt2 for sequential chain generation'
                            : 'Pipe syntax enabled - Click to disable. Currently: prompt1 | prompt2 creates a chain'
                        }
                        aria-label={disablePipeSyntax ? 'Enable pipe syntax for chain prompts' : 'Disable pipe syntax'}
                        aria-pressed={!disablePipeSyntax}
                    >
                        <span className="font-mono font-bold">|</span>
                        <X className={`h-2.5 w-2.5 ${disablePipeSyntax ? 'block' : 'hidden'}`} />
                    </button>
                    {/* Bracket toggle */}
                    <button
                        type="button"
                        onClick={() => onToggleBracketSyntax?.(!disableBracketSyntax)}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-all cursor-pointer ${disableBracketSyntax
                                ? 'border-border bg-card/30 opacity-50 hover:opacity-75'
                                : 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                            }`}
                        title={disableBracketSyntax
                            ? 'Bracket syntax disabled - Click to enable. Use [a, b, c] for multiple variations'
                            : 'Bracket syntax enabled - Click to disable. Currently: [a, b, c] creates 3 images'
                        }
                        aria-label={disableBracketSyntax ? 'Enable bracket syntax for variations' : 'Disable bracket syntax'}
                        aria-pressed={!disableBracketSyntax}
                    >
                        <span className="font-mono font-bold">[ ]</span>
                        <X className={`h-2.5 w-2.5 ${disableBracketSyntax ? 'block' : 'hidden'}`} />
                    </button>
                    {/* Wildcard toggle */}
                    <button
                        type="button"
                        onClick={() => onToggleWildcardSyntax?.(!disableWildcardSyntax)}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-all cursor-pointer ${disableWildcardSyntax
                                ? 'border-border bg-card/30 opacity-50 hover:opacity-75'
                                : 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                            }`}
                        title={disableWildcardSyntax
                            ? 'Wildcard syntax disabled - Click to enable. Use _name_ for random picks from your lists'
                            : 'Wildcard syntax enabled - Click to disable. Currently: _name_ pulls from your wildcard lists'
                        }
                        aria-label={disableWildcardSyntax ? 'Enable wildcard syntax for random selection' : 'Disable wildcard syntax'}
                        aria-pressed={!disableWildcardSyntax}
                    >
                        <span className="font-mono font-bold">_</span>
                        <X className={`h-2.5 w-2.5 ${disableWildcardSyntax ? 'block' : 'hidden'}`} />
                    </button>
                    {/* Anchor Transform toggle */}
                    <button
                        type="button"
                        onClick={() => onToggleAnchorTransform?.(!enableAnchorTransform)}
                        disabled={referenceImageCount < 2}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                            referenceImageCount < 2
                                ? 'border-border bg-card/30 opacity-30 cursor-not-allowed'
                                : enableAnchorTransform
                                    ? 'border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                                    : 'border-border bg-card/30 opacity-50 hover:opacity-75'
                            }`}
                        title={
                            referenceImageCount < 2
                                ? 'Anchor Transform - Requires 2+ reference images. Type @1 in prompt or click here.'
                                : enableAnchorTransform
                                    ? 'Anchor Transform enabled - First image transforms all others. Click to disable.'
                                    : 'Anchor Transform disabled - Click to enable or type @1 in your prompt. Use first image as style anchor to transform remaining images.'
                        }
                        aria-label={enableAnchorTransform ? 'Disable Anchor Transform' : 'Enable Anchor Transform'}
                        aria-pressed={enableAnchorTransform}
                    >
                        <span className="font-mono font-bold">¡</span>
                        <X className={`h-2.5 w-2.5 ${enableAnchorTransform ? 'hidden' : 'block'}`} />
                    </button>
                </div>
            )}
        </div>
    );
}
