# Node Workflow - User Guide

## Overview

Node Workflow is a visual workflow editor that lets you create complex image generation pipelines by connecting nodes together. Think of it as a flowchart where each node performs a specific task, and you control how data flows between them.

## Getting Started

### Opening Node Workflow

1. Click **Node Workflow** in the sidebar under **CREATION TOOLS**
2. You'll see an empty canvas with a node palette on the left

### Creating Your First Workflow

1. **Add Nodes**: Drag nodes from the left palette onto the canvas, or click a node to add it randomly
2. **Connect Nodes**: Click and drag from a node's output handle (right side) to another node's input handle (left side)
3. **Configure Nodes**: Select a node to edit its properties
4. **Execute**: Click the **Execute Workflow** button to run your pipeline

## Node Types

### 1. Input Node 🔵
**Purpose**: Provides an image as input to the workflow

**Outputs**: Image URL

**Use Cases**:
- Upload a reference image
- Use an existing image from your gallery
- Provide character reference photos

### 2. Prompt Node 📝
**Purpose**: Creates text prompts for image generation

**Outputs**: Text string (prompt)

**Features**:
- Plain text prompts (just type what you want!)
- Optional `{{variable}}` syntax for advanced users
- Variable substitution (e.g., `{{character_name}}` → "Marcus")

**Examples**:
```
A beautiful sunset over the ocean
```

```
{{character}} standing in a {{location}}, {{style}} style
```

### 3. Generation Node ✨
**Purpose**: Generates images using AI models

**Inputs**:
- Prompt (text) - **Required**
- Reference Image (optional)

**Outputs**: Generated image URL

**Models Available**:
- **Nano Banana** - Fast, 8 tokens
- **Nano Banana Pro** - High quality, 20 tokens (recommended)
- **Z-Image Turbo** - Alternative model

**Settings**:
- Aspect Ratio (16:9, 1:1, 9:16, etc.)
- Output Format (PNG, JPG, WEBP)
- Negative Prompt (what to avoid)

### 4. Tool Node 🛠️
**Purpose**: Applies image processing tools

**Inputs**: Image

**Outputs**: Processed image

**Available Tools**:
- **Remove Background** - Removes image background
- **Cinematic Grid** - Creates 2x2 cinematic grid layout
- **Grid Split** - Splits image into panels
- **Before/After Grid** - Creates comparison layout

### 5. Output Node 📤
**Purpose**: Marks the final result of your workflow

**Inputs**: Image

**Features**:
- Displays preview of generated image
- Option to save to gallery
- Shows workflow completion status

## Example Workflows

### Simple Generation

```
Input → Prompt → Generation → Output
```

1. Drag **Input** node (upload reference image)
2. Drag **Prompt** node (write description)
3. Drag **Generation** node (choose nano-banana-pro)
4. Drag **Output** node
5. Connect: Input → Generation, Prompt → Generation, Generation → Output
6. Click **Execute Workflow**

### Character with Style Reference

```
Input (character) → Generation → Tool → Output
         ↑
    Prompt (text)
```

1. **Input** node with character photo
2. **Prompt** node: "Professional headshot, studio lighting"
3. **Generation** node receives both inputs
4. **Tool** node (remove background)
5. **Output** node shows final result

### Multi-Stage Processing

```
Input → Prompt → Generation → Tool (Grid) → Tool (Remove BG) → Output
```

Each tool processes the output from the previous node sequentially.

## Tips & Best Practices

### Prompt Writing
- **Keep it simple**: Plain text works great! No special syntax required.
- **Be specific**: "A sunset over a calm ocean" is better than "sunset"
- **Optional variables**: Use `{{variable}}` only if you need reusable templates

### Workflow Organization
- **Start simple**: Test with 3-4 nodes first
- **Linear flow**: Start with Input → Prompt → Generation → Output
- **Add complexity gradually**: Add tools and multiple stages as needed

### Performance
- **Nano Banana Pro** recommended for best quality
- **Avoid cycles**: Workflows cannot have loops (nodes connecting back to themselves)
- **Test incrementally**: Execute after adding each major section

## Keyboard Shortcuts

- **Delete Node**: Select node, press `Delete` or `Backspace`
- **Select All**: `Ctrl+A` / `Cmd+A`
- **Zoom**: Mouse wheel
- **Pan**: Click and drag canvas background

## Workflow Management

### Saving Workflows
1. Click **Save** button in the toolbar
2. Give your workflow a name
3. Workflow saved as JSON

### Loading Workflows
1. Click **Load** button
2. Select a previously saved workflow
3. Workflow loads onto canvas

### Clearing Canvas
1. Click **Clear** button
2. Confirms before deleting all nodes

## Troubleshooting

### "Workflow cannot have cycles"
- You've created a loop where nodes connect back to themselves
- Check your connections and remove any circular paths

### "Generation node requires a prompt input"
- Generation nodes MUST have a prompt
- Connect a Prompt node to the Generation node

### Nodes won't connect
- Check handle compatibility (colors match)
- Source handle (right side) connects to target handle (left side)
- Some nodes have multiple input handles (e.g., Generation has separate handles for prompt and image)

### Execution fails
- Verify all required inputs are connected
- Check that your workflow is complete (has an Output node)
- Ensure you have enough credits for generation

## Advanced Features (Coming Soon)

### Phase 2: Recipe Compilation
- Save workflows as reusable recipes
- Convert linear workflows to recipe templates
- Share workflows with the community

### Phase 3: Recipe Loading
- Load existing recipes as node workflows
- Edit recipes visually
- Convert recipes back to workflows

### Phase 4: Batch Processing
- Run same workflow on multiple images
- Variable substitution for batch jobs
- Export results to gallery

## FAQ

**Q: Do I need to use special syntax like `<<FIELD:type>>`?**
A: No! Plain text prompts work perfectly. The `{{variable}}` syntax is optional and only needed for advanced reusable templates.

**Q: Can I create loops in my workflow?**
A: No, workflows must be directed acyclic graphs (DAGs). This ensures predictable execution order.

**Q: How do I delete a node?**
A: Select the node and press `Delete` or `Backspace`.

**Q: Can I save my workflows?**
A: Yes! Use the **Save** button to export as JSON. You can load it later with **Load**.

**Q: What's the difference between the models?**
A: **Nano Banana Pro** (20 tokens) offers the best quality. **Nano Banana** (8 tokens) is faster and cheaper. **Z-Image Turbo** is an alternative model.

**Q: How do I connect nodes?**
A: Click and drag from the **output handle** (right side, small circle) of one node to the **input handle** (left side) of another node.

## Getting Help

- Hover over the **?** icon in the section header for quick tips
- Check the **Help & Manual** section for comprehensive guides
- Visit the **Community** tab to see example workflows from other users

---

**Happy workflow building!** 🎨✨
