/**
 * Quick check of gallery database entries
 * Run: npx tsx scripts/check-gallery-db.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔍 Checking gallery database...\n');

  // Count by status
  const { count: pendingCount } = await supabase
    .from('gallery')
    .select('*', { count: 'exact', head: true })
    .eq('generation_type', 'image')
    .eq('status', 'pending');

  const { count: processingCount } = await supabase
    .from('gallery')
    .select('*', { count: 'exact', head: true })
    .eq('generation_type', 'image')
    .eq('status', 'processing');

  const { count: completedCount } = await supabase
    .from('gallery')
    .select('*', { count: 'exact', head: true })
    .eq('generation_type', 'image')
    .eq('status', 'completed');

  const { count: failedCount } = await supabase
    .from('gallery')
    .select('*', { count: 'exact', head: true })
    .eq('generation_type', 'image')
    .eq('status', 'failed');

  console.log('📊 Gallery Status Counts:');
  console.log(`  Pending:    ${pendingCount || 0}`);
  console.log(`  Processing: ${processingCount || 0}`);
  console.log(`  Completed:  ${completedCount || 0}`);
  console.log(`  Failed:     ${failedCount || 0}`);
  console.log(`  TOTAL:      ${(pendingCount || 0) + (processingCount || 0) + (completedCount || 0) + (failedCount || 0)}`);

  // Check for completed items without public_url (problematic)
  const { count: noUrlCount } = await supabase
    .from('gallery')
    .select('*', { count: 'exact', head: true })
    .eq('generation_type', 'image')
    .eq('status', 'completed')
    .is('public_url', null);

  if (noUrlCount && noUrlCount > 0) {
    console.log(`\n⚠️ WARNING: ${noUrlCount} completed items have NO public_url!`);
    console.log('  These will not appear in the gallery.');
  }

  // Check for stale pending items (older than 10 min)
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: stalePending, count: staleCount } = await supabase
    .from('gallery')
    .select('id, created_at, prediction_id')
    .eq('generation_type', 'image')
    .eq('status', 'pending')
    .lt('created_at', tenMinAgo)
    .limit(5);

  if (staleCount && staleCount > 0) {
    console.log(`\n⚠️ WARNING: ${staleCount} pending items are older than 10 minutes!`);
    console.log('  These may be stuck - webhook might not be configured.');
    if (stalePending && stalePending.length > 0) {
      console.log('  Sample stale items:');
      stalePending.forEach(item => {
        console.log(`    - ${item.prediction_id} (created: ${item.created_at})`);
      });
    }
  }

  // Get latest 5 entries
  const { data: latest } = await supabase
    .from('gallery')
    .select('id, status, public_url, created_at, prediction_id')
    .eq('generation_type', 'image')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n📝 Latest 5 gallery entries:');
  if (latest) {
    latest.forEach(item => {
      const hasUrl = item.public_url ? '✅' : '❌';
      const predId = item.prediction_id ? item.prediction_id.slice(0, 20) + '...' : 'no-id';
      console.log(`  [${item.status.padEnd(10)}] ${hasUrl} ${predId} (${item.created_at})`);
    });
  } else {
    console.log('  No entries found');
  }

  console.log('\n✅ Check complete!');
}

main().catch(console.error);
