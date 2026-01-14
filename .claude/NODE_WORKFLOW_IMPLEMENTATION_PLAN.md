# Node Workflow Implementation Plan
**Date**: January 14, 2026
**Purpose**: Complete roadmap for implementing visual node workflows with recipe creation

---

## 🎯 Overview

Build a visual node workflow editor that allows users to:
1. Create complex image generation pipelines visually
2. Save workflows as reusable recipes
3. Execute recipes with simple form UI
4. Batch process multiple images through same workflow

**Key Insight**: Recipes ARE linear node workflows - they can convert bidirectionally!

---

## 📦 Phase 1: Core Node Workflow (Weeks 1-2)

### Goals:
- Build functional React Flow canvas
- Implement 5 basic node types
- Save/load workflows as JSON
- Execute simple linear workflows

### Tech Stack:
```bash
npm install @xyflow/react
# Already have: zustand, framer-motion, tailwind
```

### Node Types to Implement:

#### 1. Input Node
```typescript
interface InputNode extends Node {
  type: 'input'
  data: {
    imageUrl?: string        // Uploaded image
    imageType: 'upload' | 'reference'
    label: string
  }
}
```

#### 2. Prompt Node
```typescript
interface PromptNode extends Node {
  type: 'prompt'
  data: {
    template: string         // Can include variables (but not required!)
    variables: Record<string, string>  // Resolved values
  }
}
```

**IMPORTANT**: Prompts don't NEED variables. Simple text works fine!
```
"A beautiful sunset over mountains"  // ✅ Valid
"{{style}} sunset over mountains"    // ✅ Also valid
```

#### 3. Generation Node
```typescript
interface GenerationNode extends Node {
  type: 'generation'
  data: {
    model: 'nano-banana' | 'nano-banana-pro' | 'z-image-turbo'
    aspectRatio?: string     // Auto-inherit or manual
    settings: ModelSettings
  }
}
```

#### 4. Tool Node
```typescript
interface ToolNode extends Node {
  type: 'tool'
  data: {
    toolId: 'remove-background' | 'cinematic-grid' | 'grid-split' | 'before-after-grid'
  }
}
```

#### 5. Output Node
```typescript
interface OutputNode extends Node {
  type: 'output'
  data: {
    preview: string         // Image URL
    savedToGallery: boolean
  }
}
```

### File Structure:
```
src/features/node-workflow/
├── components/
│   ├── NodeWorkflowCanvas.tsx       # Main React Flow canvas
│   ├── nodes/
│   │   ├── InputNode.tsx
│   │   ├── PromptNode.tsx
│   │   ├── GenerationNode.tsx
│   │   ├── ToolNode.tsx
│   │   └── OutputNode.tsx
│   ├── NodePalette.tsx              # Drag-and-drop node palette
│   ├── NodeProperties.tsx           # Edit selected node
│   └── WorkflowControls.tsx         # Execute, save, load buttons
├── services/
│   ├── workflow-execution.service.ts
│   ├── workflow-storage.service.ts
│   └── node-validation.service.ts
├── hooks/
│   ├── useNodeWorkflow.ts
│   └── useWorkflowExecution.ts
├── store/
│   └── workflow.store.ts
└── types/
    └── workflow.types.ts
```

### Workflow Execution Logic:
```typescript
async function executeWorkflow(workflow: NodeWorkflow): Promise<ExecutionResult> {
  // 1. Validate workflow (check connections, types)
  const validation = validateWorkflow(workflow)
  if (!validation.valid) throw new Error(validation.error)

  // 2. Find execution order (topological sort)
  const executionOrder = findExecutionOrder(workflow.nodes, workflow.edges)

  // 3. Execute nodes in order
  const results = new Map<string, any>()

  for (const node of executionOrder) {
    // Get inputs from connected nodes
    const inputs = getNodeInputs(node, workflow.edges, results)

    // Execute node based on type
    switch (node.type) {
      case 'input':
        results.set(node.id, node.data.imageUrl)
        break

      case 'prompt':
        // Resolve variables in template
        const resolvedPrompt = resolvePromptVariables(node.data.template, node.data.variables)
        results.set(node.id, resolvedPrompt)
        break

      case 'generation':
        // Call image generation API
        const prompt = inputs.find(i => i.type === 'prompt')
        const refImage = inputs.find(i => i.type === 'image')
        const generatedImage = await imageGenerationService.generate({
          prompt: prompt.value,
          model: node.data.model,
          referenceImage: refImage?.value,
          ...node.data.settings
        })
        results.set(node.id, generatedImage.url)
        break

      case 'tool':
        // Call tool API
        const inputImage = inputs.find(i => i.type === 'image')
        const toolResult = await toolService.execute(node.data.toolId, inputImage.value)
        results.set(node.id, toolResult.url)
        break

      case 'output':
        // Save to gallery
        const finalImage = inputs.find(i => i.type === 'image')
        await galleryService.save(finalImage.value)
        results.set(node.id, finalImage.value)
        break
    }
  }

  return { success: true, outputs: results }
}
```

---

## 📦 Phase 2: Workflow → Recipe Compilation (Week 3)

### Goal:
Convert linear node workflows into simple recipes that can be used in Shot Creator.

### "Save as Recipe" Button Implementation:

```typescript
function compileWorkflowToRecipe(workflow: NodeWorkflow): Recipe {
  // 1. Validate workflow is linear (no branching)
  if (!isLinear(workflow)) {
    throw new Error('Only linear workflows can be saved as recipes')
  }

  // 2. Extract stages from generation and tool nodes
  const stages: RecipeStage[] = []
  const executionOrder = findExecutionOrder(workflow.nodes, workflow.edges)

  let stageOrder = 0
  for (const node of executionOrder) {
    if (node.type === 'generation') {
      // Find connected prompt node
      const promptNode = findConnectedNode(node, 'prompt', workflow.edges)

      stages.push({
        id: generateStageId(),
        order: stageOrder++,
        type: 'generation',
        template: promptNode?.data.template || '',
        fields: [],  // Extract from template if it has variables
        referenceImages: []
      })
    } else if (node.type === 'tool') {
      stages.push({
        id: generateStageId(),
        order: stageOrder++,
        type: 'tool',
        toolId: node.data.toolId,
        template: '',
        fields: [],
        referenceImages: []
      })
    }
  }

  return {
    id: generateId(),
    name: workflow.name || 'Untitled Recipe',
    stages,
    isQuickAccess: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}
```

### UI Flow:
1. User builds workflow visually
2. Clicks "Save as Recipe" button
3. Modal appears: "Name your recipe"
4. System validates workflow is linear
5. If valid: Compiles to recipe, saves to user's recipe library
6. If invalid: Shows error "Recipe must be a linear workflow (no branching)"

### Recipe Usage:
Once saved, the recipe appears in Shot Creator recipe dropdown. User can:
- Select it like any other recipe
- Fill in fields (if template had variables)
- Execute with one click
- Gets same results as running the workflow

---

## 📦 Phase 3: Recipe → Node Decomposition (Week 4)

### Goal:
Load existing recipes as editable node workflows.

### "Load Recipe as Nodes" Feature:

```typescript
function decomposeRecipeToWorkflow(recipe: Recipe): NodeWorkflow {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Starting position for nodes
  let x = 100
  let y = 100

  // Create nodes for each stage
  recipe.stages.forEach((stage, i) => {
    if (stage.type === 'generation') {
      // Create prompt node
      const promptNode: Node = {
        id: `prompt-${i}`,
        type: 'prompt',
        position: { x, y },
        data: {
          template: stage.template,
          variables: {}
        }
      }
      nodes.push(promptNode)

      // Create generation node
      const genNode: Node = {
        id: `generation-${i}`,
        type: 'generation',
        position: { x: x + 250, y },
        data: {
          model: 'nano-banana-pro',
          settings: {}
        }
      }
      nodes.push(genNode)

      // Connect prompt → generation
      edges.push({
        id: `edge-prompt-${i}`,
        source: promptNode.id,
        target: genNode.id,
        sourceHandle: 'prompt-output',
        targetHandle: 'prompt-input'
      })

      // Connect to previous generation (if exists)
      if (i > 0) {
        edges.push({
          id: `edge-gen-${i}`,
          source: `generation-${i - 1}`,
          target: genNode.id,
          sourceHandle: 'image-output',
          targetHandle: 'reference-input'
        })
      }

      x += 500
    } else if (stage.type === 'tool') {
      // Create tool node
      const toolNode: Node = {
        id: `tool-${i}`,
        type: 'tool',
        position: { x, y },
        data: {
          toolId: stage.toolId!
        }
      }
      nodes.push(toolNode)

      // Connect from previous node
      if (i > 0) {
        edges.push({
          id: `edge-tool-${i}`,
          source: nodes[nodes.length - 2].id,
          target: toolNode.id
        })
      }

      x += 300
    }
  })

  return {
    id: generateId(),
    name: recipe.name,
    nodes,
    edges
  }
}
```

### UI Flow:
1. User goes to Node Workflow
2. Clicks "Load Recipe" button
3. Selects recipe from their library
4. Recipe expands into visual workflow
5. User can now edit, modify, extend the workflow
6. Can save as new recipe or overwrite original

---

## 📦 Phase 4: Variables WITHOUT Field Syntax (Week 5)

### Problem:
User said: "we gotta be able to do it without that shit" (referring to `<<FIELD:type!>>` syntax)

### Solution:
**Don't require special syntax!** Users can write normal prompts and optionally use simple `{{variable}}` syntax if they want.

### Three Ways to Handle Variables:

#### 1. No Variables (Simple Text)
```
Prompt: "A beautiful sunset over mountains, photorealistic"
```
**Result**: Works perfectly! No variables needed. Recipe compiles as-is.

#### 2. Simple Curly Braces (Optional)
```
Prompt: "A beautiful {{time_of_day}} over {{location}}, {{style}}"
```
**Result**: System detects `{{...}}` patterns, creates input fields automatically.

#### 3. Variable Node (Advanced)
```
[Variable Store Node]
  time_of_day: "sunset"
  location: "mountains"
  style: "photorealistic"
     ↓
[Prompt Node]
  "A beautiful {{time_of_day}} over {{location}}, {{style}}"
```
**Result**: Variable node provides values, prompt node uses them.

### Implementation:

```typescript
// Detect variables in prompt automatically
function extractVariables(template: string): string[] {
  const regex = /{{(\w+)}}/g
  const matches = []
  let match
  while ((match = regex.exec(template)) !== null) {
    matches.push(match[1])
  }
  return matches
}

// Resolve variables when executing
function resolvePromptVariables(template: string, values: Record<string, string>): string {
  return template.replace(/{{(\w+)}}/g, (match, varName) => {
    return values[varName] || match
  })
}

// When compiling to recipe, keep it simple
function compilePromptToRecipeStage(promptNode: PromptNode): RecipeStage {
  const variables = extractVariables(promptNode.data.template)

  // If no variables detected, just save template as-is
  if (variables.length === 0) {
    return {
      id: generateStageId(),
      order: 0,
      type: 'generation',
      template: promptNode.data.template,
      fields: [],  // No fields needed!
      referenceImages: []
    }
  }

  // If variables detected, create text fields for them
  return {
    id: generateStageId(),
    order: 0,
    type: 'generation',
    template: promptNode.data.template,
    fields: variables.map(varName => ({
      name: varName,
      type: 'text',
      required: false,
      defaultValue: promptNode.data.variables[varName] || ''
    })),
    referenceImages: []
  }
}
```

### User Experience:

**Without Variables**:
1. User creates workflow with prompt "A red sports car"
2. Clicks "Save as Recipe"
3. Recipe saved with static prompt
4. When executed: Always generates "A red sports car"

**With Simple Variables**:
1. User creates workflow with prompt "A {{color}} {{vehicle}}"
2. Clicks "Save as Recipe"
3. System detects variables, creates recipe with 2 text fields
4. When executed: User fills in "color" and "vehicle", gets customized result

**No special syntax required!** Works with plain text or optional `{{var}}` syntax.

---

## 📦 Phase 5: Batch Processing (Week 6)

### Goal:
Process multiple images through same workflow.

### Batch Input Node:
```typescript
interface BatchInputNode extends Node {
  type: 'batch-input'
  data: {
    images: string[]         // Array of image URLs
    mode: 'parallel' | 'sequential'
  }
}
```

### Usage Pattern:
```
[Batch Input Node]
  - image1.jpg
  - image2.jpg
  - image3.jpg
  - image4.jpg
  - image5.jpg
     ↓
[For Each Loop]
     ↓
[Recipe Node: "Character Turnaround"]
     ↓
[Collect Results]
     ↓
[Output Gallery: 5 character sheets]
```

### Execution Logic:
```typescript
async function executeBatchWorkflow(workflow: NodeWorkflow): Promise<BatchResult> {
  const batchNode = workflow.nodes.find(n => n.type === 'batch-input')
  if (!batchNode) {
    // Not a batch workflow, execute normally
    return executeSingleWorkflow(workflow)
  }

  const results = []

  if (batchNode.data.mode === 'parallel') {
    // Execute all in parallel
    const promises = batchNode.data.images.map(imageUrl => {
      const singleWorkflow = cloneWorkflow(workflow)
      replaceInputImage(singleWorkflow, imageUrl)
      return executeWorkflow(singleWorkflow)
    })
    results.push(...await Promise.all(promises))
  } else {
    // Execute sequentially
    for (const imageUrl of batchNode.data.images) {
      const singleWorkflow = cloneWorkflow(workflow)
      replaceInputImage(singleWorkflow, imageUrl)
      const result = await executeWorkflow(singleWorkflow)
      results.push(result)
    }
  }

  return { success: true, outputs: results }
}
```

---

## 🎨 UI/UX Design

### Node Workflow Canvas:

```
┌─────────────────────────────────────────────────────────────────┐
│  Node Workflow Editor                                    [Save] │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [Node Palette]                                                  │
│  ┌──────────┐                                                   │
│  │ Input    │                                                   │
│  │ Prompt   │                                                   │
│  │ Generate │                                                   │
│  │ Tool     │                                                   │
│  │ Output   │                                                   │
│  └──────────┘                                                   │
│                                                                   │
│  [Workflow Canvas - Infinite Pan/Zoom]                          │
│                                                                   │
│   ┌─────────┐    ┌──────────┐    ┌────────────┐    ┌────────┐ │
│   │  Input  │───▶│  Prompt  │───▶│ Generation │───▶│ Output │ │
│   │  Image  │    │          │    │            │    │        │ │
│   └─────────┘    └──────────┘    └────────────┘    └────────┘ │
│                                                                   │
│  [Properties Panel - Edit Selected Node]                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Node Styling:
- **Dark theme** consistent with app
- **Amber accents** for connections
- **Gradient backgrounds** for active nodes
- **Smooth animations** on connect/disconnect
- **Drag handles** clearly visible

### Controls:
- **Execute Workflow** - Run the entire flow
- **Save as Recipe** - Compile to recipe
- **Load Recipe** - Expand recipe to nodes
- **Save Workflow** - Save as JSON
- **Load Workflow** - Load from JSON

---

## 🔧 Technical Considerations

### 1. Aspect Ratio Flow
**Auto-inherit by default**, manual override if needed:
```typescript
interface GenerationNode {
  data: {
    aspectRatioMode: 'inherit' | 'custom'
    customAspectRatio?: string
  }
}

// When executing:
if (node.data.aspectRatioMode === 'inherit') {
  // Get aspect ratio from input image
  const inputImage = getConnectedInput(node, 'image')
  aspectRatio = detectAspectRatio(inputImage)
} else {
  aspectRatio = node.data.customAspectRatio
}
```

### 2. Error Handling
- **Validation before execution**: Check all connections valid
- **Per-node error display**: Show red outline on failed node
- **Retry mechanism**: Allow re-running failed nodes
- **Partial results**: Save successful nodes even if later nodes fail

### 3. Performance
- **Lazy loading**: Only load visible nodes
- **Debounced execution**: Don't re-run on every change
- **Result caching**: Cache generation results to avoid re-generating
- **Background execution**: Run workflows in web worker

---

## 📚 Documentation Plan

### User Guide Sections:
1. **Introduction to Node Workflows**
   - What are nodes?
   - When to use workflows vs. recipes

2. **Creating Your First Workflow**
   - Drag nodes onto canvas
   - Connect nodes
   - Execute workflow

3. **Saving as Recipe**
   - Requirements (linear workflow)
   - How to save
   - Using saved recipes

4. **Advanced Features**
   - Variables and dynamic prompts
   - Batch processing
   - Tool nodes

5. **Best Practices**
   - Organizing complex workflows
   - Reusing workflows
   - Performance tips

---

## 🎯 Success Metrics

### MVP Success Criteria:
- ✅ User can create simple linear workflow
- ✅ User can execute workflow and see results
- ✅ User can save workflow as recipe
- ✅ User can load recipe into Shot Creator
- ✅ Recipe executes identically to workflow

### Advanced Success Criteria:
- ✅ User can batch process 5+ images
- ✅ User can use variables in prompts
- ✅ User can load recipes as editable workflows
- ✅ Zero console errors
- ✅ Smooth 60fps animations

---

## 🚀 Rollout Strategy

### Week 1-2: Internal Testing
- Build core functionality
- Test with 5-10 simple workflows
- Fix critical bugs

### Week 3-4: Beta Release
- Add "Node Workflow" to sidebar (with "Beta" badge)
- Invite power users to test
- Collect feedback

### Week 5-6: Public Release
- Remove "Beta" badge
- Add tutorial/onboarding
- Create example workflows
- Full documentation

---

## 🎬 Example Use Cases

### Use Case 1: Character Turnaround
```
[Input: Character Photo]
  ↓
[Prompt: "{{CHARACTER}}, front view, studio lighting"]
  ↓
[Generate: nano-banana-pro]
  ↓
[Prompt: "{{CHARACTER}}, side view, studio lighting"]
  ↓
[Generate: nano-banana-pro]
  ↓
[Tool: Cinematic Grid]
  ↓
[Output: 9-angle character sheet]
```

### Use Case 2: Style Exploration
```
[Input: Base Prompt]
  ↓
[Prompt: "A sunset over mountains, anime style"]
  ↓
[Generate] → [Output 1]
  ↓
[Prompt: "A sunset over mountains, photorealistic"]
  ↓
[Generate] → [Output 2]
  ↓
[Prompt: "A sunset over mountains, oil painting"]
  ↓
[Generate] → [Output 3]
```

### Use Case 3: Batch Character Sheets
```
[Batch Input: 5 Character Photos]
  ↓
[For Each Photo]
  ↓
[Recipe: "Character Sheet"]
  ↓
[Collect Results]
  ↓
[Output Gallery: 5 Character Sheets]
```

---

## 💎 Key Takeaways

1. **No Special Syntax Required**: Plain text prompts work! Variables are optional with simple `{{var}}` syntax.

2. **Recipes ARE Node Workflows**: They convert bidirectionally, creating a powerful "design visually, use simply" system.

3. **Batch Processing Unlocked**: Run same recipe on 5 images automatically - impossible with current recipes!

4. **Progressive Disclosure**: Beginners use recipes (forms), power users use nodes (visual editor).

5. **Future-Ready**: Foundation for video workflows, AI extraction, complex automation.

---

**Next Step**: Start Phase 1 implementation with basic React Flow canvas and 5 node types. Build iteratively, test early, ship fast!
