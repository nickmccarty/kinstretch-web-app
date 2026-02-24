# Contributing

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.12 | Backend + kinstretch package |
| Node.js | 18+ | Frontend |
| PostgreSQL | 16 | Database (via Docker) |
| Docker | any | Runs Postgres |
| conda | any | Python env management |

---

## Local Setup

### 1. Database

```bash
docker-compose up -d
```

Starts PostgreSQL 16 on port 5432 with user/password/db all set to `kinstretch`.

### 2. Backend

```bash
cd backend
conda create -n kinstretch python=3.12 -y
conda activate kinstretch
pip install -r requirements.txt

# Apply migrations
alembic upgrade head

# Run dev server (auto-reload)
uvicorn app.main:app --reload
```

Backend is at **http://localhost:8000**. The MediaPipe pose model downloads automatically on the first video processed (~25 MB, cached in `models/`).

Interactive API docs: **http://localhost:8000/docs**

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend is at **http://localhost:5173**. Vite proxies `/api`, `/uploads`, and `/ws` to the backend so no CORS config is needed during development.

---

## Project Layout

```
kinstretch-app/
├── kinstretch/          Pure Python package — ML, YouTube, visualization
├── backend/             FastAPI application
│   ├── app/
│   │   ├── models/      SQLAlchemy ORM models
│   │   ├── schemas/     Pydantic request/response models
│   │   ├── routers/     Route handlers (one file per resource)
│   │   ├── services/    Business logic (called by routers)
│   │   └── tasks/       Background task functions
│   └── alembic/         Migrations
└── frontend/
    └── src/
        ├── three/        Three.js / R3F scene components and math helpers
        ├── components/   React UI components
        ├── hooks/        Custom hooks
        ├── stores/       Zustand state
        ├── services/     Axios + WebSocket clients
        ├── constants/    Skeleton connections, joint names, clinical terms
        └── types/        TypeScript interfaces
```

---

## Development Workflows

### Adding a New API Endpoint

1. Add the route handler to the appropriate file in `backend/app/routers/`.
2. Add any new request/response shapes to `backend/app/schemas/`.
3. Put business logic in `backend/app/services/` — keep routers thin.
4. Add the corresponding client call to `frontend/src/services/api.ts`.
5. Update the API table in `README.md`.

### Adding a Database Column

1. Edit the ORM model in `backend/app/models/`.
2. Generate a migration:
   ```bash
   cd backend
   alembic revision --autogenerate -m "add column X to table Y"
   ```
3. Review the generated file in `backend/alembic/versions/`.
4. Apply it:
   ```bash
   alembic upgrade head
   ```
5. Update the schema docs in `README.md` and `ARCHITECTURE.md`.

### Adding a Zustand Action

1. Add the field and setter to the `AppState` interface in `appStore.ts`.
2. Add the implementation inside `create<AppState>((set) => ({ ... }))`.
3. Subscribe in components with `useAppStore((s) => s.yourField)`.

### Adding a Three.js Component

1. Create the file in `frontend/src/three/`.
2. Export a React component that uses `@react-three/fiber` hooks (`useFrame`, `useThree`, etc.) and Three.js geometry/materials.
3. Import and render it inside `PoseScene.tsx`.
4. Coordinate transforms: convert MediaPipe normalised coords to scene space using `landmarkToVec3()` from `three/helpers.ts`.

### Changing the Skeleton Definition

`frontend/src/constants/skeleton.ts` and `kinstretch/visualization.py` both define `POSE_CONNECTIONS`. Keep them in sync. The comment at the top of `skeleton.ts` marks the source of truth.

---

## Code Conventions

### Python
- Type hints everywhere; `from __future__ import annotations` at the top of every file.
- `snake_case` for names; `PascalCase` for classes.
- Services return domain objects or primitives — never ORM models directly to routers (use schemas).
- Background task functions live in `app/tasks/` and use the **sync** DB session (`get_sync_db()`).

### TypeScript / React
- Functional components only; props interfaces defined inline above the component.
- `useAppStore((s) => s.field)` — subscribe to the minimum slice needed.
- Three.js scene math lives in `three/helpers.ts` so it can be reused by both components and hooks without importing Three.js into UI code.
- Plotly data/layout objects typed with `as any` where the Plotly types are overly complex; runtime behaviour is what matters.

### CSS
- Tailwind utility classes only — no custom CSS files.
- Dark palette: `surface` / `surface-light` / `surface-lighter` for layered backgrounds; `brand-*` for accent colours (defined in `tailwind.config.js`).

---

## Environment Variables

All backend config comes from `backend/app/config.py` via Pydantic `BaseSettings`. Set any of these in your shell or a `.env` file at the project root:

```bash
KINSTRETCH_DATABASE_URL=postgresql+asyncpg://kinstretch:kinstretch@localhost:5432/kinstretch
KINSTRETCH_DATABASE_URL_SYNC=postgresql://kinstretch:kinstretch@localhost:5432/kinstretch
KINSTRETCH_UPLOAD_DIR=uploads
KINSTRETCH_MODEL_DIR=models
KINSTRETCH_CORS_ORIGINS='["http://localhost:5173"]'
```

---

## Dependency Notes

### Backend (`backend/requirements.txt`)

Key packages and why they are needed:

| Package | Purpose |
|---------|---------|
| `fastapi`, `uvicorn` | Web framework and ASGI server |
| `sqlalchemy[asyncio]`, `asyncpg` | Async ORM + PostgreSQL driver |
| `psycopg2-binary` | Sync PostgreSQL driver (background tasks, WebSocket) |
| `alembic` | Database migrations |
| `pydantic[email]` | Data validation and settings |
| `mediapipe` | Pose landmark extraction |
| `opencv-python-headless` | Video frame reading |
| `yt-dlp` | YouTube video download |
| `youtube-transcript-api` | YouTube transcript fetching (for search metadata) |
| `torch`, `torchvision`, `transformers` | Depth Anything V2 (optional depth enhancement) |

### Frontend (`frontend/package.json`)

| Package | Purpose |
|---------|---------|
| `react`, `react-dom` | UI framework |
| `react-router-dom` | Client-side routing |
| `zustand` | State management |
| `three`, `@react-three/fiber`, `@react-three/drei` | 3D rendering |
| `react-plotly.js`, `plotly.js` | Joint analysis charts |
| `axios` | HTTP client |
| `@mediapipe/tasks-vision` | In-browser pose detection (webcam) |

---

## Common Tasks

### Reset the database

```bash
docker-compose down -v        # destroys postgres volume
docker-compose up -d
cd backend && alembic upgrade head
```

### Re-process a video

Delete the video from the UI (or via `DELETE /api/videos/{id}`) and re-upload/import it. The processing pipeline runs fresh each time.

### Inspect pose data

```python
# In a notebook or REPL
import requests
frames = requests.get("http://localhost:8000/api/videos/{video_id}/poses").json()
# frames["frames"][0]["landmarks"] → list of 33 {x, y, z, visibility} dicts
```

The `kinstretch_demo.ipynb` notebook also demonstrates the full pipeline outside the web app.

### Run a type check

```bash
cd frontend && npx tsc --noEmit
```

---

## Architecture Reference

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for:
- Full system diagram
- Backend service layer design
- Frontend component tree and Zustand store structure
- Angle measurement and plane decomposition math
- WebSocket protocol specification
- All data flow diagrams
- Deployment considerations
