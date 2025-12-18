# Video Generation Infographic Prompt

Use this prompt with nano-banana-pro to generate an infographic:

## Prompt for Nano-Banana-Pro

```
A clean, modern infographic diagram showing a video generation credit system workflow.

The infographic should show:

TOP SECTION - "Video Models & Pricing":
- 5 tiers displayed as horizontal bars with icons:
  * Budget (green): WAN 2.2-5B Fast - 1 pt/video
  * Budget+ (blue): WAN 2.2 I2V - 3 pts/video
  * Standard (yellow): Seedance Fast - 4 pts/sec
  * Featured (orange): Seedance Lite - 5 pts/sec
  * Premium (red): Kling 2.5 - 10 pts/sec

MIDDLE SECTION - "Generation Flow":
- Arrow diagram showing: User Request → Credit Check → Generate → Webhook → Deduct Credits
- Icons for each step: user icon, coin icon, video icon, webhook icon, minus icon

BOTTOM SECTION - "Storage Limits":
- Two boxes side by side:
  * Images: "500 limit" with progress bar and warning at 400
  * Videos: "7-day expiration" with clock icon

Style: Modern tech infographic, dark theme with accent colors, clean lines, professional business style, data visualization aesthetic
```

## Audit Summary

### Bugs Found & Fixed

| Issue | Before | After | Commit |
|-------|--------|-------|--------|
| Model ID in metadata | `bytedance/seedance-1-lite` | `seedance-lite` | 2bf2b36 |
| Video pricing calculation | Flat DB rate | Duration × Rate | 2bf2b36 |
| Credit deduction | No override | Supports overrideAmount | 2bf2b36 |

### Code Flow (Verified Working)

```
1. POST /api/generation/video
   ├─ Auth check ✅
   ├─ Credit check (hasSufficientCredits) ✅
   ├─ Validation ✅
   └─ Create Replicate prediction + gallery entry ✅

2. Replicate generates video...

3. POST /api/webhooks/replicate (on completion)
   ├─ Download video from Replicate ✅
   ├─ Upload to Supabase Storage ✅
   ├─ Update gallery record ✅
   └─ Deduct credits (with duration × resolution pricing) ✅
```

### Pricing Calculation Example

```
Model: seedance-lite
Resolution: 720p (5 pts/sec)
Duration: 8 seconds

Cost = 5 × 8 = 40 points
```
