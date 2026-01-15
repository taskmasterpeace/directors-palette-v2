'use client'

import { useCallback, useRef, DragEvent } from 'react'
import { useReactFlow, ReactFlowProvider } from '@xyflow/react'
import NodeWorkflowCanvas from '@/features/node-workflow/components/NodeWorkflowCanvas'
import NodePalette from '@/features/node-workflow/components/NodePalette'
import { useWorkflowStore } from '@/features/node-workflow/store/workflow.store'
import type { Node } from '@xyflow/react'

function NodeWorkflowPageContent() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const { addNode } = useWorkflowStore()

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      })

      const newNode = createNode(type, position)
      addNode(newNode)
    },
    [screenToFlowPosition, addNode]
  )

  const handleAddNode = useCallback(
    (type: string) => {
      const position = {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100
      }

      const newNode = createNode(type, position)
      addNode(newNode)
    },
    [addNode]
  )

  return (
    <div className="flex h-screen bg-zinc-950">
      <NodePalette onAddNode={handleAddNode} />

      <div
        ref={reactFlowWrapper}
        className="flex-1"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <NodeWorkflowCanvas />
      </div>
    </div>
  )
}

export default function NodeWorkflowPage() {
  return (
    <ReactFlowProvider>
      <NodeWorkflowPageContent />
    </ReactFlowProvider>
  )
}

// Helper function to create new nodes
function createNode(
  type: string,
  position: { x: number; y: number }
): Node {
  const id = `${type}-${Date.now()}`

  switch (type) {
    case 'input':
      return {
        id,
        type: 'input',
        position,
        data: {
          imageType: 'upload'
        } as Record<string, unknown>
      }

    case 'prompt':
      return {
        id,
        type: 'prompt',
        position,
        data: {
          template: 'A beautiful sunset',
          variables: {}
        } as Record<string, unknown>
      }

    case 'generation':
      return {
        id,
        type: 'generation',
        position,
        data: {
          model: 'nano-banana-pro',
          aspectRatio: '16:9',
          outputFormat: 'png'
        } as Record<string, unknown>
      }

    case 'tool':
      return {
        id,
        type: 'tool',
        position,
        data: {
          toolId: 'remove-background'
        } as Record<string, unknown>
      }

    case 'output':
      return {
        id,
        type: 'output',
        position,
        data: {
          savedToGallery: false
        } as Record<string, unknown>
      }

    default:
      throw new Error(`Unknown node type: ${type}`)
  }
}
