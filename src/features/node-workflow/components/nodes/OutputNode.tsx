'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { ImageIcon, Check } from 'lucide-react'
import type { OutputNodeData } from '../../types/workflow.types'

function OutputNode({ data, selected }: NodeProps) {
  const typedData = data as unknown as OutputNodeData
  return (
    <div
      className={`
        bg-zinc-900 border-2 rounded-lg p-4 min-w-[220px]
        ${selected ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-zinc-700'}
        transition-all duration-200
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={true}
        style={{
          width: '16px',
          height: '16px',
          background: '#22c55e',
          border: '2px solid #18181b',
          left: '-8px',
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded bg-green-500/10 flex items-center justify-center">
          <ImageIcon className="w-4 h-4 text-green-500" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-white">Output</div>
          <div className="text-xs text-zinc-400">
            {typedData.savedToGallery ? 'Saved to gallery' : 'Final result'}
          </div>
        </div>
      </div>

      {/* Preview */}
      {typedData.preview && (
        <div className="mb-3 rounded overflow-hidden border border-zinc-700">
          <img
            src={typedData.preview}
            alt="Output"
            className="w-full h-32 object-cover"
          />
        </div>
      )}

      {/* Placeholder */}
      {!typedData.preview && (
        <div className="border-2 border-dashed border-zinc-700 rounded p-6 text-center">
          <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <div className="text-xs text-zinc-500">Waiting for execution</div>
        </div>
      )}

      {/* Status */}
      {typedData.savedToGallery && (
        <div className="flex items-center gap-2 bg-green-500/10 rounded p-2">
          <Check className="w-3 h-3 text-green-500" />
          <span className="text-xs text-green-500">Saved to gallery</span>
        </div>
      )}
    </div>
  )
}

export default memo(OutputNode)
