# Node Workflow Technical Questions
**Date**: January 14, 2026
**Purpose**: Answer critical implementation questions for node workflows

---

## 🎯 Question 1: How is Aspect Ratio Handled in Nodes?

### The Problem

In recipes, aspect ratio is simple:
```typescript
interface Recipe {
  suggestedAspectRatio?: string  // "16:9", "1:1", etc.
}
```

User sets it once, applies to all stages.

**But in nodes**, the pipeline is more complex:
```
[Input: 1:1 image]
    ↓
[Generation: Should this be 1:1 or can user change to 16:9?]
    ↓
[Tool: Cinematic Grid - Outputs 1:1 grid image]
    ↓
[Tool: Grid Split - Outputs 9 images, each 1:1]
    ↓
[Generation: What aspect ratio for these 9?]
```

### Solution: Aspect Ratio Flow System

#### Option 1: Auto-Inherit (Recommended)

Each node **inherits aspect ratio from its input**:

```typescript
interface NodeExecutionContext {
  inputAspectRatio?: string    // From previous node
  outputAspectRatio?: string   // This node's output
}

interface GenerationNode extends Node {
  data: {
    aspectRatioMode: 'inherit' | 'custom'  // Default: inherit
    customAspectRatio?: string             // Only if mode=custom
  }
}
```

**Visual in Node Editor**:
```
[Input Image: 512x512]
  Aspect: 1:1 ← detected
      ↓
[Generation Node]
  Mode: [Inherit ▼] (dropdown)
  Aspect: 1:1 (inherited) ← grayed out, auto-populated
      ↓
[Tool: Cinematic Grid]
  Input: 1:1
  Output: 1:1 (3x3 grid) ← tool defines output
      ↓
[Tool: Grid Split]
  Input: 1:1 grid
  Output: 9 images @ 1:1 each ← splits maintain aspect
      ↓
[Generation Node]
  Mode: [Custom ▼] (user changed)
  Aspect: 16:9 (custom) ← user override
```

**Implementation**:
```typescript
function executeNode(node: Node, context: ExecutionContext) {
  if (node.type === 'generation') {
    const aspectRatio = node.data.aspectRatioMode === 'inherit'
      ? context.inputAspectRatio || '1:1'  // Default to square
      : node.data.customAspectRatio || '1:1'

    return {
      ...result,
      outputAspectRatio: aspectRatio
    }
  }
}
```

#### Option 2: Smart Detection

Node editor **analyzes the workflow** and suggests aspect ratios:

```typescript
function analyzeWorkflow(nodes: Node[]): AspectRatioSuggestion[] {
  const suggestions = []

  // If input is portrait (9:16), suggest portrait for all generations
  if (inputAspectRatio === '9:16') {
    suggestions.push({
      message: "Input is portrait. Consider 9:16 for all generations.",
      nodes: generationNodes
    })
  }

  // If using cinematic-grid, input should be 1:1
  if (hasCinematicGridTool) {
    suggestions.push({
      message: "Cinematic Grid works best with 1:1 input.",
      node: previousGenerationNode
    })
  }

  return suggestions
}
```

**Visual Warning**:
```
⚠️ Aspect Ratio Mismatch
Generation Node #3 outputs 16:9, but Cinematic Grid tool
requires 1:1 input. Consider changing to 1:1 or adding
a resize node.

[Fix Automatically] [Ignore]
```

#### Option 3: Aspect Ratio Node (Explicit)

Add a dedicated node type:

```typescript
interface AspectRatioNode extends Node {
  type: 'aspect-ratio'
  data: {
    targetRatio: string        // "16:9", "1:1", etc.
    resizeMode: 'crop' | 'pad' | 'stretch'
  }
}
```

**Usage**:
```
[Input: 1:1 image]
    ↓
[Aspect Ratio Node: Convert to 16:9, mode=pad]
    ↓
[Generation: Inherits 16:9]
```

### Recommended Approach: Hybrid

1. **Default**: Auto-inherit (Option 1)
2. **Visual Warnings**: Smart detection (Option 2)
3. **Manual Override**: Aspect Ratio Node (Option 3) for advanced users

**Node Editor UI**:
```
┌─────────────────────────────────┐
│ Generation Node                  │
├─────────────────────────────────┤
│ Model: nano-banana-pro          │
│                                  │
│ Aspect Ratio:                   │
│ ● Inherit (1:1) ← from input    │
│ ○ Custom [16:9 ▼]               │
│                                  │
│ [More Settings...]              │
└─────────────────────────────────┘
```

---

## 🧮 Question 2: Can We Do More with Variables in Nodes?

### Current Recipe Variables

```typescript
// Recipe template
"<<CHARACTER_NAME:name!>>, <<STYLE:text>>, <<MOOD:select(happy,sad,angry)>>"

// User fills:
CHARACTER_NAME = "Marcus"
STYLE = "photorealistic"
MOOD = "happy"

// Result:
"Marcus, photorealistic, happy"
```

**This is already powerful!** But nodes can do MORE...

### Advanced Variable Features for Nodes

#### 1. Variable Node (Shared Store)

Create a node that stores variables for the ENTIRE workflow:

```typescript
interface VariableStoreNode extends Node {
  type: 'variable-store'
  data: {
    variables: {
      [key: string]: {
        value: string
        type: 'text' | 'number' | 'select'
        description?: string
      }
    }
  }
}
```

**Usage**:
```
[Variable Store]
  character_name: "Marcus"
  style: "photorealistic"
  shot_count: 5
       ↓
[Prompt Node #1]  → Reads: character_name, style
[Prompt Node #2]  → Reads: character_name, style
[Prompt Node #3]  → Reads: character_name, style
```

**Benefits**:
- **DRY**: Define once, use everywhere
- **Consistency**: Change "Marcus" → "Sarah" in ONE place, updates all prompts
- **Type safety**: Numbers stay numbers, selects have options

#### 2. Computed Variables (Formulas)

Variables that derive from other variables:

```typescript
interface ComputedVariable {
  name: string
  formula: string  // JavaScript expression
  dependencies: string[]
}

// Example:
{
  name: "full_description",
  formula: "`${character_name}, ${age} years old, ${ethnicity}, ${style}`",
  dependencies: ["character_name", "age", "ethnicity", "style"]
}
```

**Usage**:
```
[Variable Store]
  character_name: "Marcus"
  age: 35
  ethnicity: "African American"
  style: "photorealistic"
  ↓
[Computed Variable]
  full_description = "Marcus, 35 years old, African American, photorealistic"
  ↓
[Prompt Node]
  Uses: {{full_description}}
```

#### 3. Random Variables (Wildcards on Steroids)

```typescript
interface RandomVariable {
  name: string
  type: 'random'
  options: string[]
  mode: 'pick-one' | 'cycle' | 'shuffle'
}

// Example:
{
  name: "camera_angle",
  type: "random",
  options: ["eye-level", "low-angle", "high-angle", "dutch"],
  mode: "cycle"  // Each execution uses next option
}
```

**Usage (Batch Processing)**:
```
[Variable Store]
  character: "Marcus"
  camera_angle: [random from 4 options]
  ↓
[For Each: 4 iterations]
  Iteration 1: eye-level
  Iteration 2: low-angle
  Iteration 3: high-angle
  Iteration 4: dutch
  ↓
[Result: 4 images of Marcus from different angles]
```

#### 4. Context Variables (Auto-Generated)

System provides built-in variables:

```typescript
const CONTEXT_VARIABLES = {
  '$iteration': 'Current loop iteration (0, 1, 2...)',
  '$timestamp': 'Current timestamp',
  '$user_name': 'Logged-in user name',
  '$workflow_name': 'Current workflow name',
  '$previous_output': 'Output from previous node'
}
```

**Usage**:
```
[Prompt Template]
"{{character_name}}, iteration {{$iteration}}, style variation {{$iteration + 1}}"

Iteration 0: "Marcus, iteration 0, style variation 1"
Iteration 1: "Marcus, iteration 1, style variation 2"
Iteration 2: "Marcus, iteration 2, style variation 3"
```

#### 5. Variable Extraction (AI-Powered)

Automatically extract variables from prompts:

```typescript
// User writes prompt:
"Marcus, a 35-year-old African American man, photorealistic style"

// System detects patterns:
[Extract Variables Button]

// Generates:
{
  character_name: "Marcus",
  age: 35,
  ethnicity: "African American",
  style: "photorealistic"
}

// Converts prompt to template:
"{{character_name}}, a {{age}}-year-old {{ethnicity}} man, {{style}} style"
```

**UI**:
```
┌─────────────────────────────────────────────┐
│ Prompt Node                                  │
├─────────────────────────────────────────────┤
│ [Marcus, 35 years old, photorealistic]      │
│                                              │
│ [✨ Extract Variables]                      │
│                                              │
│ Detected:                                    │
│ • character_name: Marcus                    │
│ • age: 35                                    │
│ • style: photorealistic                     │
│                                              │
│ [Create Variable Store] [Cancel]            │
└─────────────────────────────────────────────┘
```

### Recommended Variable System

```typescript
interface VariableSystem {
  // 1. Manual variables (user-defined)
  userVariables: Map<string, VariableValue>

  // 2. Computed variables (formulas)
  computedVariables: Map<string, ComputedVariable>

  // 3. Random variables (wildcards)
  randomVariables: Map<string, RandomVariable>

  // 4. Context variables (system-provided)
  contextVariables: Map<string, ContextVariable>

  // 5. Node-specific variables (scoped)
  nodeVariables: Map<string, NodeVariable>
}
```

**Variable Resolution Order**:
1. Check node-specific variables
2. Check user variables
3. Check computed variables
4. Check random variables
5. Check context variables
6. Throw error if not found

---

## 🎨 Question 3: Can Nodes Create a Recipe?

### Short Answer: YES!

Power users can build complex workflows in nodes, then **compile them into recipes** for beginners.

### Requirements for Node → Recipe Conversion

#### Must be Linear (No Branching)

```
✅ VALID (linear):
[Input] → [Prompt] → [Generation] → [Tool] → [Output]

❌ INVALID (branching):
           ┌→ [Generation A] → [Output A]
[Input] ───┤
           └→ [Generation B] → [Output B]
```

**Check**:
```typescript
function isLinearWorkflow(nodes: Node[], edges: Edge[]): boolean {
  // Each node (except output) has exactly 1 outgoing edge
  for (const node of nodes) {
    const outgoing = edges.filter(e => e.source === node.id)
    if (outgoing.length > 1) return false
  }
  return true
}
```

#### All Nodes Must Be Recipe-Compatible

```typescript
const RECIPE_COMPATIBLE_NODES = [
  'field-input',      // → Recipe fields
  'prompt',           // → Recipe stage template
  'generation',       // → Recipe stage (type: generation)
  'tool',             // → Recipe stage (type: tool)
  'image-input'       // → Recipe reference images
]

function canConvertToRecipe(workflow: NodeWorkflow): boolean {
  return workflow.nodes.every(node =>
    RECIPE_COMPATIBLE_NODES.includes(node.type)
  )
}
```

#### Variables Must Be Extractable

Variables must follow the `<<FIELD_NAME:type>>` pattern or be convertible:

```typescript
// Node variable:
{ name: "character_name", type: "text", required: true }

// Converts to:
"<<CHARACTER_NAME:text!>>"
```

### Implementation: Compile Workflow to Recipe

```typescript
function compileWorkflowToRecipe(workflow: NodeWorkflow): Recipe {
  // 1. Validate workflow is linear
  if (!isLinearWorkflow(workflow.nodes, workflow.edges)) {
    throw new Error("Cannot convert branching workflow to recipe")
  }

  // 2. Find linear path
  const path = findLinearPath(workflow.nodes, workflow.edges)

  // 3. Extract fields from Field Input node
  const fieldInputNode = path.find(n => n.type === 'field-input')
  const fields = extractFields(fieldInputNode)

  // 4. Convert each node to a stage
  const stages: RecipeStage[] = []

  for (const node of path) {
    if (node.type === 'prompt' || node.type === 'generation') {
      // Find connected prompt node
      const promptNode = findConnectedNode(node, 'prompt', workflow.edges)

      stages.push({
        id: generateStageId(),
        order: stages.length,
        type: 'generation',
        template: convertToTemplate(promptNode.data.text, fields),
        fields: [], // Will be parsed from template
        referenceImages: extractReferenceImages(node)
      })
    } else if (node.type === 'tool') {
      stages.push({
        id: generateStageId(),
        order: stages.length,
        type: 'tool',
        toolId: node.data.toolId,
        template: '',
        fields: [],
        referenceImages: []
      })
    }
  }

  // 5. Create recipe
  return {
    id: generateId(),
    name: workflow.name || 'Untitled Recipe',
    description: 'Generated from node workflow',
    stages,
    isQuickAccess: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}
```

### Example: Node Workflow → Recipe

#### Node Workflow (Visual)
```
[Field Input Node]
  Fields:
    - character_name (text, required)
    - style (text, optional)
    ↓
[Image Input]
  Reference: character-ref.jpg
    ↓
[Prompt Node]
  "{{character_name}}, front view, {{style}}"
    ↓
[Generation Node]
  Model: nano-banana-pro
    ↓
[Tool Node]
  Tool: cinematic-grid
    ↓
[Output]
```

#### Compiled Recipe (JSON)
```json
{
  "id": "recipe-123",
  "name": "Character Sheet from Workflow",
  "stages": [
    {
      "order": 0,
      "type": "generation",
      "template": "<<CHARACTER_NAME:text!>>, front view, <<STYLE:text>>",
      "fields": [
        { "name": "CHARACTER_NAME", "type": "text", "required": true },
        { "name": "STYLE", "type": "text", "required": false }
      ],
      "referenceImages": [
        { "url": "character-ref.jpg", "isStatic": true }
      ]
    },
    {
      "order": 1,
      "type": "tool",
      "toolId": "cinematic-grid"
    }
  ]
}
```

### UI: "Export as Recipe" Button

```
┌─────────────────────────────────────┐
│ Node Workflow: "Character Sheet"    │
├─────────────────────────────────────┤
│ [Nodes visual editor here...]       │
│                                      │
│ [Save Workflow] [Export as Recipe]  │
└─────────────────────────────────────┘

[Click "Export as Recipe"]

┌─────────────────────────────────────┐
│ Export as Recipe                     │
├─────────────────────────────────────┤
│ Recipe Name:                         │
│ [Character Sheet Generator        ]  │
│                                      │
│ Description:                         │
│ [Creates character turnarounds    ]  │
│                                      │
│ Category: [Characters ▼]            │
│                                      │
│ ☑ Add to Quick Access               │
│ Quick Access Label: [CharSheet   ]  │
│                                      │
│ [Cancel] [Create Recipe]            │
└─────────────────────────────────────┘

[Success!]
Recipe created. Users can now run this workflow
as a simple form without seeing the nodes.
```

### Benefits

1. **Power users create workflows** → Complex node pipelines
2. **Compile to recipes** → Simple form UI for beginners
3. **Share recipes** → Distribute as JSON
4. **Update workflow** → Regenerate recipe when improved
5. **Progressive disclosure** → Beginners use form, experts see nodes

### Limitations

- Can't convert branching workflows (conditional logic)
- Can't convert loops (for-each)
- Loses some node-specific features (batch processing)

**Solution**: Mark incompatible workflows with warning:
```
⚠️ Cannot Export as Recipe
This workflow contains branching or loops. Only linear
workflows can be exported as recipes.

Consider simplifying or saving as a node workflow instead.
```

---

## 🎯 Summary Answers

### Q1: How is aspect ratio handled in nodes?

**Answer**: **Auto-inherit by default**, with manual override.

- Each generation node inherits aspect ratio from input
- User can switch to "Custom" mode to override
- Smart warnings for mismatches (e.g., "Cinematic Grid needs 1:1")
- Optional Aspect Ratio Node for explicit conversions

**Implementation**: `aspectRatioMode: 'inherit' | 'custom'` on generation nodes

---

### Q2: Can we do more with variables?

**Answer**: **YES! Way more than recipes.**

1. **Variable Store Node** - Define once, use everywhere
2. **Computed Variables** - Formulas (e.g., `full_name = first + last`)
3. **Random Variables** - Wildcards on steroids (cycle, shuffle modes)
4. **Context Variables** - System-provided (`$iteration`, `$timestamp`)
5. **AI Extraction** - Auto-detect variables from prompts

**This makes nodes 10x more powerful than recipes for complex workflows.**

---

### Q3: Can nodes create a recipe?

**Answer**: **YES! With requirements.**

- Workflow must be LINEAR (no branching)
- All nodes must be recipe-compatible
- Variables must be extractable

**Workflow**:
1. Build complex pipeline in nodes
2. Click "Export as Recipe"
3. System compiles to simple form UI
4. Share with beginners who never see nodes

**This is HUGE**: Power users create workflows → Beginners use recipes → Everyone wins!

---

## 🚀 Recommended Implementation Priority

### Phase 1: Aspect Ratio (Core Feature)
- Auto-inherit system
- Custom override option
- **Time**: 2-3 hours

### Phase 2: Basic Variables (Critical)
- Variable Store Node
- Template syntax (`{{variable_name}}`)
- **Time**: 4-6 hours

### Phase 3: Export as Recipe (Power Feature)
- Linear workflow detection
- Node → Recipe compiler
- **Time**: 6-8 hours

### Phase 4: Advanced Variables (Nice-to-Have)
- Computed variables
- Random variables
- AI extraction
- **Time**: 8-12 hours

---

**Total core implementation**: ~12-17 hours for Phases 1-3
**With advanced features**: ~20-30 hours total

---

## 💎 Key Insight

Your questions revealed the THREE pillars of node workflows:

1. **Aspect Ratio Flow** - How data flows between nodes
2. **Variable System** - How to parameterize workflows
3. **Recipe Compilation** - How to bridge power users and beginners

**Getting these right = killer node workflow system.**
