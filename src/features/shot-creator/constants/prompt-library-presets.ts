// Nano-Banana Model Specific Prompts for Director's Palette
// These prompts are optimized for the nano-banana model's capabilities

export interface PromptPreset {
  id: string
  title: string
  prompt: string
  categoryId: string
  tags: string[]
  isQuickAccess?: boolean
  reference?: string
}

export const PROMPT_CATEGORIES = [
  { id: 'consistency', name: 'Consistency Modifiers', icon: '🔒' },
  { id: 'cinematic', name: 'Cinematic Shots', icon: '🎬' },
  { id: 'characters', name: 'Character Styles', icon: '👤' },
  { id: 'lighting', name: 'Lighting Setups', icon: '💡' },
  { id: 'environments', name: 'Environments', icon: '🏞️' },
  { id: 'effects', name: 'Special Effects', icon: '✨' },
  { id: 'moods', name: 'Moods & Atmosphere', icon: '🎭' },
  { id: 'camera', name: 'Camera Angles', icon: '📷' },
  { id: 'styles', name: 'Art Styles', icon: '🎨' }
]

export const NANO_BANANA_PROMPTS: PromptPreset[] = [
  // ==================== CONSISTENCY MODIFIERS (10) ====================
  // These prompts help maintain character/subject consistency when changing angles, lighting, or styles
  // ALWAYS include reference images when using these!
  {
    id: 'cons-01',
    title: 'Same Character, New Angle',
    prompt: 'Maintain exact character consistency with reference image - same face, same clothing, same build. Only change the camera angle to: [DESCRIBE ANGLE]. Keep all other visual details identical to the reference.',
    categoryId: 'consistency',
    tags: ['consistency', 'angle', 'character', 'reference'],
    isQuickAccess: true,
    reference: 'Upload character reference - only camera angle will change'
  },
  {
    id: 'cons-02',
    title: 'Same Character, New Lighting',
    prompt: 'Keep character exactly consistent with reference - identical face, clothing, pose, and expression. Only modify the lighting to: [DESCRIBE LIGHTING]. Preserve all character details from the reference image.',
    categoryId: 'consistency',
    tags: ['consistency', 'lighting', 'character', 'reference'],
    isQuickAccess: true,
    reference: 'Upload character reference - only lighting will change'
  },
  {
    id: 'cons-03',
    title: 'Same Character, New Background',
    prompt: 'Maintain exact character consistency with reference image - preserve face, clothing, pose, and all physical details. Only change the background/environment to: [DESCRIBE SETTING]. Character should look identical to reference.',
    categoryId: 'consistency',
    tags: ['consistency', 'background', 'environment', 'reference'],
    isQuickAccess: true,
    reference: 'Upload character reference - only background will change'
  },
  {
    id: 'cons-04',
    title: 'Same Character, Art Style Transform',
    prompt: 'Keep the character\'s identity, features, and proportions exactly consistent with reference. Transform ONLY the art style to: [DESCRIBE STYLE]. The character should be immediately recognizable as the same person/subject.',
    categoryId: 'consistency',
    tags: ['consistency', 'style', 'transform', 'reference'],
    isQuickAccess: true,
    reference: 'Upload character reference - only art style will change'
  },
  {
    id: 'cons-05',
    title: 'Same Character, New Outfit',
    prompt: 'Maintain exact face and body consistency with reference image - same person, same features, same build. Only change their clothing/outfit to: [DESCRIBE OUTFIT]. Face and identity must be preserved exactly.',
    categoryId: 'consistency',
    tags: ['consistency', 'outfit', 'clothing', 'reference'],
    isQuickAccess: true,
    reference: 'Upload character reference - only outfit will change'
  },
  {
    id: 'cons-06',
    title: 'Same Character, New Pose',
    prompt: 'Keep character identity exactly consistent with reference - same face, same clothing, same style. Only change their pose/action to: [DESCRIBE POSE]. Character must be immediately recognizable from the reference.',
    categoryId: 'consistency',
    tags: ['consistency', 'pose', 'action', 'reference'],
    isQuickAccess: true,
    reference: 'Upload character reference - only pose/action will change'
  },
  {
    id: 'cons-07',
    title: 'Same Character, New Expression',
    prompt: 'Maintain exact character consistency with reference - same person, same outfit, same setting. Only change their facial expression to: [DESCRIBE EXPRESSION]. All other visual elements must match the reference exactly.',
    categoryId: 'consistency',
    tags: ['consistency', 'expression', 'emotion', 'reference'],
    isQuickAccess: true,
    reference: 'Upload character reference - only expression will change'
  },
  {
    id: 'cons-08',
    title: 'Same Product, New Context',
    prompt: 'Keep the product exactly consistent with reference image - same design, colors, branding, and details. Only change the context/setting to: [DESCRIBE CONTEXT]. Product must be identical to the reference.',
    categoryId: 'consistency',
    tags: ['consistency', 'product', 'commercial', 'reference'],
    isQuickAccess: true,
    reference: 'Upload product reference - only context/setting will change'
  },
  {
    id: 'cons-09',
    title: 'Same Style, Different Subject',
    prompt: 'Maintain the exact visual style, color palette, lighting approach, and artistic treatment from the reference image. Apply this identical style to a completely new subject: [DESCRIBE NEW SUBJECT].',
    categoryId: 'consistency',
    tags: ['consistency', 'style transfer', 'aesthetic', 'reference'],
    isQuickAccess: true,
    reference: 'Upload style reference - new subject will match this style'
  },
  {
    id: 'cons-10',
    title: 'Multi-Shot Consistency',
    prompt: 'This is part of a multi-shot sequence. Maintain exact visual consistency with all reference images - same characters, same setting, same style, same lighting. This shot shows: [DESCRIBE THIS SPECIFIC SHOT]. Everything must match the established look.',
    categoryId: 'consistency',
    tags: ['consistency', 'sequence', 'continuity', 'storyboard'],
    isQuickAccess: true,
    reference: 'Upload previous shots as reference for sequence continuity'
  },

  // ==================== CINEMATIC SHOTS (10) ====================
  {
    id: 'cin-01',
    title: 'Epic Wide Establishing',
    prompt: 'Cinematic establishing shot, vast landscape stretching to the horizon, dramatic cloud formations, golden hour lighting casting long shadows, ARRI Alexa quality, anamorphic lens flare, 2.39:1 aspect ratio, film grain',
    categoryId: 'cinematic',
    tags: ['establishing', 'wide', 'landscape', 'golden hour', 'epic'],
    isQuickAccess: true
  },
  {
    id: 'cin-02',
    title: 'Intimate Close-Up',
    prompt: 'Extreme close-up portrait, shallow depth of field f/1.4, catch light in eyes, soft skin detail, cinematic color grading with teal and orange, professional studio lighting, 85mm lens',
    categoryId: 'cinematic',
    tags: ['close-up', 'portrait', 'shallow dof', 'intimate'],
    isQuickAccess: true
  },
  {
    id: 'cin-03',
    title: 'Dynamic Action Tracking',
    prompt: 'Dynamic tracking shot, motion blur on background, sharp subject, high speed photography, dramatic lighting, dust particles in air, slow motion feel, action movie cinematography',
    categoryId: 'cinematic',
    tags: ['action', 'tracking', 'motion blur', 'dynamic'],
    isQuickAccess: false
  },
  {
    id: 'cin-04',
    title: 'Noir Mystery',
    prompt: 'Film noir style, high contrast black and white, venetian blind shadows on face, cigarette smoke wisps, 1940s detective aesthetic, moody atmospheric lighting, classic Hollywood composition',
    categoryId: 'cinematic',
    tags: ['noir', 'mystery', 'black and white', 'dramatic'],
    isQuickAccess: false
  },
  {
    id: 'cin-05',
    title: 'Sci-Fi Future',
    prompt: 'Futuristic cityscape, neon holographic advertisements, flying vehicles, rain-slicked streets with reflections, cyberpunk aesthetic, Blade Runner inspired, blue and pink color palette, volumetric fog',
    categoryId: 'cinematic',
    tags: ['sci-fi', 'cyberpunk', 'futuristic', 'neon'],
    isQuickAccess: true
  },
  {
    id: 'cin-06',
    title: 'Western Standoff',
    prompt: 'Classic western standoff, sun blazing behind, dust devils swirling, extreme wide shot, desert landscape, silhouetted figures, Sergio Leone composition, warm sepia tones',
    categoryId: 'cinematic',
    tags: ['western', 'desert', 'standoff', 'silhouette'],
    isQuickAccess: false
  },
  {
    id: 'cin-07',
    title: 'Romantic Sunset',
    prompt: 'Romantic couple silhouette against vibrant sunset, warm orange and purple sky, lens flare, soft focus background, intimate moment captured, backlit, bokeh lights',
    categoryId: 'cinematic',
    tags: ['romantic', 'sunset', 'silhouette', 'couple'],
    isQuickAccess: false
  },
  {
    id: 'cin-08',
    title: 'Horror Reveal',
    prompt: 'Horror movie reveal shot, single source lighting from below, deep shadows, unsettling composition, Dutch angle, fog machine atmosphere, desaturated colors, tension-building frame',
    categoryId: 'cinematic',
    tags: ['horror', 'dramatic', 'shadows', 'unsettling'],
    isQuickAccess: false
  },
  {
    id: 'cin-09',
    title: 'Documentary Natural',
    prompt: 'Documentary style candid moment, natural lighting, authentic expression, environmental portrait, shallow depth of field, intimate storytelling, raw emotional capture',
    categoryId: 'cinematic',
    tags: ['documentary', 'candid', 'natural', 'authentic'],
    isQuickAccess: false
  },
  {
    id: 'cin-10',
    title: 'Epic Battle',
    prompt: 'Epic battle scene, sweeping camera movement, thousands of warriors, dramatic sky, clash of armies, dust and debris, heroic composition, historical epic film quality',
    categoryId: 'cinematic',
    tags: ['battle', 'epic', 'action', 'dramatic'],
    isQuickAccess: false
  },

  // ==================== CHARACTER STYLES (10) ====================
  {
    id: 'char-01',
    title: 'Heroic Protagonist',
    prompt: 'Heroic character portrait, determined expression, dramatic three-quarter lighting, wind-swept hair, confident stance, warm rim light, superhero movie aesthetic, detailed costume design',
    categoryId: 'characters',
    tags: ['hero', 'protagonist', 'dramatic', 'confident'],
    isQuickAccess: true
  },
  {
    id: 'char-02',
    title: 'Mysterious Villain',
    prompt: 'Sinister villain character, half-face in shadow, cold blue lighting, calculating expression, ornate dark costume, menacing presence, high contrast lighting, detailed facial features',
    categoryId: 'characters',
    tags: ['villain', 'mysterious', 'dark', 'menacing'],
    isQuickAccess: true
  },
  {
    id: 'char-03',
    title: 'Fantasy Warrior',
    prompt: 'Fantasy warrior in ornate armor, battle-worn details, magical runes glowing, epic pose, dramatic cape flowing, detailed metalwork, fantasy art style, heroic lighting',
    categoryId: 'characters',
    tags: ['fantasy', 'warrior', 'armor', 'medieval'],
    isQuickAccess: true
  },
  {
    id: 'char-04',
    title: 'Cyberpunk Hacker',
    prompt: 'Cyberpunk hacker character, neon-lit face, augmented reality interface reflections, tech-wear fashion, holographic displays, urban night setting, high-tech low-life aesthetic',
    categoryId: 'characters',
    tags: ['cyberpunk', 'hacker', 'tech', 'futuristic'],
    isQuickAccess: false
  },
  {
    id: 'char-05',
    title: 'Elegant Period',
    prompt: 'Elegant period costume portrait, Victorian or Regency era, intricate fabric details, soft diffused lighting, classical composition, subtle expression, historical accuracy, oil painting quality',
    categoryId: 'characters',
    tags: ['period', 'elegant', 'historical', 'victorian'],
    isQuickAccess: false
  },
  {
    id: 'char-06',
    title: 'Post-Apocalyptic Survivor',
    prompt: 'Post-apocalyptic survivor, weathered face with dirt and scars, improvised gear and weapons, harsh natural lighting, determined gaze, dystopian background, gritty texture',
    categoryId: 'characters',
    tags: ['apocalyptic', 'survivor', 'gritty', 'dystopian'],
    isQuickAccess: false
  },
  {
    id: 'char-07',
    title: 'Anime-Inspired',
    prompt: 'Anime-inspired character, large expressive eyes, dynamic hair, colorful costume design, cel-shading style, dramatic action pose, vibrant colors, manga aesthetic',
    categoryId: 'characters',
    tags: ['anime', 'manga', 'colorful', 'stylized'],
    isQuickAccess: false
  },
  {
    id: 'char-08',
    title: 'Corporate Executive',
    prompt: 'Powerful corporate executive, sharp tailored suit, confident posture, modern glass office background, dramatic lighting, strong jaw angle, professional portrait style',
    categoryId: 'characters',
    tags: ['corporate', 'professional', 'executive', 'modern'],
    isQuickAccess: false
  },
  {
    id: 'char-09',
    title: 'Magical Being',
    prompt: 'Ethereal magical being, glowing energy effects, otherworldly beauty, floating elements, mystical atmosphere, iridescent colors, fantasy creature design, luminous skin',
    categoryId: 'characters',
    tags: ['magical', 'ethereal', 'fantasy', 'mystical'],
    isQuickAccess: false
  },
  {
    id: 'char-10',
    title: 'Street Style Urban',
    prompt: 'Urban street style character, contemporary fashion, graffiti wall background, natural daylight, authentic pose, trendy accessories, fashion photography style, lifestyle aesthetic',
    categoryId: 'characters',
    tags: ['street', 'urban', 'fashion', 'modern'],
    isQuickAccess: false
  },

  // ==================== LIGHTING SETUPS (10) ====================
  // TIP: Add reference images and use with "maintain character consistency" for best results
  {
    id: 'light-01',
    title: 'Golden Hour Magic',
    prompt: 'Maintain subject consistency with reference. Apply golden hour lighting - warm orange sunlight, long dramatic shadows, lens flare, soft diffused light, magical hour glow, backlit subject. Keep all subject details identical to reference, only change lighting.',
    categoryId: 'lighting',
    tags: ['golden hour', 'warm', 'sunset', 'natural', 'consistency'],
    isQuickAccess: true,
    reference: 'Upload subject reference - only lighting changes to golden hour'
  },
  {
    id: 'light-02',
    title: 'Dramatic Rembrandt',
    prompt: 'Maintain subject consistency with reference. Apply Rembrandt lighting - triangle of light on cheek, deep shadows, single source dramatic, chiaroscuro effect, classical portrait lighting, rich contrast. Subject must match reference exactly.',
    categoryId: 'lighting',
    tags: ['rembrandt', 'dramatic', 'portrait', 'classical', 'consistency'],
    isQuickAccess: true,
    reference: 'Upload subject reference - only lighting changes to Rembrandt style'
  },
  {
    id: 'light-03',
    title: 'Neon Glow',
    prompt: 'Maintain subject consistency with reference. Apply neon lighting - vibrant pink and blue glow, urban night aesthetic, colorful reflections, synthwave atmosphere, high contrast, cyberpunk mood. Keep subject identical to reference.',
    categoryId: 'lighting',
    tags: ['neon', 'colorful', 'night', 'urban', 'consistency'],
    isQuickAccess: true,
    reference: 'Upload subject reference - only lighting changes to neon'
  },
  {
    id: 'light-04',
    title: 'Soft Window Light',
    prompt: 'Maintain subject consistency with reference. Apply soft natural window light - gentle shadows, diffused daylight, intimate indoor setting, peaceful atmosphere, even skin tones. Subject details must match reference.',
    categoryId: 'lighting',
    tags: ['soft', 'natural', 'window', 'diffused', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - only lighting changes to soft window'
  },
  {
    id: 'light-05',
    title: 'High-Key Bright',
    prompt: 'Maintain subject consistency with reference. Apply high-key lighting - bright and airy, minimal shadows, white background, clean aesthetic, overexposed highlights, ethereal mood. Subject must be identical to reference.',
    categoryId: 'lighting',
    tags: ['high-key', 'bright', 'clean', 'fashion', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - only lighting changes to high-key'
  },
  {
    id: 'light-06',
    title: 'Low-Key Moody',
    prompt: 'Maintain subject consistency with reference. Apply low-key lighting - deep blacks, dramatic contrast, single spotlight, mysterious atmosphere, film noir style, selective illumination. Keep subject identical to reference.',
    categoryId: 'lighting',
    tags: ['low-key', 'dramatic', 'noir', 'moody', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - only lighting changes to low-key'
  },
  {
    id: 'light-07',
    title: 'Practical Lights',
    prompt: 'Maintain subject consistency with reference. Apply practical lighting - visible light sources in frame, realistic interior lighting, warm tungsten bulbs, cozy atmosphere, motivated lighting. Subject must match reference.',
    categoryId: 'lighting',
    tags: ['practical', 'interior', 'warm', 'realistic', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - only lighting changes to practical'
  },
  {
    id: 'light-08',
    title: 'Silhouette Backlit',
    prompt: 'Maintain subject consistency with reference. Apply strong backlight - complete silhouette, rim light outline, dramatic contrast, sunrise or sunset, powerful shape definition. Subject silhouette must match reference proportions.',
    categoryId: 'lighting',
    tags: ['silhouette', 'backlit', 'dramatic', 'shape', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - transforms to silhouette'
  },
  {
    id: 'light-09',
    title: 'Studio Three-Point',
    prompt: 'Maintain subject consistency with reference. Apply professional three-point lighting - key light, fill light, back light separation, clean shadows, studio portrait quality, commercial look. Subject must be identical to reference.',
    categoryId: 'lighting',
    tags: ['studio', 'professional', 'three-point', 'controlled', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - only lighting changes to studio'
  },
  {
    id: 'light-10',
    title: 'Candlelight Intimate',
    prompt: 'Maintain subject consistency with reference. Apply candlelight illumination - warm flickering glow, intimate atmosphere, soft shadows, romantic mood, orange color temperature. Keep subject identical to reference.',
    categoryId: 'lighting',
    tags: ['candlelight', 'warm', 'romantic', 'intimate', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - only lighting changes to candlelight'
  },

  // ==================== ENVIRONMENTS (10) ====================
  {
    id: 'env-01',
    title: 'Enchanted Forest',
    prompt: 'Enchanted forest, mystical fog between ancient trees, dappled sunlight through canopy, bioluminescent plants, fantasy atmosphere, magical woodland, ethereal glow',
    categoryId: 'environments',
    tags: ['forest', 'magical', 'fantasy', 'mystical'],
    isQuickAccess: true
  },
  {
    id: 'env-02',
    title: 'Futuristic Metropolis',
    prompt: 'Futuristic city skyline, towering skyscrapers with holographic displays, flying vehicles, advanced architecture, night scene with neon lights, sci-fi urban landscape',
    categoryId: 'environments',
    tags: ['futuristic', 'city', 'sci-fi', 'urban'],
    isQuickAccess: true
  },
  {
    id: 'env-03',
    title: 'Underwater Kingdom',
    prompt: 'Underwater coral kingdom, bioluminescent sea creatures, sunlight filtering through water, vibrant marine colors, aquatic architecture, serene underwater atmosphere',
    categoryId: 'environments',
    tags: ['underwater', 'ocean', 'coral', 'marine'],
    isQuickAccess: false
  },
  {
    id: 'env-04',
    title: 'Ancient Temple',
    prompt: 'Ancient temple ruins, overgrown with vegetation, dramatic god rays through crumbling roof, moss-covered stones, archaeological mystery, adventure movie setting',
    categoryId: 'environments',
    tags: ['temple', 'ancient', 'ruins', 'archaeological'],
    isQuickAccess: true
  },
  {
    id: 'env-05',
    title: 'Space Station',
    prompt: 'Orbital space station interior, sleek futuristic design, Earth visible through windows, zero gravity elements, clean white surfaces, control panels with holograms',
    categoryId: 'environments',
    tags: ['space', 'station', 'futuristic', 'orbital'],
    isQuickAccess: false
  },
  {
    id: 'env-06',
    title: 'Desert Dunes',
    prompt: 'Vast desert landscape, rolling sand dunes, dramatic sunset sky, caravan silhouette in distance, wind-swept patterns in sand, epic scale, adventure atmosphere',
    categoryId: 'environments',
    tags: ['desert', 'dunes', 'landscape', 'sunset'],
    isQuickAccess: false
  },
  {
    id: 'env-07',
    title: 'Cozy Coffee Shop',
    prompt: 'Cozy coffee shop interior, warm ambient lighting, exposed brick walls, wooden furniture, plants and books, steam from coffee cups, comfortable atmosphere',
    categoryId: 'environments',
    tags: ['coffee shop', 'cozy', 'interior', 'warm'],
    isQuickAccess: false
  },
  {
    id: 'env-08',
    title: 'Mountain Summit',
    prompt: 'Mountain summit view, clouds below, dramatic sky above, snow-capped peaks, vast wilderness, epic landscape photography, sense of achievement and scale',
    categoryId: 'environments',
    tags: ['mountain', 'summit', 'epic', 'nature'],
    isQuickAccess: false
  },
  {
    id: 'env-09',
    title: 'Haunted Mansion',
    prompt: 'Gothic haunted mansion, moonlit night, twisted dead trees, fog rolling across grounds, broken windows, eerie atmosphere, horror movie setting, Victorian architecture',
    categoryId: 'environments',
    tags: ['haunted', 'gothic', 'horror', 'mansion'],
    isQuickAccess: false
  },
  {
    id: 'env-10',
    title: 'Tropical Paradise',
    prompt: 'Tropical paradise beach, crystal clear turquoise water, white sand, palm trees swaying, perfect sunset, vacation destination, paradise island, serene and beautiful',
    categoryId: 'environments',
    tags: ['tropical', 'beach', 'paradise', 'vacation'],
    isQuickAccess: false
  },

  // ==================== SPECIAL EFFECTS (10) ====================
  {
    id: 'fx-01',
    title: 'Magic Particles',
    prompt: 'Swirling magical particles, glowing energy effects, sparkles and light trails, mystical atmosphere, fantasy magic casting, luminous colors, ethereal glow',
    categoryId: 'effects',
    tags: ['magic', 'particles', 'glow', 'fantasy'],
    isQuickAccess: true
  },
  {
    id: 'fx-02',
    title: 'Epic Explosion',
    prompt: 'Massive cinematic explosion, fireballs and debris, shockwave distortion, action movie pyrotechnics, dramatic lighting from flames, slow motion capture feel',
    categoryId: 'effects',
    tags: ['explosion', 'action', 'fire', 'dramatic'],
    isQuickAccess: true
  },
  {
    id: 'fx-03',
    title: 'Rain and Reflections',
    prompt: 'Heavy rain falling, wet surfaces with reflections, street lights creating bokeh, moody atmosphere, cinematic rain effect, water droplets on camera lens',
    categoryId: 'effects',
    tags: ['rain', 'reflections', 'wet', 'moody'],
    isQuickAccess: true
  },
  {
    id: 'fx-04',
    title: 'Lightning Strike',
    prompt: 'Dramatic lightning strike, electrical discharge, storm clouds, split-second illumination, branching energy, powerful natural force, high contrast',
    categoryId: 'effects',
    tags: ['lightning', 'storm', 'electrical', 'dramatic'],
    isQuickAccess: false
  },
  {
    id: 'fx-05',
    title: 'Holographic Display',
    prompt: 'Futuristic holographic projection, translucent blue light, floating UI elements, data visualization, sci-fi interface, interactive display, technology aesthetic',
    categoryId: 'effects',
    tags: ['hologram', 'futuristic', 'interface', 'tech'],
    isQuickAccess: false
  },
  {
    id: 'fx-06',
    title: 'Smoke and Fog',
    prompt: 'Atmospheric smoke and fog, volumetric lighting, mysterious atmosphere, wisps of vapor, dramatic haze, layered depth, cinematic atmosphere enhancement',
    categoryId: 'effects',
    tags: ['smoke', 'fog', 'atmospheric', 'mysterious'],
    isQuickAccess: false
  },
  {
    id: 'fx-07',
    title: 'Portal Gateway',
    prompt: 'Swirling dimensional portal, energy vortex, glowing edges, space-time distortion, magical gateway, sci-fi or fantasy doorway, powerful visual effect',
    categoryId: 'effects',
    tags: ['portal', 'dimensional', 'magic', 'vortex'],
    isQuickAccess: false
  },
  {
    id: 'fx-08',
    title: 'Shattered Glass',
    prompt: 'Shattering glass fragments, frozen in mid-explosion, light refraction through pieces, high-speed capture, dramatic breakage, crystalline shards',
    categoryId: 'effects',
    tags: ['glass', 'shatter', 'fragments', 'action'],
    isQuickAccess: false
  },
  {
    id: 'fx-09',
    title: 'Fire and Embers',
    prompt: 'Roaring flames with floating embers, warm orange glow, fire particles rising, heat distortion, dramatic fire effect, dynamic flame movement',
    categoryId: 'effects',
    tags: ['fire', 'embers', 'flames', 'warm'],
    isQuickAccess: false
  },
  {
    id: 'fx-10',
    title: 'Snow and Ice',
    prompt: 'Gently falling snow, ice crystals forming, frozen surfaces, winter atmosphere, delicate snowflakes, cold blue tones, magical winter scene',
    categoryId: 'effects',
    tags: ['snow', 'ice', 'winter', 'frozen'],
    isQuickAccess: false
  },

  // ==================== MOODS & ATMOSPHERE (10) ====================
  {
    id: 'mood-01',
    title: 'Dreamy Ethereal',
    prompt: 'Dreamy ethereal atmosphere, soft focus glow, pastel color palette, floating elements, peaceful serenity, otherworldly beauty, gentle light diffusion',
    categoryId: 'moods',
    tags: ['dreamy', 'ethereal', 'soft', 'peaceful'],
    isQuickAccess: true
  },
  {
    id: 'mood-02',
    title: 'Intense Drama',
    prompt: 'High tension dramatic moment, stark contrast, powerful emotion, decisive instant, theatrical lighting, intense expression, cinematic drama peak',
    categoryId: 'moods',
    tags: ['dramatic', 'intense', 'tension', 'emotional'],
    isQuickAccess: true
  },
  {
    id: 'mood-03',
    title: 'Peaceful Serenity',
    prompt: 'Tranquil peaceful scene, soft natural light, harmonious composition, calming colors, zen atmosphere, meditative quality, quiet beauty',
    categoryId: 'moods',
    tags: ['peaceful', 'serene', 'calm', 'tranquil'],
    isQuickAccess: true
  },
  {
    id: 'mood-04',
    title: 'Melancholy Rain',
    prompt: 'Melancholic rainy day, solitary figure, muted colors, contemplative mood, emotional depth, bittersweet atmosphere, introspective moment',
    categoryId: 'moods',
    tags: ['melancholy', 'rain', 'sad', 'contemplative'],
    isQuickAccess: false
  },
  {
    id: 'mood-05',
    title: 'Joyful Celebration',
    prompt: 'Joyful celebratory moment, bright vibrant colors, confetti and streamers, genuine happiness, festive energy, warm social gathering, pure joy captured',
    categoryId: 'moods',
    tags: ['joyful', 'celebration', 'happy', 'festive'],
    isQuickAccess: false
  },
  {
    id: 'mood-06',
    title: 'Mysterious Unknown',
    prompt: 'Mysterious atmospheric scene, hidden in shadows, sense of intrigue, unanswered questions, foggy uncertainty, compelling mystery, suspenseful anticipation',
    categoryId: 'moods',
    tags: ['mysterious', 'intrigue', 'suspense', 'unknown'],
    isQuickAccess: false
  },
  {
    id: 'mood-07',
    title: 'Nostalgic Memory',
    prompt: 'Nostalgic vintage atmosphere, warm sepia tones, faded photograph quality, memories of the past, sentimental feeling, timeless moment preserved',
    categoryId: 'moods',
    tags: ['nostalgic', 'vintage', 'memory', 'sentimental'],
    isQuickAccess: false
  },
  {
    id: 'mood-08',
    title: 'Epic Grandeur',
    prompt: 'Epic sense of scale, awe-inspiring vastness, grand composition, overwhelming beauty, monumental scene, majestic atmosphere, breathtaking scope',
    categoryId: 'moods',
    tags: ['epic', 'grand', 'majestic', 'awe'],
    isQuickAccess: false
  },
  {
    id: 'mood-09',
    title: 'Cozy Comfort',
    prompt: 'Cozy comfortable atmosphere, warm inviting space, soft textures, ambient glow, home comfort, hygge aesthetic, welcoming warmth',
    categoryId: 'moods',
    tags: ['cozy', 'comfortable', 'warm', 'inviting'],
    isQuickAccess: false
  },
  {
    id: 'mood-10',
    title: 'Ominous Foreboding',
    prompt: 'Ominous threatening atmosphere, dark clouds gathering, sense of impending doom, unsettling tension, foreboding shadows, something wicked approaches',
    categoryId: 'moods',
    tags: ['ominous', 'threatening', 'dark', 'foreboding'],
    isQuickAccess: false
  },

  // ==================== CAMERA ANGLES (10) ====================
  // TIP: Add reference images and use with "maintain character consistency" for best results
  {
    id: 'cam-01',
    title: 'Extreme Low Angle',
    prompt: 'Maintain subject consistency with reference. Extreme low angle looking up, powerful imposing perspective, subject towering above, dramatic sky background, hero shot composition, dominance and power. Keep all character/subject details identical to reference.',
    categoryId: 'camera',
    tags: ['low angle', 'power', 'dramatic', 'hero', 'consistency'],
    isQuickAccess: true,
    reference: 'Upload subject reference - angle changes but subject stays consistent'
  },
  {
    id: 'cam-02',
    title: 'Birds Eye View',
    prompt: 'Maintain subject consistency with reference. Birds eye view directly above, unique overhead perspective, patterns revealed from above, miniature world effect, god perspective, aerial composition. Preserve all subject details from reference.',
    categoryId: 'camera',
    tags: ['aerial', 'overhead', 'birds eye', 'unique', 'consistency'],
    isQuickAccess: true,
    reference: 'Upload subject reference - view changes but subject stays consistent'
  },
  {
    id: 'cam-03',
    title: 'Dutch Angle',
    prompt: 'Maintain subject consistency with reference. Dutch angle tilted frame, disorientation and unease, dynamic diagonal composition, psychological tension, unconventional perspective, visual instability. Subject must match reference exactly.',
    categoryId: 'camera',
    tags: ['dutch angle', 'tilted', 'tension', 'dynamic', 'consistency'],
    isQuickAccess: true,
    reference: 'Upload subject reference - tilt changes but subject stays consistent'
  },
  {
    id: 'cam-04',
    title: 'Over-the-Shoulder',
    prompt: 'Maintain character consistency with reference. Over-the-shoulder shot, conversational perspective, depth layers in frame, character point of view, dialogue scene composition, intimate two-shot. Character must be identical to reference.',
    categoryId: 'camera',
    tags: ['over-shoulder', 'dialogue', 'pov', 'intimate', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload character reference for the person being viewed'
  },
  {
    id: 'cam-05',
    title: 'Extreme Wide',
    prompt: 'Maintain subject consistency with reference. Extreme wide shot, vast expanse, subject small in environment, sense of scale and isolation, landscape dominance, environmental context. Subject details must match reference.',
    categoryId: 'camera',
    tags: ['wide', 'landscape', 'scale', 'isolation', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - framing changes but subject stays consistent'
  },
  {
    id: 'cam-06',
    title: 'Macro Detail',
    prompt: 'Maintain subject consistency with reference. Macro extreme close-up, incredible detail revealed, shallow depth of field, hidden world exposed, texture and pattern focus, intimate detail. Focus on specific detail while maintaining overall consistency.',
    categoryId: 'camera',
    tags: ['macro', 'detail', 'close-up', 'texture', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - shows extreme close-up detail'
  },
  {
    id: 'cam-07',
    title: 'Tracking Side',
    prompt: 'Maintain subject consistency with reference. Side tracking shot perspective, moving alongside subject, dynamic motion feel, parallel movement, smooth camera glide, action progression. Subject must match reference exactly.',
    categoryId: 'camera',
    tags: ['tracking', 'motion', 'dynamic', 'movement', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - captures dynamic side view'
  },
  {
    id: 'cam-08',
    title: 'Worms Eye View',
    prompt: 'Maintain subject consistency with reference. Worms eye view from ground level, looking up at towering elements, dramatic perspective distortion, immersive ground perspective, unusual viewpoint. Subject must be identical to reference.',
    categoryId: 'camera',
    tags: ['worms eye', 'ground', 'perspective', 'dramatic', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - extreme low angle view'
  },
  {
    id: 'cam-09',
    title: 'Through Object',
    prompt: 'Maintain subject consistency with reference. Shot through foreground object, frame within frame, creative visual layering, depth and mystery, architectural framing, discovered view. Subject in background must match reference.',
    categoryId: 'camera',
    tags: ['framing', 'through', 'layered', 'creative', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - viewed through foreground element'
  },
  {
    id: 'cam-10',
    title: 'Reflection Shot',
    prompt: 'Maintain subject consistency with reference. Shot composed through reflection, mirror or water surface, doubled reality, creative composition, symmetry and distortion, reflective storytelling. Subject must be identical to reference.',
    categoryId: 'camera',
    tags: ['reflection', 'mirror', 'symmetry', 'creative', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - shown in reflection'
  },

  // ==================== ART STYLES (10) ====================
  // TIP: Add reference images to maintain subject consistency while changing art style
  {
    id: 'style-01',
    title: 'Oil Painting Classic',
    prompt: 'Maintain subject identity with reference. Transform into classical oil painting style - visible brushstrokes, rich color depth, museum quality, renaissance masters influence, traditional fine art aesthetic. Subject must be recognizable from reference.',
    categoryId: 'styles',
    tags: ['oil painting', 'classical', 'fine art', 'traditional', 'consistency'],
    isQuickAccess: true,
    reference: 'Upload subject reference - transforms to oil painting style'
  },
  {
    id: 'style-02',
    title: 'Watercolor Flow',
    prompt: 'Maintain subject identity with reference. Transform into delicate watercolor painting - soft color bleeding, paper texture visible, flowing pigment wash, artistic imperfection, gentle impressionistic style. Subject must be recognizable.',
    categoryId: 'styles',
    tags: ['watercolor', 'soft', 'flowing', 'artistic', 'consistency'],
    isQuickAccess: true,
    reference: 'Upload subject reference - transforms to watercolor style'
  },
  {
    id: 'style-03',
    title: 'Digital Concept Art',
    prompt: 'Maintain subject identity with reference. Transform into professional digital concept art - entertainment industry quality, painterly yet detailed, dramatic composition, AAA game or film style. Subject must be recognizable from reference.',
    categoryId: 'styles',
    tags: ['concept art', 'digital', 'professional', 'entertainment', 'consistency'],
    isQuickAccess: true,
    reference: 'Upload subject reference - transforms to concept art style'
  },
  {
    id: 'style-04',
    title: 'Anime Cel-Shading',
    prompt: 'Maintain subject identity with reference. Transform into Japanese anime style - clean cel-shading, bold outlines, vibrant flat colors, manga influence, expressive character design. Subject features must be recognizable from reference.',
    categoryId: 'styles',
    tags: ['anime', 'cel-shading', 'manga', 'japanese', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - transforms to anime style'
  },
  {
    id: 'style-05',
    title: 'Pixel Art Retro',
    prompt: 'Maintain subject identity with reference. Transform into retro pixel art style - limited color palette, nostalgic 16-bit aesthetic, chunky pixels visible, video game graphics. Subject silhouette must match reference.',
    categoryId: 'styles',
    tags: ['pixel art', 'retro', '8-bit', 'gaming', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - transforms to pixel art style'
  },
  {
    id: 'style-06',
    title: 'Art Nouveau Elegant',
    prompt: 'Maintain subject identity with reference. Transform into art nouveau decorative style - flowing organic lines, ornate natural patterns, Alphonse Mucha influence, elegant composition. Subject must be recognizable from reference.',
    categoryId: 'styles',
    tags: ['art nouveau', 'decorative', 'elegant', 'vintage', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - transforms to art nouveau style'
  },
  {
    id: 'style-07',
    title: 'Pop Art Bold',
    prompt: 'Maintain subject identity with reference. Transform into bold pop art style - bright contrasting colors, halftone dots pattern, Andy Warhol influence, commercial art aesthetic. Subject must be immediately recognizable from reference.',
    categoryId: 'styles',
    tags: ['pop art', 'bold', 'graphic', 'warhol', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - transforms to pop art style'
  },
  {
    id: 'style-08',
    title: 'Impressionist Light',
    prompt: 'Maintain subject identity with reference. Transform into impressionist painting style - visible brushwork capturing light, soft focus on atmosphere, Monet influence, plein air feeling. Subject must be recognizable from reference.',
    categoryId: 'styles',
    tags: ['impressionist', 'light', 'monet', 'atmospheric', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - transforms to impressionist style'
  },
  {
    id: 'style-09',
    title: 'Comic Book Graphic',
    prompt: 'Maintain subject identity with reference. Transform into comic book illustration style - bold ink outlines, dynamic action lines, Ben-Day dots, superhero comics aesthetic. Subject must be recognizable from reference.',
    categoryId: 'styles',
    tags: ['comic', 'graphic', 'illustration', 'superhero', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - transforms to comic book style'
  },
  {
    id: 'style-10',
    title: 'Photorealistic Detail',
    prompt: 'Maintain subject identity with reference. Transform into photorealistic rendering - indistinguishable from photograph, extreme detail and accuracy, hyperrealism, perfect lighting. Subject must match reference exactly.',
    categoryId: 'styles',
    tags: ['photorealistic', 'hyperreal', 'detailed', 'accurate', 'consistency'],
    isQuickAccess: false,
    reference: 'Upload subject reference - transforms to photorealistic'
  },

  // ==================== NEW PROMPTS FROM NANO BANANA PRO COMMUNITY ====================

  // PROMPTS WITH REFERENCE IMAGES
  {
    id: 'ref-01',
    title: '1990s Camera Flash Portrait',
    prompt: 'Keep facial features exactly consistent with reference. 1990s disposable camera aesthetic, direct flash harsh lighting, red-eye effect, slight overexposure, warm tungsten color cast, film grain, slightly out of focus edges, authentic vintage snapshot feel, party or candid moment vibe',
    categoryId: 'styles',
    tags: ['90s', 'flash', 'vintage', 'film', 'portrait'],
    isQuickAccess: true,
    reference: 'Upload a portrait photo - face will be preserved with vintage flash effect'
  },
  {
    id: 'ref-02',
    title: 'Studio Ghibli Portrait',
    prompt: 'Keep facial features consistent with reference, transformed into Studio Ghibli anime style. Hayao Miyazaki character design, soft watercolor backgrounds, expressive anime eyes, gentle color palette, hand-drawn animation quality, whimsical fantasy atmosphere, Spirited Away or Howl\'s Moving Castle aesthetic',
    categoryId: 'styles',
    tags: ['ghibli', 'anime', 'miyazaki', 'portrait', 'japanese'],
    isQuickAccess: true,
    reference: 'Upload a portrait - will be transformed into Ghibli anime style'
  },
  {
    id: 'ref-03',
    title: 'Pop Art Portrait (Warhol Style)',
    prompt: 'Keep facial features consistent with reference, transformed into Andy Warhol pop art style. Bold flat colors, high contrast, halftone dot pattern, screen print aesthetic, 4-panel color variations, iconic pop art portrait, Marilyn Monroe series inspired, vibrant complementary colors',
    categoryId: 'styles',
    tags: ['pop art', 'warhol', 'colorful', 'portrait', 'iconic'],
    isQuickAccess: true,
    reference: 'Upload a portrait - will become iconic Warhol-style pop art'
  },
  {
    id: 'ref-04',
    title: 'Passport Photo (Official)',
    prompt: 'Keep facial features exactly consistent with reference. Official passport/ID photo format, plain white or light gray background, neutral expression, eyes open and visible, no glasses glare, shoulders visible, even lighting with no harsh shadows, front-facing centered composition, compliant with official photo requirements',
    categoryId: 'characters',
    tags: ['passport', 'id', 'official', 'portrait', 'document'],
    isQuickAccess: true,
    reference: 'Upload any photo - will be converted to official passport format'
  },
  {
    id: 'ref-05',
    title: 'Pet Portrait Royalty',
    prompt: 'Keep the pet\'s features exactly consistent with reference. Transform pet into royal Renaissance portrait, wearing ornate royal robes and crown, sitting on throne, dramatic oil painting style, rich velvet textures, gold embroidery details, regal pose, classical portrait composition, museum-quality painting aesthetic, funny yet dignified',
    categoryId: 'characters',
    tags: ['pet', 'royal', 'renaissance', 'portrait', 'funny'],
    isQuickAccess: true,
    reference: 'Upload pet photo - your pet becomes royalty!'
  },
  {
    id: 'ref-06',
    title: 'Claymation Character',
    prompt: 'Keep facial features consistent with reference. Transform into Aardman-style claymation character (Wallace & Gromit, Shaun the Sheep), exaggerated features, visible clay texture, fingerprint impressions in clay, stop-motion animation aesthetic, plasticine material quality, warm studio lighting, whimsical personality',
    categoryId: 'styles',
    tags: ['claymation', 'aardman', 'wallace', 'animation', '3d'],
    isQuickAccess: true,
    reference: 'Upload a portrait - become a claymation character'
  },

  // CREATIVE PROMPTS (NO REFERENCE NEEDED)
  {
    id: 'creative-01',
    title: 'Recursive iPad Cat',
    prompt: 'A cat sitting at a table looking at an iPad. On the iPad screen is the same image of a cat looking at an iPad. The iPad screen shows the same scene recursively, creating an infinite recursion effect. Droste effect, mise en abyme, photorealistic rendering, cozy home setting, warm lighting, humorous and surreal',
    categoryId: 'effects',
    tags: ['recursive', 'cat', 'iPad', 'droste', 'surreal', 'funny'],
    isQuickAccess: true
  },
  {
    id: 'creative-02',
    title: 'Whiteboard Marker Art',
    prompt: 'Drawing created with whiteboard markers on a transparent glass whiteboard, from behind the glass so text appears correctly. Office setting visible through glass, hand-drawn diagrams and doodles, colorful dry-erase markers, casual sketch style, brainstorming aesthetic, startup vibes, educational',
    categoryId: 'styles',
    tags: ['whiteboard', 'sketch', 'office', 'diagram', 'brainstorm'],
    isQuickAccess: false
  },
  {
    id: 'creative-03',
    title: 'How Engineers See (Technical)',
    prompt: 'Split visualization showing how engineers see the world: left side shows normal everyday object, right side shows same object as exploded technical diagram with measurements, specifications, material callouts, engineering annotations, CAD wireframe overlay, structural analysis, patent drawing style, technical illustration',
    categoryId: 'effects',
    tags: ['engineering', 'technical', 'diagram', 'split view', 'funny'],
    isQuickAccess: true
  },
  {
    id: 'creative-04',
    title: 'Isometric Room Diorama',
    prompt: 'Detailed isometric 3D cutaway of a cozy room, miniature diorama style, tilt-shift effect, every small object perfectly detailed, warm lighting from windows, tiny furniture and decorations, architectural cross-section, video game art style, The Sims aesthetic, charming and intricate',
    categoryId: 'environments',
    tags: ['isometric', 'diorama', 'room', 'miniature', 'cozy'],
    isQuickAccess: true
  },
  {
    id: 'creative-05',
    title: 'Rare.jpg Meme Style',
    prompt: 'rare.jpg meme format, absurdist humor, surreal impossible object or situation, deep-fried aesthetic elements, intentionally bizarre combination, internet culture, cursed image aesthetic, "why does this exist" energy, strangely compelling, slightly unnerving yet funny',
    categoryId: 'effects',
    tags: ['meme', 'rare', 'absurd', 'surreal', 'internet'],
    isQuickAccess: false
  },
  {
    id: 'creative-06',
    title: 'Office Team Silly Photo',
    prompt: 'Corporate office team photo but everyone is doing something silly and unprofessional, breaking the formal photo expectation, one person in costume, someone with props, funny poses, genuine laughter, candid chaos, subverting corporate culture, wholesome humor, office comedy vibes, The Office energy',
    categoryId: 'moods',
    tags: ['office', 'team', 'funny', 'corporate', 'group'],
    isQuickAccess: false
  }
]

// Function to get prompts by category
export function getPromptsByCategory(categoryId: string): PromptPreset[] {
  return NANO_BANANA_PROMPTS.filter(prompt => prompt.categoryId === categoryId)
}

// Function to get quick access prompts
export function getQuickAccessPrompts(): PromptPreset[] {
  return NANO_BANANA_PROMPTS.filter(prompt => prompt.isQuickAccess)
}

// Function to search prompts
export function searchPrompts(query: string): PromptPreset[] {
  const lowerQuery = query.toLowerCase()
  return NANO_BANANA_PROMPTS.filter(prompt =>
    prompt.title.toLowerCase().includes(lowerQuery) ||
    prompt.prompt.toLowerCase().includes(lowerQuery) ||
    prompt.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  )
}