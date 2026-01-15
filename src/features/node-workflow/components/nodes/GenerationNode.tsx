'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Sparkles } from 'lucide-react'
import type { GenerationNodeData } from '../../types/workflow.types'

function GenerationNode({ data, selected }: NodeProps) {
  const typedData = data as unknown as GenerationNodeData
  const modelLabels = {
    'nano-banana': 'Nano Banana',
    'nano-banana-pro': 'Nano Banana Pro',
    'z-image-turbo': 'Z-Image Turbo'
  }

  return (
    <div
      className={`
        bg-zinc-900 border-2 rounded-lg p-4 min-w-[240px]
        ${selected ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-zinc-700'}
        transition-all duration-200
      `}
    >
      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        isConnectable={true}
        style={{
          width: '16px',
          height: '16px',
          background: '#3b82f6',
          border: '2px solid #18181b',
          left: '-8px',
          top: '30%',
          transform: 'translateY(-50%)'
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="image"
        isConnectable={true}
        style={{
          width: '16px',
          height: '16px',
          background: '#f59e0b',
          border: '2px solid #18181b',
          left: '-8px',
          top: '70%',
          transform: 'translateY(-50%)'
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-purple-500" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-white">Generation</div>
          <div className="text-xs text-zinc-400">{modelLabels[typedData.model]}</div>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">Aspect Ratio</span>
          <span className="text-zinc-300">{typedData.aspectRatio || '16:9'}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">Format</span>
          <span className="text-zinc-300">{typedData.outputFormat || 'png'}</span>
        </div>
        {typedData.negative && (
          <div className="bg-zinc-800 rounded p-2">
            <div className="text-xs text-zinc-500 mb-1">Negative Prompt</div>
            <div className="text-xs text-zinc-400 line-clamp-2">{typedData.negative}</div>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={true}
        style={{
          width: '16px',
          height: '16px',
          background: '#a855f7',
          border: '2px solid #18181b',
          right: '-8px',
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />
    </div>
  )
}

export default memo(GenerationNode)
