# Kinstretch Pose Analysis

Full-stack web app for analyzing kinstretch and mobility movements using 3D pose estimation. Upload a video, paste a YouTube URL, or use your webcam to capture real-time pose data. Inspect movements in an interactive 3D viewer, measure joint angles with anatomical plane decomposition, and track range of motion over time with interactive charts.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| 3D Rendering | Three.js via React Three Fiber + Drei |
| Charts | Plotly.js via react-plotly.js |
| State Management | Zustand |
| Pose Estimation | MediaPipe PoseLandmarker Heavy (server-side) |
| Backend | FastAPI, SQLAlchemy (async), Pydantic v2 |
| Database | PostgreSQL 16 (JSONB for landmark data) |
| Migrations | Alembic |
| Real-time | WebSocket (webcam streaming) |
| Video | yt-dlp, OpenCV, youtube-transcript-api |

## Features

### Video Ingestion
- **Video Upload** — Drag-and-drop MP4/MOV files. A two-step flow lets you preview duration and trim start/end times before processing so only the relevant clip is extracted.
- **YouTube Import** — Paste a URL. The server downloads the video via yt-dlp, automatically inherits the YouTube title and channel name, and extracts poses in the background.
- **Webcam Real-Time** — In-browser MediaPipe runs on GPU. Live 3D skeleton beside the camera feed. Record sessions and persist frames to the database via WebSocket.
- **Video Slicing** — Set a start and end time (supports `MM:SS`, `HH:MM:SS`, or raw seconds) before processing to skip irrelevant footage.

### 3D Viewer
- **3D Pose Skeleton** — 33 MediaPipe landmarks rendered as teal spheres and sky-blue cylinders. Rotate, zoom, and pan freely with OrbitControls.
- **Timeline Scrubber** — Play/pause and step through extracted pose frames. Keyboard shortcuts: `Space` (play/pause), `←`/`→` (prev/next frame). HH:MM:SS timestamp display.
- **Video Sync** — The source video panel is displayed alongside the 3D viewer and scrubs in sync with the skeleton. Expand it to 50% width with a toggle.

### Angle Measurement
- **Bone-Click Measurement** — Click two adjacent bones (cylinders) to calculate the 3D angle at the shared joint. A visual arc with a degree label is rendered at the joint in 3D space.
- **Anatomical Plane Decomposition** — Every measurement is decomposed into sagittal, frontal, and transverse plane components using a subject-relative body frame derived from hip and shoulder landmarks. Named clinical movements (e.g. "Flex / Ext", "Abd / Add") are shown per plane.
- **Pinnable Planes** — Click a plane row in the measurement panel to pin it; the arc reorients to show motion within that plane. Sagittal is amber, frontal is sky blue, transverse is green.
- **Plane Overlays** — Toggle translucent anatomical plane meshes anchored to the subject's body in the 3D scene via the "Planes" button.
- **Draggable Label** — The angle arc label can be repositioned by dragging (three-dot handle). OrbitControls are suspended during drag to avoid conflicts.

### Saved Measurements & Analysis
- **Save Measurements** — Persist angle + plane context with a generated label (e.g. "Left Hip — Flex / Ext @ 00:01:23") to the database.
- **Measurement History** — Saved measurements are listed at the bottom of the viewer. Clicking any row instantly seeks the skeleton and video to that moment and restores the selected edges, arc, and plane breakdown — exactly as if you had clicked those bones again.
- **Joint Analysis Charts** — Two Plotly charts appear whenever a measurement is active:
  - *Angle over Time* — Four lines (3D, Sagittal, Frontal, Transverse) plotted across all frames. A dotted playhead tracks the current position. Clicking any point seeks to that frame.
  - *Spatial Trajectory* — The joint's (x, y) path over the full video, colour-coded from dark blue (start) to amber (end), with the current position highlighted.

### Session & Video Management
- **Session Management** — Group videos and measurements into named analysis sessions. Sessions can be renamed and deleted (cascades to all videos and measurements).
- **Inline Title Editing** — Click any video title in the list to rename it in place.
- **Creator Attribution** — YouTube-imported videos automatically display the source channel name below the title.
- **Delete Sessions** — Sessions and all associated data can be removed from the sidebar or session page.

## Quick Start

```bash
# 1. Start PostgreSQL
docker-compose up -d

# 2. Backend
cd backend
conda create -n kinstretch python=3.12 -y
conda activate kinstretch
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

The MediaPipe pose model (`pose_landmarker_heavy.task`, ~25 MB) is downloaded automatically on the first video processed.

## Project Structure

```
kinstretch-app/
├── kinstretch/                   # Core Python package (reusable)
│   ├── models.py                 #   Pydantic: Landmark, PoseFrame, VideoMetadata, VideoAnalysis
│   ├── youtube.py                #   search_videos(), download_video() → (path, title, creator)
│   ├── pose_extraction.py        #   extract_poses(), download_model(), Depth Anything V2 helpers
│   └── visualization.py          #   plot_pose(), animate_poses(), plot_joint_progression()
├── backend/
│   ├── app/
│   │   ├── main.py               #   FastAPI app, CORS, lifespan
│   │   ├── config.py             #   Settings (DATABASE_URL, UPLOAD_DIR, MODEL_DIR)
│   │   ├── database.py           #   Async + sync SQLAlchemy engines
│   │   ├── models/               #   ORM: User, AnalysisSession, Video, PoseFrame, Measurement
│   │   ├── schemas/              #   Pydantic request/response schemas
│   │   ├── routers/              #   API route handlers + WebSocket
│   │   ├── services/             #   angle_service, video_service, pose_service, task_manager
│   │   └── tasks/                #   Background video processing (download → extract → store)
│   └── alembic/                  #   Database migrations
├── frontend/
│   └── src/
│       ├── three/                #   PoseScene, SkeletonRenderer, AngleArc, AnatomicalPlanes,
│       │                         #   GroundGrid, helpers (body frame, plane math, cylinder transform)
│       ├── hooks/                #   useWebcam, usePoseData, useAngleMeasurement, useTaskPolling
│       ├── stores/appStore.ts    #   Zustand: frames, currentFrameIndex, selectedEdges,
│       │                         #   measuredAngle, pinnedPlane, measurements, …
│       ├── services/             #   Axios API client, WebSocket client
│       ├── constants/skeleton.ts #   POSE_CONNECTIONS, JOINT_NAMES, JOINT_PLANE_MOVEMENTS
│       ├── components/
│       │   ├── viewer/           #   PoseViewer, MeasurementPanel, MeasurementHistory,
│       │   │                     #   JointAnalysisPanel, TimelineScrubber, VideoPanel
│       │   ├── video/            #   VideoList (inline edit), VideoUpload (slice UI), YouTubeImport
│       │   ├── session/          #   SessionPage, SessionList
│       │   ├── webcam/           #   WebcamViewer
│       │   └── layout/           #   Sidebar, AppLayout
│       └── pages/                #   Dashboard, Session, Viewer, Webcam
├── kinstretch_demo.ipynb         # Exploratory notebook: search → download → extract → visualize
└── docker-compose.yml            # PostgreSQL 16
```

## Database Schema

```
users
  id          UUID PK
  email       VARCHAR(255) UNIQUE
  name        VARCHAR(255)
  created_at  TIMESTAMPTZ

sessions
  id          UUID PK
  user_id     UUID FK → users
  title       VARCHAR(255)
  notes       TEXT
  created_at  TIMESTAMPTZ
  updated_at  TIMESTAMPTZ

videos
  id            UUID PK
  session_id    UUID FK → sessions
  source_type   VARCHAR(50)       -- upload | youtube | webcam
  url           TEXT
  file_path     TEXT
  title         VARCHAR(500)      -- inherits filename stem (upload) or YouTube title
  creator       VARCHAR(255)      -- YouTube channel name
  duration_ms   INTEGER
  frame_count   INTEGER
  status        VARCHAR(50)       -- pending | processing | completed | failed
  error_message TEXT
  created_at    TIMESTAMPTZ

pose_frames
  id            UUID PK
  video_id      UUID FK → videos
  frame_index   INTEGER
  timestamp_ms  INTEGER
  landmarks     JSONB             -- Array of 33 {x, y, z, visibility}
  UNIQUE(video_id, frame_index)

measurements
  id                  UUID PK
  session_id          UUID FK → sessions
  video_id            UUID FK → videos
  frame_index         INTEGER
  frame_timestamp_ms  INTEGER
  joint_index         INTEGER     -- Shared joint (0–32)
  edge_a              INTEGER[]   -- First bone [landmark, landmark]
  edge_b              INTEGER[]   -- Second bone [landmark, landmark]
  angle_degrees       FLOAT
  label               VARCHAR(255)
  created_at          TIMESTAMPTZ
```

## API Routes

### Users
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/users` | Create user |
| `GET` | `/api/users` | List users |
| `GET` | `/api/users/{id}` | Get user |

### Sessions
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/sessions` | Create session |
| `GET` | `/api/sessions` | List sessions (`?user_id=`) |
| `GET` | `/api/sessions/{id}` | Get session |
| `PATCH` | `/api/sessions/{id}` | Update title / notes |
| `DELETE` | `/api/sessions/{id}` | Delete session (cascades) |

### Videos
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/videos/upload` | Upload video (multipart; optional `start_s`, `stop_s`) |
| `POST` | `/api/videos/youtube` | Import from YouTube URL (optional `start_s`, `stop_s`) |
| `POST` | `/api/videos/webcam` | Create webcam placeholder |
| `GET` | `/api/videos` | List videos (`?session_id=`) |
| `GET` | `/api/videos/{id}` | Get video |
| `PATCH` | `/api/videos/{id}` | Update video title |
| `GET` | `/api/videos/{id}/status` | Poll processing progress (0–100 %) |
| `DELETE` | `/api/videos/{id}` | Delete video |

### Poses
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/videos/{id}/poses` | Get pose frames (`?start_ms=&stop_ms=&stride=`) |
| `GET` | `/api/videos/{id}/poses/{frame_index}` | Get single frame |

### Measurements
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/measurements/calculate` | Calculate angle preview (no save) |
| `POST` | `/api/measurements` | Save measurement |
| `GET` | `/api/measurements` | List measurements (`?session_id=&video_id=`) |
| `DELETE` | `/api/measurements/{id}` | Delete measurement |

### WebSocket
| Path | Description |
|------|-------------|
| `ws://host/ws/pose-stream/{video_id}` | Real-time webcam pose streaming |

**WS messages:** `pose_frame` (client→server), `start_recording`, `stop_recording` / `ack`, `recording_started`, `recording_stopped`

## Angle Measurement & Plane Decomposition

The measurement pipeline runs entirely in 3D:

1. User clicks two adjacent bones in the viewer → `selectedEdges` in the store
2. The shared joint is identified (set intersection of the two edge index pairs)
3. Vectors from the joint to each outer endpoint are computed in 3D space
4. **3D angle**: `acos(dot(va, vb) / (|va| × |vb|))`
5. **Body frame**: ML (right), SI (up), and AP (forward) axes are estimated from hip and shoulder landmark positions via Gram-Schmidt orthogonalisation
6. **Plane angles**: each bone vector pair is projected onto the plane whose normal is the body-frame axis, and the angle between projections is computed
7. A visual arc and draggable degree label are rendered at the joint; the arc plane is driven by the active (dominant or pinned) anatomical plane
8. **Joint Analysis Panel**: per-frame angle and plane-angle series are computed client-side across all loaded frames using the same math, powering the Plotly charts

## Depth Enhancement (optional)

`extract_poses()` accepts `enhance_depth=True` to replace MediaPipe's z-coordinate estimates with values from **Depth Anything V2** (via HuggingFace `transformers`). This requires `torch`, `torchvision`, and `transformers` to be installed. Depth is disabled by default because it requires GPU memory and the normalization is still being calibrated.

## Roadmap

- [ ] JWT authentication and user accounts
- [ ] YouTube search from the UI (backend `search_videos()` already supports it)
- [ ] Export measurements as CSV / PDF reports
- [ ] Movement comparison — overlay two sessions side-by-side
- [ ] Calibrate Depth Anything V2 z-normalization for reliable 3D depth
- [ ] Custom joint groups and presets (e.g. "Hip Flexion Protocol")
- [ ] Mobile-responsive layout
- [ ] Celery for production-grade background task processing
- [ ] Multi-person pose tracking
- [ ] Integration with wearable sensor data
