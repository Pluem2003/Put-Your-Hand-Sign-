require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const localDb = require('./local_db_handler');

// Initialize local database
localDb.initDb()
  .then(() => console.log('[SQLite] Local database initialized'))
  .catch(err => console.error('[SQLite] Failed to initialize local database:', err));

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e8 // Allow larger payloads for camera frames
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static('public'));

// Game state
let gameState = {
  player1: {
    id: 'player1',
    nickname: 'Player 1',
    ready: false,
    score: 0,
    prediction: null,
    cameraFrame: null,
    poseConfidence: 0,
    inferenceTime: 0
  },
  player2: {
    id: 'player2',
    nickname: 'Player 2',
    ready: false,
    score: 0,
    prediction: null,
    cameraFrame: null,
    poseConfidence: 0,
    inferenceTime: 0
  },
  gameActive: false,
  gameMode: 'normal', // 'normal' or 'rps'
  countdown: 0,
  currentTask: null,
  timer: 30, 
  timerRunning: false,
  taskImage: null,
  winner: null,
  roundWinner: null, 
  roundComplete: false,
  msgRates: {
    player1: 0,
    player2: 0
  }
};

let msgCounts = {
  player1: 0,
  player2: 0
};

// Helper to broadcast state
function broadcastState() {
  // Create a copy without heavy camera frames for general state updates
  const stateCopy = JSON.parse(JSON.stringify(gameState));
  stateCopy.player1.cameraFrame = null;
  stateCopy.player2.cameraFrame = null;
  io.emit('gameState', stateCopy);
}

function broadcastPlayerPose(playerNum, data) {
  // Use volatile to drop packets if the network is congested
  io.volatile.emit('playerPoseUpdate', { playerNum, ...data });
}

// Task definitions
const tasks = [
  { id: 1, name: 'Bird', image: '/images/bird.png', description: 'Make a bird shape with your hand' },
  { id: 2, name: 'Bull', image: '/images/bird.png', description: 'Two fingers up like horns' },
  { id: 3, name: 'Crab', image: '/images/bird.png', description: 'Fingers moving like claws' },
  { id: 4, name: 'Deer', image: '/images/bird.png', description: 'Hand shape like a deer' },
  { id: 5, name: 'Dog', image: '/images/bird.png', description: 'Hand shape like a dog' },
  { id: 6, name: 'Duck', image: '/images/bird.png', description: 'Fingers touching like a beak' },
  { id: 7, name: 'Elephant', image: '/images/bird.png', description: 'Arm or hand like a trunk' },
  { id: 8, name: 'Paper', image: '/images/bird.png', description: 'All five fingers extended' },
  { id: 9, name: 'Rock', image: '/images/bird.png', description: 'Closed fist' },
  { id: 10, name: 'Scissor', image: '/images/bird.png', description: 'Two fingers in V shape' }
];

let defaultTimerValue = 30;
let gameResetTimeout = null;

function initializeGame() {
  if (gameResetTimeout) {
    clearTimeout(gameResetTimeout);
    gameResetTimeout = null;
  }
  
  gameState.gameActive = false;
  gameState.countdown = 0;
  gameState.timer = defaultTimerValue;
  gameState.timerRunning = false;
  gameState.roundComplete = false;
  gameState.winner = null;
  gameState.roundWinner = null;
  gameState.currentTask = null;

  gameState.player1.ready = false;
  gameState.player1.score = 0;
  gameState.player1.prediction = null;
  gameState.player1.inferenceTime = 0;
  gameState.player1.cameraFrame = null;
  
  gameState.player2.ready = false;
  gameState.player2.score = 0;
  gameState.player2.prediction = null;
  gameState.player2.inferenceTime = 0;
  gameState.player2.cameraFrame = null;

  console.log(`Game reset. Mode: ${gameState.gameMode}`);
  broadcastState();
}

function getRandomTask() {
  let availableTasks = tasks;
  if (gameState.gameMode === 'rps') {
    const rpsNames = ['Rock', 'Paper', 'Scissor'];
    availableTasks = tasks.filter(t => rpsNames.includes(t.name));
  }
  if (gameState.currentTask) {
    const filtered = availableTasks.filter(t => t.id !== gameState.currentTask.id);
    if (filtered.length > 0) availableTasks = filtered;
  }
  const randomIndex = Math.floor(Math.random() * availableTasks.length);
  return availableTasks[randomIndex];
}

let countdownInterval = null;

function startCountdown() {
  if (gameState.countdown > 0 || gameState.gameActive) return;
  if (gameResetTimeout) { clearTimeout(gameResetTimeout); gameResetTimeout = null; }
  gameState.countdown = 3;
  gameState.roundComplete = false;
  gameState.winner = null;
  
  broadcastState();

  if (countdownInterval) clearInterval(countdownInterval);
  
  countdownInterval = setInterval(() => {
    // If someone unreadies during countdown, stop the countdown
    if (!gameState.player1.ready || !gameState.player2.ready) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      gameState.countdown = 0;
      broadcastState();
      return;
    }
    
    gameState.countdown--;
    broadcastState();

    if (gameState.countdown <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      startGame();
    }
  }, 1000);
}

function startGame() {
  gameState.player1.score = 0;
  gameState.player2.score = 0;
  gameState.timer = defaultTimerValue;
  gameState.gameActive = true;
  gameState.timerRunning = true;
  gameState.roundComplete = false;
  startNewTask();
  broadcastState();
}

function startNewTask() {
  if (!gameState.gameActive) return;
  gameState.currentTask = getRandomTask();
  gameState.roundWinner = null;
  broadcastState();
}

// Socket.io Handlers
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);
  
  // Send current state to new client
  socket.emit('gameState', gameState);

  socket.on('player_ready', (data) => {
    const { playerId, ready, nickname } = data;
    if (gameState[playerId]) {
      gameState[playerId].ready = ready;
      if (nickname) gameState[playerId].nickname = nickname;
      if (gameState.player1.ready && gameState.player2.ready && !gameState.gameActive && gameState.countdown === 0) {
        startCountdown();
      }
      broadcastState();
    }
  });

  socket.on('player_pose', (data) => {
    const { playerId, prediction, confidence, cameraFrame, inferenceTime } = data;
    if (gameState[playerId]) {
      const playerNum = playerId.replace('player', '');
      msgCounts[playerId]++;
      
      gameState[playerId].prediction = prediction;
      gameState[playerId].poseConfidence = confidence;
      gameState[playerId].inferenceTime = inferenceTime || 0;
      if (cameraFrame) gameState[playerId].cameraFrame = cameraFrame;

      if (gameState.gameActive && !gameState.roundWinner && predictionMatches(prediction, gameState.currentTask.name, confidence)) {
        gameState[playerId].score++;
        gameState.roundWinner = playerId;
        broadcastState();
        setTimeout(() => { startNewTask(); }, 500);
      } else {
        // Optimized: only broadcast pose update to avoid full state broadcast every frame
        broadcastPlayerPose(playerNum, { 
          prediction, confidence, cameraFrame, inferenceTime, score: gameState[playerId].score 
        });
      }
    }
  });

  socket.on('set_camera', (data) => {
    console.log(`Camera change requested for ${data.playerId} to index ${data.cameraIndex}`);
    io.emit('set_camera', data);
  });

  socket.on('update_camera_controls', (data) => {
    // Relay to inference scripts
    io.emit('update_camera_controls', data);
  });

  socket.on('open_camera_settings', (data) => {
    io.emit('open_camera_settings', data);
  });

  socket.on('camera_response', (data) => {
    console.log(`Camera change response for ${data.playerId}: ${data.success ? 'Success' : 'Failed'}`);
    io.emit('camera_changed', data);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Keep existing API Routes for compatibility or specialized needs
app.post('/api/player1/ready', (req, res) => {
  const { ready } = req.body;
  gameState.player1.ready = ready;
  if (gameState.player1.ready && gameState.player2.ready && !gameState.gameActive && gameState.countdown === 0) {
    startCountdown();
  }
  broadcastState();
  res.json({ success: true, gameActive: gameState.gameActive, countdown: gameState.countdown });
});

app.post('/api/player1/pose', (req, res) => {
  msgCounts.player1++;
  const { prediction, confidence, cameraFrame, inferenceTime } = req.body;
  gameState.player1.prediction = prediction;
  gameState.player1.poseConfidence = confidence;
  gameState.player1.inferenceTime = inferenceTime || 0;
  if (cameraFrame) gameState.player1.cameraFrame = cameraFrame;
  if (gameState.gameActive && !gameState.roundWinner && predictionMatches(prediction, gameState.currentTask.name, confidence)) {
    gameState.player1.score++;
    gameState.roundWinner = 'player1';
    broadcastState();
    setTimeout(() => { startNewTask(); }, 500);
  } else {
    broadcastPlayerPose(1, { prediction, confidence, cameraFrame, inferenceTime, score: gameState.player1.score });
  }
  res.json({ success: true });
});

app.post('/api/player2/ready', (req, res) => {
  const { ready } = req.body;
  gameState.player2.ready = ready;
  if (gameState.player1.ready && gameState.player2.ready && !gameState.gameActive && gameState.countdown === 0) {
    startCountdown();
  }
  broadcastState();
  res.json({ success: true, gameActive: gameState.gameActive, countdown: gameState.countdown });
});

app.post('/api/player2/pose', (req, res) => {
  msgCounts.player2++;
  const { prediction, confidence, cameraFrame, inferenceTime } = req.body;
  gameState.player2.prediction = prediction;
  gameState.player2.poseConfidence = confidence;
  gameState.player2.inferenceTime = inferenceTime || 0;
  if (cameraFrame) gameState.player2.cameraFrame = cameraFrame;
  if (gameState.gameActive && !gameState.roundWinner && predictionMatches(prediction, gameState.currentTask.name, confidence)) {
    gameState.player2.score++;
    gameState.roundWinner = 'player2';
    broadcastState();
    setTimeout(() => { startNewTask(); }, 500);
  } else {
    broadcastPlayerPose(2, { prediction, confidence, cameraFrame, inferenceTime, score: gameState.player2.score });
  }
  res.json({ success: true });
});

// DEBUG ROUTES
app.get('/api/debug/state', (req, res) => { res.json(gameState); });

app.post('/api/debug/mode/set', (req, res) => {
  const { mode } = req.body;
  if (['normal', 'rps'].includes(mode)) {
    gameState.gameMode = mode;
    initializeGame();
    res.json({ success: true, mode: gameState.gameMode });
  } else { res.status(400).json({ success: false, error: 'Invalid mode' }); }
});

app.post('/api/debug/timer/set', (req, res) => {
  const { seconds } = req.body;
  defaultTimerValue = parseInt(seconds);
  gameState.timer = defaultTimerValue;
  broadcastState();
  res.json({ success: true });
});

app.post('/api/debug/timer/start', (req, res) => {
  gameState.timerRunning = true;
  broadcastState();
  res.json({ success: true });
});

app.post('/api/debug/timer/stop', (req, res) => {
  gameState.timerRunning = false;
  broadcastState();
  res.json({ success: true });
});

app.post('/api/debug/game/start', (req, res) => {
  if (gameState.player1.ready && gameState.player2.ready) {
    startCountdown();
    res.json({ success: true });
  } else { res.status(400).json({ success: false, error: 'Both players must be ready' }); }
});

app.post('/api/debug/game/force-start', (req, res) => {
  if (gameResetTimeout) { clearTimeout(gameResetTimeout); gameResetTimeout = null; }
  gameState.countdown = 0;
  startGame();
  res.json({ success: true });
});

app.post('/api/debug/game/force-stop', (req, res) => {
  gameState.gameActive = false;
  gameState.timerRunning = false;
  broadcastState();
  res.json({ success: true });
});

app.post('/api/debug/game/reset', (req, res) => { initializeGame(); res.json({ success: true }); });

app.post('/api/debug/player/ready/:playerNum', (req, res) => {
  const { playerNum } = req.params;
  const { ready } = req.body;
  if (playerNum === '1') gameState.player1.ready = ready;
  else if (playerNum === '2') gameState.player2.ready = ready;
  broadcastState();
  res.json({ success: true });
});

app.get('/api/spectator/state', (req, res) => {
  res.json(gameState);
});

// NEW: Leaderboard API with Local Fallback
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('player_results')
      .select(`
        score,
        is_winner,
        players (
          nickname
        )
      `);

    if (error || !data || data.length === 0) {
      console.log('[API] Supabase leaderboard empty or failed, using local fallback');
      const localData = await localDb.getLocalLeaderboard();
      return res.json(localData);
    }

    // Aggregate data by player nickname
    const leaderboard = {};
    data.forEach(row => {
      const name = row.players.nickname;
      if (!leaderboard[name]) {
        leaderboard[name] = { name, totalScore: 0, wins: 0, matches: 0 };
      }
      leaderboard[name].totalScore += row.score;
      if (row.is_winner) leaderboard[name].wins += 1;
      leaderboard[name].matches += 1;
    });

    const sortedLeaderboard = Object.values(leaderboard)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10);

    res.json(sortedLeaderboard);
  } catch (err) {
    console.warn('[API] Leaderboard Supabase error, trying local:', err.message);
    try {
      const localData = await localDb.getLocalLeaderboard();
      res.json(localData);
    } catch (localErr) {
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  }
});

// NEW: History API with Local Fallback
app.get('/api/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        match_id,
        game_mode,
        played_at,
        player_results (
          score,
          is_winner,
          players (
            nickname
          )
        )
      `)
      .order('played_at', { ascending: false })
      .limit(20);

    if (error || !data || data.length === 0) {
      const localHistory = await localDb.getLocalHistory();
      return res.json(localHistory);
    }
    res.json(data);
  } catch (err) {
    console.warn('[API] History Supabase error, trying local:', err.message);
    try {
      const localHistory = await localDb.getLocalHistory();
      res.json(localHistory);
    } catch (localErr) {
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  }
});

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.get('/player1', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'player1.html')); });
app.get('/player2', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'player2.html')); });
app.get('/spectator', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'spectator.html')); });
app.get('/debug', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'debug.html')); });
app.get('/leaderboard', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'leaderboard.html')); });
app.get('/history', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'history.html')); });

function predictionMatches(prediction, taskName, confidence) {
  if (!prediction || !taskName) return false;
  const p = prediction.toLowerCase().trim();
  const t = taskName.toLowerCase().trim();
  if (confidence < 0.7) return false;
  return p.includes(t) || t.includes(p);
}

async function saveGameToSupabase(state) {
  console.log('[Supabase] saveGameToSupabase called');
  
  // Only save if Supabase is properly configured
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || 
      process.env.SUPABASE_URL.includes('YOUR_PROJECT') || 
      process.env.SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY')) {
    console.warn('[Supabase] Skipping DB save: Credentials not configured or still using placeholders in .env');
    return;
  }

  try {
    const p1Nickname = state.player1.nickname;
    const p2Nickname = state.player2.nickname;
    console.log(`[Supabase] Saving results for: ${p1Nickname} vs ${p2Nickname}`);
    
    // 1. Ensure Players Exist
    console.log('[Supabase] Upserting player 1...');
    const { data: p1Data, error: p1Err } = await supabase
      .from('players')
      .upsert({ nickname: p1Nickname }, { onConflict: 'nickname' })
      .select()
      .single();
      
    console.log('[Supabase] Upserting player 2...');
    const { data: p2Data, error: p2Err } = await supabase
      .from('players')
      .upsert({ nickname: p2Nickname }, { onConflict: 'nickname' })
      .select()
      .single();

    if (p1Err || p2Err) {
      console.error('[Supabase] Error upserting players:', p1Err || p2Err);
      return;
    }

    // 2. Create Match Record
    console.log('[Supabase] Creating match record...');
    const { data: matchData, error: matchErr } = await supabase
      .from('matches')
      .insert([{ game_mode: state.gameMode }])
      .select()
      .single();

    if (matchErr || !matchData) {
      console.error('[Supabase] Error creating match:', matchErr);
      return;
    }

    // 3. Create Player Results
    console.log('[Supabase] Saving player results...');
    const resultsToInsert = [
      {
        match_id: matchData.match_id,
        player_id: p1Data.player_id,
        score: state.player1.score,
        is_winner: state.winner === 'player1'
      },
      {
        match_id: matchData.match_id,
        player_id: p2Data.player_id,
        score: state.player2.score,
        is_winner: state.winner === 'player2'
      }
    ];

    const { error: resultsErr } = await supabase
      .from('player_results')
      .insert(resultsToInsert);

    if (resultsErr) {
      console.error('[Supabase] Error saving player results:', resultsErr);
    } else {
      console.log('[Supabase] Game results saved successfully!');
    }

  } catch (err) {
    console.error('[Supabase] Unexpected error saving game:', err);
  }
}

setInterval(async () => {
  gameState.msgRates.player1 = msgCounts.player1;
  gameState.msgRates.player2 = msgCounts.player2;
  msgCounts.player1 = 0;
  msgCounts.player2 = 0;

  if (gameState.timerRunning && gameState.timer > 0) {
    gameState.timer--;
    if (gameState.timer === 0) {
      gameState.timerRunning = false;
      gameState.gameActive = false;
      gameState.roundComplete = true;
      if (gameState.player1.score > gameState.player2.score) gameState.winner = 'player1';
      else if (gameState.player2.score > gameState.player1.score) gameState.winner = 'player2';
      else gameState.winner = 'tie';
      
      broadcastState();
      
      // Save to databases (Clone state to prevent race condition with reset)
      const stateToSave = JSON.parse(JSON.stringify(gameState));
      console.log('[Server] Starting game save operations...');
      
      // 1. Save locally first (Fast and reliable)
      await localDb.saveGameLocally(stateToSave);
      
      // 2. Save to Supabase in background (Don't let network lag block the server tick)
      saveGameToSupabase(stateToSave).catch(err => {
        console.error('[Supabase] Background save failed:', err);
      });
      
      console.log('[Server] Local save completed, Supabase save initiated in background.');
      
      gameResetTimeout = setTimeout(() => { initializeGame(); gameResetTimeout = null; }, 5000);
    } else {
      broadcastState(); // Broadcast timer updates
    }
  }
}, 1000);

app.get('/api/player/:playerNum/data', (req, res) => {
  const { playerNum } = req.params;
  const player = gameState[`player${playerNum}`];
  if (!player) return res.status(404).json({ error: 'Player not found' });
  res.json({ ...player, ...gameState, player1: undefined, player2: undefined, [`player${playerNum}`]: player });
});

const PORT = process.env.PORT || 6527;
server.listen(PORT, () => { console.log(`Hand Pose Game server running on http://localhost:${PORT}`); });

