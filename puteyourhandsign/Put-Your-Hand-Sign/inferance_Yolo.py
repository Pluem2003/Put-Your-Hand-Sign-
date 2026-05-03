import cv2
from ultralytics import YOLO
import base64
import socketio
import time
import threading
import os
import argparse

# --- CONFIG & ARGS ---
script_dir = os.path.dirname(os.path.abspath(__file__))
parser = argparse.ArgumentParser()
parser.add_argument('--player', type=str, default='player1')
parser.add_argument('--camera', type=int, default=0)
parser.add_argument('--server', type=str, default='http://localhost:3000')
args = parser.parse_args()

SERVER_URL = args.server.strip().rstrip('/')
MODEL_PATH = os.path.join(script_dir, "yolo26_ob_results", "runs", "detect", "yolo26_ob_experiment", "weights", "best.pt")
PLAYER_ID = args.player
CAMERA_INDEX = args.camera
THRESHOLD_VAL = 240

# --- SHARED STATE ---
latest_prediction = "Unknown"
latest_confidence = 0.0
latest_inference_time = 0.0
current_raw_frame = None
current_frame_id = 0
last_sent_frame_id = -1
is_connected = False

# --- INITIALIZE ---
print(f"Loading Model: {MODEL_PATH}")
model = YOLO(MODEL_PATH)
sio = socketio.Client(reconnection=True)

@sio.event
def connect():
    global is_connected
    is_connected = True
    print(f"\n[SUCCESS] Connected to server: {SERVER_URL}")

@sio.event
def disconnect():
    global is_connected
    is_connected = False
    print("\n[WARNING] Disconnected from server.")

# --- THREAD 1: AI INFERENCE ---
def ai_worker():
    global latest_prediction, latest_confidence, latest_inference_time
    while True:
        if current_raw_frame is not None:
            # ใช้ภาพขนาดเล็กสำหรับ AI เพื่อความเร็ว
            gray = cv2.cvtColor(current_raw_frame, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, THRESHOLD_VAL, 255, cv2.THRESH_BINARY)
            input_img = cv2.resize(binary, (320, 320))
            input_img = cv2.cvtColor(input_img, cv2.COLOR_GRAY2BGR)
            
            start = time.time()
            results = model.predict(source=input_img, conf=0.5, verbose=False, imgsz=320)
            latest_inference_time = (time.time() - start) * 1000
            
            found = False
            for r in results:
                if len(r.boxes) > 0:
                    latest_prediction = model.names[int(r.boxes[0].cls[0])]
                    latest_confidence = float(r.boxes[0].conf[0])
                    found = True
                    break
            if not found:
                latest_prediction = "None"
                latest_confidence = 0.0
        time.sleep(0.01)

# --- THREAD 2: NETWORK STREAMER ---
def stream_worker():
    global last_sent_frame_id
    while True:
        # ส่งเฉพาะเมื่อมีเฟรมใหม่ และ เชื่อมต่ออยู่
        if is_connected and current_raw_frame is not None and current_frame_id > last_sent_frame_id:
            last_sent_frame_id = current_frame_id
            
            # ย่อภาพและส่งเป็น Binary
            gray = cv2.cvtColor(current_raw_frame, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, THRESHOLD_VAL, 255, cv2.THRESH_BINARY)
            small = cv2.resize(binary, (160, 120))
            _, buffer = cv2.imencode('.jpg', small, [cv2.IMWRITE_JPEG_QUALITY, 25])
            
            payload = {
                'playerId': PLAYER_ID,
                'prediction': latest_prediction,
                'confidence': latest_confidence,
                'cameraFrame': buffer.tobytes(),
                'inferenceTime': latest_inference_time,
                'timestamp': time.time() # ใส่ timestamp เพื่อเช็คความสดใหม่
            }
            try:
                sio.emit('player_pose', payload)
            except: pass
            
        time.sleep(0.03) # Cap ไว้ที่ประมาณ 33 FPS

# --- MAIN THREAD: CAMERA & GUI ---
def main():
    global current_raw_frame, current_frame_id
    
    cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    if not cap.isOpened():
        print(f"Error: Could not open camera {CAMERA_INDEX}")
        return

    # Start Workers
    threading.Thread(target=ai_worker, daemon=True).start()
    threading.Thread(target=stream_worker, daemon=True).start()
    
    def connect_with_retry():
        while not is_connected:
            try:
                print(f"Attempting to connect to {SERVER_URL}...")
                sio.connect(SERVER_URL, wait_timeout=10, headers={'ngrok-skip-browser-warning': 'true'})
                break
            except Exception as e:
                print(f"Connection failed: {e}. Retrying in 2 seconds...")
                time.sleep(2)

    threading.Thread(target=connect_with_retry, daemon=True).start()

    print("\n--- Running AI with Local Preview ---")
    print("Press 'q' in the window to stop")

    while True:
        ret, frame = cap.read()
        if not ret: break
        
        current_raw_frame = frame.copy()
        current_frame_id += 1 # เพิ่ม ID เมื่อได้ภาพใหม่
        
        # สร้างภาพสำหรับโชว์บนจอคอม
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, THRESHOLD_VAL, 255, cv2.THRESH_BINARY)
        preview = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)
        
        # วาดข้อมูลลงบนจอ
        color = (0, 255, 0) if latest_prediction != "None" else (0, 0, 255)
        cv2.putText(preview, f"P1 AI: {latest_prediction} ({latest_confidence:.2f})", (20, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        cv2.putText(preview, f"Inference: {latest_inference_time:.1f}ms", (20, 70), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 1)
        
        cv2.imshow(f"Put Your Hand Sign - {PLAYER_ID}", preview)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    sio.disconnect()

if __name__ == "__main__":
    main()
