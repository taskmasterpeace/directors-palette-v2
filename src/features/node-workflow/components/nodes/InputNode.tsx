'use client'

import { memo, useState } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Upload, Image as ImageIcon } from 'lucide-react'
import type { InputNodeData } from '../../types/workflow.types'
import { useWorkflowStore } from '../../store/workflow.store'
import { InputNodeModal } from './InputNodeModal'

function InputNode({ data, selected, id }: NodeProps) {
  const typedData = data as unknown as InputNodeData
  const [showModal, setShowModal] = useState(false)
  const updateNode = useWorkflowStore(state => state.updateNode)

  const handleSelectImage = (imageUrl: string, type: 'upload' | 'reference') => {
    updateNode(id, {
      imageUrl,
      imageType: type
    })
    setShowModal(false)
  }

  return (
    <>
      <div
        className={`
          bg-zinc-900 border-2 rounded-lg p-4 min-w-[220px]
          ${selected ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-zinc-700'}
          transition-all duration-200
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center">
            <Upload className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">Input</div>
            <div className="text-xs text-zinc-400">{typedData.imageType}</div>
          </div>
        </div>

        {/* Image Preview */}
        {typedData.imageUrl && (
          <div
            className="mb-3 rounded overflow-hidden border border-zinc-700 cursor-pointer hover:border-amber-500 transition-colors"
            onClick={() => setShowModal(true)}
          >
            <img
              src={typedData.imageUrl}
              alt="Input image"
              className="w-full h-24 object-cover"
            />
          </div>
        )}

        {/* Upload Area */}
        {!typedData.imageUrl && (
          <div
            onClick={() => setShowModal(true)}
            className="border-2 border-dashed border-zinc-700 rounded p-4 text-center cursor-pointer hover:border-amber-500 transition-colors"
          >
            <ImageIcon className="w-6 h-6 text-zinc-500 mx-auto mb-1" />
            <div className="text-xs text-zinc-500">Click to add image</div>
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
            background: '#f59e0b',
            border: '2px solid #18181b',
            right: '-8px',
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        />
      </div>

      <InputNodeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelectImage={handleSelectImage}
        currentImageUrl={typedData.imageUrl}
      />
    </>
  )
}

export default memo(InputNode)
