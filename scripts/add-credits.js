// Quick script to add credits to a user via Supabase
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tarohelkwuurakbxjyxm.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.argv[2];

if (!SERVICE_KEY) {
    console.error('Usage: node add-credits.js <service_key> <user_id> <amount>');
    console.error('Or set SUPABASE_SERVICE_KEY env var');
    process.exit(1);
}

const USER_ID = process.argv[3] || 'd3a01f94-671e-483a-89f6-0284f7aaaf85';
const AMOUNT = parseInt(process.argv[4] || '2500');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function addCredits() {
    console.log(`Adding ${AMOUNT} credits to user ${USER_ID}...`);

    // Get current balance
    const { data: current, error: fetchError } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', USER_ID)
        .single();

    if (fetchError) {
        console.error('Error fetching user:', fetchError);
        process.exit(1);
    }

    console.log('Current balance:', current.balance);

    // Update balance
    const newBalance = current.balance + AMOUNT;
    const { data, error } = await supabase
        .from('user_credits')
        .update({
            balance: newBalance,
            lifetime_purchased: current.lifetime_purchased + AMOUNT
        })
        .eq('user_id', USER_ID)
        .select()
        .single();

    if (error) {
        console.error('Error updating credits:', error);
        process.exit(1);
    }

    console.log('✅ Credits added! New balance:', data.balance);
}

addCredits();
