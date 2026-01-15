'use client'

import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  NodeTypes,
  BackgroundVariant,
  ConnectionMode,
  OnConnect,
  addEdge,
  Connection
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useWorkflowStore } from '../store/workflow.store'
import InputNode from './nodes/InputNode'
import PromptNode from './nodes/PromptNode'
import GenerationNode from './nodes/GenerationNode'
import ToolNode from './nodes/ToolNode'
import OutputNode from './nodes/OutputNode'
import { Play, Save, FolderOpen, Trash2 } from 'lucide-react'

export default function NodeWorkflowCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    setEdges,
    clearWorkflow,
    isExecuting
  } = useWorkflowStore()

  // Define custom node types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      input: InputNode,
      prompt: PromptNode,
      generation: GenerationNode,
      tool: ToolNode,
      output: OutputNode
    }),
    []
  )

  // Handle new connections
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      console.log('🔗 Connection created:', connection)
      setEdges(addEdge(connection, edges))
      console.log('📊 Total edges:', edges.length + 1)
    },
    [edges, setEdges]
  )

  const handleExecute = async () => {
    // TODO: Implement workflow execution
    console.log('Execute workflow', { nodes, edges })
  }

  const handleSave = () => {
    // TODO: Implement save workflow
    console.log('Save workflow')
  }

  const handleLoad = () => {
    // TODO: Implement load workflow
    console.log('Load workflow')
  }

  return (
    <div className="w-full h-full bg-zinc-950 relative workflow-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        connectOnClick={false}
        fitView
        className="bg-zinc-950"
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#78716c', strokeWidth: 2 }
        }}
      >
        {/* Background Pattern */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="#3f3f46"
          className="bg-zinc-950"
        />

        {/* Controls */}
        <Controls
          className="bg-zinc-900 border border-zinc-700 rounded-lg"
          showInteractive={false}
        />

        {/* Mini Map */}
        <MiniMap
          className="bg-zinc-900 border border-zinc-700 rounded-lg"
          nodeColor={(node) => {
            switch (node.type) {
              case 'input':
                return '#f59e0b' // amber
              case 'prompt':
                return '#3b82f6' // blue
              case 'generation':
                return '#a855f7' // purple
              case 'tool':
                return '#10b981' // emerald
              case 'output':
                return '#22c55e' // green
              default:
                return '#71717a' // zinc
            }
          }}
          maskColor="#18181b99"
        />

        {/* Top Toolbar */}
        <Panel position="top-center" className="flex gap-2">
          <button
            onClick={handleExecute}
            disabled={isExecuting || nodes.length === 0}
            className="
              flex items-center gap-2 px-4 py-2 rounded-lg
              bg-amber-500 hover:bg-amber-600
              disabled:bg-zinc-800 disabled:text-zinc-600
              text-white font-medium text-sm
              transition-all duration-200
            "
          >
            <Play className="w-4 h-4" />
            {isExecuting ? 'Executing...' : 'Execute Workflow'}
          </button>

          <button
            onClick={handleSave}
            disabled={nodes.length === 0}
            className="
              flex items-center gap-2 px-4 py-2 rounded-lg
              bg-zinc-800 hover:bg-zinc-700
              disabled:bg-zinc-900 disabled:text-zinc-700
              border border-zinc-700
              text-white font-medium text-sm
              transition-all duration-200
            "
          >
            <Save className="w-4 h-4" />
            Save
          </button>

          <button
            onClick={handleLoad}
            className="
              flex items-center gap-2 px-4 py-2 rounded-lg
              bg-zinc-800 hover:bg-zinc-700
              border border-zinc-700
              text-white font-medium text-sm
              transition-all duration-200
            "
          >
            <FolderOpen className="w-4 h-4" />
            Load
          </button>

          <button
            onClick={clearWorkflow}
            disabled={nodes.length === 0}
            className="
              flex items-center gap-2 px-4 py-2 rounded-lg
              bg-zinc-800 hover:bg-red-900/50
              disabled:bg-zinc-900 disabled:text-zinc-700
              border border-zinc-700 hover:border-red-700
              text-white font-medium text-sm
              transition-all duration-200
            "
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </Panel>

        {/* Empty State */}
        {nodes.length === 0 && (
          <Panel position="top-center" className="mt-20">
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-8 text-center">
              <div className="text-zinc-400 mb-2">Welcome to Node Workflow</div>
              <div className="text-zinc-600 text-sm">
                Drag nodes from the palette to get started
              </div>
            </div>
          </Panel>
        )}

        {/* Bottom Info Drawer */}
        <Panel position="bottom-center" className="mb-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-6 py-3 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Nodes:</span>
              <span className="text-white font-medium">{nodes.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Connections:</span>
              <span className="text-white font-medium">{edges.length}</span>
            </div>
            <div className="h-4 w-px bg-zinc-700" />
            <div className="text-zinc-500 text-xs">
              Drag handles to connect • Click nodes to edit • Execute to run workflow
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
