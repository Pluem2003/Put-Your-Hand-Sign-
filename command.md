# Supabase Setup Commands

Run the following SQL in your Supabase SQL Editor to create the tables according to your ER diagram:

```sql
CREATE TABLE players (
    player_id SERIAL PRIMARY KEY,
    nickname TEXT UNIQUE NOT NULL
);

CREATE TABLE matches (
    match_id SERIAL PRIMARY KEY,
    game_mode TEXT NOT NULL,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE player_results (
    result_id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES matches(match_id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(player_id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    is_winner BOOLEAN DEFAULT FALSE
);
```

# Environment Configuration

Update your `.env` file with these keys (replace with your actual project values):

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

# Project Installation

Make sure you have installed the necessary libraries in the project folder:

```bash
npm install @supabase/supabase-js dotenv
```
