const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'game_results.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
function initDb() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Enable WAL mode for better concurrency and reliability
            db.run("PRAGMA journal_mode = WAL");

            // Players table
            db.run(`CREATE TABLE IF NOT EXISTS players (
                player_id INTEGER PRIMARY KEY AUTOINCREMENT,
                nickname TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Matches table
            db.run(`CREATE TABLE IF NOT EXISTS matches (
                match_id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_mode TEXT NOT NULL,
                played_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Results table
            db.run(`CREATE TABLE IF NOT EXISTS player_results (
                result_id INTEGER PRIMARY KEY AUTOINCREMENT,
                match_id INTEGER,
                player_id INTEGER,
                score INTEGER DEFAULT 0,
                is_winner BOOLEAN DEFAULT 0,
                FOREIGN KEY(match_id) REFERENCES matches(match_id),
                FOREIGN KEY(player_id) REFERENCES players(player_id)
            )`, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

// Save game results locally
async function saveGameLocally(gameState) {
    try {
        const p1Name = gameState.player1.nickname;
        const p2Name = gameState.player2.nickname;

        // 1. Get or create players
        const getPlayerId = (nickname) => {
            return new Promise((resolve, reject) => {
                db.get("SELECT player_id FROM players WHERE nickname = ?", [nickname], (err, row) => {
                    if (err) return reject(err);
                    if (row) return resolve(row.player_id);
                    
                    db.run("INSERT INTO players (nickname) VALUES (?)", [nickname], function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    });
                });
            });
        };

        const p1Id = await getPlayerId(p1Name);
        const p2Id = await getPlayerId(p2Name);

        // 2. Create match
        const matchId = await new Promise((resolve, reject) => {
            db.run("INSERT INTO matches (game_mode) VALUES (?)", [gameState.gameMode], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });

        // 3. Save results
        const saveResult = (mId, pId, score, isWinner) => {
            return new Promise((resolve, reject) => {
                db.run(
                    "INSERT INTO player_results (match_id, player_id, score, is_winner) VALUES (?, ?, ?, ?)",
                    [mId, pId, score, isWinner ? 1 : 0],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        };

        await saveResult(matchId, p1Id, gameState.player1.score, gameState.winner === 'player1');
        await saveResult(matchId, p2Id, gameState.player2.score, gameState.winner === 'player2');

        console.log(`[SQLite] Game results saved locally: ${p1Name} vs ${p2Name}`);
        return true;
    } catch (err) {
        console.error('[SQLite] Error saving game:', err);
        return false;
    }
}

// Get leaderboard data from SQLite
function getLocalLeaderboard() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT p.nickname as name, SUM(r.score) as totalScore, SUM(r.is_winner) as wins, COUNT(r.result_id) as matches
            FROM players p
            JOIN player_results r ON p.player_id = r.player_id
            GROUP BY p.player_id
            ORDER BY totalScore DESC
            LIMIT 10
        `;
        db.all(query, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Get match history from SQLite
function getLocalHistory() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT m.match_id, m.game_mode, m.played_at, p.nickname, r.score, r.is_winner
            FROM matches m
            JOIN player_results r ON m.match_id = r.match_id
            JOIN players p ON r.player_id = p.player_id
            ORDER BY m.played_at DESC
            LIMIT 40
        `;
        db.all(query, [], (err, rows) => {
            if (err) return reject(err);
            
            // Format data to match Supabase structure for UI compatibility
            const history = [];
            const matchMap = new Map();
            
            rows.forEach(row => {
                if (!matchMap.has(row.match_id)) {
                    matchMap.set(row.match_id, {
                        match_id: row.match_id,
                        game_mode: row.game_mode,
                        played_at: row.played_at,
                        player_results: []
                    });
                    history.push(matchMap.get(row.match_id));
                }
                matchMap.get(row.match_id).player_results.push({
                    score: row.score,
                    is_winner: row.is_winner === 1,
                    players: { nickname: row.nickname }
                });
            });
            
            resolve(history);
        });
    });
}

module.exports = {
    initDb,
    saveGameLocally,
    getLocalLeaderboard,
    getLocalHistory
};
