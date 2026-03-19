# Camera Angle Feature — Animated Explainer Script

## What It Does

Camera Angle lets you take any image and re-render it from a different viewpoint. Upload a photo of a character, object, or scene — then use sliders or presets to rotate the camera around it. The AI generates a new image showing your subject from the new angle.

**Model:** Qwen Image Edit (with Camera LoRA)
**Cost:** 5 pts per generation (~30 seconds)

---

## The 3 Sliders

### 1. Rotate (Azimuth) — Pink Slider
- **Range:** 0° to 360° (full circle around the subject)
- **What it does:** Spins the camera left/right around your subject, like walking in a circle around a statue
- **Key positions:**
  - **0°** — Front (looking straight at the subject)
  - **45°** — Front-right quarter view
  - **90°** — Right side (profile view)
  - **135°** — Back-right quarter view
  - **180°** — Back (behind the subject)
  - **225°** — Back-left quarter view
  - **270°** — Left side (profile view)
  - **315°** — Front-left quarter view
- **Think of it as:** Standing on a clock face — 0° is 12 o'clock (front), 90° is 3 o'clock (right side), 180° is 6 o'clock (back), 270° is 9 o'clock (left side)

### 2. Tilt (Elevation) — Cyan Slider
- **Range:** -30° to +60°
- **What it does:** Tilts the camera up or down — like crouching low or climbing a ladder
- **Key positions:**
  - **-30°** — Low angle (looking up at the subject, heroic/powerful feel)
  - **0°** — Eye level (neutral, straight-on)
  - **30°** — Elevated (looking slightly down, like from a balcony)
  - **60°** — High angle (looking down from above, bird's eye)
- **Think of it as:** A photographer crouching down (-30°) or standing on a chair (+60°)

### 3. Zoom (Distance) — Amber Slider
- **Range:** 0 to 10
- **What it does:** Moves the camera closer or farther from the subject
- **Key positions:**
  - **0–3** — Close-up (tight on the subject, detail shots)
  - **4–6** — Medium shot (standard framing, most versatile)
  - **7–10** — Wide shot (pulled back, shows environment/context)
- **Think of it as:** A camera dolly rolling forward (close-up) or backward (wide shot)

---

## The 8 Presets

Quick-access buttons that set all 3 sliders at once:

| Preset | Rotate | Tilt | Zoom | Best For |
|--------|--------|------|------|----------|
| **Front** | 0° | 0° | 5 | Standard front-facing shot |
| **Right** | 90° | 0° | 5 | Profile view from the right |
| **Back** | 180° | 0° | 5 | Seeing the back of subject |
| **Left** | 270° | 0° | 5 | Profile view from the left |
| **Hero Low** | 0° | -30° | 3 | Powerful, looking-up-at-subject shot |
| **Bird's Eye** | 0° | 60° | 8 | Looking down from above |
| **Close-up** | 0° | 0° | 1 | Tight detail shot |
| **Wide** | 0° | 0° | 9 | Pulled-back environmental shot |

---

## The 3D Preview (Gizmo)

The interactive 3D viewport shows exactly where your camera will be:

- **Your uploaded image** appears as a flat billboard in the center (the "subject")
- **A small camera icon** orbits around it, showing where the virtual camera is positioned
- **Pink ring** on the ground shows the rotation path (azimuth circle)
- **Cyan arc** shows the tilt range (elevation arc)
- **Grid lines** on the ground for spatial reference
- As you drag sliders, the camera moves in real-time so you can see the angle before generating

---

## LoRA Scale (Advanced Setting)

- **Where:** In Advanced Settings, below the main sliders
- **Range:** 0 to 2.0
- **Default:** 1.25
- **What it does:** Controls how strongly the camera angle instruction affects the output
  - **Lower (0.5–1.0):** Subtle angle change, more freedom for AI interpretation
  - **Default (1.25):** Recommended balance of accuracy and quality
  - **Higher (1.5–2.0):** Stronger angle enforcement, but may reduce image quality
- **When to adjust:** If the angle isn't changing enough, increase it. If the image looks distorted, decrease it.

---

## How It Works Under the Hood

1. You upload a reference image (required — Camera Angle always needs a subject)
2. You set your angle using sliders or presets
3. The system converts your slider values into a text token: `<sks> [azimuth] [elevation] [distance]`
   - Example: Rotate 90°, Tilt 0°, Zoom 5 → `<sks> right side eye level medium shot`
4. This token is prepended to your prompt and sent to Qwen Image Edit with the Camera LoRA
5. The AI generates a new image of your subject from the specified viewpoint

### The 96 Possible Angles

The system maps continuous slider values to the nearest discrete position:

**8 Azimuth positions** (Rotate):
- front, front-right quarter, right side, back-right quarter, back, back-left quarter, left side, front-left quarter

**4 Elevation positions** (Tilt):
- low-angle, eye-level, elevated, high-angle

**3 Distance positions** (Zoom):
- close-up, medium shot, wide shot

8 × 4 × 3 = **96 unique camera angles**

---

## Step-by-Step Usage Flow

### For the Animated Explainer Video:

**Scene 1: Upload**
- Show: User clicks "Upload" or drags an image into the reference area
- Caption: "Start with any image — a character, product, or scene"

**Scene 2: Enable Camera Angle**
- Show: Toggle switch turns on, 3D gizmo appears with sliders
- Caption: "Turn on Camera Angle to unlock the 3D controls"

**Scene 3: Try a Preset**
- Show: User clicks "Right" preset, camera swings to the right side in the 3D preview
- Caption: "Use presets for common angles — or fine-tune with sliders"

**Scene 4: Adjust with Sliders**
- Show: User drags the pink Rotate slider, camera orbits around the subject
- Caption: "Rotate spins the camera around your subject (0°–360°)"

- Show: User drags the cyan Tilt slider, camera rises and falls
- Caption: "Tilt angles the camera up or down (-30° to +60°)"

- Show: User drags the amber Zoom slider, camera moves in/out
- Caption: "Zoom moves the camera closer or farther away"

**Scene 5: Generate**
- Show: User clicks Generate, loading spinner, result appears
- Caption: "Hit Generate to see your subject from the new angle"

**Scene 6: Compare**
- Show: Side-by-side of original and generated image at new angle
- Caption: "Same subject, brand new perspective — in about 30 seconds"

**Scene 7: Advanced Tip**
- Show: LoRA Scale slider in Advanced Settings
- Caption: "Adjust LoRA Scale for stronger or softer angle control (default: 1.25)"

---

## Example Use Cases

1. **Character Turnaround Sheets** — Upload a character front-view, generate right, back, and left views
2. **Product Photography** — Show a product from multiple angles without reshooting
3. **Storyboarding** — Same scene from different camera positions (hero low for drama, bird's eye for context)
4. **3D Reference** — Generate angle references for 3D modelers
5. **Action Sequences** — Show a subject from rotating perspectives for dynamic sequences
