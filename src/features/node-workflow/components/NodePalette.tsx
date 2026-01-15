'use client'

import { Upload, FileText, Sparkles, Wand2, ImageIcon } from 'lucide-react'
import type { NodePaletteItem } from '../types/workflow.types'

const PALETTE_ITEMS: NodePaletteItem[] = [
  {
    type: 'input',
    label: 'Input',
    icon: 'Upload',
    description: 'Upload or reference image'
  },
  {
    type: 'prompt',
    label: 'Prompt',
    icon: 'FileText',
    description: 'Text prompt with optional variables'
  },
  {
    type: 'generation',
    label: 'Generation',
    icon: 'Sparkles',
    description: 'Generate image with AI model'
  },
  {
    type: 'tool',
    label: 'Tool',
    icon: 'Wand2',
    description: 'Apply image processing tool'
  },
  {
    type: 'output',
    label: 'Output',
    icon: 'ImageIcon',
    description: 'Final result output'
  }
]

const ICON_MAP = {
  Upload,
  FileText,
  Sparkles,
  Wand2,
  ImageIcon
}

interface NodePaletteProps {
  onAddNode: (type: string) => void
}

export default function NodePalette({ onAddNode }: NodePaletteProps) {
  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 p-4 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-1">Node Palette</h2>
        <p className="text-xs text-zinc-500">Drag nodes onto the canvas</p>
      </div>

      {/* Palette Items */}
      <div className="space-y-2">
        {PALETTE_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP]

          return (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => handleDragStart(e, item.type)}
              onClick={() => onAddNode(item.type)}
              className="
                group
                flex items-start gap-3 p-3 rounded-lg
                bg-zinc-800 hover:bg-zinc-700
                border border-zinc-700 hover:border-amber-500/50
                cursor-grab active:cursor-grabbing
                transition-all duration-200
              "
            >
              <div className="w-8 h-8 rounded bg-zinc-700 group-hover:bg-amber-500/10 flex items-center justify-center flex-shrink-0 transition-colors">
                <Icon className="w-4 h-4 text-zinc-400 group-hover:text-amber-500 transition-colors" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white mb-0.5">
                  {item.label}
                </div>
                <div className="text-xs text-zinc-500 leading-tight">
                  {item.description}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
        <h3 className="text-xs font-medium text-zinc-400 mb-2">Quick Tips</h3>
        <ul className="space-y-1.5 text-xs text-zinc-500">
          <li>• Drag nodes to canvas</li>
          <li>• Click node handles to connect</li>
          <li>• Select nodes to edit properties</li>
          <li>• Execute to run workflow</li>
        </ul>
      </div>
    </div>
  )
}
