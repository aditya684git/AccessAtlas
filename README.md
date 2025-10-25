# AccessAtlas
AI-powered navigation assistant for visually impaired users
---
## 📝 AccessAtlas: AI-Powered Navigation for the Visually Impaired

### 🌟 Overview
**AccessAtlas** is a mobile-first AI assistant that helps visually impaired users navigate indoor and outdoor environments safely. It combines real-time object detection, voice-guided feedback, and crowdsourced accessibility tagging to create a smarter, more inclusive experience.

This project uses the **VizWiz dataset** for object detection and **OpenStreetMap APIs** for location metadata and accessibility tagging. SANPO has been intentionally excluded to streamline development and focus on lightweight, image-based guidance.
---
### 🎯 Features
- 📷 Real-time object detection using smartphone camera
- 🗣️ Voice-guided navigation with contextual cues
- 🏷️ Accessibility tagging (e.g., ramps, elevators, tactile paths)
- 🗺️ OpenStreetMap integration for location metadata
- 📴 Offline mode for low-connectivity environments
---
### 🧠 Tech Stack
| Layer       | Tools Used                          |
|-------------|-------------------------------------|
| Frontend    | React Native                        |
| Backend     | FastAPI (Python)                    |
| AI Models   | TensorFlow / PyTorch                |
| Map API     | OpenStreetMap (Nominatim + Overpass)|
| Voice       | pyttsx3 / Google TTS                |
---
### 📦 Datasets
- **VizWiz**: Real-world images taken by blind users, used for training object detection models.
- **OpenStreetMap API**: Provides geolocation, accessibility metadata, and tagging support.

> 🛑 **Note:** The SANPO dataset was excluded to reduce complexity and focus on image-based navigation. VizWiz provides sufficient visual data for prototyping and testing.
---
### 🗓️ Timeline
| Week | Milestone |
|------|-----------|
| 1    | Planning, dataset setup, wireframes |
| 2    | Frontend UI development |
| 3    | Object detection integration |
| 4    | Backend + voice guidance |
| 5    | Accessibility tagging + map |
| 6    | Testing, polish, submission |

### 📁 Folder Structure
```
AccessAtlas/
├── README.md
├── LICENSE
├── .gitignore
├── data/              # VizWiz dataset
│   └── vizwiz/
├── docs/              # Architecture diagram, wireframes
│   └── wireframes/
├── frontend/          # React Native app
├── backend/           # FastAPI backend
├── models/            # Object detection models
│   └── object_detection/
├── scripts/           # Preprocessing utilities
│   └── preprocessing/
```
### 📜 License
This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.
