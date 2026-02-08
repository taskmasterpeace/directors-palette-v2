# Project Intake Form: Director's Palette v2

## 1. Project Basics

### Project Name
Director's Palette v2

### One-Line Description
AI-powered creative production platform for generating cinematic images, storyboards, children's books, and music video treatments using customizable recipes and AI directors.

### Core Problem Being Solved
Content creators, filmmakers, and storytellers need to rapidly prototype visual content (storyboards, book illustrations, music video concepts) without expensive production resources. Traditional tools require extensive artistic skills or expensive outsourcing. Director's Palette democratizes cinematic visual creation through AI-powered generation with professional-grade aesthetic control.

### Target Users
1. **Independent Filmmakers** - Pre-production storyboarding and shot planning
2. **Content Creators** - Visual content for marketing, social media, brand storytelling
3. **Children's Book Authors** - Illustrated book creation with consistent characters
4. **Music Video Directors** - Treatment generation and concept visualization
5. **Marketing Agencies** - Rapid campaign visual prototyping

### Current Stage
**Active Development** - Core features functional, iterating on UX refinements and new capabilities. Production deployment on Vercel.

---

## 2. Technical Foundation

### Tech Stack
| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15.5.4 with App Router |
| **React** | 19.1.0 (latest) |
| **Build Tool** | Turbopack |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS v4 + PostCSS |
| **State Management** | Zustand |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **Image Generation** | Replicate API (nano-banana, nano-banana-pro, etc.) |
| **Video Generation** | Replicate API (Seedance, Kling, WAN) |
| **LLM Integration** | OpenRouter (Gemini, Claude, GPT) |
| **TTS** | ElevenLabs API |
| **Hosting** | Vercel |

### Repository Structure
```
src/
├── app/                    # Next.js App Router pages & API routes
│   └── api/               # REST API endpoints
├── components/            # Shared UI components
│   └── ui/               # shadcn/ui components
├── features/             # Feature modules (domain-driven)
│   ├── shot-creator/     # Single shot generation with recipes
│   ├── storyboard/       # Story → cinematic shots
│   ├── storybook/        # Children's book creation
│   ├── music-lab/        # Music video treatments
│   ├── context-pack/     # Reference architecture example
│   └── shared/           # Cross-feature services
├── lib/                  # Utility libraries
├── stores/               # Zustand global stores
└── utils/                # Helper functions
```

### Key Architectural Patterns
1. **Feature Modules**: Self-contained domains in `src/features/[name]/`
2. **Service Layer**: Business logic extracted from components
3. **Custom Hooks**: React state management abstraction
4. **Recipe System**: Templated prompts with field syntax `<<FIELD:type>>`
5. **AI Directors**: Style modifiers that enhance prompts (5 director personas)
6. **Character Tagging**: `@character_name` syntax for reference image anchoring

### Database Schema (Key Tables)
- `auth.users` - Supabase authentication
- `user_credits` - Credit balance tracking
- `generation_events` - Image/video generation history
- `admin_users` - Admin access control
- `api_keys` - External API access
- `coupons` - Discount/credit codes
- `community_items` - User-submitted content

---

## 3. Business Model

### Revenue Model
**Credit-based consumption**
- Users purchase or earn credits
- Different generation types cost different credit amounts
- Model tiers: nano-banana (8 pts), nano-banana-pro (20 pts), premium video models (higher)

### Current Pricing Structure
Credits consumed per generation based on model complexity and output type (image vs video).

### Key Metrics to Track
1. **Credits consumed/day** - Revenue proxy
2. **Generation success rate** - Platform reliability
3. **User retention** - Weekly active users
4. **Feature adoption** - Which features drive engagement
5. **Cost per generation** - API cost management

---

## 4. Market & Audience

### Primary Audience Segments
| Segment | Use Case | Pain Point |
|---------|----------|------------|
| Indie Filmmakers | Pre-production storyboards | Can't afford storyboard artists |
| Content Creators | Visual storytelling | Need consistent branded visuals fast |
| Self-Publishing Authors | Children's book illustrations | Illustration costs prohibitive |
| Music Video Directors | Treatment visualization | Quick concept iteration needed |

### Competitive Landscape
- **Midjourney/DALL-E**: General image generation, no production workflow
- **Runway**: Video-focused, expensive, less character consistency
- **Canva AI**: Marketing-focused, limited cinematic capabilities
- **Director's Palette Differentiator**: Recipe system, AI directors, character consistency, integrated production workflow

---

## 5. Team & Resources

### Development Approach
Solo developer with Claude Code AI assistance. Heavy automation via:
- Git workflow hooks (auto-backup, protected files)
- Build verification automation
- Playwright E2E testing
- Custom slash commands for common workflows

### Key Automation Tools
- `/build-check` - TypeScript build verification
- `/test` - Smart test runner
- `/deploy` - Full deployment workflow
- `/commit-all` - Quick commit and push
- `/session-end` - Safety checkpoint

---

## 6. Project Goals & Metrics

### Short-Term Goals (Next 30 Days)
1. Polish Slot Machine syntax feature (inline panel, UX refinements)
2. Improve generation success rate monitoring
3. Expand Quick Presets system for shot creator
4. Add more AI models to generation options

### Medium-Term Goals (3-6 Months)
1. Community gallery for sharing creations
2. Collaborative project editing
3. Export to video editing formats (EDL, XML)
4. Mobile-responsive improvements

### Success Metrics
| Metric | Target |
|--------|--------|
| Build Success Rate | 100% (enforced via pre-commit) |
| Generation Success Rate | >95% |
| User Session Duration | >10 minutes |
| Feature Adoption | 50%+ use multiple features |

---

## 7. Dependencies & Integration

### External APIs
| Service | Purpose | Fallback |
|---------|---------|----------|
| Replicate | Image/video generation | Multiple model options |
| OpenRouter | LLM for prompt enhancement | Direct API keys as backup |
| ElevenLabs | Text-to-speech | Rachel voice default |
| Supabase | Database + Auth | N/A (core dependency) |

### Third-Party Libraries (Critical)
- `react-pageflip` - Book page flip animation
- `zustand` - State management
- `react-hook-form` - Form handling
- `@supabase/supabase-js` - Database client

---

## 8. Blockers & Challenges

### Known Technical Debt
1. **Model settings switch statements** - Need centralized model config
2. **Inconsistent error handling** - Some API routes don't check content-type
3. **Test coverage** - Playwright tests exist but not comprehensive

### Current Challenges
1. **Character consistency** - nano-banana requires careful reference image handling
2. **API cost optimization** - Premium models expensive at scale
3. **Build caching** - Must clean `.next` before commits (Vercel discrepancy)

### Risk Areas
- OpenRouter API availability (single LLM gateway)
- Replicate model deprecation (models change versions)
- ElevenLabs rate limits on TTS

---

## 9. Recent Decisions

### Architectural Decisions (Last 30 Days)
| Decision | Rationale |
|----------|-----------|
| Inline SlotMachinePanel vs Modal | Better UX, consistent with RecipePanel placement |
| Gemini 2.0 Flash for slot expansion | Free tier, fast response, good quality |
| Quick Presets in Zustand store | Persistence across sessions |
| Hook-based file protection | Prevent accidental credential commits |

### Deferred Decisions
- Multi-user collaboration model
- Video export format standardization
- Credit pricing tier structure

---

## 10. Documentation & Resources

### Key Documentation Files
| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI assistant instructions, architecture reference |
| `LESSONS_LEARNED.md` | Incident post-mortems |
| `.claude/rules/git-workflow.md` | Git safety protocols |
| `.claude/COMMANDS_QUICK_REFERENCE.md` | Automation command docs |

### API Documentation
- Replicate API: https://replicate.com/docs
- OpenRouter API: https://openrouter.ai/docs
- Supabase: https://supabase.com/docs
- ElevenLabs: https://elevenlabs.io/docs

### Design Resources
- UI Components: shadcn/ui patterns
- Color Palette: Amber/Gold for slot machine, Green for success states
- Typography: Geist Sans/Mono system fonts

---

## 11. Roadmap & Timeline

### Current Sprint Focus
- Slot Machine syntax refinement
- Quick Presets persistence
- Test coverage expansion

### Upcoming Features (Prioritized)
1. **High**: Community gallery for sharing
2. **High**: Improved character consistency tools
3. **Medium**: Video storyboard export
4. **Medium**: Batch generation queue
5. **Low**: Mobile app consideration

### Technical Improvements Planned
1. Centralized model configuration
2. Comprehensive E2E test suite
3. API response caching layer
4. Performance monitoring dashboard

---

## Quick Reference

### Development Commands
```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint check
rm -rf .next && npm run build  # Clean build (MANDATORY before commit)
```

### Key Ports
- Dev server: `http://localhost:3002`
- Storybook: Accessed via sidebar (not /storybook route)

### Environment Variables (in .env.local)
- `REPLICATE_API_TOKEN`
- `OPENROUTER_API_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `ELEVENLABS_API_KEY`

---

*Last Updated: February 7, 2026*
*Maintained by: Claude Code AI Assistant*
