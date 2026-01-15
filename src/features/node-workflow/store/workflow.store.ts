import { create } from 'zustand'
import type { Node, Edge, OnNodesChange, OnEdgesChange } from '@xyflow/react'
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import type { NodeWorkflow, WorkflowNode } from '../types/workflow.types'

interface WorkflowState {
  // Current workflow
  nodes: Node[]
  edges: Edge[]
  workflow: NodeWorkflow | null

  // Selection
  selectedNode: Node | null

  // Execution
  isExecuting: boolean
  executionResults: Map<string, unknown>

  // Actions
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  addNode: (node: Node) => void
  updateNode: (nodeId: string, data: Partial<Node['data']>) => void
  deleteNode: (nodeId: string) => void
  setSelectedNode: (node: Node | null) => void

  // Workflow management
  loadWorkflow: (workflow: NodeWorkflow) => void
  saveWorkflow: (name: string) => NodeWorkflow
  clearWorkflow: () => void

  // Execution
  setIsExecuting: (isExecuting: boolean) => void
  setExecutionResults: (results: Map<string, unknown>) => void
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  workflow: null,
  selectedNode: null,
  isExecuting: false,
  executionResults: new Map(),

  // Node management
  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes)
    })
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges)
    })
  },

  addNode: (node) => {
    set({ nodes: [...get().nodes, node] })
  },

  updateNode: (nodeId, data) => {
    set({
      nodes: get().nodes.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    })
  },

  deleteNode: (nodeId) => {
    set({
      nodes: get().nodes.filter(node => node.id !== nodeId),
      edges: get().edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId)
    })
  },

  setSelectedNode: (node) => set({ selectedNode: node }),

  // Workflow management
  loadWorkflow: (workflow) => {
    set({
      workflow,
      nodes: workflow.nodes as unknown as Node[],
      edges: workflow.edges
    })
  },

  saveWorkflow: (name) => {
    const workflow: NodeWorkflow = {
      id: get().workflow?.id || `workflow-${Date.now()}`,
      name,
      nodes: get().nodes as unknown as WorkflowNode[],
      edges: get().edges,
      createdAt: get().workflow?.createdAt || Date.now(),
      updatedAt: Date.now()
    }
    set({ workflow })
    return workflow
  },

  clearWorkflow: () => {
    set({
      nodes: [],
      edges: [],
      workflow: null,
      selectedNode: null,
      executionResults: new Map()
    })
  },

  // Execution
  setIsExecuting: (isExecuting) => set({ isExecuting }),

  setExecutionResults: (results) => set({ executionResults: results })
}))
