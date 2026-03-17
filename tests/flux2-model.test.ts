/**
 * Test: Flux 2 Klein 9B Model Integration
 * Validates config, routing, input building, and LoRA filtering
 */

import { MODEL_CONFIGS, getModelConfig, getModelCost, migrateModelId } from '@/config'
import { ImageGenerationService } from '@/features/shot-creator/services/image-generation.service'
import { COMMUNITY_LORAS, BUILT_IN_LORA_IDS } from '@/features/shot-creator/store/lora.store'

let passed = 0
let failed = 0

function test(name: string, fn: () => boolean) {
    const ok = fn()
    if (ok) {
        console.log(`  ✓ ${name}`)
        passed++
    } else {
        console.log(`  ✗ ${name}`)
        failed++
    }
}

console.log('\n=== Model Config Tests ===')

test('Flux 2 exists in MODEL_CONFIGS', () => !!MODEL_CONFIGS['flux-2-klein-9b'])
test('displayName is "Flux 2"', () => MODEL_CONFIGS['flux-2-klein-9b'].displayName === 'Flux 2')
test('endpoint is correct', () => MODEL_CONFIGS['flux-2-klein-9b'].endpoint === 'black-forest-labs/flux-2-klein-9b')
test('cost is 0.05', () => MODEL_CONFIGS['flux-2-klein-9b'].costPerImage === 0.05)
test('maxReferenceImages is 5', () => MODEL_CONFIGS['flux-2-klein-9b'].maxReferenceImages === 5)
test('type is generation', () => MODEL_CONFIGS['flux-2-klein-9b'].type === 'generation')
test('getModelConfig works', () => getModelConfig('flux-2-klein-9b').id === 'flux-2-klein-9b')
test('getModelCost returns 0.05', () => getModelCost('flux-2-klein-9b') === 0.05)
test('migrateModelId preserves flux-2-klein-9b', () => migrateModelId('flux-2-klein-9b') === 'flux-2-klein-9b')
test('5 total models', () => Object.keys(MODEL_CONFIGS).length === 5)

console.log('\n=== Model Routing Tests ===')

test('Flux 2 base (no LoRA, no ref) → base model', () =>
    ImageGenerationService.getReplicateModelId('flux-2-klein-9b', false, false) === 'black-forest-labs/flux-2-klein-9b')

test('Flux 2 + LoRA → base-lora variant', () =>
    ImageGenerationService.getReplicateModelId('flux-2-klein-9b', true, false) === 'black-forest-labs/flux-2-klein-9b-base-lora')

test('Flux 2 + LoRA + ref → base-lora variant', () =>
    ImageGenerationService.getReplicateModelId('flux-2-klein-9b', true, true) === 'black-forest-labs/flux-2-klein-9b-base-lora')

test('Flux 2 + ref only → base model', () =>
    ImageGenerationService.getReplicateModelId('flux-2-klein-9b', false, true) === 'black-forest-labs/flux-2-klein-9b')

test('Flux 2 base version hash', () =>
    ImageGenerationService.getVersionForModel('flux-2-klein-9b', false, false) === '963f7b2c4aa2bc7e6377b95759dcf3a21cf175f6e8b0d8c1efe7bf6c8a23b690')

test('Flux 2 LoRA version hash', () =>
    ImageGenerationService.getVersionForModel('flux-2-klein-9b', true, false) === '5e92f3f81c77962ddc86ddd75c8fc46c92a26730b1ac13701a39aa10eac464f0')

console.log('\n=== Z-Image Turbo Routing (Regression) ===')

test('Z-Image base', () =>
    ImageGenerationService.getReplicateModelId('z-image-turbo', false, false) === 'prunaai/z-image-turbo')

test('Z-Image LoRA', () =>
    ImageGenerationService.getReplicateModelId('z-image-turbo', true, false) === 'prunaai/z-image-turbo-lora')

test('Z-Image img2img', () =>
    ImageGenerationService.getReplicateModelId('z-image-turbo', false, true) === 'prunaai/z-image-turbo-img2img')

console.log('\n=== Input Building Tests ===')

test('Flux 2 basic input', () => {
    const input = ImageGenerationService.buildReplicateInput({
        model: 'flux-2-klein-9b',
        prompt: 'a cat',
        modelSettings: { aspectRatio: '16:9', outputFormat: 'jpg' },
    })
    return input.prompt === 'a cat' && input.aspect_ratio === '16:9' && input.output_format === 'jpg' && input.go_fast === true
})

test('Flux 2 with LoRA weights', () => {
    const input = ImageGenerationService.buildReplicateInput({
        model: 'flux-2-klein-9b',
        prompt: 'Claymation dog',
        modelSettings: {
            aspectRatio: '1:1',
            loraWeightsUrls: ['https://example.com/lora.safetensors'],
            loraScales: [1.0],
        },
    })
    return Array.isArray(input.lora_weights) &&
        (input.lora_weights as string[]).length === 1 &&
        Array.isArray(input.lora_scales) &&
        (input.lora_scales as number[])[0] === 1.0
})

test('Flux 2 with reference images', () => {
    const input = ImageGenerationService.buildReplicateInput({
        model: 'flux-2-klein-9b',
        prompt: 'a landscape',
        referenceImages: ['https://example.com/img.jpg'],
        modelSettings: { aspectRatio: '16:9' },
    })
    return Array.isArray(input.images) && (input.images as string[]).length === 1
})

console.log('\n=== Validation Tests ===')

test('Flux 2 valid input', () => {
    const { valid } = ImageGenerationService.validateInput({
        model: 'flux-2-klein-9b',
        prompt: 'a cat',
        modelSettings: {},
    })
    return valid
})

test('Flux 2 rejects >5 ref images', () => {
    const { valid, errors } = ImageGenerationService.validateInput({
        model: 'flux-2-klein-9b',
        prompt: 'a cat',
        referenceImages: ['a', 'b', 'c', 'd', 'e', 'f'],
        modelSettings: {},
    })
    return !valid && errors.some(e => e.includes('5'))
})

test('Flux 2 allows 5 ref images', () => {
    const { valid } = ImageGenerationService.validateInput({
        model: 'flux-2-klein-9b',
        prompt: 'a cat',
        referenceImages: ['a', 'b', 'c', 'd', 'e'],
        modelSettings: {},
    })
    return valid
})

console.log('\n=== LoRA Store Tests ===')

test('Claymation K9B in COMMUNITY_LORAS', () =>
    COMMUNITY_LORAS.some(l => l.id === 'claymation-k9b'))

test('Inflate K9B in COMMUNITY_LORAS', () =>
    COMMUNITY_LORAS.some(l => l.id === 'inflate-k9b'))

test('Claymation has compatibleModels = [flux-2-klein-9b]', () => {
    const lora = COMMUNITY_LORAS.find(l => l.id === 'claymation-k9b')
    return !!lora?.compatibleModels && lora.compatibleModels[0] === 'flux-2-klein-9b'
})

test('Inflate trigger word is "inflate the"', () =>
    COMMUNITY_LORAS.find(l => l.id === 'inflate-k9b')?.triggerWord === 'inflate the')

test('Claymation trigger word is "Claymation"', () =>
    COMMUNITY_LORAS.find(l => l.id === 'claymation-k9b')?.triggerWord === 'Claymation')

test('9B LoRAs are in BUILT_IN_LORA_IDS', () =>
    BUILT_IN_LORA_IDS.has('claymation-k9b') && BUILT_IN_LORA_IDS.has('inflate-k9b'))

test('Existing LoRAs have no compatibleModels (universal)', () =>
    COMMUNITY_LORAS.filter(l => l.id === 'nava-style').every(l => !l.compatibleModels))

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed > 0 ? 1 : 0)
