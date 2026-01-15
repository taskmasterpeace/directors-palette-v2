'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Wand2, Grid3x3, SplitSquareHorizontal, LayoutGrid } from 'lucide-react'
import type { ToolNodeData } from '../../types/workflow.types'

function ToolNode({ data, selected }: NodeProps) {
  const typedData = data as unknown as ToolNodeData
  const toolConfig = {
    'remove-background': {
      label: 'Remove Background',
      icon: Wand2,
      color: 'emerald'
    },
    'cinematic-grid': {
      label: 'Cinematic Grid',
      icon: Grid3x3,
      color: 'cyan'
    },
    'grid-split': {
      label: 'Grid Split',
      icon: SplitSquareHorizontal,
      color: 'orange'
    },
    'before-after-grid': {
      label: 'Before/After Grid',
      icon: LayoutGrid,
      color: 'pink'
    }
  }

  const config = toolConfig[typedData.toolId]
  const Icon = config.icon

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
          background: '#10b981',
          border: '2px solid #18181b',
          left: '-8px',
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded bg-${config.color}-500/10 flex items-center justify-center`}>
          <Icon className={`w-4 h-4 text-${config.color}-500`} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-white">Tool</div>
          <div className="text-xs text-zinc-400">{config.label}</div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-zinc-800 rounded p-3">
        <div className="text-xs text-zinc-400">
          {typedData.toolId === 'remove-background' && 'Removes background from image'}
          {typedData.toolId === 'cinematic-grid' && 'Creates 2x2 cinematic grid'}
          {typedData.toolId === 'grid-split' && 'Splits image into grid panels'}
          {typedData.toolId === 'before-after-grid' && 'Creates before/after comparison'}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={true}
        style={{
          width: '16px',
          height: '16px',
          background: '#10b981',
          border: '2px solid #18181b',
          right: '-8px',
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />
    </div>
  )
}

export default memo(ToolNode)
