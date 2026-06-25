# Streamly — MERN Video Streaming Platform

A full-stack video platform with **uploads, server-side transcoding to adaptive HLS, and per-user watch history with resume**. Built with MongoDB, Express, React, and Node.

![stack](https://img.shields.io/badge/stack-MERN-6d5efc) ![hls](https://img.shields.io/badge/streaming-HLS-success)

## Features

- 🔐 **JWT auth** — register / login, password hashing with bcrypt
- ⬆️ **Chunk-friendly uploads** with live progress (Multer, up to 500 MB)
- 🎞️ **Transcoding pipeline** — ffmpeg converts every upload into adaptive **HLS** with multiple renditions (360p / 720p), a master playlist, and an auto-generated thumbnail
- ⚙️ **Background job queue** — transcoding runs off the request path in an in-process FIFO queue with DB-tracked status (`uploaded → processing → ready / failed`) and crash recovery (interrupted jobs re-queue on boot)
- ▶️ **Adaptive playback** — hls.js (Chromium/Firefox) with native HLS fallback (Safari/iOS)
- 🕘 **Watch history & resume** — progress is saved as you watch and the player seeks back to where you left off
- 🎬 **Creator studio** — manage your uploads and watch transcode status update live
- 🔎 Browse, search, and view counts

## Architecture

```
client/  React + Vite SPA (hls.js, react-router, axios)
server/  Express API
  ├─ models/      User, Video, WatchHistory (Mongoose)
  ├─ controllers/ auth, video, history
  ├─ services/    transcode.js  (fluent-ffmpeg → HLS)
  ├─ queue/       transcodeQueue.js  (background worker)
  ├─ middleware/  auth (JWT), upload (Multer), error
  └─ storage/     uploads/ (raw)  media/ (HLS)  thumbnails/
```

**Upload flow:** client `POST /api/videos` → file saved to `storage/uploads` → `Video` doc created (`status: uploaded`) → job enqueued → worker runs ffmpeg into a temp dir → HLS + thumbnail published to `storage/media` & `storage/thumbnails` → `status: ready`. The client studio polls until ready.

> The transcoder writes into a space-free temp dir then moves results into storage, because `fluent-ffmpeg` splits option strings on spaces and the project path may contain them. The queue interface is deliberately tiny so it can be swapped for **BullMQ/Redis** without touching controllers.

## Prerequisites

- Node 18+ and npm
- MongoDB running locally (or a connection string)
- **ffmpeg** on PATH (`brew install ffmpeg` / `apt install ffmpeg`)

## Setup

```bash
# 1. Backend
cd server
cp .env.example .env        # adjust if needed
npm install
npm start                   # http://localhost:5050

# 2. Frontend (separate terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

Then open http://localhost:5173, create an account, and upload a video.

### Environment

`server/.env`

| var | default | meaning |
|-----|---------|---------|
| `PORT` | 5050 | API port |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/video_mern` | database |
| `JWT_SECRET` | — | **change in production** |
| `CLIENT_ORIGIN` | `http://localhost:5173` | CORS origin |
| `MAX_UPLOAD_MB` | 500 | upload size cap |

`client/.env`

| var | default |
|-----|---------|
| `VITE_API_URL` | `http://localhost:5050` |

## API

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | — | create account → `{ token, user }` |
| POST | `/api/auth/login` | — | login → `{ token, user }` |
| GET | `/api/auth/me` | ✓ | current user |
| GET | `/api/videos` | — | list ready videos (`?q=&page=&limit=`) |
| POST | `/api/videos` | ✓ | upload (multipart: `title`, `description`, `video`) |
| GET | `/api/videos/mine` | ✓ | my uploads (any status) |
| GET | `/api/videos/:id` | — | video detail |
| POST | `/api/videos/:id/view` | — | increment view count |
| DELETE | `/api/videos/:id` | ✓ | delete own video |
| GET | `/api/history` | ✓ | watch history |
| POST | `/api/history` | ✓ | upsert progress `{ videoId, progress, completed }` |
| GET | `/api/history/:videoId` | ✓ | resume point |
| DELETE | `/api/history` | ✓ | clear history |

HLS output is served statically at `/static/media/:id/master.m3u8`; thumbnails at `/static/thumbnails/:id/thumb.jpg`.

## Deployment

This repo deploys as three pieces: **MongoDB Atlas** (database) → **Render** (backend API) → **Vercel** (frontend). Deploy in that order, because each step needs the previous one's URL.

### 1. MongoDB Atlas (database)

1. Create a free **M0** cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Database Access** → add a user (username + password).
3. **Network Access** → allow `0.0.0.0/0` (so Render can connect).
4. **Connect → Drivers** → copy the connection string. It looks like:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxx.mongodb.net/video_mern?retryWrites=true&w=majority`
   (add `/video_mern` before the `?` to name the database).

### 2. Render (backend API)

The repo includes [`render.yaml`](render.yaml), so:

1. Render → **New → Blueprint** → connect this GitHub repo. It detects `render.yaml` and provisions `streamly-api`.
2. When prompted, set the two secret env vars:
   - `MONGO_URI` = your Atlas connection string from step 1
   - `CLIENT_ORIGIN` = your Vercel URL (set after step 3 — use a placeholder for now, then update)
3. Deploy. Your API will be at `https://streamly-api.onrender.com` (or similar). `JWT_SECRET` is auto-generated.

> ffmpeg is bundled via `ffmpeg-static`, so no system install is needed on Render.
> ⚠️ Render's free tier has an **ephemeral filesystem** — uploaded/transcoded videos are wiped on redeploy/restart. Fine for a demo; for durability use S3 or a Render persistent disk.

### 3. Vercel (frontend)

1. Vercel → **Add New → Project** → import this repo.
2. Set **Root Directory** to `client`.
3. Add env var `VITE_API_URL` = your Render API URL from step 2.
4. Deploy. Vite framework + the included [`client/vercel.json`](client/vercel.json) handles SPA routing.

### 4. Close the loop

Go back to Render and set `CLIENT_ORIGIN` to the real Vercel URL, then redeploy so CORS allows the frontend.

## Possible next steps

- Swap the in-process queue for **BullMQ + Redis** and run the worker as its own process
- Move storage to **S3** + CloudFront (the storage layer is already isolated)
- Add likes/comments/subscriptions, captions (WebVTT), and a 1080p tier
