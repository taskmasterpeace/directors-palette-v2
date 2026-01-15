import { Node, Edge } from '@xyflow/react'
import type {
  InputNodeData,
  PromptNodeData,
  GenerationNodeData,
  ToolNodeData,
  OutputNodeData as _OutputNodeData
} from '../types/workflow.types'

// Node execution result
interface NodeResult {
  nodeId: string
  success: boolean
  data?: {
    imageUrl?: string
    prompt?: string
    error?: string
  }
}

// Execution context to pass data between nodes
interface ExecutionContext {
  results: Map<string, NodeResult>
}

export class WorkflowExecutor {
  private nodes: Node[]
  private edges: Edge[]
  private context: ExecutionContext

  constructor(nodes: Node[], edges: Edge[]) {
    this.nodes = nodes
    this.edges = edges
    this.context = {
      results: new Map()
    }
  }

  /**
   * Execute the workflow
   */
  async execute(): Promise<NodeResult[]> {
    // 1. Topologically sort nodes
    const sortedNodes = this.topologicalSort()

    if (!sortedNodes) {
      throw new Error('Workflow has circular dependencies')
    }

    // 2. Execute each node in order
    const results: NodeResult[] = []

    for (const node of sortedNodes) {
      console.log(`Executing node: ${node.id} (${node.type})`)

      try {
        const result = await this.executeNode(node)
        results.push(result)
        this.context.results.set(node.id, result)

        if (!result.success) {
          console.error(`Node ${node.id} failed:`, result.data?.error)
          // Continue execution even if one node fails
        }
      } catch (error) {
        console.error(`Error executing node ${node.id}:`, error)
        results.push({
          nodeId: node.id,
          success: false,
          data: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }
    }

    return results
  }

  /**
   * Topological sort to determine execution order
   */
  private topologicalSort(): Node[] | null {
    const adjacencyList = new Map<string, string[]>()
    const inDegree = new Map<string, number>()

    // Initialize
    this.nodes.forEach(node => {
      adjacencyList.set(node.id, [])
      inDegree.set(node.id, 0)
    })

    // Build graph
    this.edges.forEach(edge => {
      const from = edge.source
      const to = edge.target
      adjacencyList.get(from)?.push(to)
      inDegree.set(to, (inDegree.get(to) || 0) + 1)
    })

    // Find nodes with no dependencies
    const queue: Node[] = []
    this.nodes.forEach(node => {
      if (inDegree.get(node.id) === 0) {
        queue.push(node)
      }
    })

    const sorted: Node[] = []

    while (queue.length > 0) {
      const node = queue.shift()!
      sorted.push(node)

      const neighbors = adjacencyList.get(node.id) || []
      neighbors.forEach(neighborId => {
        const newDegree = (inDegree.get(neighborId) || 0) - 1
        inDegree.set(neighborId, newDegree)

        if (newDegree === 0) {
          const neighborNode = this.nodes.find(n => n.id === neighborId)
          if (neighborNode) {
            queue.push(neighborNode)
          }
        }
      })
    }

    // Check for cycles
    if (sorted.length !== this.nodes.length) {
      return null // Circular dependency detected
    }

    return sorted
  }

  /**
   * Execute a single node based on its type
   */
  private async executeNode(node: Node): Promise<NodeResult> {
    switch (node.type) {
      case 'input':
        return this.executeInputNode(node)
      case 'prompt':
        return this.executePromptNode(node)
      case 'generation':
        return this.executeGenerationNode(node)
      case 'tool':
        return this.executeToolNode(node)
      case 'output':
        return this.executeOutputNode(node)
      default:
        return {
          nodeId: node.id,
          success: false,
          data: { error: `Unknown node type: ${node.type}` }
        }
    }
  }

  /**
   * Execute Input node - just return the image URL
   */
  private executeInputNode(node: Node): NodeResult {
    const data = node.data as unknown as InputNodeData

    return {
      nodeId: node.id,
      success: true,
      data: {
        imageUrl: data.imageUrl
      }
    }
  }

  /**
   * Execute Prompt node - just return the prompt text
   */
  private executePromptNode(node: Node): NodeResult {
    const data = node.data as unknown as PromptNodeData

    return {
      nodeId: node.id,
      success: true,
      data: {
        prompt: data.template || ''
      }
    }
  }

  /**
   * Execute Generation node - call image generation API
   */
  private async executeGenerationNode(node: Node): Promise<NodeResult> {
    const data = node.data as unknown as GenerationNodeData

    // Get inputs from connected nodes
    const inputs = this.getNodeInputs(node.id)
    const promptText = inputs.prompt || 'A beautiful image'
    const referenceImage = inputs.image

    try {
      // Call the image generation API
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          model: data.model,
          aspectRatio: data.aspectRatio,
          outputFormat: data.outputFormat,
          negative: data.negative,
          referenceImageUrl: referenceImage
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Generation failed')
      }

      const result = await response.json()

      return {
        nodeId: node.id,
        success: true,
        data: {
          imageUrl: result.imageUrl
        }
      }
    } catch (error) {
      return {
        nodeId: node.id,
        success: false,
        data: {
          error: error instanceof Error ? error.message : 'Generation failed'
        }
      }
    }
  }

  /**
   * Execute Tool node - apply image processing
   */
  private async executeToolNode(node: Node): Promise<NodeResult> {
    const _data = node.data as unknown as ToolNodeData

    // Get input image
    const inputs = this.getNodeInputs(node.id)
    const inputImage = inputs.image

    if (!inputImage) {
      return {
        nodeId: node.id,
        success: false,
        data: { error: 'No input image provided' }
      }
    }

    // TODO: Implement tool processing
    // For now, just pass through the image
    return {
      nodeId: node.id,
      success: true,
      data: {
        imageUrl: inputImage
      }
    }
  }

  /**
   * Execute Output node - display result
   */
  private async executeOutputNode(node: Node): Promise<NodeResult> {
    // Get input image
    const inputs = this.getNodeInputs(node.id)
    const inputImage = inputs.image

    if (!inputImage) {
      return {
        nodeId: node.id,
        success: false,
        data: { error: 'No input image provided' }
      }
    }

    // TODO: Save to gallery if needed
    return {
      nodeId: node.id,
      success: true,
      data: {
        imageUrl: inputImage
      }
    }
  }

  /**
   * Get inputs for a node from connected source nodes
   */
  private getNodeInputs(nodeId: string): { prompt?: string; image?: string } {
    const inputs: { prompt?: string; image?: string } = {}

    // Find all edges connecting to this node
    const incomingEdges = this.edges.filter(edge => edge.target === nodeId)

    incomingEdges.forEach(edge => {
      const sourceResult = this.context.results.get(edge.source)

      if (sourceResult?.success && sourceResult.data) {
        // Determine input type based on target handle
        if (edge.targetHandle === 'prompt' || !edge.targetHandle) {
          // Prompt input
          if (sourceResult.data.prompt) {
            inputs.prompt = sourceResult.data.prompt
          }
        }

        if (edge.targetHandle === 'image' || !edge.targetHandle) {
          // Image input
          if (sourceResult.data.imageUrl) {
            inputs.image = sourceResult.data.imageUrl
          }
        }
      }
    })

    return inputs
  }
}
