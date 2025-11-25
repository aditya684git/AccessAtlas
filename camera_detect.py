import cv2
import torch
import pyttsx3
import threading
import time

# Load YOLOv5 model
model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)

# Start webcam
cap = cv2.VideoCapture(0)

# Track spoken labels and reset timer
spoken_labels = set()
last_reset = time.time()

# Threaded speech function with fresh engine
def speak(text):
    def run():
        local_engine = pyttsx3.init()
        local_engine.say(text)
        local_engine.runAndWait()
    threading.Thread(target=run, daemon=True).start()

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame_width = frame.shape[1]

    # Run detection
    results = model(frame)
    df = results.pandas().xyxy[0]
    df = df[df['confidence'] > 0.4]

    # Reset spoken labels every 10 seconds
    if time.time() - last_reset > 10:
        spoken_labels.clear()
        last_reset = time.time()

    labels_to_speak = []

    for _, row in df.iterrows():
        label = row['name']
        conf = row['confidence']
        x1, y1, x2, y2 = int(row['xmin']), int(row['ymin']), int(row['xmax']), int(row['ymax'])

        # Draw box and label
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(frame, f'{label} {conf:.2f}', (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        # Spatial logic
        center_x = (x1 + x2) // 2
        if center_x < frame_width / 3:
            position = "on the left"
        elif center_x > 2 * frame_width / 3:
            position = "on the right"
        else:
            position = "in the center"

        directional_label = f"{label} {position}"

        if directional_label not in spoken_labels:
            labels_to_speak.append(directional_label)
            spoken_labels.add(directional_label)

    if labels_to_speak:
        sentence = "I see " + ", ".join(f"a {label}" for label in labels_to_speak)
        print(f"Speaking: {sentence}")
        speak(sentence)

    cv2.imshow('YOLOv5 Live Detection', frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()