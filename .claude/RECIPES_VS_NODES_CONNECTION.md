# Recipes vs Nodes: The Hidden Connection
**Date**: January 14, 2026
**Purpose**: Explore the relationship between recipe system and node workflows

---

## 🎯 The Brilliant Insight

**User's Question**: "I'm wondering if the nodes and recipes are somehow related and we don't even realize it?"

**Answer**: YES! They're DEEPLY connected. Recipes are essentially **linear node workflows in disguise**.

---

## 🔍 Recipe System Analysis

### What is a Recipe?

A recipe is a **fill-in-the-blank template** with multiple stages:

```typescript
interface Recipe {
  name: string
  stages: RecipeStage[]  // Multi-stage pipeline!
  referenceImages: RecipeReferenceImage[]
}

interface RecipeStage {
  order: number          // Stage order (0, 1, 2...)
  type: 'generation' | 'tool'
  template: string       // Prompt with <<FIELD>> variables
  fields: RecipeField[]  // Parsed input fields
  referenceImages: RecipeReferenceImage[]
  toolId?: RecipeToolId  // Optional tool (remove-background, grid-split, etc.)
}
```

### Example: "Character Turnaround" Recipe

**Stage 0** (Generation):
```
Prompt: "<<CHARACTER:name!>>, front view, neutral expression, studio lighting"
Fields: [CHARACTER (required name field)]
Reference: character-ref.jpg
Model: nano-banana-pro
```

**Stage 1** (Generation):
```
Prompt: "<<CHARACTER:name!>>, side view, neutral expression, studio lighting"
Fields: [CHARACTER (reuses value from Stage 0)]
Reference: [output from Stage 0]  ← Uses previous output!
Model: nano-banana-pro
```

**Stage 2** (Tool):
```
Tool: "cinematic-grid"
Reference: [output from Stage 1]
Output: 9 camera angles
```

**This is ALREADY a node workflow!** It's just expressed as a linear pipeline instead of a visual canvas.

---

## 🧩 Mapping: Recipes → Nodes

### Recipe Concept → Node Equivalent

| Recipe Component | Node Equivalent | Notes |
|-----------------|-----------------|-------|
| **RecipeStage** | **Node** | Each stage = one node |
| **Stage.order** | **Node connections** | Order defines flow |
| **Stage.template** | **Prompt Node** | Input text with variables |
| **Stage.fields** | **Node inputs** | Variable inputs (text, select, etc.) |
| **Stage.referenceImages** | **Image Input Node** | Static reference images |
| **Previous stage output** | **Edge connection** | Output → Input connection |
| **Stage.toolId** | **Tool Node** | Processing nodes (remove-bg, grid-split) |
| **Recipe.name** | **Workflow name** | Overall workflow title |

---

## 💡 The Perfect Translation

### Recipe as Linear Flow
```
Input (user fills fields)
  ↓
Stage 0: Generation Node (prompt + ref images)
  ↓
Stage 1: Generation Node (uses Stage 0 output as reference)
  ↓
Stage 2: Tool Node (cinematic-grid)
  ↓
Output (9 images)
```

### Same Flow as Visual Nodes
```
[Field Input Node]
    ↓
[Image Input: Ref]
    ↓
[Prompt Node: Stage 0] → [Generation Node: nano-banana-pro]
    ↓
[Prompt Node: Stage 1] → [Generation Node: nano-banana-pro]
    ↓
[Tool Node: cinematic-grid]
    ↓
[Output Gallery]
```

**They're the SAME thing!** Recipes are just a **simplified UI** for linear workflows.

---

## 🤯 Why This Matters

### 1. **Recipes Can Be Visualized as Nodes**

You can **automatically generate node workflows from recipes**:

```typescript
function recipeToNodes(recipe: Recipe): NodeWorkflow {
  const nodes: Node[] = []

  // Create input node for fields
  nodes.push({
    id: 'input',
    type: 'field-input',
    data: { fields: recipe.stages.flatMap(s => s.fields) }
  })

  // Create nodes for each stage
  recipe.stages.forEach((stage, i) => {
    if (stage.type === 'generation') {
      nodes.push({
        id: `prompt-${i}`,
        type: 'prompt',
        data: { template: stage.template }
      })
      nodes.push({
        id: `generation-${i}`,
        type: 'generation',
        data: { model: recipe.suggestedModel || 'nano-banana-pro' }
      })
    } else if (stage.type === 'tool') {
      nodes.push({
        id: `tool-${i}`,
        type: 'tool',
        data: { toolId: stage.toolId }
      })
    }
  })

  // Create connections based on stage order
  const edges = createEdgesFromStageOrder(recipe.stages)

  return { nodes, edges }
}
```

### 2. **Nodes Can Be Saved as Recipes**

You can **compile node workflows back into recipes**:

```typescript
function nodesToRecipe(workflow: NodeWorkflow): Recipe {
  // Find linear path through nodes
  const path = findLinearPath(workflow.nodes, workflow.edges)

  // Convert each node to a stage
  const stages: RecipeStage[] = path.map((node, i) => {
    if (node.type === 'generation') {
      return {
        id: generateStageId(),
        order: i,
        type: 'generation',
        template: extractPromptTemplate(node),
        fields: extractFields(node),
        referenceImages: []
      }
    } else if (node.type === 'tool') {
      return {
        id: generateStageId(),
        order: i,
        type: 'tool',
        template: '',
        toolId: node.data.toolId,
        fields: [],
        referenceImages: []
      }
    }
  })

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

---

## 🔄 Bulk Processing Answer

**User's Question**: "What if you gave it 5 images and wanted to do bulk processing?"

**Answer**: This is where nodes SHINE over recipes!

### Recipe Limitation: Single Input
Recipes are designed for **one execution**:
- User fills fields once
- Pipeline runs once
- Gets one set of outputs

### Node Workflow: Batch Processing

With nodes, you can do:

#### Pattern 1: Multiple Inputs → Same Pipeline

```
[Input: Image 1] ─┐
[Input: Image 2] ─┤
[Input: Image 3] ─┼→ [Recipe Node: Character Turnaround] → [Output Gallery]
[Input: Image 4] ─┤
[Input: Image 5] ─┘
```

**How it works**:
1. Upload 5 character photos
2. Recipe node runs 5 times (once per input)
3. Gets 5 sets of turnaround images
4. All saved to gallery

**This is IMPOSSIBLE with current recipes!**

#### Pattern 2: Batch Node

```
[Batch Input Node]
  ├─ Image 1
  ├─ Image 2
  ├─ Image 3
  ├─ Image 4
  └─ Image 5
       ↓
[For Each Loop]
  ↓
[Recipe Node: Character Sheet]
  ↓
[Collect Results]
  ↓
[Output Gallery: 5 character sheets]
```

---

## 🎨 Visual Comparison

### Recipe UI (Current)
```
┌─────────────────────────────────────┐
│ Character Turnaround Recipe         │
├─────────────────────────────────────┤
│ Character Name: [Marcus           ] │
│ Upload Reference: [📷 Choose File ] │
│                                     │
│ [Generate] (runs all stages)        │
└─────────────────────────────────────┘
```
**Pros**: Simple, beginner-friendly
**Cons**: One execution at a time, can't see pipeline

### Node Workflow UI (Future)
```
┌───────────────────────────────────────────────────────┐
│  [Field Input]                                         │
│    Character: Marcus                                   │
│         ↓                                              │
│  [Image Input]                                         │
│    📷 marcus.jpg                                       │
│         ↓                                              │
│  [Prompt] "Marcus, front view..."                     │
│         ↓                                              │
│  [Generation] nano-banana-pro                         │
│         ↓                                              │
│  [Prompt] "Marcus, side view..."                      │
│         ↓                                              │
│  [Generation] nano-banana-pro                         │
│         ↓                                              │
│  [Tool] Cinematic Grid (9 angles)                     │
│         ↓                                              │
│  [Output] 📁 View Results                             │
└───────────────────────────────────────────────────────┘
```
**Pros**: Visual pipeline, can edit any step, reusable
**Cons**: More complex UI

---

## 🚀 Implementation Strategy

### Phase 1: Recipe Node
Create a special "Recipe Node" that runs existing recipes:

```typescript
interface RecipeNode extends Node {
  type: 'recipe'
  data: {
    recipeId: string
    fieldValues: RecipeFieldValues  // Pre-filled or connected
    referenceImages: string[]       // From upstream nodes
  }
}
```

**Usage**:
```
[Input Images] → [Recipe Node: "Character Sheet"] → [Output]
```

This lets users run recipes inside node workflows!

### Phase 2: Recipe Decomposition
Break recipes into individual nodes:

```typescript
function decomposeRecipe(recipe: Recipe): Node[] {
  // Convert each stage to discrete nodes
  const nodes = recipe.stages.flatMap((stage, i) => {
    if (stage.type === 'generation') {
      return [
        createPromptNode(stage, i),
        createGenerationNode(stage, i)
      ]
    } else {
      return [createToolNode(stage, i)]
    }
  })
  return nodes
}
```

**Usage**: "Load Recipe as Nodes" button → Expands recipe into editable workflow

### Phase 3: Batch Processing
Add special batch nodes:

```typescript
interface BatchInputNode extends Node {
  type: 'batch-input'
  data: {
    images: string[]  // Array of image URLs
    mode: 'parallel' | 'sequential'
  }
}

interface ForEachNode extends Node {
  type: 'for-each'
  data: {
    batchInput: string  // Connected batch input node
  }
}
```

**Usage**:
```
[Batch Input: 5 images]
    ↓
[For Each]
    ↓
[Recipe Node]
    ↓
[Collect Results]
```

---

## 🎯 Character Sheet Example with Variables

**User's Question**: "How could we make recipes with variables for character sheets?"

**Current Character Sheet Recipe**:
```
Stage 0: "<<CHARACTER_NAME:name!>>, front view, <<STYLE:text>>"
```

**Node Workflow Version**:
```
[Field Input Node]
  Fields:
    - CHARACTER_NAME (required)
    - STYLE (optional)
    - AGE (select: young, middle-aged, elderly)
    - ETHNICITY (text)
       ↓
[Character Variable Node]
  Stores: {
    name: "Marcus",
    style: "photorealistic",
    age: "middle-aged",
    ethnicity: "African American"
  }
       ↓
[Prompt Template Node]
  Template: "{{name}}, {{age}} {{ethnicity}} man, front view, {{style}}"
       ↓
[Generation Node]
  Model: nano-banana-pro
       ↓
[Output]
```

**Variables can be**:
1. **Hard-coded** in node data
2. **Connected** from upstream nodes
3. **Inherited** from parent workflow
4. **Batch values** (run 5 different characters)

---

## 🤝 Best of Both Worlds

### For Beginners: Keep Recipes
- Simple form UI
- One-click execution
- Hidden complexity

### For Power Users: Add Nodes
- Visual pipeline editor
- Batch processing
- Reusable workflows
- Mix and match recipes

### The Bridge: Recipe Node
A special node that runs recipes inside workflows:
```
[Batch: 5 images] → [Recipe Node: "Character Sheet"] → [Gallery]
```

This lets beginners create recipes, and power users can **compose** them into complex workflows!

---

## 💎 Key Insights

1. **Recipes ARE linear node workflows** - just with a simpler UI
2. **Every recipe can be visualized as nodes** - automatic conversion possible
3. **Nodes unlock batch processing** - run same recipe on 5 images
4. **Variables work the same way** - fields in recipes = inputs in nodes
5. **Recipe Node bridges both worlds** - use recipes inside node workflows

---

## 🎬 Video Integration (Replicate)

**User mentioned**: "We can add video relatively easy using Replicate"

**Node Workflow for Video**:
```
[Input: Story Text]
    ↓
[LLM Node: Break into scenes]
    ↓
[For Each Scene]
    ↓
[Image Generation Node: Key frame]
    ↓
[Video Generation Node: seedance-1-lite or Veo]
    Input: Key frame + prompt
    Output: 5-second video clip
    ↓
[Collect Video Clips]
    ↓
[Video Concatenation Node]
    ↓
[Output: Full video]
```

**This would be PERFECT for Music Lab** - turn treatment into full music video!

---

## 🚀 Recommended Implementation Order

### Week 1-2: Node Workflow Core
- React Flow canvas
- Basic node types (Input, Prompt, Generation, Output)
- Save/load JSON

### Week 3: Recipe Node
- Special node that executes existing recipes
- Bridge between recipes and nodes

### Week 4: Batch Processing
- Batch Input node
- For Each loop node
- Test with 5 character photos

### Week 5: Recipe Decomposition
- "Load Recipe as Nodes" feature
- Convert recipes to editable workflows

### Week 6: Video Nodes (Future)
- Replicate video generation node
- Scene breakdown node
- Video concatenation

---

## 🎯 Answer to User's Questions

### Q: "Are nodes and recipes related?"
**A**: YES! Recipes are linear node workflows with a simplified UI. They can be converted back and forth.

### Q: "Can recipes have variables?"
**A**: They already do! `<<CHARACTER_NAME:name!>>` fields ARE variables. In node workflows, these become input connections.

### Q: "Can we do bulk processing (5 images through same flow)?"
**A**: YES! This is where nodes excel. Create a Batch Input node → For Each loop → Recipe Node. Run the same recipe on all 5 images automatically.

### Q: "How does this connect to character sheets?"
**A**: Character sheets are perfect for this! Upload 5 character photos → Run "Character Sheet" recipe on all → Get 5 character sheets. Or vary parameters: same character, 5 different styles.

---

## 🎉 The Big Picture

**Recipes** = Simple, linear workflows for beginners
**Nodes** = Powerful, visual workflows for complex pipelines
**Recipe Node** = Bridge between them

Together, they create a **progressive disclosure** system:
1. Beginners use recipes (form UI)
2. Power users use nodes (visual editor)
3. Experts mix both (recipes as nodes, batch processing, variables)

**This is BRILLIANT architecture!**

---

**Next Step**: Implement basic node workflow with Recipe Node as first-class citizen. This lets you leverage ALL existing recipes as building blocks for complex workflows!
