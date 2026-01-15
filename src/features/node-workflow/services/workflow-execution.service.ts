import type { Node, Edge } from '@xyflow/react'
import type { WorkflowExecutionResult } from '../types/workflow.types'
// TODO: Import actual image generation service when implemented
// import { imageGenerationService } from '@/features/shared/services/image-generation.service'

class WorkflowExecutionService {
  /**
   * Execute a workflow by running nodes in topological order
   */
  async executeWorkflow(nodes: Node[], edges: Edge[]): Promise<WorkflowExecutionResult> {
    const results = new Map<string, unknown>()
    const errors: Array<{ nodeId: string; error: string }> = []

    try {
      // 1. Validate workflow
      const validation = this.validateWorkflow(nodes, edges)
      if (!validation.valid) {
        return {
          success: false,
          outputs: results,
          errors: [{ nodeId: 'workflow', error: validation.error! }]
        }
      }

      // 2. Find execution order (topological sort)
      const executionOrder = this.findExecutionOrder(nodes, edges)

      // 3. Execute nodes in order
      for (const node of executionOrder) {
        try {
          const inputs = this.getNodeInputs(node, edges, results)
          const result = await this.executeNode(node, inputs)
          results.set(node.id, result)
        } catch (error) {
          console.error(`Error executing node ${node.id}:`, error)
          errors.push({
            nodeId: node.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return {
        success: errors.length === 0,
        outputs: results,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      console.error('Workflow execution failed:', error)
      return {
        success: false,
        outputs: results,
        errors: [{ nodeId: 'workflow', error: error instanceof Error ? error.message : 'Unknown error' }]
      }
    }
  }

  /**
   * Execute a single node based on its type
   */
  private async executeNode(node: Node, inputs: Array<{ type: string; value: unknown }>): Promise<unknown> {
    switch (node.type) {
      case 'input':
        // Input node just passes through its image URL
        return (node.data as { imageUrl?: string }).imageUrl

      case 'prompt':
        // Prompt node resolves variables and returns text
        return this.resolvePromptVariables(
          (node.data as { template: string }).template,
          (node.data as { variables: Record<string, string> }).variables
        )

      case 'generation': {
        // Generation node calls image generation API
        const promptInput = inputs.find(i => i.type === 'prompt')
        const imageInput = inputs.find(i => i.type === 'image')

        if (!promptInput) {
          throw new Error('Generation node requires a prompt input')
        }

        // TODO: Implement actual image generation
        // For now, return a placeholder URL
        const genData = node.data as { model?: string; aspectRatio?: string; outputFormat?: string; negative?: string }
        console.log('Generation node would generate with:', {
          prompt: promptInput.value,
          model: genData.model || 'nano-banana-pro',
          referenceImage: imageInput?.value,
          aspectRatio: genData.aspectRatio || '16:9',
          outputFormat: genData.outputFormat || 'png',
          negative: genData.negative
        })

        return 'https://via.placeholder.com/800x450?text=Generated+Image'
      }

      case 'tool': {
        // Tool node would call tool service (placeholder for now)
        const imageInput = inputs.find(i => i.type === 'image')
        if (!imageInput) {
          throw new Error('Tool node requires an image input')
        }

        // TODO: Implement tool execution
        const toolData = node.data as { toolId?: string }
        console.log(`Tool ${toolData.toolId} would process:`, imageInput.value)
        return imageInput.value
      }

      case 'output': {
        // Output node just passes through the image
        const imageInput = inputs.find(i => i.type === 'image')
        if (!imageInput) {
          throw new Error('Output node requires an image input')
        }
        return imageInput.value
      }

      default:
        throw new Error(`Unknown node type: ${node.type}`)
    }
  }

  /**
   * Get inputs for a node from connected edges
   */
  private getNodeInputs(node: Node, edges: Edge[], results: Map<string, unknown>): Array<{ type: string; value: unknown }> {
    const inputs: Array<{ type: string; value: unknown }> = []

    // Find edges that connect to this node
    const incomingEdges = edges.filter(edge => edge.target === node.id)

    for (const edge of incomingEdges) {
      const sourceNode = results.get(edge.source)
      if (sourceNode !== undefined) {
        // Determine input type based on source node type
        const sourceType = this.getNodeOutputType(edge.source, results)
        inputs.push({ type: sourceType, value: sourceNode })
      }
    }

    return inputs
  }

  /**
   * Determine what type of output a node produces
   */
  private getNodeOutputType(nodeId: string, results: Map<string, unknown>): string {
    // For now, simple heuristic based on node type
    // In a full implementation, this would check the node's actual type
    const value = results.get(nodeId)
    if (typeof value === 'string') {
      // Check if it's an image URL or text
      if (value.startsWith('http') || value.startsWith('data:image')) {
        return 'image'
      }
      return 'prompt'
    }
    return 'unknown'
  }

  /**
   * Resolve variables in a prompt template
   */
  private resolvePromptVariables(template: string, variables: Record<string, string>): string {
    let resolved = template

    // Replace {{variable}} patterns
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      resolved = resolved.replace(regex, value)
    }

    return resolved
  }

  /**
   * Validate workflow structure
   */
  private validateWorkflow(nodes: Node[], edges: Edge[]): { valid: boolean; error?: string } {
    if (nodes.length === 0) {
      return { valid: false, error: 'Workflow must have at least one node' }
    }

    // Check for cycles
    if (this.hasCycles(nodes, edges)) {
      return { valid: false, error: 'Workflow cannot have cycles' }
    }

    return { valid: true }
  }

  /**
   * Check if the workflow has cycles
   */
  private hasCycles(nodes: Node[], edges: Edge[]): boolean {
    const visited = new Set<string>()
    const stack = new Set<string>()

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId)
      stack.add(nodeId)

      const outgoingEdges = edges.filter(e => e.source === nodeId)
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          if (dfs(edge.target)) return true
        } else if (stack.has(edge.target)) {
          return true
        }
      }

      stack.delete(nodeId)
      return false
    }

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true
      }
    }

    return false
  }

  /**
   * Find execution order using topological sort
   */
  private findExecutionOrder(nodes: Node[], edges: Edge[]): Node[] {
    const inDegree = new Map<string, number>()
    const adjacency = new Map<string, string[]>()

    // Initialize
    nodes.forEach(node => {
      inDegree.set(node.id, 0)
      adjacency.set(node.id, [])
    })

    // Build graph
    edges.forEach(edge => {
      const currentDegree = inDegree.get(edge.target) || 0
      inDegree.set(edge.target, currentDegree + 1)

      const neighbors = adjacency.get(edge.source) || []
      neighbors.push(edge.target)
      adjacency.set(edge.source, neighbors)
    })

    // Topological sort using Kahn's algorithm
    const queue: Node[] = []
    const result: Node[] = []

    // Start with nodes that have no incoming edges
    nodes.forEach(node => {
      if (inDegree.get(node.id) === 0) {
        queue.push(node)
      }
    })

    while (queue.length > 0) {
      const node = queue.shift()!
      result.push(node)

      const neighbors = adjacency.get(node.id) || []
      neighbors.forEach(neighborId => {
        const degree = inDegree.get(neighborId)!
        inDegree.set(neighborId, degree - 1)

        if (degree - 1 === 0) {
          const neighborNode = nodes.find(n => n.id === neighborId)
          if (neighborNode) queue.push(neighborNode)
        }
      })
    }

    return result
  }
}

export const workflowExecutionService = new WorkflowExecutionService()
