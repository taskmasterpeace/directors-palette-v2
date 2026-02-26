import type { Node, Edge } from '@xyflow/react'

// Base node data types
export interface BaseNodeData {
  label?: string
}

export interface InputNodeData extends BaseNodeData {
  imageUrl?: string
  imageType: 'upload' | 'reference'
}

export interface PromptNodeData extends BaseNodeData {
  template: string
  variables: Record<string, string>
}

export interface GenerationNodeData extends BaseNodeData {
  model: 'nano-banana-2' | 'z-image-turbo' | 'seedream-5-lite' | 'riverflow-2-pro'
  aspectRatio?: string
  outputFormat?: string
  negative?: string
}

export interface ToolNodeData extends BaseNodeData {
  toolId: 'remove-background' | 'cinematic-grid' | 'grid-split' | 'before-after-grid'
}

export interface OutputNodeData extends BaseNodeData {
  preview?: string
  savedToGallery: boolean
}

// Node types - using generic Node to avoid type conflicts
export type WorkflowNode = Node

// Workflow
export interface NodeWorkflow {
  id: string
  name: string
  nodes: WorkflowNode[]
  edges: Edge[]
  createdAt: number
  updatedAt: number
}

// Execution
export interface WorkflowExecutionResult {
  success: boolean
  outputs: Map<string, unknown>
  errors?: Array<{ nodeId: string; error: string }>
}

export interface NodeExecutionContext {
  nodeId: string
  inputs: Array<{ type: string; value: unknown }>
  results: Map<string, unknown>
}

// Node palette item
export interface NodePaletteItem {
  type: 'input' | 'prompt' | 'generation' | 'tool' | 'output'
  label: string
  icon: string
  description: string
}
