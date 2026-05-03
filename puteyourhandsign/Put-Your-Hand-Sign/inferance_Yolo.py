import cv2
from ultralytics import YOLO
import base64
import requests
import json
import time
import threading
import queue
import os
import argparse

# --- CONFIG & ARGS ---
script_dir = os.path.dirname(os.path.abspath(__file__))
parser = argparse.ArgumentParser()
parser.add_argument('--player', type=str, default='player1')
parser.add_argument('--camera', type=int, default=1)
parser.add_argument('--server', type=str, default='http://localhost:3000')
args = parser.parse_args()

MODEL_PATH = os.path.join(script_dir, "yolo26_ob_results", "runs", "detect", "yolo26_ob_experiment", "weights", "best.pt")
SERVER_URL = args.server
PLAYER_ID = args.player
CAMERA_INDEX = args.camera
THRESHOLD_VAL = 240
SEND_INTERVAL = 0.033 # เป้าหมาย 30 FPS

# --- INITIALIZE ---
model = YOLO(MODEL_PATH)
# บังคับให้ YOLO ใช้ความละเอียดต่ำลงตอนทำ Prediction เพื่อเพิ่ม FPS
# ถ้ามี GPU NVIDIA ให้เพิ่ม device=0 เข้าไปใน model.predict ด้านล่าง

cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

# --- OPTIMIZED NETWORKING ---
data_queue = queue.Queue(maxsize=3) # ลดเหลือ 3 เพื่อความสดใหม่ของภาพที่สุด
session = requests.Session() # ใช้ Session ค้างไว้เพื่อความเร็ว

def worker_thread():
    while True:
        url, payload = data_queue.get()
        try:
            session.post(url, json=payload, timeout=0.3)
        except:
            pass
        data_queue.task_done()

threading.Thread(target=worker_thread, daemon=True).start()

def encode_optimized(binary_frame):
    # ย่อภาพลงอีกนิดเพื่อให้ส่งผ่าน Tunnel ได้ทัน 30 FPS
    small = cv2.resize(binary_frame, (160, 120))
    _, buffer = cv2.imencode('.jpg', small, [cv2.IMWRITE_JPEG_QUALITY, 20])
    return base64.b64encode(buffer).decode('utf-8')

def send_data(prediction, confidence, frame_b64, ms):
    endpoint = f"{SERVER_URL}/api/{PLAYER_ID}/pose"
    payload = {
        'prediction': prediction, 'confidence': confidence,
        'cameraFrame': frame_b64, 'inferenceTime': ms
    }
    if not data_queue.full():
        data_queue.put((endpoint, payload))

# --- MAIN LOOP ---
last_send_time = 0

while True:
    ret, frame = cap.read()
    if not ret: break

    # 1. Pre-processing (ทำให้ภาพเล็กลงก่อนเข้า AI จะช่วยเพิ่ม FPS)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, THRESHOLD_VAL, 255, cv2.THRESH_BINARY)
    
    # ย่อภาพที่จะเข้า AI ให้เหลือ 320px (YOLO จะรันเร็วขึ้นมาก!)
    input_for_ai = cv2.resize(binary, (320, 320))
    input_for_ai = cv2.cvtColor(input_for_ai, cv2.COLOR_GRAY2BGR)

    # 2. Inference (ใส่ imgsz=320 เพื่อให้ AI รันเร็วขึ้น)
    start_time = time.time()
    results = model.predict(source=input_for_ai, conf=0.5, verbose=False, imgsz=320)
    inference_ms = (time.time() - start_time) * 1000

    # 3. Get results
    prediction, confidence = "Unknown", 0.0
    for r in results:
        if len(r.boxes) > 0:
            prediction = model.names[int(r.boxes[0].cls[0])]
            confidence = float(r.boxes[0].conf[0])
            break

    # 4. Network Send (30 FPS)
    curr_time = time.time()
    if curr_time - last_send_time >= SEND_INTERVAL:
        b64 = encode_optimized(binary)
        send_data(prediction, confidence, b64, inference_ms)
        last_send_time = curr_time

    # ปิดหน้าต่างโชว์ทั้งหมด (ถ้าคอมเมนต์ 2 บรรทัดนี้จะไม่มีหน้าต่างเด้งในเครื่อง)
    # cv2.imshow('Debug', binary)
    # if cv2.waitKey(1) & 0xFF == ord('q'): break

cap.release()
cv2.destroyAllWindows()