import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db/client'

// Default wildcards to seed
const DEFAULT_WILDCARDS = [
    {
        name: 'black_girl_hairstyles',
        category: 'hairstyles',
        description: 'Black women hairstyles including braids, locs, twists, and natural styles',
        content: `Asymmetrical Bob with Finger Waves
Goddess Locs with Curly Ends
Tribal Braids with Beads and Shells
Ombre Box Braids with Curls
Passion Twists in a Half-Up Space Buns
Sleek Low Ponytail with Swoop Bang
Crochet Faux Locs with Deep Side Part
Feed-In Cornrows with Zig-Zag Part
Shoulder-Length Butterfly Locs
Kinky Twists with Curly Ends
Jumbo Knotless Braids with Heart-Shaped Part
Shoulder-Length Curly Weave with Layers
High Puff with Side Cornrow Braids
Loose Spiral Curls with Bangs
Havana Twists with Ombre Highlights
Flat Twists into a Low Bun
Tapered Cut with Defined Curls
Slicked-Back High Ponytail with Baby Hairs
Long Goddess Braids with Wavy Extensions
Crown Braid with Loose Tendrils
Double-Strand Flat Twists into a Twist Out
Side-Swept Marley Twists with Beads
Braided Mohawk with Undercut
Crochet Braids with Loose Deep Waves
Twisted Updo with Marley Hair
Faux Hawk with Bantu Knots on the Sides
Fulani Braids with Curly Ends
Havana Twists Updo with a Top Knot
Layered Pixie Cut with Finger Coils
Shoulder-Length Fluffy Rod Set
Waist-Length Bohemian Box Braids
Senegalese Twists with Goddess Curls
Side Part Bob with Feathered Ends
Mohawk Braids with Curly Ponytail
Jumbo Cornrows into a High Bun
Micro Locs with Curly Ends
S-Curl Perm with Defined Waves
Curly Half-Up Bun with Fringe
Twisted Halo Crown with Loose Curls
Knotless Braids with Triangle Parts
Feed-In Braids into a Wrapped Bun
Side Part Silk Press with Flip Ends
Pineapple Puff with Pearl Accessories
Braided High Ponytail with Cuff Beads
Crochet Curls with Burgundy Highlights
Sleek Braided Space Buns
Frohawk with Colored Tips
Jumbo Marley Twists in a Half-Up Ponytail
Defined Finger Coils with Color Highlights
Afro
Box Braids
Cornrows
Bantu Knots
Faux Locs
Kinky Twists
Fulani Braids
Butterfly Locs
Flat Twists
Passion Twists
Goddess Braids
Senegalese Twists
Havana Twists
Marley Twists
Crochet Braids
Feed-In Braids
Jumbo Braids
Micro Braids
Lemonade Braids
Natural Curls
Silk Press
Finger Coils
Coil Out
Braid Out
Twist Out
Wash and Go
Pineapple Updo
High Puff
Low Bun
Tapered Cut
Buzz Cut
Braid Crown
Halo Braids
Rod Set
Knotless Braids
Ghana Braids
Sisterlocks
Loc Extensions
Bob Cut
TWA (Teeny Weeny Afro)
Side Part Curls
Curly Mohawk
Braided Ponytail
Half-Up Half-Down
Pompadour
Blunt Cut
Shoulder-Length Curls
Top Knot
Box Braid Bob`
    },
    {
        name: 'rapper_action',
        category: 'actions',
        description: 'Battle rapper actions and poses for dynamic scenes',
        content: `is leaning against a subway pillar, hood up, headphones on
is looking down at his phone, scrolling through
is posted up by a chain-link fence, head down, scribbling on a notepad, focused
is leaning over the railing of a fire escape, eyes on the city below, lost in thought
is lighting up a blunt, taking a slow drag as he stares into the distance
is scrolling through social media on his phone, checking comments and reactions
is washing his face, water dripping, staring into the mirror with a serious look
is sketching ideas on a whiteboard, intense focus in his eyes
is sitting at a bar, in deep thought
is texting someone on his phone, his face lit by the screen
is tossing a football in the air, thinking silently, eyes distant
is practicing hand gestures and delivery, his lips moving without sound
is staring out over the ocean, deep in thought, occasionally murmuring lines
is flipping through a notebook filled with scribbles and crossed-out lines, lost in his thoughts
is rewatching an old battle video on his phone, headphones in, nodding slowly
is putting his hands together, eyes closed, mouthing words to himself like a silent rehearsal
is laughing with his crew, gesturing excitedly as he retells a story
is standing outside a music store, flipping through records with a focused look
is rehearsing hand movements in front of a store window reflection, lips moving silently
is putting on a pair of headphones, testing a beat by bobbing his head
is practicing breath control, taking slow, deep breaths, focusing hard
is looking through his phone with a smirk, reacting to fan comments
is hyping himself up with a shadowboxing routine, adrenaline flowing
is flipping through a binder of lyrics, scanning each page carefully
is wiping sweat from his brow, looking intense, eyes narrowed
is tapping beats on his thigh, staring off, deep in thought
is scrolling through his phone, pausing to listen, nodding to himself
is pouring water on his hands, washing away grime, focused on his reflection
is gazing over a city skyline, mouthing lines under his breath
is hyping up his crew, gesturing with big movements, grinning wide
is rubbing his temples, thinking hard, replaying lines in his head
is holding up his phone, recording himself for social media with a smirk
is flipping through a stack of notebooks, each page filled with lyrics
is sitting on a park bench, his head down, focused on his notebook
is practicing lines, hands moving as if performing
is going through old CDs, reading each cover intently
is staring up at the stars, reflecting, mouthing words softly
is standing at a bus stop, looking down at his phone, mumbling bars
is watching old battle tapes, headphones in, eyes focused
is writing on his phone, pausing now and then to check his rhyme scheme
is laughing with a friend, reminiscing, eyes lighting up
is checking his fit in a shop window reflection, nodding with approval
is practicing delivery, whispering lines to himself, arms gesturing
is flipping through texts on his phone, lost in thought
is looking out over a foggy river, muttering bars with a thoughtful expression
is jotting down notes with intensity, barely looking up
is quietly reciting lines, voice barely a whisper
is watching a street performer, nodding to the rhythm, taking it in
is sketching a new tattoo idea in his notebook, looking inspired`
    },
    {
        name: 'venue_setting',
        category: 'settings',
        description: 'Urban battle rap venue settings without crowds',
        content: `The setting is an abandoned warehouse with dimly lit stage, exposed brick and graffiti in the background
The setting is a dimly lit intimate venue with exposed brick walls and colorful artwork adorning the background
The setting is a urban alley at night, graffiti-covered walls glowing with vibrant colors under flickering streetlights
The setting is a sprawling rooftop at night, city lights twinkling in the distance, with a sleek, modern railing framing the edge
The setting is a moody underground parking garage, with concrete pillars and low ceilings casting deep shadows
The setting is an abandoned subway station, its tiled walls cracked and streaked with grime, dimly lit by a few flickering fluorescent lights
The setting is a gritty train yard, with rusting freight cars and overgrown weeds creating a desolate atmosphere
The setting is a bustling urban basketball court, with chain-link fencing and cracked asphalt, surrounded by towering city buildings
The setting is a sleek high-rise office building at night, with reflective windows capturing the glow of the city
The setting is an industrial warehouse, with exposed beams, concrete floors, and scattered metal containers
The setting is a rain-soaked street, with puddles reflecting the glow of traffic lights and neon signs
The setting is a graffiti-covered rooftop, with spray paint cans and unfinished murals scattered about
The setting is a retro diner, with chrome accents, red leather booths, and a classic jukebox glowing in the corner
The setting is a gritty urban boxing gym, with scuffed wooden floors, hanging heavy bags, and faded motivational posters
The setting is a crowded pool hall, with dim lighting, neon beer signs, and the faint glow of billiard tables
The setting is a vintage barbershop, with checkerboard floors, spinning red-and-white poles, and a faded leather barber chair
The setting is a futuristic, high-tech urban plaza, with holographic advertisements projected onto glass surfaces
The setting is a lively graffiti-covered skate park, with concrete ramps and bold murals framing the scene
The setting is a desolate urban underpass, with graffiti-covered concrete pillars and scattered trash
The setting is a bustling urban market, with colorful stalls and a maze of alleyways illuminated by string lights
The setting is a stark industrial stairwell, with metal railings and walls covered in peeling paint
The setting is a shadowy corner store, with flickering fluorescent lights and shelves stocked with brightly colored snacks
The setting is a modern metro station, with sleek tiles, illuminated signs, and benches lining the platform
The setting is a dimly lit recording studio, with soundproof walls, glowing control panels, and scattered equipment
The setting is a grungy laundromat, with outdated washing machines and buzzing fluorescent lights
The setting is a smoky urban rooftop, with mismatched furniture and strings of dim fairy lights
The setting is a bustling food truck lot, with vibrant trucks illuminated by string lights against the backdrop of the city
The setting is a stylish urban loft, with exposed brick, polished concrete floors, and large industrial-style windows
The setting is an old-school arcade, with glowing retro machines, neon signage, and carpeted floors with funky patterns
The setting is a vibrant nightclub, with flashing strobe lights, a DJ booth, and a glowing dance floor
The setting is a graffiti-covered pedestrian bridge, with intricate designs sprawling across every inch of the walls
The setting is a gritty loading dock, with rusting metal doors, scattered crates, and faint light spilling from a nearby warehouse
The setting is a sprawling urban courtyard, with graffiti walls, abandoned furniture, and patches of overgrown weeds
The setting is an abandoned car repair shop, with rusted tools, oil-stained floors, and a faint smell of gasoline in the air
The setting is a corner bodega, with glowing refrigerators, vibrant signs, and a cluttered counter packed with everyday goods
The setting is a worn-down urban theater, with red velvet curtains, faded seats, and a faintly illuminated stage
The setting is a smoky pool hall, with glowing neon lights, scattered cues, and cracked wooden floors
The setting is a lively rooftop bar, with mismatched chairs, dim lighting, and a view of the surrounding city skyline
The setting is a gritty nightclub alleyway, with dim light bulbs hanging over wet pavement and overflowing trash bins
The setting is an urban basketball court at dusk, chain nets swinging in the breeze under dim overhead lighting`
    },
    {
        name: 'venue_with_crowd',
        category: 'settings',
        description: 'Battle rap venues with crowds and atmosphere',
        content: `The setting is an abandoned warehouse with dimly lit stage, exposed brick and graffiti in the background, the atmosphere charged with anticipation as a Black crowd surrounds the battle
The setting is a repurposed church with stained glass windows casting colorful light; in the background, pews are replaced with standing room only. The crowd is pressed close to the stage, fully engaged in the lyrical clash
The setting is a rooftop in Miami during golden hour; stage lighting is soft with the sun setting behind. The crowd in the background is out of focus, creating an intense yet scenic atmosphere
The setting is a graffiti-covered skate park at night, with concrete ramps and vibrant street art in the background. The crowd surrounds the stage, their energy setting the tone for the battle
The setting is a firehouse-turned-venue with exposed brick and fire poles visible in the background; the atmosphere electric as the Black crowd presses in to watch the battle unfold
The setting is a high-end nightclub with velvet curtains and chandeliers in the background, dim blue lighting illuminating the stage. The crowd is dressed to impress, adding a luxe atmosphere to the battle scene
The setting is an underground club with low ceilings and exposed pipes, stage lit with red accents in the background. The atmosphere is raw, with a tightly packed crowd leaning into the intense lyrical exchanges
The setting is an outdoor amphitheater with a stage lit under twilight skies. In the background, food trucks and street art surround the space, while the crowd buzzes with excitement
The setting is an old art gallery transformed into a battle scene, white walls in the background adorned with curated street art. The atmosphere is vibrant, with the crowd fully engaged in the showdown
The setting is a renovated theater with ornate ceilings and dim lighting focused on the stage. The background is filled with Black hip-hop fans reacting to each bar with explosive energy
The setting is an upscale lounge with leather couches and soft lighting in the background. The crowd, dressed in designer streetwear, brings an intimate yet exclusive vibe to the battle atmosphere
The setting is a community basketball court transformed into a battleground; the background shows graffiti murals on brick walls. The crowd is hyped, creating a charged atmosphere around the stage
The setting is a converted garage with industrial vibes, the background filled with exposed beams and neon signs. The crowd is tight-knit, pressing against the stage as the battle heats up
The setting is an old factory space with rusted metal and broken windows in the background, dimly lit stage providing an eerie yet intense atmosphere. The Black crowd surrounds the rappers, fully engaged
The setting is a speakeasy-style club with vintage decor and low lights, stage set against exposed brick in the background. The crowd fills the space, adding an exclusive underground feel to the battle
The setting is a small backyard in Atlanta at night, with string lights hanging in the background. The crowd surrounds a small makeshift stage, creating an intimate, homegrown atmosphere
The setting is a snow-covered rooftop in Chicago under streetlights, with a cold wind whipping through the background. The crowd huddles close, their breath visible in the chilly air as they hang on every word
The setting is a massive arena with bright spotlights and tiered seating in the background. The crowd roars in waves, the atmosphere electric like a championship boxing match
The setting is an underground parking garage with concrete pillars and dim fluorescent lights in the background. The Black crowd surrounds the rappers, the echo of their voices bouncing off the walls
The setting is a small park in the Bronx under moonlight, with playground equipment in the background. The crowd gathers in a tight circle around the rappers, creating an open-air, gritty feel`
    },
    {
        name: 'wardrobe_designer',
        category: 'fashion',
        description: 'Luxury designer clothing and accessories',
        content: `Wearing a Gucci button-up shirt made of a sleek, satin-like fabric with a prominent stripe pattern in red and green running horizontally across the chest
Wearing a Gucci bomber jacket crafted from soft lambskin leather, featuring the brand's signature green and red web stripe running vertically along the sleeves
Wearing a Louis Vuitton monogram-patterned button-up shirt in a crisp white cotton fabric with the LV monogram printed in a subtle pearl tone
Wearing a Louis Vuitton oversized puffer jacket in jet black with gold accents along the zippers and cuffs
Wearing a Louis Vuitton tailored blazer in a deep navy tone, embroidered with a gold LV monogram pattern cascading down the lapels
Wearing a Prada nylon vest in sleek black, featuring bold silver hardware and the iconic triangular Prada logo on the chest
Wearing a Prada slim-fit turtleneck sweater in charcoal gray, with the Prada logo subtly stitched at the collar
Wearing an oversized Balenciaga hoodie in jet black with the brand's logo emblazoned across the front in bold white letters
Wearing a Balenciaga trench coat made of water-resistant fabric in a muted beige with exaggerated lapels
Wearing a Dior button-up shirt in sky blue with the signature Dior Oblique pattern running throughout
Wearing a Dior wool overcoat in midnight black, with a silk inner lining featuring the Dior logo
Wearing a Versace silk shirt with a vibrant baroque print in gold and black, featuring Medusa head buttons
Wearing a Versace black leather jacket with bold gold hardware and embossed Medusa head details on the shoulders
Wearing a YSL velvet blazer in rich emerald green with satin lapels and the iconic YSL logo embroidered in gold
Wearing a Fendi turtleneck sweater in cream white with the iconic FF logo pattern knitted across the torso
Wearing a Fendi overcoat in charcoal gray wool, featuring a detachable collar lined with FF monogram fur trim
Wearing a Chanel boucle jacket in classic black and white, with pearl-button details
Wearing an Off-White graphic hoodie in bright neon green, with the iconic diagonal stripe pattern printed across the back
Wearing an Off-White utility vest in dark gray with multiple functional pockets and the brand's signature cross-arrow logo
Wearing a Burberry trench coat in classic beige with the iconic plaid lining visible at the collar and cuffs
Wearing a Burberry cashmere scarf in the signature beige-and-red checkered pattern
Wearing a Moncler down jacket in metallic silver, featuring a high-gloss finish and the iconic Moncler logo patch on the sleeve`
    },
    {
        name: 'wardrobe_streetwear',
        category: 'fashion',
        description: 'Streetwear and urban fashion with brand names',
        content: `Wearing a plain white Pro Club heavyweight tee under a black zip-up hoodie with a soft fleece lining
Wearing a Champion reverse-weave sweatshirt in gray, with the small embroidered "C" logo on the chest and sleeve
Wearing a black Carhartt work jacket with a boxy fit, layered over a graphic tee featuring bold, oversized lettering
Wearing a Nike tech fleece tracksuit in jet black, with slim-tapered joggers and a zip-up hoodie
Wearing an Adidas three-stripe hoodie in heather gray, paired with matching joggers
Wearing a Puma windbreaker in a vibrant red-and-white color-block design
Wearing a plaid flannel shirt in red and black, layered over a black thermal Henley
Wearing a Levi's trucker jacket in a medium-wash denim with faux shearling lining
Wearing a pair of baggy Dickies carpenter jeans in a dark indigo wash, paired with a longline white tee
Wearing a North Face Nuptse puffer jacket in matte black, paired with straight-leg jeans and wheat-colored Timberlands
Wearing a Champion hoodie in deep burgundy, layered under a black varsity jacket with faux leather sleeves
Wearing a Pelle Pelle leather jacket in a rich brown tone, featuring embroidered graffiti-inspired designs across the back
Wearing a Billionaire Boys Club t-shirt with a cosmic design and bold lettering across the chest
Wearing a Grimey NYC oversized graphic hoodie featuring an abstract street art-inspired design in neon green and purple
Wearing a Supreme long-sleeve tee in white, with the iconic red box logo across the chest
Wearing a pair of classic black-and-red Jordan 1s, matched with an oversized white tee and distressed denim shorts
Wearing a pair of Yeezy Boost 350s in a "Zebra" colorway, styled with slim joggers in olive green
Wearing a pair of Air Max 97s in metallic silver, with a black bomber jacket and tapered black jeans
Wearing a black-and-gold snapback with a bold logo print on the front
Wearing a gold Cuban link chain over a simple black hoodie, paired with a matching gold bracelet
Wearing a sherpa-lined khaki bomber jacket, layered over a waffle-knit long-sleeve shirt in cream
Wearing a camo-print parka with faux fur trim on the hood, paired with a black turtleneck sweater
is wearing a black Carhartt beanie with a small logo patch, paired with a navy quilted bomber jacket
is wearing a gray Nike fleece hoodie with a bold swoosh logo, layered under a black puffer vest
is wearing a burgundy Champion crewneck sweatshirt with a subtle "C" embroidery
is wearing a dark green Adidas track jacket with white stripes, over a black graphic tee
is wearing a black Pelle Pelle leather jacket with stitched logo details
is wearing a red Supreme snapback with a box logo, styled with a black oversized hoodie
is wearing a navy North Face puffer jacket with a matte finish
is wearing a black-and-white Stussy graphic tee with a wave design, paired with loose-fit camo pants`
    },
    {
        name: 'camera_angle_dramatic',
        category: 'cinematography',
        description: 'Dramatic camera angles and shots',
        content: `low angle shot looking up, dramatic lighting from above
dutch angle with tilted horizon, creating tension and unease
extreme close-up on face, every emotion visible in detail
over-the-shoulder shot, intimate perspective on the subject
bird's eye view looking straight down, god-like perspective
worm's eye view from ground level, subject towering above
rack focus shifting from foreground to background
tracking shot following the subject in smooth motion
crane shot sweeping up and revealing the full scene
dolly zoom creating vertigo effect, background warping
silhouette against bright backlight, mysterious and dramatic
profile shot with dramatic rim lighting from the side
three-quarter view with moody shadows across the face
straight-on confrontational shot, direct eye contact with camera`
    }
]

// Wildcards to delete by name
const WILDCARDS_TO_DELETE = [
    'triumphant_mood',
    'intense_mood',
    'film_grain_style',
    'battle_rap_lighting'
]

export async function POST(request: NextRequest) {
    try {
        const supabase = await getClient()

        // Get current user from session
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const userId = user.id

        const body = await request.json()
        const { action } = body

        const results: string[] = []

        if (action === 'delete' || action === 'all') {
            // Delete specified wildcards
            for (const name of WILDCARDS_TO_DELETE) {
                const { error } = await supabase
                    .from('wildcards')
                    .delete()
                    .eq('user_id', userId)
                    .eq('name', name)

                if (error) {
                    results.push(`Failed to delete ${name}: ${error.message}`)
                } else {
                    results.push(`Deleted: ${name}`)
                }
            }
        }

        if (action === 'delete_by_name') {
            // Delete wildcards by custom names from request
            const { names } = body
            if (Array.isArray(names)) {
                for (const name of names) {
                    const { error } = await supabase
                        .from('wildcards')
                        .delete()
                        .eq('user_id', userId)
                        .eq('name', name)

                    if (error) {
                        results.push(`Failed to delete ${name}: ${error.message}`)
                    } else {
                        results.push(`Deleted: ${name}`)
                    }
                }
            }
        }

        if (action === 'seed' || action === 'all') {
            // Create default wildcards
            for (const wildcard of DEFAULT_WILDCARDS) {
                // Check if exists first
                const { data: existing } = await supabase
                    .from('wildcards')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('name', wildcard.name)
                    .maybeSingle()

                if (existing) {
                    // Update existing
                    const { error } = await supabase
                        .from('wildcards')
                        .update({
                            content: wildcard.content,
                            category: wildcard.category,
                            description: wildcard.description
                        })
                        .eq('id', existing.id)

                    if (error) {
                        results.push(`Failed to update ${wildcard.name}: ${error.message}`)
                    } else {
                        results.push(`Updated: ${wildcard.name}`)
                    }
                } else {
                    // Create new
                    const { error } = await supabase
                        .from('wildcards')
                        .insert({
                            user_id: userId,
                            name: wildcard.name,
                            content: wildcard.content,
                            category: wildcard.category,
                            description: wildcard.description,
                            is_shared: false
                        })

                    if (error) {
                        results.push(`Failed to create ${wildcard.name}: ${error.message}`)
                    } else {
                        results.push(`Created: ${wildcard.name}`)
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            results,
            message: `Processed ${results.length} operations`
        })

    } catch (error) {
        console.error('Seed wildcards error:', error)
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        )
    }
}
