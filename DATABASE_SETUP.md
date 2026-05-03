# 🗄️ Supabase Database Setup Guide

คู่มือนี้สำหรับเตรียมความพร้อมฐานข้อมูล Supabase เพื่อใช้งานกับระบบ Leaderboard และ Match History ของเกม Hand Pose Game

## 1. สร้างตาราง (Tables)
ให้รัน SQL นี้ใน **Supabase SQL Editor** เพื่อสร้างตารางที่จำเป็น:

```sql
-- เปิดใช้งานส่วนขยายสำหรับ UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ตารางผู้เล่น
CREATE TABLE IF NOT EXISTS players (
    player_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nickname TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ตารางแมตช์การแข่งขัน
CREATE TABLE IF NOT EXISTS matches (
    match_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_mode TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ตารางผลการแข่งขันของแต่ละผู้เล่น
CREATE TABLE IF NOT EXISTS player_results (
    result_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(match_id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(player_id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    is_winner BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 2. ตั้งค่าความปลอดภัย (RLS Policies)
รัน SQL นี้เพื่ออนุญาตให้เซิร์ฟเวอร์อ่านและบันทึกข้อมูลได้ โดยยังป้องกันการแก้ไขหรือลบข้อมูลจากภายนอก:

```sql
-- เปิดใช้งาน RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_results ENABLE ROW LEVEL SECURITY;

-- สร้างกฎ: อนุญาตให้ "อ่าน" ข้อมูลได้ทุกคน (สำหรับหน้า Leaderboard/History)
CREATE POLICY "Allow select for all" ON players FOR SELECT USING (true);
CREATE POLICY "Allow select for all" ON matches FOR SELECT USING (true);
CREATE POLICY "Allow select for all" ON player_results FOR SELECT USING (true);

-- สร้างกฎ: อนุญาตให้ "เพิ่ม" ข้อมูลได้ทุกคน (สำหรับบันทึกผลการเล่น)
CREATE POLICY "Allow insert for all" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for all" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for all" ON player_results FOR INSERT WITH CHECK (true);

-- หมายเหตุ: ไม่มีการสร้าง Policy สำหรับ UPDATE และ DELETE เพื่อความปลอดภัย
```

## 3. การตั้งค่า Environment (.env)
สร้างไฟล์ `.env` ไว้ที่ Root ของโปรเจกต์ และใส่ค่าจาก Supabase Dashboard (Settings > API):

```env
SUPABASE_URL=https://xxxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 4. ตรวจสอบการเชื่อมต่อ
รันคำสั่งทดสอบผ่าน Terminal:

```bash
node test_db.js
```

หากขึ้นเครื่องหมาย ✅ ครบทุกข้อ แสดงว่าระบบฐานข้อมูลพร้อมใช้งานแล้วครับ
