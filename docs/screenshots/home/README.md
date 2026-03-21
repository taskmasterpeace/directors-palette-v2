# Home — Shot Creator

**Route:** `/` (default tab)
**Auth Required:** Yes

The main workspace and default view after login. Shot Creator is the core image generation tool. Features:

- **Model Selector:** Choose between AI models (Flux 2, nano-banana-2, etc.) with a red/green badge showing active model
- **Reference Image Slots:** Upload up to 14 reference images for character/style consistency. Supports drag-and-drop and paste-from-clipboard
- **Prompt Editor:** Text area for describing the shot. Supports `@tag` autocomplete to reference uploaded images
- **Recipes:** Pre-built multi-stage generation pipelines (character sheets, style guides, cinematic grids) with yellow/amber UI theme
- **LoRA Section:** Toggle style LoRAs (Claymation, Inflate, Disney Golden Age, etc.) for Flux models
- **Settings Bar:** Aspect ratio, batch count (x5), enhancement toggle, prompt tips
- **Generate Button:** Shows pts cost per generation
- **Right Panel (Gallery):** Inline image gallery showing recent generations with search and filter (Shot Creator, Storybook, Storyboard, Artist DNA)
- **Sidebar:** Full navigation to all features, collapsible sections, user profile, and pts balance
