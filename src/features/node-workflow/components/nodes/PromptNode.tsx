'use client'

import { memo, useState } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { FileText } from 'lucide-react'
import type { PromptNodeData } from '../../types/workflow.types'
import { useWorkflowStore } from '../../store/workflow.store'
import { PromptNodeModal } from './PromptNodeModal'

function PromptNode({ data, selected, id }: NodeProps) {
  const typedData = data as unknown as PromptNodeData
  const hasVariables = Object.keys(typedData.variables || {}).length > 0
  const [showModal, setShowModal] = useState(false)
  const updateNode = useWorkflowStore(state => state.updateNode)

  const handleSavePrompt = (template: string) => {
    updateNode(id, { template })
    setShowModal(false)
  }

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className={`
          bg-zinc-900 border-2 rounded-lg p-4 min-w-[240px] cursor-pointer
          ${selected ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-zinc-700'}
          hover:border-amber-500/50 transition-all duration-200
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
          background: '#f59e0b',
          border: '2px solid #18181b'
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center">
          <FileText className="w-4 h-4 text-blue-500" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-white">Prompt</div>
          <div className="text-xs text-zinc-400">
            {hasVariables ? `${Object.keys(typedData.variables).length} variables` : 'Plain text'}
          </div>
        </div>
      </div>

      {/* Prompt Preview */}
      <div className="bg-zinc-800 rounded p-3 mb-3">
        <div className="text-xs text-zinc-300 line-clamp-3">
          {typedData.template || 'Enter prompt text...'}
        </div>
      </div>

      {/* Variables */}
      {hasVariables && (
        <div className="space-y-1">
          {Object.entries(typedData.variables).slice(0, 2).map(([key, value]) => (
            <div key={key} className="text-xs text-zinc-500 flex gap-2">
              <span className="text-amber-500">{'{{' + key + '}}'}</span>
              <span className="truncate">{value}</span>
            </div>
          ))}
          {Object.keys(typedData.variables).length > 2 && (
            <div className="text-xs text-zinc-600">
              +{Object.keys(typedData.variables).length - 2} more
            </div>
          )}
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={true}
        style={{
          width: '16px',
          height: '16px',
          background: '#3b82f6',
          border: '2px solid #18181b'
        }}
      />
    </div>

    <PromptNodeModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      onSave={handleSavePrompt}
      currentTemplate={typedData.template}
    />
  </>
  )
}

export default memo(PromptNode)
