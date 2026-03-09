require('dotenv').config({ path: '.env.local' });
const Replicate = require('replicate');
const fs = require('fs');
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

async function main() {
  console.log('1. Downloading test image...');
  const imgResponse = await fetch('https://picsum.photos/512/512');
  const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
  console.log('   Downloaded:', imgBuffer.length, 'bytes');

  console.log('2. Uploading to Replicate...');
  const form = new FormData();
  form.append('content', new Blob([imgBuffer], { type: 'image/jpeg' }), 'test.jpg');

  const fileResponse = await fetch('https://api.replicate.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.REPLICATE_API_TOKEN,
    },
    body: form,
  });
  const fileData = await fileResponse.json();
  const imageUrl = fileData.urls?.get;

  if (!imageUrl) {
    console.log('   Upload failed:', JSON.stringify(fileData).slice(0, 300));
    return;
  }
  console.log('   Uploaded:', imageUrl.slice(0, 100) + '...');

  console.log('3. Starting Trellis 3D generation...');
  const start = Date.now();

  const prediction = await replicate.predictions.create({
    version: 'e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c',
    input: {
      images: [imageUrl],
      texture_size: 1024,
      mesh_simplify: 0.95,
      generate_color: true,
      generate_model: true,
      randomize_seed: true,
      ss_sampling_steps: 12,
      slat_sampling_steps: 12,
      ss_guidance_strength: 7.5,
      slat_guidance_strength: 3,
    },
  });
  console.log('   Prediction ID:', prediction.id);

  console.log('4. Waiting for completion (~30-45s)...');
  const completed = await replicate.wait(prediction, { interval: 3000 });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('   Status:', completed.status, `(${elapsed}s)`);

  if (completed.error) {
    console.log('   ERROR:', completed.error);
    return;
  }

  if (completed.output) {
    console.log('   Output type:', Array.isArray(completed.output) ? 'array' : typeof completed.output);

    if (Array.isArray(completed.output)) {
      completed.output.forEach((item, i) => {
        if (typeof item === 'string') {
          console.log(`   Output[${i}]:`, item.slice(0, 200));
          if (item.endsWith('.glb') || item.includes('.glb')) {
            console.log('   >>> GLB URL FOUND <<<');
          }
        } else {
          console.log(`   Output[${i}]:`, JSON.stringify(item).slice(0, 200));
        }
      });
    } else if (typeof completed.output === 'object') {
      Object.entries(completed.output).forEach(([k, v]) => {
        console.log(`   Output.${k}:`, typeof v === 'string' ? v.slice(0, 200) : typeof v);
      });
    } else {
      console.log('   Output:', String(completed.output).slice(0, 300));
    }
  }

  console.log('\nDone! Generation cost: ~$0.046');
}

main().catch(e => console.error('Fatal:', e.message));
