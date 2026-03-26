# Programmatic NLE Timeline Assembly — Research

**Date:** 2026-03-23
**Use case:** Given narration audio with word-level timestamps and a shot list mapping timestamps to video clips, automatically assemble a rough cut where clips are placed at correct positions on the timeline synced to narration.

---

## TL;DR Recommendation

**Use OpenTimelineIO (OTIO) as the primary approach.** It generates interchange files that import into Premiere Pro, DaVinci Resolve, and other NLEs — giving editors a real editable timeline, not a baked render. Supplement with MoviePy for cases where you need a rendered preview (social media export, client review).

| Approach | Editable in NLE? | Multi-track? | Precision | Transitions? | Maturity |
|---|---|---|---|---|---|
| **OTIO** | YES (Premiere, Resolve, Avid) | YES | Frame-accurate | YES | Production-ready |
| **DaVinci Resolve API** | YES (Resolve only) | YES | Frame-accurate | YES | Mature, Studio only |
| **Premiere ExtendScript** | YES (Premiere only) | YES | Frame-accurate | YES | Deprecated (2026) |
| **EDL (CMX3600)** | YES (universal) | NO (1 video track) | Frame-accurate | Basic (dissolves) | Ancient but universal |
| **MLT XML** | YES (Shotcut/Kdenlive) | YES | Frame-accurate | YES | Stable |
| **MoviePy** | NO (renders flat file) | YES (compositing) | Sub-frame | YES | Mature |
| **FFmpeg** | NO (renders flat file) | YES (filter_complex) | Sub-frame | YES (limited) | Mature |
| **VidPy** | NO (renders flat file) | YES | Sub-frame | YES | Alpha |

---

## 1. OpenTimelineIO (OTIO) — RECOMMENDED

**What it is:** An open-source API and interchange format for editorial timeline data, developed by Pixar and now under the Academy Software Foundation. Think of it as a modern, programmable EDL.

**NLE support:**
- DaVinci Resolve — native import/export (first NLE to support it)
- Adobe Premiere Pro — native OTIO import/export (shipped 2025)
- Avid Media Composer — tech preview support
- Blender VSE — plugin available
- Can also export to EDL, FCP XML, AAF formats via adapters

**Install:** `pip install opentimelineio opentimelineio-plugins`

### Code Example: Assemble rough cut from JSON shot list

```python
import opentimelineio as otio
import json

# Our input: narration-synced shot list
shot_list = [
    {"clip": "establishing_shot.mp4", "start_tc": 0.0, "end_tc": 3.5, "in": 0.0, "out": 3.5},
    {"clip": "interview_cu.mp4",      "start_tc": 3.5, "end_tc": 8.2, "in": 10.0, "out": 14.7},
    {"clip": "broll_street.mp4",      "start_tc": 8.2, "end_tc": 12.0, "in": 0.0, "out": 3.8},
    {"clip": "interview_cu.mp4",      "start_tc": 12.0, "end_tc": 18.5, "in": 14.7, "out": 21.2},
]

FPS = 24.0

def seconds_to_rational(seconds, fps=FPS):
    return otio.opentime.RationalTime(seconds * fps, fps)

def make_time_range(start_seconds, duration_seconds, fps=FPS):
    return otio.opentime.TimeRange(
        start_time=seconds_to_rational(start_seconds, fps),
        duration=seconds_to_rational(duration_seconds, fps),
    )

# Create timeline
timeline = otio.schema.Timeline(name="Rough Cut v1")

# Video track (V1) — main footage
v1 = otio.schema.Track(name="V1", kind=otio.schema.Track.Kind.Video)

# Audio track (A1) — narration
a1 = otio.schema.Track(name="A1 - Narration", kind=otio.schema.Track.Kind.Audio)

# Place narration on audio track (single file, full duration)
narration_ref = otio.schema.ExternalReference(target_url="narration_final.wav")
narration_clip = otio.schema.Clip(
    name="Narration",
    media_reference=narration_ref,
    source_range=make_time_range(0, 18.5),  # full narration length
)
a1.append(narration_clip)

# Place each video clip sequentially on V1
for shot in shot_list:
    clip_duration = shot["end_tc"] - shot["start_tc"]
    source_in = shot["in"]

    media_ref = otio.schema.ExternalReference(target_url=shot["clip"])
    clip = otio.schema.Clip(
        name=shot["clip"],
        media_reference=media_ref,
        source_range=make_time_range(source_in, clip_duration),
    )
    v1.append(clip)

# Optional: add a crossfade between clip 1 and clip 2
crossfade = otio.schema.Transition(
    transition_type=otio.schema.Transition.Type.SMPTE_Dissolve,
    in_offset=seconds_to_rational(0.5),   # 0.5s from outgoing clip
    out_offset=seconds_to_rational(0.5),  # 0.5s into incoming clip
)
# Insert transition between first two clips (index 1, between items 0 and 1)
v1.insert(1, crossfade)

# Add tracks to timeline
timeline.tracks.append(v1)
timeline.tracks.append(a1)

# Write to .otio (lossless, all metadata preserved)
otio.adapters.write_to_file(timeline, "rough_cut.otio")

# Or export to other formats:
# otio.adapters.write_to_file(timeline, "rough_cut.edl")      # CMX3600 EDL
# otio.adapters.write_to_file(timeline, "rough_cut.fcpxml")   # Final Cut Pro XML
```

### Key OTIO concepts

- **Track** — a single row on the timeline (video or audio). Items are sequential.
- **Stack** — multiple tracks stacked (the `timeline.tracks` is a Stack).
- **Clip** — references media with a `source_range` (in-point + duration from source).
- **Gap** — empty space on a track (like a blank slug). Use this to position clips at arbitrary timecodes instead of sequentially.
- **Transition** — dissolve/wipe between adjacent clips.
- **ExternalReference** — points to media file on disk (relative or absolute path).
- **RationalTime** — frame-accurate time representation (value + rate, e.g., frame 72 at 24fps = 3 seconds).

### Placing a clip at an arbitrary timecode (not sequential)

If the shot list has gaps between clips (e.g., clip at 0:00, next at 0:10), insert Gap objects:

```python
# If clip should start at 10 seconds but track is currently at 3.5 seconds:
gap_duration = 10.0 - 3.5  # 6.5 seconds of empty space
gap = otio.schema.Gap(
    source_range=make_time_range(0, gap_duration)
)
v1.append(gap)
v1.append(next_clip)
```

### B-Roll track (V2)

```python
v2 = otio.schema.Track(name="V2 - B-Roll", kind=otio.schema.Track.Kind.Video)

# B-roll at 5 seconds into timeline: need a 5-second gap first
gap = otio.schema.Gap(source_range=make_time_range(0, 5.0))
v2.append(gap)

broll_clip = otio.schema.Clip(
    name="broll_aerial.mp4",
    media_reference=otio.schema.ExternalReference(target_url="broll_aerial.mp4"),
    source_range=make_time_range(0, 4.0),
)
v2.append(broll_clip)

timeline.tracks.append(v2)
```

---

## 2. DaVinci Resolve Scripting API

**Language:** Python 3 or Lua
**Requirement:** DaVinci Resolve **Studio** ($295 one-time). Free version restricts scripting to the Fusion page console only.
**How it works:** Resolve must be running. Your script connects to the running instance and manipulates the project/timeline via the API.

### Code Example: Add clips to timeline at specific timecodes

```python
import DaVinciResolveScript as dvr

resolve = dvr.scriptapp("Resolve")
pm = resolve.GetProjectManager()
project = pm.GetCurrentProject()
media_pool = project.GetMediaPool()

# Import clips to media pool
media_storage = resolve.GetMediaStorage()
clips = media_storage.AddItemListToMediaPool([
    "/path/to/establishing_shot.mp4",
    "/path/to/interview.mp4",
    "/path/to/broll.mp4",
    "/path/to/narration.wav",
])

# Create timeline
timeline = media_pool.CreateEmptyTimeline("Rough Cut v1")
project.SetCurrentTimeline(timeline)

# Get clips from media pool
folder = media_pool.GetRootFolder()
pool_clips = folder.GetClipList()

# Add clip at specific frame position using recordFrame
# recordFrame = the frame on the timeline where the clip should be placed
fps = 24
clip_info = {
    "mediaPoolItem": pool_clips[0],  # establishing_shot.mp4
    "startFrame": 0,                  # source in-point (frame)
    "endFrame": 84,                   # source out-point (3.5s * 24fps)
    "trackIndex": 1,                  # V1
    "recordFrame": 0,                 # timeline position: frame 0
}
media_pool.AppendToTimeline([clip_info])

# Add second clip at 3.5 seconds
clip_info_2 = {
    "mediaPoolItem": pool_clips[1],  # interview.mp4
    "startFrame": 240,                # source in = 10s * 24fps
    "endFrame": 353,                   # source out = 14.7s * 24fps
    "trackIndex": 1,
    "recordFrame": 84,                # timeline position: 3.5s * 24fps
}
media_pool.AppendToTimeline([clip_info_2])

# Add narration to audio track
narration_info = {
    "mediaPoolItem": pool_clips[3],  # narration.wav
    "startFrame": 0,
    "endFrame": 444,                  # 18.5s * 24fps
    "trackIndex": 1,                  # A1
    "recordFrame": 0,
}
media_pool.AppendToTimeline([narration_info])
```

### Key points
- `recordFrame` is what places the clip at a specific timeline position
- `startFrame`/`endFrame` define the source in/out points
- `trackIndex` specifies which track (1-based)
- Resolve must be running — this is a live connection, not file generation
- Supports transitions, effects, color grading via additional API calls
- Full multi-track support (unlimited video + audio tracks)

---

## 3. Adobe Premiere Pro — ExtendScript

**Language:** ExtendScript (JavaScript dialect)
**Status:** ExtendScript is frozen — no new features. Adobe is transitioning to UXP. ExtendScript support ends ~September 2026.
**Execution:** Runs inside Premiere via CEP panel or command line.

### Code Example: Insert clips at specific timecodes

```javascript
// ExtendScript for Premiere Pro
var project = app.project;
var seq = project.activeSequence;

// Import clips
var importArray = [
    "/path/to/establishing_shot.mp4",
    "/path/to/interview.mp4",
    "/path/to/narration.wav"
];
project.importFiles(importArray, true, project.rootItem, false);

// Get imported items
var rootItem = project.rootItem;
var clip1 = rootItem.children[0]; // establishing_shot.mp4
var clip2 = rootItem.children[1]; // interview.mp4
var narration = rootItem.children[2]; // narration.wav

// Insert clip on V1 at 0 seconds
// overwriteClip(projectItem, timeInSeconds)
seq.videoTracks[0].overwriteClip(clip1, 0.0);

// Insert clip on V1 at 3.5 seconds
seq.videoTracks[0].overwriteClip(clip2, 3.5);

// Insert narration on A1 at 0 seconds
seq.audioTracks[0].overwriteClip(narration, 0.0);

// For 23.976fps, time = seconds + frames/fps
// E.g., 8 seconds and 5 frames: 8 + (5/23.976)
seq.videoTracks[0].overwriteClip(brollClip, 8 + (5/23.976));
```

### Key points
- `insertClip()` pushes existing clips forward (ripple insert)
- `overwriteClip()` replaces whatever is at that position (what you want for assembly)
- Time is specified in **seconds** (floating point)
- Carries all audio/video tracks from source clip
- Premiere must be running with the project open
- **Better alternative:** Generate an OTIO file and import it into Premiere (no scripting needed, works offline)

---

## 4. EDL (CMX3600 Edit Decision List)

**What it is:** A plain-text format from the 1970s that describes an edit as a list of events with source/record timecodes. Universally supported by every NLE.

**Limitation:** Supports only **1 video track** and up to **4 audio channels**. No B-roll track. No complex effects.

### EDL Format Example

```
TITLE: ROUGH CUT V1
FCM: NON-DROP FRAME

001  EST_SHOT V     C        00:00:00:00 00:00:03:12 00:00:00:00 00:00:03:12
* FROM CLIP NAME: establishing_shot.mp4

002  INTRVIEW V     C        00:00:10:00 00:00:14:17 00:00:03:12 00:00:08:05
* FROM CLIP NAME: interview_cu.mp4

003  BROLL_ST V     C        00:00:00:00 00:00:03:19 00:00:08:05 00:00:12:00
* FROM CLIP NAME: broll_street.mp4

004  INTRVIEW V     C        00:00:14:17 00:00:21:05 00:00:12:00 00:00:18:12
* FROM CLIP NAME: interview_cu.mp4
```

**Format:** `EVENT# REEL# TRACK TYPE SOURCE_IN SOURCE_OUT RECORD_IN RECORD_OUT`

- `V` = video, `A` = audio, `AA` = stereo audio
- `C` = cut, `D` = dissolve (with duration on next line)
- Source IN/OUT = timecodes within the source clip
- Record IN/OUT = timecodes on the timeline

### Generate EDL with Python (using OTIO)

```python
import opentimelineio as otio

# Build your timeline with OTIO (see section 1 above)
# Then export as EDL:
otio.adapters.write_to_file(timeline, "rough_cut.edl")
```

Or generate raw EDL text directly:

```python
def generate_edl(shot_list, title="ROUGH CUT", fps=24):
    lines = [f"TITLE: {title}", "FCM: NON-DROP FRAME", ""]

    for i, shot in enumerate(shot_list, 1):
        event_num = f"{i:03d}"
        reel = shot["clip"][:8].upper().replace(".", "_")

        src_in = seconds_to_tc(shot["in"], fps)
        src_out = seconds_to_tc(shot["out"], fps)
        rec_in = seconds_to_tc(shot["start_tc"], fps)
        rec_out = seconds_to_tc(shot["end_tc"], fps)

        lines.append(f"{event_num}  {reel:8s} V     C        {src_in} {src_out} {rec_in} {rec_out}")
        lines.append(f"* FROM CLIP NAME: {shot['clip']}")
        lines.append("")

    return "\n".join(lines)

def seconds_to_tc(seconds, fps=24):
    total_frames = int(round(seconds * fps))
    h = total_frames // (fps * 3600)
    m = (total_frames % (fps * 3600)) // (fps * 60)
    s = (total_frames % (fps * 60)) // fps
    f = total_frames % fps
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d}:{int(f):02d}"
```

### Key points
- Universal import — every NLE since the 1980s reads EDLs
- Single video track only (no B-roll layer)
- Dissolves supported but no complex transitions
- Great as a fallback/universal format alongside OTIO
- Reel names limited to 8 characters in standard format (Adobe extended format supports longer names)

---

## 5. MLT XML (Shotcut / Kdenlive)

**What it is:** XML-based project format used by MLT Framework, which powers Shotcut and Kdenlive (both free, open-source NLEs).

### Code Example: Generate MLT XML

```xml
<?xml version="1.0" encoding="utf-8"?>
<mlt LC_NUMERIC="C" version="7.0.0" title="Rough Cut" producer="main_bin">

  <!-- Define media producers -->
  <producer id="clip1" in="00:00:00.000" out="00:00:03.500">
    <property name="resource">/path/to/establishing_shot.mp4</property>
  </producer>

  <producer id="clip2" in="00:00:10.000" out="00:00:14.700">
    <property name="resource">/path/to/interview_cu.mp4</property>
  </producer>

  <producer id="narration" in="00:00:00.000" out="00:00:18.500">
    <property name="resource">/path/to/narration.wav</property>
  </producer>

  <!-- Video playlist (V1) -->
  <playlist id="V1">
    <entry producer="clip1" in="00:00:00.000" out="00:00:03.500"/>
    <entry producer="clip2" in="00:00:10.000" out="00:00:14.700"/>
  </playlist>

  <!-- Audio playlist (A1 - narration) -->
  <playlist id="A1">
    <entry producer="narration" in="00:00:00.000" out="00:00:18.500"/>
  </playlist>

  <!-- Multitrack timeline -->
  <tractor id="timeline" title="Rough Cut">
    <multitrack>
      <track producer="V1"/>
      <track producer="A1"/>
    </multitrack>
    <!-- Audio mix transition -->
    <transition>
      <property name="a_track">0</property>
      <property name="b_track">1</property>
      <property name="mlt_service">mix</property>
      <property name="always_active">1</property>
    </transition>
  </tractor>

</mlt>
```

### Generate MLT XML from Python

```python
import xml.etree.ElementTree as ET

def generate_mlt(shot_list, narration_path, output_path):
    mlt = ET.Element("mlt", version="7.0.0", title="Rough Cut")

    # Create producers for each unique clip
    producers = {}
    for shot in shot_list:
        clip_name = shot["clip"]
        if clip_name not in producers:
            prod = ET.SubElement(mlt, "producer", id=clip_name)
            res = ET.SubElement(prod, "property", name="resource")
            res.text = clip_name
            producers[clip_name] = prod

    # Narration producer
    narr = ET.SubElement(mlt, "producer", id="narration")
    res = ET.SubElement(narr, "property", name="resource")
    res.text = narration_path

    # Video playlist
    v1 = ET.SubElement(mlt, "playlist", id="V1")
    for shot in shot_list:
        src_in = f"00:00:{shot['in']:06.3f}"
        src_out = f"00:00:{shot['out']:06.3f}"
        ET.SubElement(v1, "entry", producer=shot["clip"],
                      attrib={"in": src_in, "out": src_out})

    # Audio playlist
    a1 = ET.SubElement(mlt, "playlist", id="A1")
    ET.SubElement(a1, "entry", producer="narration")

    # Tractor (multitrack)
    tractor = ET.SubElement(mlt, "tractor", id="timeline")
    mt = ET.SubElement(tractor, "multitrack")
    ET.SubElement(mt, "track", producer="V1")
    ET.SubElement(mt, "track", producer="A1")

    tree = ET.ElementTree(mlt)
    ET.indent(tree)
    tree.write(output_path, encoding="utf-8", xml_declaration=True)
```

### Key points
- Opens directly in Shotcut (.mlt) and Kdenlive (.kdenlive)
- Full multi-track support with transitions
- Can render via `melt` command line: `melt rough_cut.mlt -consumer avformat:output.mp4`
- Free tools, cross-platform
- Gaps inserted via `<blank length="..."/>` elements in playlists
- Not importable into Premiere or Resolve (use OTIO/EDL for those)

---

## 6. MoviePy (Python) — For Rendered Output

**What it is:** Python library for video compositing. Renders a final video file — NOT an editable NLE project.

**Use case:** Client preview renders, social media exports, automated final output.

### Code Example: Assemble from shot list

```python
from moviepy import VideoFileClip, AudioFileClip, CompositeVideoClip, CompositeAudioClip, concatenate_videoclips

shot_list = [
    {"clip": "establishing_shot.mp4", "in": 0.0, "out": 3.5, "start_tc": 0.0},
    {"clip": "interview_cu.mp4",      "in": 10.0, "out": 14.7, "start_tc": 3.5},
    {"clip": "broll_street.mp4",      "in": 0.0, "out": 3.8, "start_tc": 8.2},
]

# Load and trim each clip
video_clips = []
for shot in shot_list:
    clip = VideoFileClip(shot["clip"]).subclipped(shot["in"], shot["out"])
    # set_start() places the clip at a specific time in the composition
    clip = clip.with_start(shot["start_tc"])
    video_clips.append(clip)

# Load narration
narration = AudioFileClip("narration.wav")

# Composite video (all clips layered at their start times)
final_video = CompositeVideoClip(video_clips)

# Add narration audio
final_video = final_video.with_audio(
    CompositeAudioClip([narration])
)

# Render
final_video.write_videofile("rough_cut.mp4", fps=24)
```

### Crossfade between clips

```python
from moviepy import crossfadein, crossfadeout

# Add 0.5s crossfade
clip1 = clip1.with_effects([crossfadeout(0.5)])
clip2 = clip2.with_effects([crossfadein(0.5)])
# Overlap their start times by 0.5s
clip2 = clip2.with_start(clip1.end - 0.5)
```

### Key points
- **Output is a rendered video file** — not editable in an NLE
- Good for automated preview generation
- Handles arbitrary compositing, text overlays, effects
- Sub-frame precision (works in seconds as float)
- Can be slow for long videos (processes every frame)
- `pip install moviepy`

---

## 7. FFmpeg — For Rendered Output

**What it is:** Command-line tool for video processing. Can assemble clips using concat demuxer or filter_complex.

### Approach A: Concat demuxer (sequential clips, same codec)

```bash
# concat_list.txt:
# file 'clip1_trimmed.mp4'
# file 'clip2_trimmed.mp4'
# file 'clip3_trimmed.mp4'

# First trim each clip to the needed segment
ffmpeg -ss 0 -t 3.5 -i establishing_shot.mp4 -c copy clip1_trimmed.mp4
ffmpeg -ss 10.0 -t 4.7 -i interview_cu.mp4 -c copy clip2_trimmed.mp4
ffmpeg -ss 0 -t 3.8 -i broll_street.mp4 -c copy clip3_trimmed.mp4

# Then concatenate
ffmpeg -f concat -safe 0 -i concat_list.txt -c copy rough_cut_video.mp4

# Merge with narration audio
ffmpeg -i rough_cut_video.mp4 -i narration.wav \
  -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 \
  rough_cut_final.mp4
```

### Approach B: filter_complex (arbitrary placement, re-encodes)

```bash
ffmpeg \
  -i establishing_shot.mp4 \
  -i interview_cu.mp4 \
  -i broll_street.mp4 \
  -i narration.wav \
  -filter_complex "
    [0:v]trim=start=0:end=3.5,setpts=PTS-STARTPTS[v0];
    [1:v]trim=start=10:end=14.7,setpts=PTS-STARTPTS[v1];
    [2:v]trim=start=0:end=3.8,setpts=PTS-STARTPTS[v2];
    [v0][v1][v2]concat=n=3:v=1:a=0[vout]
  " \
  -map "[vout]" -map 3:a \
  -c:v libx264 -c:a aac \
  rough_cut.mp4
```

### Key points
- Renders a final file — not editable in NLE
- Concat demuxer is fast (no re-encode) but requires matching codecs
- filter_complex is flexible but slow (full re-encode)
- Frame-accurate trimming with `-ss` before `-i` (input seeking)
- Good for automated pipeline output
- Can handle crossfades with `xfade` filter: `[v0][v1]xfade=transition=fade:duration=0.5:offset=3.0`

---

## Recommended Architecture

For the Directors Palette use case, here is the recommended pipeline:

```
Writer's Shot List (JSON)
        |
        v
  Python Assembly Script
        |
        +---> OTIO file (.otio)  --> Import into Premiere/Resolve/Avid
        |                             (editor fine-tunes the real timeline)
        |
        +---> EDL file (.edl)    --> Universal fallback import
        |
        +---> MoviePy render     --> Preview MP4 for client review
        |
        +---> MLT XML (.mlt)     --> Open in Shotcut/Kdenlive (free option)
```

### Input format (from writers)

```json
{
  "title": "Episode 1 - The Beginning",
  "fps": 24,
  "narration": "narration_final.wav",
  "shots": [
    {
      "id": "shot_001",
      "timestamp": "00:00:00.000",
      "duration": 3.5,
      "clip": "establishing_shot.mp4",
      "source_in": 0.0,
      "source_out": 3.5,
      "track": "V1",
      "transition_in": null,
      "notes": "Wide shot of city skyline"
    },
    {
      "id": "shot_002",
      "timestamp": "00:00:03.500",
      "duration": 4.7,
      "clip": "interview_cu.mp4",
      "source_in": 10.0,
      "source_out": 14.7,
      "track": "V1",
      "transition_in": {"type": "dissolve", "duration": 0.5},
      "notes": "Close-up interview response"
    },
    {
      "id": "broll_001",
      "timestamp": "00:00:05.000",
      "duration": 3.0,
      "clip": "broll_aerial.mp4",
      "source_in": 0.0,
      "source_out": 3.0,
      "track": "V2",
      "transition_in": null,
      "notes": "B-roll overlay during interview"
    }
  ]
}
```

### Core assembly script (OTIO-based)

```python
#!/usr/bin/env python3
"""
Assemble a rough cut from a JSON shot list using OpenTimelineIO.
Outputs: .otio (NLE interchange), .edl (universal), .mp4 (preview render)
"""
import json
import opentimelineio as otio

def load_shot_list(path: str) -> dict:
    with open(path) as f:
        return json.load(f)

def seconds_to_rt(seconds: float, fps: float) -> otio.opentime.RationalTime:
    return otio.opentime.RationalTime(round(seconds * fps), fps)

def make_range(start: float, duration: float, fps: float) -> otio.opentime.TimeRange:
    return otio.opentime.TimeRange(
        start_time=seconds_to_rt(start, fps),
        duration=seconds_to_rt(duration, fps),
    )

def parse_timestamp(tc: str) -> float:
    """Parse HH:MM:SS.mmm to seconds."""
    parts = tc.split(":")
    h, m = int(parts[0]), int(parts[1])
    s = float(parts[2])
    return h * 3600 + m * 60 + s

def assemble(shot_list_path: str, output_base: str):
    data = load_shot_list(shot_list_path)
    fps = data.get("fps", 24)

    timeline = otio.schema.Timeline(name=data["title"])

    # Organize shots by track
    tracks_data = {}
    for shot in data["shots"]:
        track_name = shot.get("track", "V1")
        if track_name not in tracks_data:
            tracks_data[track_name] = []
        tracks_data[track_name].append(shot)

    # Sort each track's shots by timestamp
    for track_name in tracks_data:
        tracks_data[track_name].sort(key=lambda s: parse_timestamp(s["timestamp"]))

    # Build tracks
    for track_name, shots in tracks_data.items():
        kind = (otio.schema.Track.Kind.Audio
                if track_name.startswith("A")
                else otio.schema.Track.Kind.Video)
        track = otio.schema.Track(name=track_name, kind=kind)

        current_position = 0.0  # seconds on the timeline

        for shot in shots:
            shot_start = parse_timestamp(shot["timestamp"])
            shot_duration = shot["duration"]

            # Insert gap if needed
            gap_duration = shot_start - current_position
            if gap_duration > 0.01:  # small tolerance
                gap = otio.schema.Gap(source_range=make_range(0, gap_duration, fps))
                track.append(gap)

            # Insert transition if specified
            trans = shot.get("transition_in")
            if trans and trans.get("type") == "dissolve":
                t = otio.schema.Transition(
                    transition_type=otio.schema.Transition.Type.SMPTE_Dissolve,
                    in_offset=seconds_to_rt(trans["duration"] / 2, fps),
                    out_offset=seconds_to_rt(trans["duration"] / 2, fps),
                )
                track.append(t)

            # Create clip
            media_ref = otio.schema.ExternalReference(target_url=shot["clip"])
            clip = otio.schema.Clip(
                name=shot.get("id", shot["clip"]),
                media_reference=media_ref,
                source_range=make_range(shot["source_in"], shot_duration, fps),
            )
            track.append(clip)
            current_position = shot_start + shot_duration

        timeline.tracks.append(track)

    # Add narration track
    if "narration" in data:
        a_track = otio.schema.Track(name="A1 - Narration", kind=otio.schema.Track.Kind.Audio)
        narr_ref = otio.schema.ExternalReference(target_url=data["narration"])
        # Calculate total timeline duration
        total_duration = max(
            parse_timestamp(s["timestamp"]) + s["duration"]
            for s in data["shots"]
        )
        narr_clip = otio.schema.Clip(
            name="Narration",
            media_reference=narr_ref,
            source_range=make_range(0, total_duration, fps),
        )
        a_track.append(narr_clip)
        timeline.tracks.append(a_track)

    # Export
    otio.adapters.write_to_file(timeline, f"{output_base}.otio")
    print(f"Written: {output_base}.otio")

    # Also export EDL (single video track only — uses first video track)
    try:
        otio.adapters.write_to_file(timeline, f"{output_base}.edl")
        print(f"Written: {output_base}.edl")
    except Exception as e:
        print(f"EDL export failed (expected if multi-track): {e}")

if __name__ == "__main__":
    import sys
    assemble(sys.argv[1], sys.argv[2])

# Usage: python assemble.py shot_list.json rough_cut
```

---

## Summary of Tradeoffs

### Best for "editable in any NLE": **OTIO**
- Generates one file, imports into Premiere/Resolve/Avid
- Full multi-track, transitions, frame-accurate
- Python API is clean and well-documented
- Academy Software Foundation backed (Pixar, Netflix, etc.)

### Best for "Resolve-only workflow": **DaVinci Resolve API**
- Direct manipulation of live project
- Most powerful (color grading, effects, Fusion)
- Requires Studio license ($295)

### Best for "universal fallback": **EDL**
- Every NLE reads it, dead simple format
- Limited to 1 video track

### Best for "free NLE workflow": **MLT XML**
- Shotcut and Kdenlive are free and cross-platform
- Full multi-track with transitions
- Can render headless via `melt` command

### Best for "rendered preview": **MoviePy**
- Quick preview MP4 for client review
- Not editable afterward, but simple Python API

### Avoid for this use case: **FFmpeg alone**
- Good for rendering but painful for complex timeline assembly
- filter_complex syntax becomes unmanageable with many clips
- No NLE-editable output
