/**
 * Direct test of Replicate background removal models
 * Run: npx tsx scripts/test-remove-bg.ts
 */

import Replicate from 'replicate';

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

// A public test image from your Supabase
const TEST_IMAGE = 'https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/generations/d3a01f94-671e-483a-89f6-0284f7aaaf85/sjwbkbgg21rmc0cv36p8hh3nzm.png';

async function testModel(modelId: string, label: string) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${label}`);
    console.log(`Model: ${modelId}`);
    console.log(`${'='.repeat(60)}`);

    try {
        const startTime = Date.now();

        const output = await replicate.run(modelId as `${string}/${string}`, {
            input: {
                image: TEST_IMAGE,
            },
        });

        const elapsed = Date.now() - startTime;

        console.log(`\n✅ SUCCESS (${elapsed}ms)`);
        console.log(`Type: ${typeof output}`);
        console.log(`Constructor: ${(output as object)?.constructor?.name}`);
        console.log(`Is Array: ${Array.isArray(output)}`);

        // Detailed object inspection
        if (output && typeof output === 'object') {
            console.log('\n--- Detailed Object Inspection ---');

            // Get all properties including Symbol properties
            const allKeys = [
                ...Object.keys(output),
                ...Object.getOwnPropertyNames(output),
                ...Object.getOwnPropertySymbols(output).map(s => s.toString())
            ];
            console.log(`All keys: ${allKeys.join(', ') || '(none)'}`);

            // Try to get prototype methods
            const proto = Object.getPrototypeOf(output);
            if (proto) {
                const protoMethods = Object.getOwnPropertyNames(proto).filter(
                    name => typeof (proto as Record<string, unknown>)[name] === 'function' && name !== 'constructor'
                );
                console.log(`Prototype methods: ${protoMethods.join(', ') || '(none)'}`);
            }

            // Try toString()
            console.log(`toString(): ${String(output)}`);

            // Try to read URL property directly (FileOutput might expose it)
            const obj = output as Record<string, unknown>;
            console.log(`obj.url: ${obj.url}`);
            console.log(`obj.href: ${obj.href}`);

            // Check if it has a url() method
            if (typeof (output as { url?: () => string }).url === 'function') {
                console.log(`url() method result: ${(output as { url: () => string }).url()}`);
            }

            // FileOutput in replicate-js extends ReadableStream and has Symbol.toStringTag
            // Try converting to string via various methods
            if (output instanceof URL) {
                console.log(`Is URL instance: ${output.href}`);
            }

            // Check if it's iterable (ReadableStream has Symbol.asyncIterator)
            const hasAsyncIterator = Symbol.asyncIterator in (output as object);
            console.log(`Has asyncIterator: ${hasAsyncIterator}`);
        }

        if (typeof output === 'string') {
            console.log(`\nOutput URL: ${output}`);
            console.log(`Starts with http: ${output.startsWith('http')}`);
        }

        return { success: true, output, elapsed };
    } catch (error) {
        console.log(`\n❌ FAILED`);
        console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
        return { success: false, error };
    }
}

async function main() {
    console.log('🧪 Testing Replicate Background Removal Models');
    console.log(`Test image: ${TEST_IMAGE}\n`);

    if (!process.env.REPLICATE_API_TOKEN) {
        console.log('❌ ERROR: REPLICATE_API_TOKEN is not set');
        return;
    }

    console.log('✅ REPLICATE_API_TOKEN is set');

    await testModel(
        'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
        'cjwbw/rembg (current)'
    );

    console.log('\n\n🏁 Test complete!');
}

main().catch(console.error);
