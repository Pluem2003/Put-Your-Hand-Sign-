require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('YOUR_PROJECT')) {
    console.error('❌ ERROR: Supabase credentials are not set in .env file!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Connect to SQLite
const dbPath = path.join(__dirname, 'game_results.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('❌ ERROR: Could not connect to local SQLite database:', err.message);
        process.exit(1);
    }
});

console.log('🚀 Starting Data Sync from Local SQLite to Supabase...');

// Helper: Get or Create Player without triggering RLS UPDATE block
async function getOrCreatePlayer(nickname) {
    // 1. Try to fetch existing player
    let { data: player, error: fetchErr } = await supabase
        .from('players')
        .select('player_id')
        .eq('nickname', nickname)
        .single();
    
    if (player) return player.player_id;

    // 2. If not found, insert
    const { data: newPlayer, error: insertErr } = await supabase
        .from('players')
        .insert([{ nickname }])
        .select('player_id')
        .single();
        
    if (insertErr) {
        // If it failed because it was created just now by another process/request
        if (insertErr.message.includes('duplicate key') || insertErr.message.includes('violates unique constraint')) {
             let { data: retryPlayer } = await supabase.from('players').select('player_id').eq('nickname', nickname).single();
             if (retryPlayer) return retryPlayer.player_id;
        }
        throw new Error(`Failed to create player ${nickname}: ${insertErr.message}`);
    }
    
    return newPlayer.player_id;
}

async function syncData() {
    try {
        console.log('Fetching local history from SQLite...');
        // Fetch all complete match data from SQLite
        const query = `
            SELECT m.match_id, m.game_mode, m.played_at, p.nickname, r.score, r.is_winner
            FROM matches m
            JOIN player_results r ON m.match_id = r.match_id
            JOIN players p ON r.player_id = p.player_id
            ORDER BY m.match_id ASC
        `;
        
        const localRows = await new Promise((resolve, reject) => {
            db.all(query, [], (err, rows) => {
                if (err) reject(err); else resolve(rows);
            });
        });
        
        if (localRows.length === 0) {
            console.log('⚠️ No data found in local database to sync.');
            return;
        }

        // Group rows by match_id
        const matches = {};
        for (const row of localRows) {
            if (!matches[row.match_id]) {
                matches[row.match_id] = {
                    game_mode: row.game_mode,
                    played_at: row.played_at,
                    results: []
                };
            }
            matches[row.match_id].results.push({
                nickname: row.nickname,
                score: row.score,
                is_winner: row.is_winner === 1
            });
        }
        
        const matchIds = Object.keys(matches);
        console.log(`Found ${matchIds.length} matches to sync.`);

        let successCount = 0;

        for (const mId of matchIds) {
            const match = matches[mId];
            process.stdout.write(`Syncing Match ${mId} (${match.results[0].nickname} vs ${match.results[1].nickname})... `);
            
            // Note: Depending on your exact schema, the timestamp column might be 'played_at' or 'created_at'.
            // If Supabase uses 'played_at', we map it there.
            const { data: newMatch, error: matchErr } = await supabase
                .from('matches')
                .insert([{ game_mode: match.game_mode, played_at: match.played_at }])
                .select('match_id')
                .single();

            // Fallback if the column is actually named 'created_at' in Supabase
            if (matchErr && matchErr.message.includes('played_at')) {
                const { data: fallbackMatch, error: fallbackErr } = await supabase
                    .from('matches')
                    .insert([{ game_mode: match.game_mode, created_at: match.played_at }])
                    .select('match_id')
                    .single();
                if (fallbackErr) throw new Error(fallbackErr.message);
                newMatch = fallbackMatch;
            } else if (matchErr) {
                throw new Error(matchErr.message);
            }

            // Get player UUIDs from Supabase
            const player1Id = await getOrCreatePlayer(match.results[0].nickname);
            const player2Id = await getOrCreatePlayer(match.results[1].nickname);

            // Insert match results
            const resultsToInsert = [
                {
                    match_id: newMatch.match_id,
                    player_id: player1Id,
                    score: match.results[0].score,
                    is_winner: match.results[0].is_winner
                },
                {
                    match_id: newMatch.match_id,
                    player_id: player2Id,
                    score: match.results[1].score,
                    is_winner: match.results[1].is_winner
                }
            ];

            const { error: resultsErr } = await supabase
                .from('player_results')
                .insert(resultsToInsert);

            if (resultsErr) throw new Error(`Failed to insert results: ${resultsErr.message}`);
            
            console.log(`✅ Success`);
            successCount++;
        }

        console.log(`\n🎉 Sync complete! Successfully synced ${successCount} matches to Supabase.`);

    } catch (err) {
        console.error('\n❌ SYNC FAILED:', err.message);
    } finally {
        db.close();
    }
}

syncData();