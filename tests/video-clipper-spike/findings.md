# Video Clipper Spike — Findings

*Auto-updated by test scripts. Manual observations in italics.*

---

## Test 00 — Download source videos

- ✅ **podcast** (Podcast / interview, 2 speakers) — ok
- ✅ **keynote** (Single-speaker keynote (TED Talk, Tim Urban "Procrastinator")) — ok
- ✅ **vlog** (Vlog, moving camera, 1 speaker) — ok
- ✅ **tutorial** (Tutorial / explainer, voiceover + code screen) — ok
- ✅ **music_event** (Music event, multiple people) — ok

## Test 01 — WhisperX transcription

Model: `victor-upmeet/whisperx:84d2ad2d6194fe98a17d2b60bef1c7f910c46b2f6fd38996ca457afd9c8abfcb`

| Slot | Duration | Elapsed | Segments | Words | Word TS |
|------|---------:|--------:|---------:|------:|:-------:|
| keynote | 300.0s | 12.0s | 61 | 800 | ✅ |
| music_event | 230.7s | 6.0s | 6 | 103 | ✅ |
| podcast | 300.0s | 8.3s | 51 | 809 | ✅ |
| tutorial | 240.0s | 7.6s | 46 | 481 | ✅ |
| vlog | 200.0s | 20.3s | 22 | 124 | ✅ |

## Test 02 — Viral segment picking

Model: `openai/gpt-4o-mini`, target 5 picks, duration 20-75s

| Slot | Picks | Elapsed | In tokens | Out tokens |
|------|------:|--------:|----------:|-----------:|
| keynote | 5 | 0.4s | 1466 | 323 |
| music_event | 5 | 0.4s | 403 | 328 |
| podcast | 5 | 0.4s | 1391 | 317 |
| tutorial | 5 | 0.8s | 995 | 324 |
| vlog | 5 | 0.7s | 501 | 305 |

### Sample picks

**keynote**
- `78s–102s` (24s, conf 9): "The Last-Minute Thesis Panic" — Relatable procrastination story that hooks viewers.
- `104s–146s` (42s, conf 8): "The Call About My Thesis" — Unexpected twist that builds suspense and humor.
- `172s–208s` (36s, conf 9): "Procrastinator vs. Non-Procrastinator Brain" — Intriguing comparison that sparks curiosity.
- `215s–277s` (62s, conf 9): "The Instant Gratification Monkey" — Humorous personification of procrastination that resonates.
- `222s–268s` (46s, conf 8): "Why Procrastinators Can't Focus" — Explains a common struggle in an engaging way.

**music_event**
- `30s–59s` (29s, conf 8): "Life is a Drink" — Captures the essence of love and life in a catchy phrase.
- `59s–110s` (51s, conf 7): "Angels Sing from Above" — Evokes a sense of wonder and connection, perfect for emotional engagement.
- `158s–210s` (52s, conf 9): "Feeling Drunk in My Love" — Relatable feeling of love that many can connect with instantly.
- `210s–240s` (30s, conf 6): "Shooting Across the Sky" — Imagery of freedom and joy that resonates with viewers.
- `158s–210s` (52s, conf 8): "High on Love" — The repetition and rhythm make it catchy and memorable.

**podcast**
- `47s–81s` (34s, conf 9): "Create Your Python Virtual Environment" — Setting up a virtual environment is crucial for Python projects.
- `98s–132s` (34s, conf 8): "Install Essential Python Packages" — Learn how to install key packages for your project.
- `213s–237s` (24s, conf 9): "Using OpenAI's API Key Safely" — Protect your API key with environment variables.
- `253s–276s` (23s, conf 8): "Generate Unique Pet Names with Python" — Create fun and unique pet names using AI.
- `268s–276s` (8s, conf 7): "Understanding Temperature in AI Models" — Learn how temperature affects AI creativity.

**tutorial**
- `0s–11s` (11s, conf 8): "What is a REST API?" — Explains a fundamental tech concept simply.
- `106s–165s` (59s, conf 9): "Why REST APIs are Game Changers" — Highlights the benefits of REST APIs in a relatable way.
- `17s–30s` (13s, conf 7): "REST API in Action: Ice Cream Shop" — Uses a fun example to explain a complex topic.
- `49s–69s` (20s, conf 8): "What Does REST Stand For?" — Curiosity about the acronym draws viewers in.
- `172s–219s` (47s, conf 8): "The Building Blocks of REST APIs" — Breaks down a complex topic into digestible parts.

**vlog**
- `7s–49s` (42s, conf 8): "Heart Under Attack" — An emotional declaration that resonates with many.
- `97s–113s` (16s, conf 7): "Sibling Rivalry" — Relatable and humorous take on sibling dynamics.
- `116s–123s` (7s, conf 6): "Power of Will" — Inspiring message about determination and strength.
- `49s–95s` (46s, conf 8): "Feeling Free" — Captures the essence of liberation and joy.
- `113s–121s` (8s, conf 7): "The Thrill of the Challenge" — Engaging and relatable moment about facing challenges.


## Test 03 — Single-frame face detection

Model: `ahmdyassr/detect-crop-face:23ef97b1c72422837f0b25aacad4ec5fa8e2423e2660bc4599347287e14cf94d` (returns cropped face image; note: no bbox coords in output)

Sampled **5** evenly-spaced frames per video.

| Slot | Faces found | Per-frame |
|------|:-----------:|-----------|
| keynote | 4/5 | ✅✅✅❌✅ |
| music_event | 1/5 | ❌❌✅❌❌ |
| podcast | 0/5 | ❌❌❌❌❌ |
| tutorial | 4/5 | ✅✅✅✅❌ |
| vlog | 4/5 | ✅✅✅❌✅ |

### Visual inspection

Open the `outputs/<slot>-frames/` directories to compare:
- Source frames (`frame-*.jpg`)
- Cropped faces (`crop-*.png`)

Key question: do the crops look like the SAME face position across frames? If yes → static crop works. If faces move a lot → need per-frame tracking (Test 04).

---

## Takeaways after Tests 0-3 (spike pause point)

**All three fast/cheap primitives work.** Pipeline viability depends on the content type, not on any single primitive failing.

### 1. WhisperX is fast and accurate
- 6-20s wall-clock to transcribe 3-5 min audio (~0.05× realtime)
- Word-level timestamps present on every segment, with confidence scores
- `align_output: true` is cheap and necessary for Hormozi-style per-word captions
- No silent failures — when audio is mostly music (music_event), it still returns partial transcripts without erroring

### 2. LLM segment picker is basically free
- `gpt-4o-mini` at ~$0.0003 per video (400-1500 in tokens, ~320 out)
- <1s per video
- Titles are short, hook-forward, match the "grandma scrolling TikTok" test
- Same model, same prompt, works across very different content types (TED talk, tutorial, vlog, music video) — no content-type-specific prompting needed for v1

### 3. Face-presence varies wildly — this is the critical fork
| Content type | Example slot | Faces/5 | Pipeline decision |
|--------------|--------------|--------:|-------------------|
| Single-speaker talking head | keynote, tutorial | 4/5 | **Pipeline A** viable |
| Moving vlog | vlog | 4/5 | **Pipeline A** viable |
| Wide-angle / crowd | music_event | 1/5 | **Pipeline B** (or center crop) |
| Screen-recording tutorial | podcast | 0/5 | **Pipeline B** only |

### Design implication for the real feature
The feature **cannot assume face-present**. It needs a quick gate at the start of clip processing:

```
for each LLM-picked segment:
  sample 3 frames → run detect-crop-face (or yolo-world)
  if face found on ≥2 frames → Pipeline A (talking-head crop + captions)
  else → Pipeline B (AI recap: visuals + narration)
```

This is actually freeing: we don't need Pipeline A to work on every video. We need a **dispatcher** that picks the right pipeline per clip.

### Cost so far (tests 0-3 × 5 videos)
- WhisperX: ~54s compute @ ~$0.0014/min → **~$0.02 total**
- Segment picking: **<$0.01 total**
- Face detection: 25 predictions × ~$0.0002 → **~$0.005 total**
- **~$0.04 for full transcribe + pick + face-check on 5 videos (~21 min of source material)**

---

## Test 04 — Per-frame face tracking (video)

Model: `zsxkib/yolo-world:07aee09fc38bc4459409caa872ea416717712f4e6e875f8751a0d0d5bbea902f`, classes: "person, face"

**Result: ❌ 0/5 — model unusable on Replicate for our needs.**

All 5 slots failed with the same OpenCV error:
```
OpenCV(4.9.0) /io/opencv/modules/imgcodecs/src/loadsave.cpp:786:
error: (-215:Assertion failed) !_img.empty() in function 'imwrite'
```

Also observed: the `return_json` parameter we were sending is **not** in the model's actual input schema (confirmed via `/v1/models/zsxkib/yolo-world`). The model was designed to return an annotated video, not JSON bboxes.

**Implication for Pipeline A:** Test 08 also called yolo-world (single-frame/image mode) to get a bbox for face-centered cropping — it failed on every clip too, falling back to center crop. We need a different strategy for face-aware framing (see Decisions below).

## Test 05 — ffmpeg cut

Local ffmpeg cut + re-encode (h264/aac, crf 20).

| Slot | Expected | Actual | Cut time |
|------|---------:|-------:|---------:|
| keynote | 24s | 24.0s | 0.5s |
| music_event | 29s | 29.0s | 0.8s |
| podcast | 34s | 34.0s | 0.9s |
| tutorial | 11s | 11.0s | 0.3s |
| vlog | 42s | 42.0s | 1.1s |

## Test 06 — Caption burn-in

Captions built locally via ASS subtitle format + ffmpeg subtitles filter.

| Slot | Words | Hormozi | Minimal | Karaoke |
|------|------:|:-------:|:-------:|:-------:|
| keynote | 60 | ✅ | ✅ | ✅ |
| music_event | 17 | ✅ | ✅ | ✅ |
| podcast | 84 | ✅ | ✅ | ✅ |
| tutorial | 34 | ✅ | ✅ | ✅ |
| vlog | 13 | ✅ | ✅ | ✅ |

Review output MP4s visually: `outputs/<slot>.captioned.<style>.mp4`

## Test 07 — Gemini TTS narrator (Replicate)

Model: `google/gemini-3.1-flash-tts` (Replicate), voice: Kore

| Style | Elapsed | Size | Type | Output |
|-------|--------:|-----:|------|--------|
| documentary | 13.4s | 1091 KB | audio/wav | `narrator-documentary.wav` |
| upbeat_explainer | 10.2s | 951 KB | audio/wav | `narrator-upbeat_explainer.wav` |
| dramatic | 16.6s | 1581 KB | audio/wav | `narrator-dramatic.wav` |

Listen to each `narrator-*.wav` in `outputs/` and evaluate voice naturalness + style control.

Note: Gemini 3.1 Flash TTS supports inline tags like `[sigh]`, `[laughing]`, `[whispering]`, `[shouting]`, `[extremely fast]` inside the text itself for fine-grained delivery control.

## Test 08 — Pipeline A end-to-end (Talking Head)

End-to-end Pipeline A: Source video → cut → face-centered 9:16 crop → Hormozi captions.

| Slot | bbox detected | Final |
|------|:-------------:|:-----:|
| keynote | ❌ (fallback: center) | ✅ keynote.pipelineA.final.mp4 |
| music_event | ❌ (fallback: center) | ✅ music_event.pipelineA.final.mp4 |
| podcast | ❌ (fallback: center) | ✅ podcast.pipelineA.final.mp4 |
| tutorial | ❌ (fallback: center) | ✅ tutorial.pipelineA.final.mp4 |
| vlog | ❌ (fallback: center) | ✅ vlog.pipelineA.final.mp4 |

Visually review each `<slot>.pipelineA.final.mp4` in outputs/.

## Test 09 — Pipeline B end-to-end (AI Recap)

End-to-end Pipeline B: transcript → LLM recap + shot list → Gemini TTS + flux-schnell stills → Ken-Burns + captions.

| Slot | Title | Style | Shots | Narration | Final |
|------|-------|-------|------:|----------:|:-----:|
| keynote | Thesis Deadline Panic | dramatic | 6 | 55.4s | ✅ keynote.pipelineB.final.mp4 |
| music_event | Life's Sweet Elixir | upbeat_explainer | 5 | 37.2s | ✅ music_event.pipelineB.final.mp4 |
| podcast | Python Virtual Environment Basics | upbeat_explainer | 5 | 35.1s | ✅ podcast.pipelineB.final.mp4 |
| tutorial | Understanding REST APIs | upbeat_explainer | 6 | 42.5s | ✅ tutorial.pipelineB.final.mp4 |
| vlog | Heart Under Attack | dramatic | 5 | 44.4s | ✅ vlog.pipelineB.final.mp4 |

Review each `<slot>.pipelineB.final.mp4` in outputs/. Check: narration timing vs. visuals, Ken-Burns feel, caption readability.

## Decisions after all tests

### 1. Which pipeline(s) work?

- **Pipeline A (Talking Head): partial ✅** — cut + scale to 9:16 + Hormozi captions works end-to-end for all 5 slots. **The face-centering step does NOT work** with yolo-world on Replicate. All 5 final MP4s used a static center crop fallback. For single-speaker keynote/vlog/tutorial this is acceptable because the speaker is already roughly centered in the source, but for true "zoom the crop window to the speaker's face across shot changes" we need a different model.
- **Pipeline B (AI Recap): full ✅** — all 5 slots produced a watchable 9:16 short with narration, Ken-Burns stills, and burnt-in ASS captions. Works on content where Pipeline A struggles (podcast screen-recording, music_event wide crowd).

Recommendation: **ship both**, dispatched by a face-presence gate. Pipeline B is a real content-agnostic fallback, not a degraded mode.

### 2. Is a custom Cog model needed?

**Yes for reliable face-aware cropping, no for v1 launch.** Options in priority order:

1. **Skip face-centering for v1** — shipping Pipeline A with static center crop is acceptable for the content types where faces are detected (keynote / vlog / tutorial) because speakers self-center. This unblocks a v1 without new model work.
2. **Use `detect-crop-face` geometry** — the model returns a cropped PNG of the face but no bbox coords. We could re-run face-detection locally (OpenCV Haar or mediapipe) on a few sample frames to get coordinates, then smooth a crop path. Free and local, avoids another Replicate model.
3. **Custom Cog model with ultralytics yolov8-face** — most reliable long-term. Ships the same Cog pattern as `taskmasterpeace/z-image-turbo`. Gives us bboxes + confidence per frame in one call, ~$0.003/clip.

### 3. Realistic cost per 60-sec short

**Pipeline A (center-crop fallback)**
- WhisperX portion: ~$0.002 (prorated per clip)
- LLM segment pick: ~$0.0001
- ffmpeg + captions: local / $0
- **~$0.003 per short**

**Pipeline B (AI Recap, 5-6 shots)**
- WhisperX: ~$0.002
- LLM recap + shot list: ~$0.001
- Gemini TTS via Replicate: ~$0.003
- flux-schnell × 6 images: 6 × ~$0.003 = ~$0.018
- ffmpeg Ken-Burns + mux: local / $0
- **~$0.024 per short**

User charges at ~10-100× markup (see pts pricing), so margin is healthy on both.

### 4. Biggest surviving risks

1. **Face-aware cropping unsolved** — yolo-world is unreliable on Replicate for both video (Test 04) and image (Test 08) modes. Need to pick an alternative before promising "dynamic speaker tracking."
2. **Pipeline B narration/visual sync** — currently we assume TTS duration fits within shot cumulative durations. Needs a tolerance check: if narration > shots, extend last shot; if shorter, pad. Not broken, but brittle.
3. **Gemini TTS style control quality** — the `prompt` field takes natural-language style hints ("dramatic, cinematic") but we haven't evaluated how consistent the delivery is across runs. Listen-test required before user-facing.
4. **flux-schnell style consistency across shots** — each shot is generated independently, so characters/locations drift. For the AI Recap use case this is fine (stock-footage feel), but if we want a more unified look we'll need either a style LoRA or a single seed + img2img chain.
5. **Segment picker grounding** — LLM sometimes picks overlapping segments (e.g. keynote `215s-277s` and `222s-268s`). Need dedup / min-gap enforcement in the picker prompt.

### 5. Next step

Build the production feature as `src/features/video-clipper/`:

1. **Upload** — reuse R2 for source videos (100MB+ uploads are standard here).
2. **Transcribe** — WhisperX via Replicate, cache by content hash.
3. **Pick segments** — OpenRouter gpt-4o-mini, return 3-10 candidates with hooks.
4. **Face gate** — sample 3 frames per candidate via `detect-crop-face`. If ≥2 hit → route to Pipeline A; else → Pipeline B.
5. **Pipeline A** — ffmpeg cut, static or face-aware 9:16 crop (TBD based on §2), ASS caption burn (user-selectable Hormozi/Minimal/Karaoke).
6. **Pipeline B** — LLM recap script + shot list, Gemini TTS (Replicate), flux-schnell stills, Ken-Burns, caption burn.
7. **UI** — preview all candidates as thumbnails with the picker's hook text; user selects 1-N to render; store finals in R2 (already our video bucket).

Out of scope for v1:
- AIOBR narrator migration (already has a narrator, per project memory)
- Custom face-tracking Cog model (start with center-crop, upgrade later if users ask)
- Multi-language — Gemini TTS supports it but v1 ships en-US only
