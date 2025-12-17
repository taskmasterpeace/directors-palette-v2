/**
 * Generate sidebar background image
 * A claymation artist sculpting a character in their studio
 */
import 'dotenv/config'

async function generateSidebarBackground() {
    const prompt = `A talented artist in their claymation studio, hands sculpting a detailed claymation character - a stylish Black man with a hip hop aesthetic, gold chain, fresh sneakers. Behind the artist you can see the creative studio workspace: a storyboard on the wall showing character sketches and animation frames, clay molds, wire armatures, miniature props. Warm studio lighting, artistic atmosphere, shallow depth of field focusing on the hands and the character being crafted. Photorealistic, cinematic lighting, 9:16 vertical composition`

    console.log('🎬 Generating sidebar background image...')
    console.log('📝 Prompt:', prompt.slice(0, 100) + '...')

    const response = await fetch('http://localhost:3000/api/generation/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'nano-banana-pro',
            prompt,
            modelSettings: {
                aspectRatio: '9:16',
                resolution: '2K'
            }
        })
    })

    const result = await response.json()
    
    if (!response.ok) {
        console.error('❌ Generation failed:', result.error)
        return
    }

    console.log('✅ Generation started!')
    console.log('📍 Gallery ID:', result.galleryId)
    console.log('🔮 Prediction ID:', result.predictionId)
    console.log('')
    console.log('Check the gallery for the result. Save the image as /public/banners/sidebar-claymation.webp')
}

generateSidebarBackground().catch(console.error)
