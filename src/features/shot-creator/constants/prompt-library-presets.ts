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
  {
    id: 'light-01',
    title: 'Golden Hour Magic',
    prompt: 'Golden hour lighting, warm orange sunlight, long dramatic shadows, lens flare, soft diffused light, magical hour glow, backlit subject, nature photography',
    categoryId: 'lighting',
    tags: ['golden hour', 'warm', 'sunset', 'natural'],
    isQuickAccess: true
  },
  {
    id: 'light-02',
    title: 'Dramatic Rembrandt',
    prompt: 'Rembrandt lighting, triangle of light on cheek, deep shadows, single source dramatic, chiaroscuro effect, classical portrait lighting, rich contrast, painterly quality',
    categoryId: 'lighting',
    tags: ['rembrandt', 'dramatic', 'portrait', 'classical'],
    isQuickAccess: true
  },
  {
    id: 'light-03',
    title: 'Neon Glow',
    prompt: 'Neon lighting, vibrant pink and blue glow, urban night aesthetic, colorful reflections, synthwave atmosphere, high contrast, cyberpunk mood, electric ambiance',
    categoryId: 'lighting',
    tags: ['neon', 'colorful', 'night', 'urban'],
    isQuickAccess: true
  },
  {
    id: 'light-04',
    title: 'Soft Window Light',
    prompt: 'Soft natural window light, gentle shadows, diffused daylight, intimate indoor setting, peaceful atmosphere, even skin tones, commercial beauty lighting',
    categoryId: 'lighting',
    tags: ['soft', 'natural', 'window', 'diffused'],
    isQuickAccess: false
  },
  {
    id: 'light-05',
    title: 'High-Key Bright',
    prompt: 'High-key lighting, bright and airy, minimal shadows, white background, clean aesthetic, fashion photography style, overexposed highlights, ethereal mood',
    categoryId: 'lighting',
    tags: ['high-key', 'bright', 'clean', 'fashion'],
    isQuickAccess: false
  },
  {
    id: 'light-06',
    title: 'Low-Key Moody',
    prompt: 'Low-key lighting, deep blacks, dramatic contrast, single spotlight, mysterious atmosphere, film noir style, selective illumination, mood-driven shadows',
    categoryId: 'lighting',
    tags: ['low-key', 'dramatic', 'noir', 'moody'],
    isQuickAccess: false
  },
  {
    id: 'light-07',
    title: 'Practical Lights',
    prompt: 'Practical lighting, visible light sources in frame, realistic interior lighting, warm tungsten bulbs, cozy atmosphere, motivated lighting, cinematic natural',
    categoryId: 'lighting',
    tags: ['practical', 'interior', 'warm', 'realistic'],
    isQuickAccess: false
  },
  {
    id: 'light-08',
    title: 'Silhouette Backlit',
    prompt: 'Strong backlight, complete silhouette, rim light outline, dramatic contrast, sunrise or sunset, powerful shape definition, artistic composition',
    categoryId: 'lighting',
    tags: ['silhouette', 'backlit', 'dramatic', 'shape'],
    isQuickAccess: false
  },
  {
    id: 'light-09',
    title: 'Studio Three-Point',
    prompt: 'Professional three-point lighting, key light, fill light, back light separation, clean shadows, studio portrait quality, controlled environment, commercial look',
    categoryId: 'lighting',
    tags: ['studio', 'professional', 'three-point', 'controlled'],
    isQuickAccess: false
  },
  {
    id: 'light-10',
    title: 'Candlelight Intimate',
    prompt: 'Candlelight illumination, warm flickering glow, intimate atmosphere, soft shadows, romantic mood, orange color temperature, close proximity lighting',
    categoryId: 'lighting',
    tags: ['candlelight', 'warm', 'romantic', 'intimate'],
    isQuickAccess: false
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
  {
    id: 'cam-01',
    title: 'Extreme Low Angle',
    prompt: 'Extreme low angle looking up, powerful imposing perspective, subject towering above, dramatic sky background, hero shot composition, dominance and power',
    categoryId: 'camera',
    tags: ['low angle', 'power', 'dramatic', 'hero'],
    isQuickAccess: true
  },
  {
    id: 'cam-02',
    title: 'Birds Eye View',
    prompt: 'Birds eye view directly above, unique overhead perspective, patterns revealed from above, miniature world effect, god perspective, aerial composition',
    categoryId: 'camera',
    tags: ['aerial', 'overhead', 'birds eye', 'unique'],
    isQuickAccess: true
  },
  {
    id: 'cam-03',
    title: 'Dutch Angle',
    prompt: 'Dutch angle tilted frame, disorientation and unease, dynamic diagonal composition, psychological tension, unconventional perspective, visual instability',
    categoryId: 'camera',
    tags: ['dutch angle', 'tilted', 'tension', 'dynamic'],
    isQuickAccess: true
  },
  {
    id: 'cam-04',
    title: 'Over-the-Shoulder',
    prompt: 'Over-the-shoulder shot, conversational perspective, depth layers in frame, character point of view, dialogue scene composition, intimate two-shot',
    categoryId: 'camera',
    tags: ['over-shoulder', 'dialogue', 'pov', 'intimate'],
    isQuickAccess: false
  },
  {
    id: 'cam-05',
    title: 'Extreme Wide',
    prompt: 'Extreme wide shot, vast expanse, tiny subject in environment, sense of scale and isolation, landscape dominance, environmental context',
    categoryId: 'camera',
    tags: ['wide', 'landscape', 'scale', 'isolation'],
    isQuickAccess: false
  },
  {
    id: 'cam-06',
    title: 'Macro Detail',
    prompt: 'Macro extreme close-up, incredible detail revealed, shallow depth of field, hidden world exposed, texture and pattern focus, intimate detail',
    categoryId: 'camera',
    tags: ['macro', 'detail', 'close-up', 'texture'],
    isQuickAccess: false
  },
  {
    id: 'cam-07',
    title: 'Tracking Side',
    prompt: 'Side tracking shot, moving alongside subject, dynamic motion feel, parallel movement, smooth camera glide, action progression',
    categoryId: 'camera',
    tags: ['tracking', 'motion', 'dynamic', 'movement'],
    isQuickAccess: false
  },
  {
    id: 'cam-08',
    title: 'Worms Eye View',
    prompt: 'Worms eye view from ground level, looking up at towering elements, dramatic perspective distortion, immersive ground perspective, unusual viewpoint',
    categoryId: 'camera',
    tags: ['worms eye', 'ground', 'perspective', 'dramatic'],
    isQuickAccess: false
  },
  {
    id: 'cam-09',
    title: 'Through Object',
    prompt: 'Shot through foreground object, frame within frame, creative visual layering, depth and mystery, architectural framing, discovered view',
    categoryId: 'camera',
    tags: ['framing', 'through', 'layered', 'creative'],
    isQuickAccess: false
  },
  {
    id: 'cam-10',
    title: 'Reflection Shot',
    prompt: 'Shot composed through reflection, mirror or water surface, doubled reality, creative composition, symmetry and distortion, reflective storytelling',
    categoryId: 'camera',
    tags: ['reflection', 'mirror', 'symmetry', 'creative'],
    isQuickAccess: false
  },

  // ==================== ART STYLES (10) ====================
  {
    id: 'style-01',
    title: 'Oil Painting Classic',
    prompt: 'Classical oil painting style, visible brushstrokes, rich color depth, museum quality, renaissance masters influence, traditional fine art aesthetic',
    categoryId: 'styles',
    tags: ['oil painting', 'classical', 'fine art', 'traditional'],
    isQuickAccess: true
  },
  {
    id: 'style-02',
    title: 'Watercolor Flow',
    prompt: 'Delicate watercolor painting, soft color bleeding, paper texture visible, flowing pigment wash, artistic imperfection, gentle impressionistic style',
    categoryId: 'styles',
    tags: ['watercolor', 'soft', 'flowing', 'artistic'],
    isQuickAccess: true
  },
  {
    id: 'style-03',
    title: 'Digital Concept Art',
    prompt: 'Professional digital concept art, entertainment industry quality, painterly yet detailed, dramatic composition, AAA game or film pre-production style',
    categoryId: 'styles',
    tags: ['concept art', 'digital', 'professional', 'entertainment'],
    isQuickAccess: true
  },
  {
    id: 'style-04',
    title: 'Anime Cel-Shading',
    prompt: 'Japanese anime style, clean cel-shading, bold outlines, vibrant flat colors, manga influence, expressive character design, kawaii or shounen aesthetic',
    categoryId: 'styles',
    tags: ['anime', 'cel-shading', 'manga', 'japanese'],
    isQuickAccess: false
  },
  {
    id: 'style-05',
    title: 'Pixel Art Retro',
    prompt: 'Retro pixel art style, limited color palette, nostalgic 16-bit aesthetic, chunky pixels visible, video game graphics, 80s/90s gaming era',
    categoryId: 'styles',
    tags: ['pixel art', 'retro', '8-bit', 'gaming'],
    isQuickAccess: false
  },
  {
    id: 'style-06',
    title: 'Art Nouveau Elegant',
    prompt: 'Art nouveau decorative style, flowing organic lines, ornate natural patterns, Alphonse Mucha influence, elegant composition, vintage poster aesthetic',
    categoryId: 'styles',
    tags: ['art nouveau', 'decorative', 'elegant', 'vintage'],
    isQuickAccess: false
  },
  {
    id: 'style-07',
    title: 'Pop Art Bold',
    prompt: 'Bold pop art style, bright contrasting colors, halftone dots pattern, Andy Warhol influence, commercial art aesthetic, graphic bold impact',
    categoryId: 'styles',
    tags: ['pop art', 'bold', 'graphic', 'warhol'],
    isQuickAccess: false
  },
  {
    id: 'style-08',
    title: 'Impressionist Light',
    prompt: 'Impressionist painting style, visible brushwork capturing light, soft focus on atmosphere, Monet influence, plein air feeling, light and color study',
    categoryId: 'styles',
    tags: ['impressionist', 'light', 'monet', 'atmospheric'],
    isQuickAccess: false
  },
  {
    id: 'style-09',
    title: 'Comic Book Graphic',
    prompt: 'Comic book illustration style, bold ink outlines, dynamic action lines, Ben-Day dots, superhero comics aesthetic, dramatic sequential art',
    categoryId: 'styles',
    tags: ['comic', 'graphic', 'illustration', 'superhero'],
    isQuickAccess: false
  },
  {
    id: 'style-10',
    title: 'Photorealistic Detail',
    prompt: 'Photorealistic rendering, indistinguishable from photograph, extreme detail and accuracy, hyperrealism, perfect lighting simulation, uncanny realism',
    categoryId: 'styles',
    tags: ['photorealistic', 'hyperreal', 'detailed', 'accurate'],
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