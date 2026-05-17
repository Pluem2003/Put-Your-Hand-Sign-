# Web-based Interactive Shadow Hand Game

A competitive hand pose recognition game where two players race to perform hand gestures faster and more accurately than their opponent!

## 🎮 Features

- **Real-time Multiplayer**: Powered by Socket.io for instantaneous game state syncing between players and spectators.
- **AI Hand Pose Detection**: Utilizes MediaPipe/YOLO via Python to detect hand landmarks and classify poses in real-time.
- **Dual Database System**: Uses **Supabase (PostgreSQL)** for cloud leaderboard and history, with an automatic **SQLite local fallback** to ensure no data is lost during network issues or free-tier pauses.
- **Spectator Dashboard**: Watch the match live with real-time score updates and predictions.
- **Future Proof**: Designed to easily transition from shadow-based detection to standard webcam Skeleton Tracking (Hand Landmark Detection).

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v14 or higher)
- Python 3.7+
- Webcam

### 1. Setup the Server (Node.js)

```bash
# Install dependencies
npm install

# Start the server (Runs on port 6527 by default)
npx pm2 start server.js --name "hand-pose-game"
```
The server will now run in the background at `http://localhost:6527` (or your server's IP).

### 2. Setup Database Environment (.env)
Create a `.env` file in the root directory for Supabase:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### 3. Setup AI Client (Python)

On the machine(s) connected to the webcams (Players):
```bash
# Install required Python libraries
pip install -r requirements.txt
```

### 4. How to Play

1. **Start the Game Server:** Ensure the Node.js server is running via PM2.
2. **Open the Web Interfaces:**
   - **Main Hub:** `http://<SERVER_IP>:6527`
   - **Spectator:** `http://<SERVER_IP>:6527/spectator`
   - **Player 1:** `http://<SERVER_IP>:6527/player1`
   - **Player 2:** `http://<SERVER_IP>:6527/player2`
3. **Start the AI Cameras:**
   - Run `run-player1-remote.bat` (or your specific bat file).
   - When prompted for the Server URL, enter your server's IP and port (e.g., `http://10.61.200.60:6527`).
4. **Ready Up:** Click "Ready To Play" on the web interfaces.
5. **Perform Poses:** Follow the on-screen prompts and perform the hand poses in front of the camera. The AI will send the predictions to the server. First to correctly match the pose wins the round!

---

## 🗄️ Database Recovery (Local to Cloud Sync)

Since Supabase Free Tier pauses after 7 days of inactivity, the server automatically saves matches locally using SQLite (`game_results.db`). 

To restore or sync local data back to Supabase after unpausing your project:
```bash
node sync_to_supabase.js
```
This script intelligently reads the local SQLite data, checks for existing users, and safely upserts missing match history and scores to Supabase without triggering RLS policy errors.

---

## 🛠️ Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js, Socket.io
- **AI/Computer Vision**: Python, MediaPipe, OpenCV
- **Database**: Supabase (Cloud), SQLite (Local Backup)

---

## 🔮 Future Work
Future iterations aim to utilize full **Hand Landmark Detection** (Skeleton Tracking). This will remove the need for specialized lighting or physical setups to cast shadows, allowing the game to be played anywhere using standard webcams under normal lighting conditions.

---
*Created by Group 15 for FRA502 Web Programming.*