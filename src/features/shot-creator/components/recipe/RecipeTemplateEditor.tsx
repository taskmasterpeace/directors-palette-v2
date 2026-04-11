'use client';

import { useMemo, useRef } from 'react';
import type { RecipeStage } from '../../types/recipe-stage.types';
import { RECIPE_TOOLS } from '../../types/recipe-tools.types';
import { RECIPE_ANALYSIS } from '../../types/recipe-analysis.types';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';

// --- Syntax highlighting overlay ---

function HighlightedOverlay({ text }: { text: string }) {
  const parts = useMemo(() => {
    const regex = /(<<[^>]+>>)/g;
    return text.split(regex);
  }, [text]);

  return (
    <div className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words font-mono text-sm leading-relaxed p-3 text-zinc-300">
      {parts.map((part, i) =>
        part.startsWith('<<') && part.endsWith('>>') ? (
          <span key={i} className="bg-cyan-500/20 text-cyan-300 rounded px-0.5">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </div>
  );
}

// --- Props ---

interface RecipeTemplateEditorProps {
  stages: RecipeStage[];
  recipeName: string;
  recipeDescription: string;
  recipeNote: string;
  suggestedModel: string;
  suggestedAspectRatio: string;
  suggestedResolution: string;
  categoryId: string;
  requiresImage: boolean;
  onStageTemplateChange: (stageId: string, template: string) => void;
  onStageTypeChange: (stageId: string, type: 'generation' | 'tool' | 'analysis') => void;
  onStageToolChange: (stageId: string, toolId: string) => void;
  onAddStage: () => void;
  onRemoveStage: (stageId: string) => void;
  onMoveStage: (stageId: string, direction: 'up' | 'down') => void;
  onMetadataChange: (field: string, value: string | boolean) => void;
}

// --- Field insertion helpers ---

const FIELD_INSERTS = [
  { label: 'Text', token: '<<FIELD_NAME:text>>' },
  { label: 'Name', token: '<<FIELD_NAME:name>>' },
  { label: 'Select', token: '<<FIELD_NAME:select>>' },
  { label: 'Wildcard', token: '<<FIELD_NAME:wildcard>>' },
] as const;

const MODEL_OPTIONS = [
  { value: 'nano-banana-2', label: 'Nano Banana 2' },
  { value: 'z-image-turbo', label: 'Z-Image Turbo' },
  { value: 'flux-dev', label: 'Flux Dev' },
  { value: 'flux-schnell', label: 'Flux Schnell' },
];

const ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: '2:3' },
  { value: '21:9', label: '21:9' },
];

const RESOLUTION_OPTIONS = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
];

// --- Stage Card ---

function StageCard({
  stage,
  index,
  total,
  onTemplateChange,
  onTypeChange,
  onToolChange,
  onRemove,
  onMove,
}: {
  stage: RecipeStage;
  index: number;
  total: number;
  onTemplateChange: (template: string) => void;
  onTypeChange: (type: 'generation' | 'tool' | 'analysis') => void;
  onToolChange: (toolId: string) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stageType = stage.type || 'generation';

  function insertField(token: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = ta.value.substring(0, start);
    const after = ta.value.substring(end);
    const newValue = before + token + after;
    onTemplateChange(newValue);
    // Restore cursor after token
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + token.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="border border-zinc-700/60 rounded-xl bg-zinc-900/50 overflow-hidden">
      {/* Stage header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 border-b border-zinc-700/40">
        <GripVertical className="size-4 text-zinc-500 shrink-0" />
        <span className="text-xs font-semibold text-zinc-400 shrink-0">
          Stage {index + 1}
        </span>

        {/* Type selector */}
        <select
          value={stageType}
          onChange={(e) => onTypeChange(e.target.value as 'generation' | 'tool' | 'analysis')}
          className="text-xs bg-zinc-800 border border-zinc-600 rounded-md px-2 py-1 text-zinc-300 outline-none focus:border-cyan-500 transition-colors"
        >
          <option value="generation">Generation</option>
          <option value="tool">Tool</option>
          <option value="analysis">Analysis</option>
        </select>

        {/* Tool/Analysis picker */}
        {stageType === 'tool' && (
          <select
            value={stage.toolId || ''}
            onChange={(e) => onToolChange(e.target.value)}
            className="text-xs bg-zinc-800 border border-zinc-600 rounded-md px-2 py-1 text-zinc-300 outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="">Select tool...</option>
            {Object.values(RECIPE_TOOLS).map((tool) => (
              <option key={tool.id} value={tool.id}>
                {tool.name}
              </option>
            ))}
          </select>
        )}
        {stageType === 'analysis' && (
          <select
            value={stage.analysisId || ''}
            onChange={(e) => onToolChange(e.target.value)}
            className="text-xs bg-zinc-800 border border-zinc-600 rounded-md px-2 py-1 text-zinc-300 outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="">Select analysis...</option>
            {Object.values(RECIPE_ANALYSIS).map((analysis) => (
              <option key={analysis.id} value={analysis.id}>
                {analysis.name}
              </option>
            ))}
          </select>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Move/Delete buttons */}
        <button
          onClick={() => onMove('up')}
          disabled={index === 0}
          className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Move up"
        >
          <ChevronUp className="size-3.5" />
        </button>
        <button
          onClick={() => onMove('down')}
          disabled={index === total - 1}
          className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Move down"
        >
          <ChevronDown className="size-3.5" />
        </button>
        <button
          onClick={onRemove}
          disabled={total <= 1}
          className="p-1 rounded hover:bg-red-900/50 text-zinc-400 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Remove stage"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {/* Template textarea with syntax highlighting */}
      {stageType === 'generation' && (
        <div className="p-3">
          <div className="relative">
            <HighlightedOverlay text={stage.template} />
            <textarea
              ref={textareaRef}
              value={stage.template}
              onChange={(e) => onTemplateChange(e.target.value)}
              placeholder="Enter prompt template... Use <<FIELD:type>> for dynamic fields"
              rows={6}
              className="relative w-full bg-transparent font-mono text-sm leading-relaxed p-3 text-transparent caret-cyan-400 border border-zinc-700/60 rounded-lg resize-y outline-none focus:border-cyan-500/50 transition-colors placeholder:text-zinc-600"
              spellCheck={false}
            />
          </div>

          {/* Insert field buttons */}
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider mr-1">Insert:</span>
            {FIELD_INSERTS.map((field) => (
              <button
                key={field.label}
                onClick={() => insertField(field.token)}
                className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/30 transition-colors"
              >
                {field.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Non-generation stage info */}
      {stageType !== 'generation' && (
        <div className="p-3 text-xs text-zinc-500 italic">
          {stageType === 'tool' && (stage.toolId
            ? `Will run: ${RECIPE_TOOLS[stage.toolId]?.name || stage.toolId}`
            : 'Select a tool above'
          )}
          {stageType === 'analysis' && (stage.analysisId
            ? `Will analyze: ${RECIPE_ANALYSIS[stage.analysisId]?.name || stage.analysisId}`
            : 'Select an analysis type above'
          )}
        </div>
      )}
    </div>
  );
}

// --- Main Component ---

export default function RecipeTemplateEditor({
  stages,
  recipeName,
  recipeDescription,
  recipeNote,
  suggestedModel,
  suggestedAspectRatio,
  suggestedResolution,
  categoryId,
  requiresImage,
  onStageTemplateChange,
  onStageTypeChange,
  onStageToolChange,
  onAddStage,
  onRemoveStage,
  onMoveStage,
  onMetadataChange,
}: RecipeTemplateEditorProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stages section — scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Stages
        </h3>

        {stages.map((stage, i) => (
          <StageCard
            key={stage.id}
            stage={stage}
            index={i}
            total={stages.length}
            onTemplateChange={(t) => onStageTemplateChange(stage.id, t)}
            onTypeChange={(type) => onStageTypeChange(stage.id, type)}
            onToolChange={(toolId) => onStageToolChange(stage.id, toolId)}
            onRemove={() => onRemoveStage(stage.id)}
            onMove={(dir) => onMoveStage(stage.id, dir)}
          />
        ))}

        {/* Add stage button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onAddStage}
          className="w-full border-dashed border-zinc-700 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/40"
        >
          <Plus className="size-3.5" />
          Add Stage
        </Button>
      </div>

      {/* Settings section */}
      <div className="border-t border-zinc-700/60 p-4 space-y-3 bg-zinc-900/30">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Recipe Settings
        </h3>

        {/* Name */}
        <div>
          <label className="text-[11px] text-zinc-500 block mb-1">Name *</label>
          <input
            type="text"
            value={recipeName}
            onChange={(e) => onMetadataChange('recipeName', e.target.value)}
            placeholder="Recipe name"
            className="w-full text-sm bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-zinc-200 outline-none focus:border-cyan-500/50 transition-colors placeholder:text-zinc-600"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[11px] text-zinc-500 block mb-1">Description</label>
          <input
            type="text"
            value={recipeDescription}
            onChange={(e) => onMetadataChange('recipeDescription', e.target.value)}
            placeholder="What does this recipe do?"
            className="w-full text-sm bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-zinc-200 outline-none focus:border-cyan-500/50 transition-colors placeholder:text-zinc-600"
          />
        </div>

        {/* Recipe Note */}
        <div>
          <label className="text-[11px] text-zinc-500 block mb-1">Recipe Note</label>
          <textarea
            value={recipeNote}
            onChange={(e) => onMetadataChange('recipeNote', e.target.value)}
            placeholder="Tips or notes for users..."
            rows={2}
            className="w-full text-sm bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-zinc-200 outline-none focus:border-cyan-500/50 transition-colors resize-none placeholder:text-zinc-600"
          />
        </div>

        {/* Grid: Model, Aspect Ratio, Resolution */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">Model</label>
            <select
              value={suggestedModel}
              onChange={(e) => onMetadataChange('suggestedModel', e.target.value)}
              className="w-full text-xs bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-2 py-1.5 text-zinc-300 outline-none focus:border-cyan-500/50 transition-colors"
            >
              <option value="">None</option>
              {MODEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">Aspect Ratio</label>
            <select
              value={suggestedAspectRatio}
              onChange={(e) => onMetadataChange('suggestedAspectRatio', e.target.value)}
              className="w-full text-xs bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-2 py-1.5 text-zinc-300 outline-none focus:border-cyan-500/50 transition-colors"
            >
              <option value="">Default</option>
              {ASPECT_RATIO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">Resolution</label>
            <select
              value={suggestedResolution}
              onChange={(e) => onMetadataChange('suggestedResolution', e.target.value)}
              className="w-full text-xs bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-2 py-1.5 text-zinc-300 outline-none focus:border-cyan-500/50 transition-colors"
            >
              <option value="">Default</option>
              {RESOLUTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-[11px] text-zinc-500 block mb-1">Category ID</label>
          <input
            type="text"
            value={categoryId}
            onChange={(e) => onMetadataChange('categoryId', e.target.value)}
            placeholder="e.g. cinematic, portrait, abstract"
            className="w-full text-sm bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-zinc-200 outline-none focus:border-cyan-500/50 transition-colors placeholder:text-zinc-600"
          />
        </div>

        {/* Requires Image */}
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={requiresImage}
            onChange={(e) => onMetadataChange('requiresImage', e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-cyan-500 focus:ring-cyan-500/30 focus:ring-offset-0"
          />
          <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
            Requires reference image
          </span>
        </label>
      </div>
    </div>
  );
}
