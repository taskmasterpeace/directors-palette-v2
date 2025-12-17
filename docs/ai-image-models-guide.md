# AI Image Generation Models Guide

Comprehensive documentation for the image generation models used in Director's Palette.

---

## Table of Contents

1. [Google Imagen 3 (Nano Banana)](#google-imagen-3-nano-banana)
2. [Google Imagen 3 Fast (Nano Banana Pro)](#google-imagen-3-fast-nano-banana-pro)
3. [Flux Schnell / Z-Image Turbo](#flux-schnell--z-image-turbo)
4. [Qwen2-VL / Qwen Image Fast](#qwen2-vl--qwen-image-fast)
5. [Model Comparison Matrix](#model-comparison-matrix)

---

## Google Imagen 3 (Nano Banana)

**Endpoint:** `google/imagen-3`

### Overview

Google's highest quality image generation model to date, featuring exceptional prompt comprehension and the ability to render detailed, photorealistic images with precise adherence to complex descriptions.

### Official Documentation

- [Vertex AI Prompt Guide](https://cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide)
- [Gemini API Imagen Guide](https://ai.google.dev/gemini-api/docs/imagen)
- [Developer's Guide](https://cloud.google.com/blog/products/ai-machine-learning/a-developers-guide-to-imagen-3-on-vertex-ai)
- [Imagen Prompt Guide](https://ai.google.dev/gemini-api/docs/imagen-prompt-guide)

### Best Practices for Prompting

#### Core Principle: Describe the Scene, Don't List Keywords

Imagen 3's strength lies in deep language understanding. **Use narrative, descriptive paragraphs** rather than disconnected keywords.

#### Key Prompting Tips

1. **Use Descriptive Language**
   - Employ detailed adjectives and adverbs to paint a clear picture
   - Provide context and background information to aid understanding
   - Be specific about arrangements, positioning, and spatial relationships

2. **Specify Style Clearly**
   - General styles: painting, photograph, sketch
   - Specific styles: pastel painting, charcoal drawing, isometric 3D
   - Combine styles for unique effects

3. **Photography Terms for Realism**
   - Mention camera angles (eye-level, bird's eye, worm's eye)
   - Specify lens types (wide-angle, telephoto, macro)
   - Define lighting (soft, harsh, directional, focus)
   - Include fine details and texture descriptions

4. **Iterative Refinement**
   - Start with core idea
   - Add details progressively until vision is achieved
   - Iteration is key to perfect results

5. **Quality Modifiers**
   - Use keywords: high-quality, beautiful, stylized
   - These signal the model to prioritize asset quality

#### Text Rendering in Images

- **Keep it short:** Limit to 25 characters or less
- **Multiple phrases:** Use 2-3 distinct phrases for context
- **Don't exceed:** More than 3 phrases reduces composition quality

#### Prompt Structure

Consider these elements when crafting prompts:

- **Arrangement:** Specify where subjects are positioned
- **Lighting:** Control atmosphere with soft/harsh lighting, direction, and focus
- **Composition:** Describe the overall scene layout
- **Details:** Include fine details for precision

### Special Parameters

#### Aspect Ratio
- Supported values: `1:1`, `3:4`, `4:3`, `9:16`, `16:9`
- Default: `1:1` (1024x1024)
- Parameter: `aspectRatio`

#### Safety Filter Level
- `block_most` - Most restrictive
- `block_some` - Moderate filtering (recommended)
- `block_few` / `block_only_high` - Least restrictive (may increase objectionable content)
- Parameter: `safety_filter_level`

#### Person Generation
- `dont_allow` - Block generation of people
- `allow_adult` - Generate adults only (default)
- `allow_all` - Generate adults and children (not allowed in EU, UK, CH, MENA)
- Parameter: `personGeneration`

#### Other Parameters
- `enhancePrompt` (default: true) - LLM-based prompt rewriting for higher quality
- `addWatermark` (default: true) - Embeds digital SynthID watermark
- `seed` - Non-negative integer for deterministic output (requires `addWatermark: false`)

### Strengths

- Exceptional prompt comprehension and adherence
- Superior photorealistic quality
- Excellent detail rendering (lighting, shadows, backgrounds)
- Strong at handling elaborate, detailed prompts
- Natural language understanding
- Professional-grade output suitable for marketing

### Weaknesses

- Slower generation speed compared to Fast variant
- Requires detailed prompts for best results
- May struggle with very abstract concepts
- Higher computational cost

### Recommended Use Cases

- Final production images
- Marketing campaigns and external communications
- Professional photography-style renders
- High-quality assets requiring fine detail
- Projects where quality > speed
- Images with complex lighting and composition
- Architectural visualizations
- Product photography

---

## Google Imagen 3 Fast (Nano Banana Pro)

**Endpoint:** `google/imagen-3-fast`

### Overview

Speed-optimized variant of Imagen 3, offering **40% reduction in latency** compared to Imagen 2 while maintaining good quality. Generates brighter, higher-contrast images.

### Official Documentation

- [Imagen 3 Fast Model Documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-fast-generate-001)
- [Replicate API](https://replicate.com/google/imagen-3-fast)

### Best Practices for Prompting

**Same prompting guidelines as Imagen 3** - the model uses the same architecture, just optimized for speed.

- Elaborate prompts yield better quality
- Specify arrangement, lighting, and details
- Use quality modifiers (high-quality, beautiful, stylized)
- Iterate and refine prompts
- Keep text to 25 characters or less

### Special Parameters

**Same parameters as Imagen 3:**

- Aspect ratio configuration
- Safety filter levels
- Person generation settings
- Prompt enhancement
- Watermarking (SynthID)
- IMAGE_COUNT: 1-4 images per request

### Strengths

- 40% faster than Imagen 2
- Good quality output
- Brighter, higher-contrast images
- Same prompt comprehension as Imagen 3
- Cost-effective for iterations
- Fast turnaround for ideation

### Weaknesses

- Lower quality than standard Imagen 3
- May produce unusual results (blurry faces, artifacts)
- Less detailed than base model
- Not recommended for production/external use

### Recommended Use Cases

- Prompt refinement and testing
- Rapid prototyping
- Ideation and creative exploration
- Internal drafts and reviews
- Multiple concept variations
- Quick iteration cycles
- Budget-conscious projects where speed matters

### Quality vs Speed Tradeoff

**Use Imagen 3 Fast for:** Fine-tuning prompts, testing ideas, internal use
**Use Imagen 3 for:** Final results, marketing materials, external communications

---

## Flux Schnell / Z-Image Turbo

**Endpoint:** `prunaai/z-image-turbo`

### Overview

Z-Image-Turbo is a 6 billion parameter text-to-image model that generates photorealistic images in **sub-second time**. It's an optimized version of Tongyi-MAI's Z-Image-Turbo, accelerated with PrunaAI's compression engine.

**Based on:** Flux Schnell architecture (12B parameter rectified flow transformer)
**Speed:** Runs in ~4 seconds on H100, only needs 8 steps
**License:** Apache 2.0 (open weights)

### Official Documentation

- [Replicate API](https://replicate.com/prunaai/z-image-turbo)
- [Z-Image-Turbo Official Site](https://z-image-turbo.org/)
- [Flux Schnell Hugging Face](https://huggingface.co/black-forest-labs/FLUX.1-schnell)
- [Comprehensive Flux Prompting Guide](https://skywork.ai/blog/flux-prompting-ultimate-guide-flux1-dev-schnell/)
- [FLUX.1 Prompt Guide](https://getimg.ai/blog/flux-1-prompt-guide-pro-tips-and-common-mistakes-to-avoid)

### Best Practices for Prompting

#### Core Principles

1. **Use Natural Language**
   - Write clear, descriptive sentences
   - Avoid keyword-heavy language
   - Natural language > comma-separated tags

2. **Be Specific and Literal**
   - Replace vague terms ("beautiful," "nice") with concrete details
   - Provide specific attributes (age, appearance, materials, conditions)
   - Keep prompts concise and literal

3. **Provide Details**
   - FLUX thrives on detailed information
   - Instead of "a woman" → "a 25-year-old Asian woman in a red coat"
   - Use 80-250 words of clear, structured description

4. **Prompt Structure**
   - Start with main subject
   - Add detailed attributes
   - Describe action or state
   - Include artistic/technical specifications
   - Define lighting and atmosphere

5. **No Prompt Weights**
   - FLUX doesn't support weight syntax like `(keyword:1.5)`
   - Use phrases: "with emphasis on" or "with a focus on"

6. **Iterative Testing**
   - Keep prompts concise
   - Iterate in small, controlled changes
   - Use seeds to stabilize composition while testing modifiers

#### Text Rendering

Z-Image-Turbo excels at rendering text in **both English and Chinese**:

- Use short, clear phrases in quotes
- Specify font style and color if important
- Works exceptionally well for bilingual content
- Example: `"a coffee shop storefront with a sign that says Morning Brew in elegant gold lettering"`

**Note:** Complex text on objects (like curved text on a hoodie) may degrade quality

#### Recommended Parameters

**For Flux Schnell:**
- Steps: 3-4
- Guidance: 3.0
- Resolution: 768×1024 starting point

**For Z-Image-Turbo:**
- Steps: 8
- Guidance: 0.0 (for turbo models)
- No negative prompts supported

### Optimization Techniques

PrunaAI's optimization includes:
- **Decoupled-DMD:** Distribution Matching Distillation
- **Smart caching:** Reusing computations from previous steps
- **Model compilation:** Hardware-optimized execution
- **Quantization:** Lower precision where it doesn't affect quality

### Strengths

- **Exceptional speed:** Sub-second generation
- Fast iterations perfect for brainstorming
- Excellent photorealistic images
- Strong text rendering (English & Chinese)
- Natural lighting and realistic portraits
- Cost-effective for high-volume generation
- Open source (Apache 2.0)
- Good at natural language prompts

### Weaknesses

- Less intricate details than slower models
- Struggles with complex/abstract requests
- May miss nuanced details
- Fingers and human anatomy less accurate than Dev variant
- Poor in-painting capabilities
- More 3D/animated quality vs photorealistic
- Degrades at higher resolutions
- Not as good for fine detail work

### Recommended Use Cases

- **Ideal for:**
  - Rapid prototyping and brainstorming
  - Thumbnails and concept sketches
  - Quick iterations and testing
  - Projects with limited hardware
  - Commercial use (Apache license)
  - Bilingual text rendering (EN/ZH)
  - Getting started with Flux models
  - Cost-effective high-volume generation

- **Avoid for:**
  - Fine detail work requiring precision
  - Complex in-painting tasks
  - High-resolution final outputs
  - Complex abstract concepts
  - Critical human anatomy rendering

---

## Qwen2-VL / Qwen Image Fast

**Endpoint:** `prunaai/qwen-image-fast`

### Overview

Qwen-Image is a powerful open-source image generation model with exceptional **text rendering capabilities**, especially for non-Latin scripts. Developed by Alibaba's Tongyi-MAI division, optimized by PrunaAI.

**Size:** 20 billion parameters
**Speed:** Generates 1.5MP images in ~2 seconds on H100
**License:** Apache (open source)

### Official Documentation

- [Replicate API](https://replicate.com/prunaai/qwen-image-fast)
- [Pruna AI Qwen-Image Guide](https://pruna.support.site/article/qwen-image)
- [GitHub Repository](https://github.com/QwenLM/Qwen-Image)
- [Qwen-Image Prompt Guide](https://blog.segmind.com/qwen-image-prompt-parameter-guide/)

### Best Practices for Prompting

#### Core Principles

1. **Keep It Simple and Clear**
   - State subject, style, and mood in plain language
   - Use 1-3 sentences
   - Describe main subject first, then environment, then details

2. **Be Specific, Avoid Vagueness**
   - Replace vague terms with concrete descriptions
   - Qwen excels at precision and prompt accuracy
   - Minimal "hallucinations" or prompt deviation

3. **Structured Approach**
   - Subject identity and attributes
   - Action or state
   - Environment and context
   - Artistic/technical specifications
   - Lighting and atmosphere

4. **For Text in Images**
   - Use short, clear phrases in quotes
   - Specify font style and color if important
   - Works exceptionally well for Chinese characters
   - Maintains typographic details and layout coherence

5. **Enhancement Tool**
   - For stability, use Qwen's official Prompt Enhancement Tool (powered by Qwen-VL-Max)
   - Helps ensure consistent results

#### Key Parameters

**Guidance / CFG Scale:**
- Range: 4-5 (ideal)
- Lower values = more creativity
- Higher values = strict prompt adherence

**Seed:**
- Same seed + same prompt = identical output
- Essential for iterative parameter testing

### Advanced Capabilities

#### Text Rendering
- **Exceptional multilingual text:** Best-in-class for Chinese characters
- Alphabetic languages (English) and logographic scripts (Chinese)
- Preserves typographic details and layout coherence
- Contextual harmony with image content

#### Image Editing Features
- Style transfer
- Object insertion or removal
- Detail enhancement
- Text editing within images
- Human pose manipulation

**Note:** Image editing features may vary by deployment

### Strengths

- **World-class text rendering** (especially Chinese)
- Exceptional prompt comprehension
- Accurate reproduction of user intent
- Minimal prompt deviation/hallucinations
- Fast LoRA integration and training
- Powerful editing capabilities
- Open source with Apache license
- Outperforms FLUX.1 on text benchmarks
- #3 overall on AI Arena leaderboard (#1 open-source)
- Versatile for multiple use cases

### Weaknesses

- **Lacks creative flair** - better at precision than artistry
- Struggles with unpredictable domains (art, anime, fantasy)
- Inconsistent stylistic output with same prompting
- Photorealistic images can have "smooth plastic AI skin" look
- Text rendering degrades on complex objects (curved surfaces)
- Large model size (40GB BF16, 20GB FP8)
- Not ideal for artistic/creative abstraction

### Recommended Use Cases

- **Ideal for:**
  - Bilingual marketing materials (EN/ZH)
  - Presentation design with text
  - Educational materials with diagrams
  - Retail/E-commerce product labels
  - Storefront scenes with readable signage
  - Brand logos and posters
  - Style transfer applications
  - Architectural visualizations
  - Virtual avatar creation
  - Controlled experiments requiring precision
  - Layout-aware designs

- **Avoid for:**
  - Abstract art and fantasy illustrations
  - Anime/manga style generation
  - Projects requiring artistic creativity
  - Unpredictable, experimental aesthetics

---

## Model Comparison Matrix

| Feature | Imagen 3 | Imagen 3 Fast | Z-Image Turbo | Qwen Image Fast |
|---------|----------|---------------|---------------|-----------------|
| **Endpoint** | google/imagen-3 | google/imagen-3-fast | prunaai/z-image-turbo | prunaai/qwen-image-fast |
| **Marketing Name** | Nano Banana | Nano Banana Pro | - | - |
| **Parameters** | - | - | 6B (based on 12B Flux) | 20B |
| **License** | Proprietary | Proprietary | Apache 2.0 | Apache 2.0 |
| **Speed** | ~10s (4 images) | ~4s (4 images) | ~4s | ~2s |
| **Quality** | Highest | Good | Good | Good-Excellent |
| **Best For** | Production/Marketing | Prototyping/Ideation | Speed/Volume | Text Rendering/Precision |
| **Text Rendering** | Good (≤25 chars) | Good (≤25 chars) | Excellent (EN/ZH) | Best-in-class (EN/ZH) |
| **Prompt Style** | Natural language, detailed | Natural language, detailed | Natural language | Simple & clear |
| **Photorealism** | Excellent | Good | Good | Good (some plasticity) |
| **Detail Level** | Highest | Good | Moderate | Good |
| **Cost Effectiveness** | Low (high quality) | Medium | High | High |
| **Open Source** | No | No | Yes | Yes |
| **Special Features** | SynthID watermark, safety filters | Same as Imagen 3 | Bilingual text | Multilingual text, editing |
| **Weaknesses** | Slow, expensive | Lower quality, artifacts | Less detail, struggles with complexity | Lacks creative flair |

### Decision Guide

**Choose Imagen 3 when:**
- Quality is paramount
- Production/marketing materials
- Professional photography needed
- Budget allows for premium quality

**Choose Imagen 3 Fast when:**
- Testing prompts quickly
- Internal ideation/drafts
- Speed > quality
- Budget-conscious prototyping

**Choose Z-Image Turbo when:**
- Need maximum speed
- High-volume generation
- Bilingual text (EN/ZH) required
- Open source license needed
- Cost is primary concern

**Choose Qwen Image Fast when:**
- Text rendering is critical
- Multilingual content (especially Chinese)
- Precision and accuracy over creativity
- Image editing capabilities needed
- Marketing materials with text

---

## General Prompting Tips (All Models)

### Universal Best Practices

1. **Start broad, add detail incrementally**
2. **Use natural, descriptive language**
3. **Be specific about technical aspects** (lighting, camera, composition)
4. **Iterate and refine** based on results
5. **Use seeds for consistency** when testing variations
6. **Describe the scene, not just objects**
7. **Include quality modifiers** (high-quality, detailed, professional)

### Common Mistakes to Avoid

1. ❌ Vague descriptions ("beautiful", "nice")
2. ❌ Keyword stuffing without context
3. ❌ Contradictory instructions
4. ❌ Overloading prompts (focus on 3-5 key concepts)
5. ❌ Expecting perfect results on first try (iterate!)
6. ❌ Using model-specific syntax on incompatible models

### Prompt Template Structure

```
[SUBJECT] + [ATTRIBUTES] + [ACTION/STATE] + [ENVIRONMENT] +
[STYLE] + [TECHNICAL SPECS] + [LIGHTING] + [QUALITY MODIFIERS]
```

**Example:**
```
A 30-year-old female astronaut in a white NASA spacesuit,
floating in the International Space Station, looking through
a window at Earth, soft natural lighting from the planet,
documentary photography style, shot with a wide-angle lens,
high detail, photorealistic, professional quality
```

---

## Additional Resources

### Google Imagen 3
- [Imagen Prompt Bible (GitHub)](https://github.com/yanis112/Prompting-Guide-For-Google-Imagen3)
- [Imagen 3 Guide with Examples (DataCamp)](https://www.datacamp.com/tutorial/imagen-3)

### Flux Schnell
- [14 Essential Flux Prompts](https://skywork.ai/blog/flux1-prompts-tested-templates-tips-2025/)
- [Flux Model Comparison](https://www.mimicpc.com/learn/an-in-depth-comparison-of-all-flux-models)

### Z-Image Turbo
- [Ultimate Z-Image Prompting Guide](https://www.atlabs.ai/blog/ultimate-z-image-prompting-guide)
- [Z-Image Turbo Prompt Guide (fal.ai)](https://fal.ai/learn/devs/z-image-turbo-prompt-guide)

### Qwen Image
- [Exploring Qwen-Image Strengths & Weaknesses](https://medium.com/@koin7302/exploring-qwen-image-strengths-weaknesses-and-lora-limitations-332dac6a3500)
- [Qwen-Image vs Competition](https://qwen-image.ai/blog/Qwen-Image-vs-Competition)

---

## Code Integration

For programmatic access in Director's Palette:

```typescript
// Image generation service
import { ImageGenerationService } from '@/features/shot-creator/services/image-generation.service';

// Model endpoints
const MODELS = {
  IMAGEN_3: 'google/imagen-3',           // Nano Banana
  IMAGEN_3_FAST: 'google/imagen-3-fast', // Nano Banana Pro
  Z_IMAGE_TURBO: 'prunaai/z-image-turbo',
  QWEN_IMAGE_FAST: 'prunaai/qwen-image-fast'
};
```

**Related Files:**
- Types: `src/features/shot-creator/types/image-generation.types.ts`
- Service: `src/features/shot-creator/services/image-generation.service.ts`
- Hook: `src/features/shot-creator/hooks/useImageGeneration.ts`

---

*Last Updated: 2025-12-16*
