/**
 * Pre-built wildcard presets for storyboard generation
 * These can be auto-created for users who don't have them yet
 */

export interface WildcardPreset {
    name: string
    category: string
    description: string
    content: string // newline-separated entries
}

export const STORYBOARD_WILDCARD_PRESETS: WildcardPreset[] = [
    // Battle Rap Venues
    {
        name: 'url_large_venue',
        category: 'battle_rap',
        description: 'URL large venue descriptions for big events',
        content: `A vast convention hall with 40-foot ceilings, industrial pillars framing the stage, a black banner reading "URL" in bold white letters, packed crowd extending into darkness
A warehouse-style arena with exposed brick walls, professional lighting rigs, URL logo projected on massive screens, VIP section visible in foreground
An auditorium with stadium seating, URL branded backdrop, camera crews visible, crowd of hundreds creating electric atmosphere
A large theater venue with ornate architecture contrasting street energy, URL banners draped from balconies, crowd packed tight around the stage`
    },
    {
        name: 'url_small_venue',
        category: 'battle_rap',
        description: 'URL intimate venue descriptions',
        content: `A tight basement venue, low ceilings, crowd forming tight circle around battlers, raw energy, graffiti-covered walls
A small club setting, stage at eye level, front row faces visible, URL banner behind, intimate 100-person crowd
A converted warehouse space, industrial lighting, close quarters, crowd energy palpable, URL flag on the wall
A dimly lit lounge, leather couches pushed aside, standing room only, URL logo on a projector screen`
    },
    {
        name: 'battle_rap_lighting',
        category: 'battle_rap',
        description: 'Dramatic lighting setups for battle rap scenes',
        content: `harsh spotlight from above, dramatic shadows, smoke haze catching light beams
rim lighting silhouetting the subject, moody blue and red gels, cinematic atmosphere
natural daylight through industrial windows, dust particles floating in air beams
strobe-like stage lighting, high contrast, freeze-frame moment energy`
    },
    // Fashion/Wardrobe
    {
        name: 'designer_wardrobe',
        category: 'fashion',
        description: 'High-end designer clothing descriptions',
        content: `wearing a custom Gucci tracksuit, gold chains layered, fresh Jordans, confident stance
in a tailored Balenciaga coat, designer shades pushed up, Cuban link chain gleaming
dressed in Off-White hoodie with signature arrows, Yeezy 350s, diamond studs catching light
sporting a Louis Vuitton leather jacket, designer belt visible, iced-out watch`
    },
    {
        name: 'streetwear_wardrobe',
        category: 'fashion',
        description: 'Street fashion looks',
        content: `in a vintage Nike windbreaker, baggy jeans, Timberland boots, classic 90s aesthetic
wearing oversized hoodie with hood up, cargo pants, clean white Air Force 1s
dressed in graphic band tee, fitted cap turned back, gold watch, relaxed fit jeans
sporting a bomber jacket, joggers, high-top sneakers, chain tucked in shirt`
    },
    // Camera/Cinematography
    {
        name: 'camera_angle_dramatic',
        category: 'cinematography',
        description: 'Dramatic camera angles and shots',
        content: `low angle shot looking up, subject towering over frame, powerful presence
Dutch angle tilted 15 degrees, creating tension and unease
extreme close-up on face, eyes intense, every detail visible
over-the-shoulder shot, shallow depth of field, subject in sharp focus`
    },
    {
        name: 'film_grain_style',
        category: 'cinematography',
        description: 'Film stock and grain aesthetics',
        content: `shot on 35mm film, visible grain, warm color grading, nostalgic feel
digital cinema look, clean and crisp, subtle color correction
16mm documentary style, heavy grain, desaturated colors, raw and authentic
IMAX quality, ultra sharp, rich blacks, cinematic color science`
    },
    // Mood/Atmosphere
    {
        name: 'intense_mood',
        category: 'mood',
        description: 'Intense atmospheric descriptions',
        content: `tension thick in the air, crowd holding breath, moment before explosion
electric anticipation, sweat beading, focused determination
raw aggression barely contained, eyes locked, ready to strike
calculated confidence, knowing smirk, complete control of the room`
    },
    {
        name: 'triumphant_mood',
        category: 'mood',
        description: 'Victory and triumph atmospheres',
        content: `arms raised in victory, crowd erupting, pure elation
confident smile spreading, knowing they delivered, respect earned
standing tall in spotlight, moment of glory, crowd chanting
humble acknowledgment of crowd love, fist raised, job done`
    }
]

/**
 * Get preset by name
 */
export function getPresetByName(name: string): WildcardPreset | undefined {
    return STORYBOARD_WILDCARD_PRESETS.find(p => p.name === name)
}

/**
 * Get all presets in a category
 */
export function getPresetsByCategory(category: string): WildcardPreset[] {
    return STORYBOARD_WILDCARD_PRESETS.filter(p => p.category === category)
}

/**
 * Get all unique categories
 */
export function getPresetCategories(): string[] {
    return [...new Set(STORYBOARD_WILDCARD_PRESETS.map(p => p.category))]
}
