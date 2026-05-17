# Web-based Interactive Shadow Hand Game
> 🌐 **Language:** [English](#english) | [ภาษาไทย](#ภาษาไทย)

---

<a id="english"></a>
# 🇬🇧 English Version

A competitive hand pose recognition game where two players race to perform hand gestures faster and more accurately than their opponent!

## 📑 Table of Contents
- [Features](#-features)
- [Quick Start Guide](#-quick-start-guide)
- [How to Run (The .bat Files Guide)](#️-how-to-run-the-bat-files-guide)
  - [A. Server Side](#a-server-side-hosting-the-game)
  - [B. Local/Client Side](#b-localclient-side-the-camera--ai)
- [Database Recovery](#️-database-recovery-local-to-cloud-sync)
- [Tech Stack](#️-tech-stack)
- [Future Work](#-future-work)

## 🎮 Features
- **Real-time Multiplayer**: Powered by Socket.io for instantaneous game state syncing between players and spectators.
- **AI Hand Pose Detection**: Utilizes MediaPipe/YOLO via Python to detect hand landmarks and classify poses in real-time.
- **Dual Database System**: Uses **Supabase (PostgreSQL)** for cloud leaderboard and history, with an automatic **SQLite local fallback** to ensure no data is lost during network issues or free-tier pauses.
- **Spectator Dashboard**: Watch the match live with real-time score updates and predictions.
- **Future Proof**: Designed to easily transition from shadow-based detection to standard webcam Skeleton Tracking (Hand Landmark Detection).

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

## 🏃‍♂️ How to Run (The `.bat` Files Guide)
To make running the project as easy as possible, we have provided several `.bat` files. You need to run the **Server** on one machine, and the **Client (Camera/AI)** on the players' machines.

### A. Server Side (Hosting the Game)
This is the central brain of the game. It manages scores, timers, and databases. Choose **ONE** of the following hosting methods:

**Option 1: University Server (Recommended for Presentation)**
If deploying to the university Linux server (e.g., `10.61.200.60`), you don't need `.bat` files. Simply use PM2 to keep it running in the background:
```bash
npx pm2 start server.js --name "hand-pose-game"
```
*(Players will access the game via `http://10.61.200.60:6527`)*

**Option 2: Localhost with Public Tunnels (Playing over the internet)**
If you are running the server on your personal Windows computer and want friends to join over the internet:
1. Double-click `run-server-only.bat` to start the Node.js server.
2. Double-click **either** `run-cloudflare.bat` OR `run-ngrok.bat` to create a secure tunnel.
3. The tunnel will generate a public URL (e.g., `https://xyz.trycloudflare.com`). Share this URL with your players!

### B. Local/Client Side (The Camera & AI)
This must be run on the computers that actually have webcams connected to them (Player 1 and Player 2).

1. **Install AI Libraries:** Open a terminal in the project folder and run:
   ```bash
   pip install -r requirements.txt
   ```
2. **Start the AI Camera:**
   - For Player 1: Double-click **`run-player1-remote.bat`**
   - For Player 2: Double-click **`run-player2-remote.bat`**
3. **Enter the Server URL:** A black command window will pop up asking for the `SERVER_URL`. 
   - If playing on the University Server, type: `http://10.61.200.60:6527`
   - If playing via Tunnel, type the public URL (e.g., `https://xyz.trycloudflare.com`)
   - *(Note: It will also ask for a Camera Index. Usually, typing `0` is for your built-in webcam, or `1` for an external USB webcam).*
4. **Play!** 
   - Open your web browser and go to the Server URL.
   - Go to the Player 1 or Player 2 page.
   - Click "Ready To Play", and start making hand poses!

## 🗄️ Database Recovery (Local to Cloud Sync)
Since Supabase Free Tier pauses after 7 days of inactivity, the server automatically saves matches locally using SQLite (`game_results.db`). 

To restore or sync local data back to Supabase after unpausing your project:
```bash
node sync_to_supabase.js
```
This script intelligently reads the local SQLite data, checks for existing users, and safely upserts missing match history and scores to Supabase without triggering RLS policy errors.

## 🛠️ Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js, Socket.io
- **AI/Computer Vision**: Python, MediaPipe, OpenCV
- **Database**: Supabase (Cloud), SQLite (Local Backup)

## 🔮 Future Work
Future iterations aim to utilize full **Hand Landmark Detection** (Skeleton Tracking). This will remove the need for specialized lighting or physical setups to cast shadows, allowing the game to be played anywhere using standard webcams under normal lighting conditions.

---

<a id="ภาษาไทย"></a>
# 🇹🇭 ภาษาไทย (Thai Version)

เกมแข่งขันจำแนกท่าทางเงามือแบบอินเทอร์แอกทีฟ โดยผู้เล่น 2 คนจะต้องแข่งกันทำท่าทางมือตามโจทย์ที่ได้รับให้ถูกต้องและเร็วที่สุด!

## 📑 สารบัญ (Table of Contents)
- [ฟีเจอร์เด่น (Features)](#-ฟีเจอร์เด่น-features)
- [การติดตั้งเบื้องต้น (Quick Start Guide)](#-การติดตั้งเบื้องต้น-quick-start-guide)
- [วิธีรันโปรแกรม (คู่มือการใช้ไฟล์ .bat)](#️-วิธีรันโปรแกรม-คู่มือการใช้ไฟล์-bat)
  - [A. ฝั่งเซิร์ฟเวอร์ (Server Side)](#a-ฝั่งเซิร์ฟเวอร์-server-side)
  - [B. ฝั่งผู้เล่นและกล้อง (Local/Client Side)](#b-ฝั่งผู้เล่นและกล้อง-localclient-side)
- [การกู้คืนข้อมูล (Database Recovery)](#️-การกู้คืนข้อมูล-database-recovery)
- [เทคโนโลยีที่ใช้ (Tech Stack)](#️-เทคโนโลยีที่ใช้-tech-stack)
- [แผนในอนาคต (Future Work)](#-แผนในอนาคต-future-work)

## 🎮 ฟีเจอร์เด่น (Features)
- **มัลติเพลเยอร์แบบเรียลไทม์**: ใช้ Socket.io เพื่อซิงค์สถานะเกมระหว่างผู้เล่นและผู้ชมได้ทันที
- **AI ตรวจจับท่าทางมือ**: ใช้ Python ร่วมกับ MediaPipe/YOLO ในการตรวจจับและจำแนกท่าทางมือแบบเรียลไทม์
- **ระบบฐานข้อมูลแบบคู่ (Dual DB)**: ใช้ **Supabase (PostgreSQL)** เป็นฐานข้อมูลหลักบนคลาวด์ และมี **SQLite** เป็นระบบสำรองในเครื่อง (Local Fallback) เพื่อป้องกันข้อมูลสูญหายเมื่อเน็ตหลุดหรือฐานข้อมูลคลาวด์ถูกระงับ (Pause)
- **หน้าจอสำหรับผู้ชม (Spectator)**: สามารถดูการแข่งขัน คะแนน และผลการทายท่าทางของ AI ได้สดๆ
- **รองรับการต่อยอดในอนาคต**: โค้ดถูกออกแบบมาให้เปลี่ยนจากการใช้เงามือ (Shadow-based) ไปสู่การตรวจจับโครงสร้างมือ (Skeleton Tracking / Hand Landmark) จากกล้องปกติได้อย่างง่ายดาย

## 🚀 การติดตั้งเบื้องต้น (Quick Start Guide)
### สิ่งที่ต้องมี
- Node.js (เวอร์ชัน 14 ขึ้นไป)
- Python 3.7 ขึ้นไป
- กล้อง Webcam

### 1. การตั้งค่าฝั่งเซิร์ฟเวอร์ (Node.js)
```bash
# ติดตั้งไลบรารีที่จำเป็น
npm install

# รันเซิร์ฟเวอร์ (ค่าเริ่มต้นคือพอร์ต 6527)
npx pm2 start server.js --name "hand-pose-game"
```
เซิร์ฟเวอร์จะทำงานอยู่เบื้องหลังที่ `http://localhost:6527` (หรือ IP ของเซิร์ฟเวอร์นั้น)

### 2. การตั้งค่าฐานข้อมูล (.env)
สร้างไฟล์ `.env` ไว้ที่โฟลเดอร์หลักของโปรเจค และกรอกข้อมูลของ Supabase:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## 🏃‍♂️ วิธีรันโปรแกรม (คู่มือการใช้ไฟล์ `.bat`)
เพื่อให้ง่ายต่อการใช้งาน เราได้เตรียมไฟล์ `.bat` ไว้ให้ โดยคุณจะต้องแยกรัน **เซิร์ฟเวอร์** ไว้ที่เครื่องหนึ่ง และรัน **ไคลเอนต์ (กล้อง/AI)** ไว้ที่เครื่องของผู้เล่น

### A. ฝั่งเซิร์ฟเวอร์ (Server Side)
เลือกทำตามวิธีใดวิธีหนึ่งด้านล่างนี้:

**ทางเลือก 1: ใช้ Server มหาวิทยาลัย (แนะนำสำหรับการพรีเซนต์)**
ถ้านำไปรันบน Server Linux (เช่น `10.61.200.60`) คุณไม่ต้องใช้ไฟล์ `.bat` ให้ใช้ PM2 รันคำสั่งนี้เพื่อให้ระบบทำงานตลอดเวลา:
```bash
npx pm2 start server.js --name "hand-pose-game"
```
*(ผู้เล่นและกรรมการจะเข้าเกมผ่านลิงก์ `http://10.61.200.60:6527`)*

**ทางเลือก 2: รันในเครื่องตัวเองและปล่อยผ่าน Tunnel (เล่นผ่านอินเทอร์เน็ต)**
1. ดับเบิ้ลคลิกไฟล์ `run-server-only.bat` เพื่อเปิด Node.js เซิร์ฟเวอร์
2. ดับเบิ้ลคลิกไฟล์ `run-cloudflare.bat` **หรือ** `run-ngrok.bat` เพื่อสร้าง Tunnel
3. ระบบจะสร้าง URL สาธารณะให้ (เช่น `https://xyz.trycloudflare.com`) คุณสามารถส่งลิงก์นี้ให้เพื่อนเล่นได้เลย!

### B. ฝั่งผู้เล่นและกล้อง (Local/Client Side)
ขั้นตอนเหล่านี้ต้องทำในเครื่องคอมพิวเตอร์ของผู้เล่น (เครื่องที่มีกล้อง)

1. **ติดตั้งไลบรารี AI:** เปิด Terminal ในโฟลเดอร์โปรเจคแล้วพิมพ์:
   ```bash
   pip install -r requirements.txt
   ```
2. **เปิดกล้อง AI:**
   - ผู้เล่นที่ 1: ดับเบิ้ลคลิกไฟล์ **`run-player1-remote.bat`**
   - ผู้เล่นที่ 2: ดับเบิ้ลคลิกไฟล์ **`run-player2-remote.bat`**
3. **กรอกลิงก์เซิร์ฟเวอร์ (SERVER URL):** จะมีหน้าต่างสีดำเด้งขึ้นมาถามหา `SERVER_URL`
   - ถ้ารันบน Server มหาวิทยาลัย ให้พิมพ์: `http://10.61.200.60:6527`
   - ถ้าใช้ Tunnel ให้พิมพ์ URL ของ Tunnel นั้น (เช่น `https://xyz.trycloudflare.com`)
   - *(ระบบจะถาม Camera Index ด้วย: พิมพ์ `0` สำหรับกล้องติดเครื่อง หรือ `1` สำหรับกล้อง USB)*
4. **เริ่มเล่นเกม!**
   - เปิดเบราว์เซอร์ไปที่ลิงก์ SERVER URL ที่ตั้งไว้
   - เข้าหน้า Player 1 หรือ Player 2
   - กดปุ่ม "Ready To Play" แล้วทำท่าทางแข่งขันกันได้เลย!

## 🗄️ การกู้คืนข้อมูล (Database Recovery)
เนื่องจาก Supabase แบบฟรี จะระงับการทำงาน (Pause) ตัวเองหากไม่มีการใช้งานเกิน 7 วัน ระบบเซิร์ฟเวอร์ของเราจึงทำการสำรองข้อมูลไว้ใน SQLite (`game_results.db`) อัตโนมัติเสมอ

หากฐานข้อมูลคลาวด์กลับมาใช้งานได้ และคุณต้องการซิงค์ข้อมูลจากเครื่องกลับขึ้นไปบน Supabase ให้รันคำสั่ง:
```bash
node sync_to_supabase.js
```
สคริปต์นี้จะอ่านประวัติการแข่งขันจากไฟล์ SQLite ในเครื่องและอัปเดตขึ้น Supabase ให้อย่างปลอดภัยครับ

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js, Socket.io
- **AI/Computer Vision**: Python, MediaPipe, OpenCV
- **Database**: Supabase (Cloud), SQLite (Local Backup)

## 🔮 แผนในอนาคต (Future Work)
ในอนาคตมีแผนพัฒนาให้สามารถใช้กล้อง Webcam ปกติเล่นได้ในสภาพแสงทั่วไปโดยไม่ต้องจัดฉากแสงหรือฉากหลังเพื่อสร้างเงามือ โดยจะเปลี่ยนไปใช้เทคโนโลยี **Hand Landmark Detection** (การตรวจจับโครงร่างข้อต่อและจุดสำคัญของมือ หรือ Skeleton Tracking) ซึ่งช่วยเพิ่มความสะดวกและลดข้อจำกัดด้านสถานที่ในการเล่น

---
*จัดทำโดย กลุ่ม 15 - วิชา FRA502 Web Programming*
