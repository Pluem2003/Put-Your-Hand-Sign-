require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('YOUR_PROJECT')) {
    console.error('❌ ERROR: Supabase credentials are not set in .env file!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
    console.log('--- Supabase Connectivity Test ---');
    console.log('URL:', supabaseUrl);
    
    try {
        // 1. Test Player Upsert
        console.log('\n1. Testing Player Upsert...');
        const testNickname = 'TestPlayer_' + Math.floor(Math.random() * 1000);
        const { data: pData, error: pErr } = await supabase
            .from('players')
            .upsert({ nickname: testNickname }, { onConflict: 'nickname' })
            .select()
            .single();

        if (pErr) {
            console.error('❌ Player Upsert Failed:', pErr.message);
            console.error('Detail:', pErr.details || 'Check if "players" table exists and has "nickname" column.');
        } else {
            console.log('✅ Player Upsert Success:', pData);
        }

        // 2. Test Match Insert
        console.log('\n2. Testing Match Insert...');
        const { data: mData, error: mErr } = await supabase
            .from('matches')
            .insert([{ game_mode: 'test' }])
            .select()
            .single();

        if (mErr) {
            console.error('❌ Match Insert Failed:', mErr.message);
            console.error('Detail:', mErr.details || 'Check if "matches" table exists and has "game_mode" column.');
        } else {
            console.log('✅ Match Insert Success:', mData);
        }

        // 3. Test Result Insert
        if (pData && mData) {
            console.log('\n3. Testing Player Results Insert...');
            const { error: rErr } = await supabase
                .from('player_results')
                .insert([{
                    match_id: mData.match_id,
                    player_id: pData.player_id,
                    score: 99,
                    is_winner: true
                }]);

            if (rErr) {
                console.error('❌ Results Insert Failed:', rErr.message);
                console.error('Detail:', rErr.details || 'Check if "player_results" table exists and has correct Foreign Keys.');
            } else {
                console.log('✅ Results Insert Success!');
            }
        }

        console.log('\n--- Test Completed ---');

    } catch (err) {
        console.error('\n❌ Unexpected Error:', err);
    }
}

testDatabase();
