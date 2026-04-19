# Video Clipper Spike

Throwaway test scripts to validate every primitive of a "long video → shorts" feature **before** writing production code.

## Setup

```bash
cd tests/video-clipper-spike
npm install
```

## Required env vars

In project root `.env.local`:

```
REPLICATE_API_TOKEN=...   # already present — used for all models
OPENROUTER_API_KEY=...    # already present — used for segment picker + recap script
```

Gemini TTS is used via Replicate (`google/gemini-3.1-flash-tts`), so no separate Gemini/Google API key is needed.

## Binaries used

- ffmpeg at `C:/Users/taskm/ffmpeg/ffmpeg-8.0.1-essentials_build/bin/ffmpeg.exe` (from CLAUDE.md)
- yt-dlp auto-downloaded by `youtube-dl-exec` npm package (no system install)

## Running

Scripts are numbered in execution order. Each is standalone.

```bash
node 00-download-videos.mjs    # downloads 5 test videos to videos/
node 01-whisperx-transcribe.mjs    # transcribes all videos
node 02-segment-picker.mjs         # picks viral segments from each transcript
node 03-face-detect-single-frame.mjs
node 04-face-track-video.mjs
node 05-ffmpeg-cut.mjs
node 06-caption-burn.mjs
node 07-gemini-narrator.mjs
node 08-pipeline-a-manual.mjs
node 09-pipeline-b-manual.mjs
```

All outputs land in `outputs/`. Both `videos/` and `outputs/` are gitignored.

## Source videos

Test 00 downloads short slices (~5 min each) of public YouTube videos covering:

| Slot | Type | Why |
|------|------|-----|
| podcast | 2 speakers, interview | Face tracking + diarization stress test |
| keynote | 1 speaker, slides | Best case for crop + caption |
| vlog | 1 speaker, moving camera | Face tracking with motion |
| tutorial | Talking head + code screen (Fireship-style) | Mixed-shot caption test |
| music_event | Multiple people, dynamic | Split-screen / multi-face decision |

Edit `00-download-videos.mjs` to change sources.

## Findings

Results logged to [`findings.md`](./findings.md) as each test runs.
