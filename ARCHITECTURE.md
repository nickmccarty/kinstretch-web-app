# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (localhost:5173)                                            │
│                                                                      │
│  React + TypeScript + Vite                                           │
│  ┌────────────┐  ┌───────────────┐  ┌──────────────────────────┐    │
│  │  Pages /   │  │  Zustand      │  │  Three.js / R3F Canvas   │    │
│  │  Components│◄─┤  appStore.ts  │  │  Skeleton · Arc · Planes │    │
│  └────────────┘  └───────────────┘  └──────────────────────────┘    │
│         │                │                       ▲                   │
│         │ Axios /api     │ frames, edges          │ landmarks         │
│         ▼                ▼                       │                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Services: api.ts (REST) · websocket.ts (WS)                │    │
│  └──────────┬──────────────────────────────┬───────────────────┘    │
└─────────────┼──────────────────────────────┼───────────────────────┘
              │ HTTP /api/*                  │ WS /ws/pose-stream/{id}
              ▼                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FastAPI (localhost:8000)                                            │
│                                                                      │
│  Routers: users · sessions · videos · poses · measurements · ws     │
│  Services: pose_service · video_service · angle_service · task_mgr  │
│  Background: process_video_task (yt-dlp → MediaPipe → DB)           │
└───────────────────────┬─────────────────────────────────────────────┘
                        │ asyncpg / psycopg2
                        ▼
              ┌──────────────────┐
              │  PostgreSQL 16   │
              │  (Docker)        │
              │                  │
              │  users           │
              │  sessions        │
              │  videos          │
              │  pose_frames     │
              │  measurements    │
              └──────────────────┘
```

---

## Backend

### Application Bootstrap (`app/main.py`)

```
lifespan():
  startup:
    create UPLOAD_DIR, MODEL_DIR
    download MediaPipe heavy model (~25 MB, cached)
    ensure default demo user exists in DB

FastAPI app:
  CORS middleware → allow localhost:5173
  Mount routers at /api/...
  Mount /uploads static dir (for video file serving)
```

### Service Layer

```
Routers (HTTP handlers)
  └─ call Services (business logic)
        └─ call kinstretch/ package (ML / IO)

app/services/
  video_service.py    save_upload(), download_youtube_video()
  pose_service.py     extract_poses_from_video()
  angle_service.py    calculate_angle(), find_shared_joint(), JOINT_NAMES
  task_manager.py     in-memory task registry (PENDING→PROCESSING→COMPLETED/FAILED)
```

`task_manager.py` is a module-level `dict[UUID, TaskInfo]`. It is intentionally simple — a single-process prototype. Replace with Redis + Celery for multi-worker deployments.

### Database Layer

Two SQLAlchemy engines are wired up:

| Engine | Driver | Used by |
|--------|--------|---------|
| `async_engine` | `asyncpg` | FastAPI route handlers (async) |
| `sync_engine` | `psycopg2` | Background tasks, WebSocket handler (blocking) |

Background tasks run in FastAPI's thread pool. They use the sync engine to avoid async-in-thread complexity.

### Video Processing Pipeline

```
POST /api/videos/upload  OR  POST /api/videos/youtube
  │
  ├─ Create Video row (status="pending")
  ├─ create_task(video_id)         ← registers in-memory task
  └─ BackgroundTasks.add_task(process_video_task, ...)

process_video_task() [background thread]:
  5%  → video.status = "processing"
  10% → (YouTube) yt-dlp download → update title, creator, file_path
  30% → file ready
  35% → extract_poses_from_video()
          └─ kinstretch/pose_extraction.py
                └─ cv2.VideoCapture
                └─ MediaPipe PoseLandmarker (VIDEO mode, frame_stride=5)
                └─ (optional) Depth Anything V2 z-replacement
  85% → bulk insert PoseFrame rows
 100% → video.frame_count, video.duration_ms, status="completed"

Error path:
  → video.status = "failed", video.error_message = str(e)
  → task updated with FAILED status
```

Frontend polls `GET /api/videos/{id}/status` and displays progress.

---

## Frontend

### Component Tree

```
App
├── Sidebar (session list, navigation)
└── <Routes>
    ├── / → Dashboard (session list + create)
    ├── /sessions/:id → SessionPage
    │     ├── VideoUpload (drag-drop + time-slice UI)
    │     ├── YouTubeImport (URL + time-slice)
    │     └── VideoList (title edit, status, creator)
    ├── /viewer/:videoId → ViewerPage
    │     └── PoseViewer
    │           ├── PoseScene (R3F Canvas)
    │           │     ├── SkeletonRenderer
    │           │     ├── AngleArc
    │           │     ├── AnatomicalPlanes (togglable)
    │           │     └── OrbitControls
    │           ├── VideoPanel (synced video + expand toggle)
    │           ├── TimelineScrubber (play/pause/keyboard)
    │           ├── MeasurementPanel (plane breakdown + save)
    │           ├── MeasurementHistory (saved list + seek)
    │           └── JointAnalysisPanel (Plotly charts)
    └── /webcam/:videoId → WebcamPage
          └── WebcamViewer
                ├── WebcamCapture (<video> + canvas overlay)
                └── PoseScene (live skeleton)
```

### State Management (Zustand)

`stores/appStore.ts` is the single source of truth for the viewer session:

```
┌────────────────────────────────────────────────────────┐
│  appStore                                              │
│                                                        │
│  Navigation                                            │
│    userId, currentSessionId                            │
│                                                        │
│  Pose Data                                             │
│    frames: PoseFrame[]        ← all frames for video   │
│    currentFrameIndex: number  ← drives everything      │
│    isPlaying: boolean                                  │
│                                                        │
│  Measurement State                                     │
│    selectedEdges: [n,n][]     ← 0, 1, or 2 edges       │
│    measuredAngle              ← computed angle + planes │
│    pinnedPlane                ← user-selected plane     │
│    labelDragging              ← disables OrbitControls  │
│                                                        │
│  History                                               │
│    measurements: Measurement[]                         │
└────────────────────────────────────────────────────────┘
```

`currentFrameIndex` is the central clock. Everything downstream is derived from it:
- `VideoPanel` reads `frames[currentFrameIndex].timestamp_ms` → `video.currentTime`
- `PoseViewer` reads `frames[currentFrameIndex].landmarks` → skeleton
- `JointAnalysisPanel` draws a playhead at `frames[currentFrameIndex].timestamp_ms`

### Three.js Scene

```
<Canvas camera={{ position:[0, 0.5, 3], fov:50 }}>
  ambient + directional lights
  <Environment preset="night" />
  <GroundGrid />

  [when landmarks available]
  ├── <AnatomicalPlanes />  (showPlanes=true only)
  ├── <SkeletonRenderer />
  │     joints: <sphereGeometry r=0.018 />
  │     bones:  <cylinderGeometry r=0.008, len=dist(a,b) />
  │             clickable → addSelectedEdge(edge)
  └── <AngleArc />  (measuredAngle + 2 edges selected)
        arc points: lerp between normalised bone vectors
        label: <Html> overlay, draggable

  <OrbitControls enabled={!labelDragging} />
</Canvas>
```

**Coordinate system:** MediaPipe outputs normalised [0,1] screen coords. The app maps them to scene space with `SCALE = 2.0` and centres at the frame origin:

```
scene_x =  (lm.x - 0.5) * 2.0
scene_y = -(lm.y - 0.5) * 2.0   // Y-flip (screen→world)
scene_z = -lm.z          * 2.0
```

### Key Hooks

| Hook | Purpose |
|------|---------|
| `usePoseData(videoId)` | Fetches all frames → `setFrames()` |
| `useAngleMeasurement(videoId)` | Watches `selectedEdges`; calls API when 2 selected; computes plane angles |
| `useWebcam()` | Camera access, in-browser MediaPipe inference loop |
| `useTaskPolling(videoId)` | Polls `/status` endpoint until `completed` or `failed` |

---

## Angle Measurement & Plane Decomposition

### 3D Angle

Given two bone edges sharing a joint `j`, with outer endpoints `a` and `b`:

```
vₐ = a − j
v_b = b − j

angle = acos( (vₐ · v_b) / (|vₐ| × |v_b|) )
```

### Body Frame Estimation

Four landmarks are used to build a subject-relative anatomical coordinate frame:

```
lHip  = landmark[23]   rHip  = landmark[24]
lSh   = landmark[11]   rSh   = landmark[12]

origin = (lHip + rHip) / 2

right   = normalise(rHip − lHip)                     // ML axis
rawUp   = shCentre − origin
up      = normalise(rawUp − right·(rawUp·right))     // SI axis (Gram-Schmidt)
forward = normalise(right × up)                      // AP axis
```

### Plane Angle

To find the angle component within one anatomical plane, both bone vectors are projected onto that plane (whose normal is the corresponding axis), then the angle between projections is computed:

```
project(v, n) = v − n·(v·n)

sagittal   = angle(project(vₐ, right),   project(v_b, right))
frontal    = angle(project(vₐ, forward), project(v_b, forward))
transverse = angle(project(vₐ, up),      project(v_b, up))
```

The dominant plane (highest angle value) drives the arc colour and label text unless the user has pinned a plane.

### Per-Frame Series (JointAnalysisPanel)

When a measurement is active, `JointAnalysisPanel` iterates `frames[]` and recomputes both the 3D angle and the three plane angles for every frame using the same helpers, producing the Plotly time-series charts. This is purely client-side and uses `useMemo` — it only recalculates when the joint or edge selection changes, not on every scrub.

---

## WebSocket Protocol

**Endpoint:** `ws://localhost:8000/ws/pose-stream/{video_id}`

### Client → Server

```jsonc
// Begin recording
{ "type": "start_recording" }

// Stream a pose frame (sent every detected frame while recording)
{
  "type": "pose_frame",
  "frame_index": 42,
  "timestamp_ms": 1400,
  "landmarks": [
    { "x": 0.501, "y": 0.402, "z": -0.05, "visibility": 0.998 },
    // … 33 total
  ]
}

// End recording
{ "type": "stop_recording" }
```

### Server → Client

```jsonc
{ "type": "ack", "frames_received": 30 }        // every 30 frames
{ "type": "recording_started" }
{ "type": "recording_stopped", "frame_count": 150, "duration_ms": 5000 }
```

### Server Buffering

Frames accumulate in a module-level list. Two flush triggers:

1. Buffer reaches **500 frames** (prevents memory growth for long sessions)
2. Client sends `stop_recording` or disconnects

Each flush is a synchronous bulk insert using the sync DB session (safe from within a thread).

---

## Data Flows

### Upload → View

```
VideoUpload
 └─ POST /api/videos/upload (FormData: session_id, file, title?, start_s?, stop_s?)
      └─ save file → create Video(status="pending") → BackgroundTask
           └─ process_video_task
                └─ extract_poses(path, start_s, stop_s, frame_stride=5)
                     └─ MediaPipe PoseLandmarker (VIDEO mode)
                └─ bulk insert PoseFrame rows
                └─ video.status = "completed"
VideoList polls /status → shows progress bar
User opens Viewer
 └─ usePoseData → GET /api/videos/{id}/poses
      └─ setFrames(data.frames)  [Zustand]
           └─ currentFrameIndex=0 → PoseScene renders frame 0
```

### YouTube Import → View

Identical to Upload except:
- `process_video_task` calls `video_service.download_youtube_video(url)`
- `download_video()` (yt-dlp) returns `(path, title, creator)`
- `video.title` and `video.creator` are written before pose extraction begins

### Angle Measurement → Save

```
User clicks bone A → addSelectedEdge([a0,a1])   selectedEdges: 1 edge
User clicks bone B → addSelectedEdge([b0,b1])   selectedEdges: 2 edges

useAngleMeasurement useEffect fires:
  findSharedJoint(edgeA, edgeB) → jointIdx
  buildBodyFrame(landmarks)     → {right, up, forward, origin}
  getPlaneAngles(j, a, b, frame)→ {sagittal, frontal, transverse}
  POST /api/measurements/calculate
    └─ angle_service.calculate_angle() → {joint_index, angle_degrees, joint_name}
  setMeasuredAngle({jointIndex, degrees, jointName, planeAngles})

PoseScene re-renders:
  AngleArc draws arc at joint, colour = dominant/pinned plane
  MeasurementPanel shows degree + plane breakdown

User clicks Save:
  POST /api/measurements  →  Measurement row created
  addMeasurement(m)        →  MeasurementHistory updates

User clicks saved measurement:
  setSelectedEdges([m.edge_a, m.edge_b])  →  skeleton highlights bones
  setCurrentFrameIndex(m.frame_index)     →  skeleton + video seek to that moment
  useAngleMeasurement fires again         →  arc + panel restored
```

### Webcam Record → View

```
WebcamViewer mounts
  POST /api/videos/webcam → Video(status="pending")
  WS connect: /ws/pose-stream/{videoId}

useWebcam() loop (requestAnimationFrame):
  MediaPipe PoseLandmarker.detectForVideo(videoFrame, now)
  landmarks → update React state → PoseScene renders live

User clicks Record:
  WS send { type:"start_recording" }
  Loop additionally calls wsClient.sendFrame() per detection

User clicks Stop:
  WS send { type:"stop_recording" }
  Server bulk-inserts frames, sets status="completed"
  Frontend navigates to viewer
```

---

## Configuration

All settings are in `backend/app/config.py` via Pydantic `BaseSettings`. Override any value by setting the corresponding env var prefixed with `KINSTRETCH_`:

| Setting | Default | Override |
|---------|---------|----------|
| `DATABASE_URL` | `postgresql+asyncpg://kinstretch:kinstretch@localhost:5432/kinstretch` | `KINSTRETCH_DATABASE_URL` |
| `DATABASE_URL_SYNC` | `postgresql://kinstretch:kinstretch@localhost:5432/kinstretch` | `KINSTRETCH_DATABASE_URL_SYNC` |
| `UPLOAD_DIR` | `uploads/` | `KINSTRETCH_UPLOAD_DIR` |
| `MODEL_DIR` | `models/` | `KINSTRETCH_MODEL_DIR` |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | `KINSTRETCH_CORS_ORIGINS` |
| `DEFAULT_USER_EMAIL` | `demo@kinstretch.app` | `KINSTRETCH_DEFAULT_USER_EMAIL` |

### Docker Compose

```yaml
db:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: kinstretch
    POSTGRES_PASSWORD: kinstretch
    POSTGRES_DB: kinstretch
  ports: ["5432:5432"]
  volumes: [pgdata:/var/lib/postgresql/data]
```

### Vite Dev Proxy

`frontend/vite.config.ts` proxies all dev-time requests to avoid CORS:

```
/api/*        → http://localhost:8000
/uploads/*    → http://localhost:8000   (video file serving)
/ws/*         → ws://localhost:8000     (WebSocket, ws:true)
```

---

## Database Schema

### Entity Relationships

```
User ──< AnalysisSession ──< Video ──< PoseFrame
                         │         └─< Measurement
                         └─────────────< Measurement
```

All foreign keys use `ON DELETE CASCADE`.

### Key Design Decisions

**`landmarks` as JSONB** — Each `PoseFrame` stores all 33 landmarks as a JSON array. This avoids a separate `landmarks` table with 33 rows per frame and makes bulk inserts fast. Queries that need individual landmark values use PostgreSQL JSON path operators or fetch the whole array to Python.

**Separate `frame_index` and `timestamp_ms`** — `frame_index` is the extraction-relative index (0, 5, 10, … with stride=5), not the video's native frame number. `timestamp_ms` is the wall-clock time used to seek the video element.

**`UNIQUE(video_id, frame_index)`** — Prevents duplicate frames from re-processing runs without needing to delete existing data first.

**Two DB engines** — `asyncpg` for FastAPI async routes; `psycopg2` for background threads (MediaPipe is blocking; running async code from a thread pool is error-prone).

---

## Deployment Notes

The current setup is a single-process development configuration. For production:

| Concern | Current | Production path |
|---------|---------|-----------------|
| Background tasks | FastAPI `BackgroundTasks` (in-process) | Celery + Redis worker |
| Task state | Module-level dict (lost on restart) | Redis or DB-backed task table |
| File storage | Local filesystem (`uploads/`) | Object store (S3, GCS) |
| Model cache | Local filesystem (`models/`) | Baked into container image |
| Auth | Demo user only | JWT + proper user registration |
| CORS | `localhost:5173` hardcoded | Env var for production origin |
| WebSocket | Single server | Sticky sessions or pub/sub for scale |
