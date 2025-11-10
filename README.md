# Director's Palette v2

> AI-powered image generation platform with advanced prompt engineering and visual storytelling capabilities

## 🎨 Overview

Director's Palette v2 is a sophisticated Next.js application that enables creators to generate high-quality images using multiple AI models (Replicate API). Built specifically for visual storytelling, it provides powerful prompt engineering tools, character consistency features, and a unified gallery for managing generated content.

## 📸 Screenshots

### Shot Creator Interface
![Shot Creator with Reference Images and Gallery](./screenshots/shot-creator-interface.png)
*Main interface showing reference image upload, unified gallery, and generated images*

### AI Model Selection
![Multi-Model Support](./screenshots/model-selection-dropdown.png)
*Choose from 6 AI models: Nano Banana, Seedream-4, Gen4 Image, Gen4 Turbo, Qwen Edit, and Qwen Image*

### Image Editing
![Fullscreen Image Editing](./screenshots/image-editing-fullscreen.png)
*Fullscreen editing mode with annotation tools and adjustments*

### Video Generation
![Video Generation Results](./screenshots/video-generation-results.png)
*Generate videos from images with prompt variations*

![Video Generation in Progress](./screenshots/video-generation-progress.png)
*Real-time generation status with processing indicators*

## ✨ Key Features

### 🎯 Shot Creator
- **Multi-Model Support**: Generate images with Nano Banana, Seedream-4, Gen4 Image, Qwen Image, and Qwen Image Edit
- **Advanced Prompt System**:
  - `@references` - Tag and reuse prompt categories
  - `[variations]` - Generate multiple versions from bracket options
  - `pipe | chaining` - Create sequential image progressions
  - `_wildcards_` - Dynamic content placeholders
- **Reference Images**: Upload and tag images for character/style consistency
- **Real-time Settings**: Adjust aspect ratio, resolution, guidance, and model-specific parameters

### 🖼️ Unified Gallery
- **Smart Organization**: View all generated images with search and filtering
- **Metadata Tracking**: Credits used, generation settings, and prompt history
- **Mobile Optimized**: Responsive design with fullscreen image viewing
- **Batch Operations**: Select multiple images for deletion or management

### 📱 Mobile-First Design
- Clean, simplified interface on mobile devices
- Fullscreen image modal with swipe navigation
- Download directly to photo library
- Touch-optimized controls

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm/yarn/pnpm
- Replicate API key
- Supabase account (for authentication & storage)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/directors-palette-v2.git

# Navigate to project directory
cd directors-palette-v2

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys:
# REPLICATE_API_TOKEN=your_replicate_token
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🛠️ Tech Stack

- **Framework**: Next.js 15.5.4 with App Router & Turbopack
- **React**: 19.1.0
- **TypeScript**: Strict mode
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **State Management**: Zustand
- **Backend**: Supabase (Auth, Database, Storage)
- **AI Provider**: Replicate API
- **Image Generation**: Multiple models via Replicate

## 📖 Prompt System Guide

Director's Palette includes a powerful prompt engineering system designed for visual storytelling:

### Character Consistency
Create character templates and reference images to maintain consistency across hundreds of generated images - perfect for comic books, storyboards, and visual novels.

### Story-to-Visual Workflow
Generate one image per sentence of your story using:
- Character sheet templates (copy-paste into every prompt)
- Location reference images with consistent descriptions
- Bracket variations for different angles/emotions
- Pipe chaining for action sequences

See [DIRECTORS_PALETTE_PROMPT_GUIDE.md](./DIRECTORS_PALETTE_PROMPT_GUIDE.md) for comprehensive documentation.

## 📁 Project Structure

```
src/
├── app/                           # Next.js App Router pages
├── components/
│   └── ui/                       # shadcn/ui components
├── features/
│   └── shot-creator/
│       ├── components/           # Shot creator UI components
│       │   ├── creator-prompt-settings/  # Prompt input & settings
│       │   ├── reference-images/         # Image upload & tagging
│       │   └── unified-gallery/          # Gallery & image management
│       ├── hooks/                # Custom React hooks
│       ├── services/             # API & business logic
│       ├── store/                # Zustand state management
│       └── types/                # TypeScript definitions
└── lib/                          # Shared utilities
```

## 🔧 Available Scripts

```bash
npm run dev          # Start development server (Turbopack)
npm run build        # Build for production (Turbopack)
npm start            # Start production server
npm run lint         # Run ESLint
```

## 🎨 Features in Detail

### Shot Creator
- **Model Selection**: Choose from 5+ AI models optimized for different use cases
- **Prompt Engineering**: Advanced syntax for variations, chaining, and wildcards
- **Reference Management**: Upload, tag, and reuse reference images
- **Settings Control**: Fine-tune generation parameters per model
- **Cost Management**: Track credit usage and optimize model selection

### Gallery Management
- **Search & Filter**: Find images by prompt, model, or tags
- **Batch Actions**: Select and delete multiple images
- **Mobile Support**: Fullscreen viewing with gesture controls
- **Metadata Display**: View all generation settings and prompts

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - Machine King Labs

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- AI image generation powered by [Replicate](https://replicate.com/)
- Icons from [Lucide](https://lucide.dev/)

---

**Machine King Labs** - "With AI anything is possible"
