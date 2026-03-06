# Ad Production Pipeline — Research & Testing Plan

## Goal

Figure out the best method to produce brand-consistent 30-60 second video ads from AI. This is a research phase — we need to test different approaches before committing to a pipeline.

## The Product

A short-form video ad (15-60s) that looks and sounds professional:
- Multiple shots (not one continuous take)
- Voiceover narration (not on-camera dialogue)
- Ambient background sound (street noise, office hum, nature — not specific SFX)
- Brand-consistent visuals (colors, style, tone)
- Cuts between scenes like a real commercial

## What We Have to Work With

### Image Models
| Model | Speed | Cost | Key Feature |
|-------|-------|------|-------------|
| nano-banana-2 | ~15s | 10 pts | Reference images, anchor transform, high quality |
| z-image-turbo | ~8s | 5 pts | Ultra-fast, text-only (no refs), great for rapid iteration |

### Video/Animation Models
| Model | Max Duration | Key Feature | Notes |
|-------|-------------|-------------|-------|
| Seedance 1.5 Pro | 12s | Start frame, end frame, generates audio | Doesn't REQUIRE start+end frames — can prompt-only too |
| Kling Avatar V2 | varies | Still + audio → lip-sync talking video | For when you need a person speaking |
| Kling 2.5 Turbo Pro | 10s | Best motion quality | Premium option for hero shots |

### Audio
| Model | What It Does | Duration |
|-------|-------------|----------|
| ElevenLabs TTS | Voiceover narration | Any length |
| ElevenLabs Sound Gen | Ambient/background sound | Up to 22s per clip |

### Existing Infrastructure
- Pipe chaining (output of step N → input of step N+1)
- Anchor transform (one anchor + multiple inputs → batch)
- Brand Boost (auto-inject brand colors/style/voice into prompts)
- Gallery storage with metadata tracking

---

## Pipeline Approaches to Test

### Approach A: "Stills + VO + Animate"
1. Generate still images for each shot (nano-banana-2)
2. Generate voiceover for the full script (ElevenLabs TTS)
3. Generate ambient background audio (ElevenLabs Sound Gen, one continuous bed)
4. Animate each still with Seedance 1.5 Pro (just start frame, let the model add motion)
5. Assemble: animated clips + voiceover + ambient → final video

**Test questions:**
- Does Seedance 1.5 Pro produce good motion from a single still with no end frame?
- Does its built-in audio generation conflict with our voiceover layer?
- How natural do the transitions between shots look?

### Approach B: "Stills + End Frames + Animate"
1. Generate hero still for each shot (nano-banana-2)
2. Generate end frame for each shot (nano-banana-2 — "show me this scene 5 seconds later")
3. Generate voiceover (ElevenLabs TTS)
4. Generate ambient audio (ElevenLabs Sound Gen)
5. Animate each shot: Seedance 1.5 Pro with start + end frame
6. Assemble

**Test questions:**
- Does the end frame technique produce better animation than single-frame?
- How good is nano-banana-2 at generating a "5 seconds later" version of the same scene?
- Is the extra image generation cost worth it?

### Approach C: "Prompt-Only Video + VO"
1. Write detailed shot descriptions from the script
2. Generate each shot directly with Seedance 1.5 Pro (text-to-video, no image input)
3. Generate voiceover (ElevenLabs TTS)
4. Generate ambient audio (ElevenLabs Sound Gen)
5. Assemble

**Test questions:**
- Is pure text-to-video good enough for brand consistency?
- Does Brand Boost prompting keep the visual style coherent across shots?
- Faster/cheaper since we skip image generation entirely

### Approach D: "Hybrid — Stills for Key Shots, Prompt for B-Roll"
1. Generate stills only for hero/key shots (nano-banana-2)
2. Use those as start frames for Seedance 1.5 Pro
3. Use prompt-only for transition/B-roll shots
4. Voiceover + ambient audio
5. Assemble

**Test questions:**
- Does mixing image-driven and prompt-driven shots look jarring?
- Can we use z-image-turbo for rapid B-roll stills (cheaper/faster)?

---

## Lip-Sync Consideration

For ads that need a spokesperson/talking head:
- Generate the person as a still (nano-banana-2)
- Generate their dialogue segment (ElevenLabs TTS)
- Feed both to Kling Avatar V2 → talking head clip
- Mix with regular animated shots

This is a **variant**, not the primary pipeline. Most ads are voiceover + visuals.

---

## Ambient Sound Strategy

Not specific SFX per shot. One continuous ambient bed for the whole ad:
- "Busy coffee shop background ambiance, gentle chatter and espresso machine"
- "Modern office ambient sound, subtle keyboard typing and air conditioning"
- "Urban street ambiance, gentle traffic and distant city sounds"

ElevenLabs Sound Gen maxes at 22s per clip. For a 60s ad, we'd generate 3 clips and crossfade. Or generate one 22s clip and loop it.

---

## Testing Plan

### Phase 1: Image Quality (test nano-banana-2 vs z-image-turbo)
- Generate 5 shots from the same brand/ad script with each model
- Compare: brand consistency, visual quality, style coherence
- Test "end frame" technique: "Show me this same scene 5 seconds later, the actress has walked to the door"

### Phase 2: Animation Quality (test Seedance 1.5 Pro approaches)
- Same shot, 3 ways:
  a. Start frame only (single still)
  b. Start + end frame (two stills)
  c. Prompt only (no image input)
- Compare: motion quality, brand consistency, natural feel
- Test with and without Seedance's built-in audio generation

### Phase 3: Audio Layering
- Generate voiceover for a 30s ad script
- Generate ambient background audio
- Test manual layering: does it sound natural?
- Test Seedance 1.5 Pro's audio vs our ElevenLabs audio

### Phase 4: Assembly
- Take the best approach from phases 1-3
- Produce a complete 30s test ad
- Evaluate: does it look/sound like a real ad?

---

## Prompt Engineering Needed

### Shot Description Prompt
Given an ad script, generate a shot list where each shot has:
- Visual description (what we see)
- Camera direction (close-up, wide, pan)
- Duration (how long this shot runs)
- Talent action (what the person/product is doing)
- Transition note (cut, dissolve, etc.)

### End Frame Prompt (if Approach B wins)
Given a start frame image and a shot description:
- "Show me the next moment in this scene. [specific action that changed]. Same style, same lighting, same composition. The [subject] has now [action]."

### Brand Boost for Video
Current Brand Boost injects colors and style keywords. For video, we may also need:
- Pacing descriptors (energetic cuts vs smooth transitions)
- Color grading direction ("warm golden tones", "cool corporate blue")
- Shot style preferences from brand visual style

---

## What We're NOT Building Yet

- Script writer (Phase 3 — LLM turns a brief into a screenplay)
- Assemble tool (Phase 3 — stitches clips + audio into final video)
- Campaign builder (Phase 6 — multi-platform ad sets)
- Automated pipeline (this whole thing end-to-end with one click)

We're figuring out the **best approach** first. Then we build the pipeline around whatever wins.

---

## Decision Checkpoints

After each test phase, we decide:
1. **Image model**: nano-banana-2 for everything, or z-image-turbo for B-roll?
2. **Animation approach**: start frame only, start+end, or prompt-only?
3. **Audio strategy**: ElevenLabs for everything, or let Seedance generate some audio?
4. **Lip-sync**: when and how to mix in talking head shots?

These answers determine what the final pipeline looks like and what we need to build.
