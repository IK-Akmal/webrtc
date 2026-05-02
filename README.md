# WebRTC Conferencing

Real-time video conferencing powered by **LiveKit SFU**, NestJS backend, React frontend, PostgreSQL.

---

## Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS + TypeORM |
| Database | PostgreSQL 16 |
| Media (SFU) | LiveKit |
| Realtime (presence) | Socket.IO |
| Frontend | React + Vite + Zustand |
| Auth | JWT (access token) + httpOnly refresh cookie |
| Deployment | Docker Compose + Nginx |

---

## Architecture

```
Browser A ──── LiveKit SFU ──── Browser B
    │            (media)            │
    │                               │
    └──── NestJS Backend ───────────┘
          │  REST /api/*
          │  Socket.IO /signaling   (room presence)
          │  Socket.IO /notifications (room count push)
          │
        PostgreSQL 16
          │
        Nginx 80/443  (reverse proxy)
```

Audio/video streams flow through **LiveKit SFU** — each browser uploads one stream to the server and downloads one per remote participant. The NestJS Socket.IO gateway handles room join/leave presence events. LiveKit webhooks push real-time participant count updates to all rooms-page clients via a `/notifications` Socket.IO namespace.

---

## Quick Start (Docker — recommended)

### 1. Clone and configure

```bash
git clone <repo-url>
cd webrtc-conf
cp .env.example .env
```

Open `.env` and fill in the required values:

```ini
DB_PASS=your_strong_db_password

JWT_ACCESS_SECRET=your_random_32char_string_here
JWT_REFRESH_SECRET=another_random_32char_string

LIVEKIT_API_SECRET=your_random_livekit_secret

# Your machine's LAN IP (run `ipconfig` on Windows / `ifconfig` on Linux/macOS)
# Required on Docker Desktop (Windows/macOS) so browsers can reach LiveKit RTC ports
LIVEKIT_NODE_IP=192.168.1.100
```

### 2. Start

```bash
docker compose up --build
```

First run takes ~2 minutes (builds images, runs DB migrations automatically).

### 3. Open

```
http://localhost
```

Register two accounts in separate browser tabs, create a room, join from both — video and audio should connect.

---

## LiveKit Setup

LiveKit is included in `docker-compose.yml` and starts automatically.

### LIVEKIT_NODE_IP (important for Docker Desktop)

LiveKit must advertise the correct IP in ICE candidates so browsers can reach the media ports.

| Platform | What to set |
|----------|-------------|
| Docker Desktop (Windows/macOS) | Your machine's LAN IP, e.g. `192.168.1.100` |
| Linux Docker | Usually `127.0.0.1` or the server's public IP |

Find your LAN IP:
```bash
# Windows
ipconfig

# Linux / macOS
ifconfig | grep "inet "
```

### Required ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 80 | TCP | HTTP (Nginx) |
| 7881 | TCP | LiveKit RTC (TCP fallback) |
| 7882 | UDP | LiveKit RTC (UDP, primary) |

Make sure your firewall allows inbound 7881/TCP and 7882/UDP from browser clients.

---

## Local Development (without Docker)

### Prerequisites

- Node.js 20+
- PostgreSQL 16 running locally
- LiveKit server binary — download from [livekit.io/releases](https://livekit.io/releases) or run via Docker:

```bash
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  livekit/livekit-server:latest --dev --bind 0.0.0.0
```

### 1. Create the database

```sql
CREATE USER webrtc WITH PASSWORD 'devpassword';
CREATE DATABASE webrtc_conf OWNER webrtc;
```

### 2. Configure and start backend

```bash
cd backend
cp ../.env.example .env
# Edit .env — set DB_HOST=localhost, DB_USER=webrtc, DB_PASS=devpassword
# Set LIVEKIT_URL=ws://localhost:7880
npm install
npm run migration:run
npm run start:dev        # starts on http://localhost:3001
```

### 3. Configure and start frontend

```bash
cd frontend
npm install
npm run dev              # starts on http://localhost:5173
```

Vite proxies `/api` and `/socket.io` to the backend automatically.

### 4. Open

```
http://localhost:5173
```

---

## Environment Variables

All variables are documented in `.env.example`.

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_HOST` | yes | PostgreSQL host (`postgres` in Docker, `localhost` locally) |
| `DB_PORT` | yes | PostgreSQL port (default `5432`) |
| `DB_NAME` | yes | Database name |
| `DB_USER` | yes | Database user |
| `DB_PASS` | yes | Database password |
| `DB_SSL` | no | Set `true` for hosted PostgreSQL (e.g. Supabase, Railway) |
| `JWT_ACCESS_SECRET` | yes | Secret for access tokens — min 32 chars |
| `JWT_ACCESS_EXPIRES` | no | Access token TTL (default `15m`) |
| `JWT_REFRESH_SECRET` | yes | Secret for refresh tokens — must differ from access |
| `JWT_REFRESH_EXPIRES` | no | Refresh token TTL (default `7d`) |
| `LIVEKIT_API_KEY` | yes | LiveKit API key (default `devkey`) |
| `LIVEKIT_API_SECRET` | yes | LiveKit API secret |
| `LIVEKIT_URL` | yes | LiveKit server URL (`ws://livekit:7880` in Docker) |
| `LIVEKIT_NODE_IP` | yes* | Host LAN IP for Docker Desktop (Windows/macOS) |
| `STUN_SERVER_URL` | no | STUN server (default: Google `stun:stun.l.google.com:19302`) |
| `TURN_SERVER_URL` | no | TURN server — needed for symmetric NAT / corporate firewalls |
| `TURN_SECRET` | no | TURN static auth secret for HMAC credential generation |
| `CORS_ORIGIN` | no | Allowed CORS origin (default `http://localhost`) |
| `VITE_API_BASE_URL` | no | Frontend API base URL (default `/api`) |
| `VITE_SOCKET_URL` | no | Socket.IO server URL (default: same origin) |

---

## TURN Server (required for production)

LiveKit handles STUN/TURN internally for media. The backend also exposes `/api/rooms/ice-config` for any custom ICE server needs.

For production deployments where participants may be behind strict NAT:

### Option A — Hosted (easiest, free tier available)

1. Sign up at [Metered.ca](https://www.metered.ca/) or [Twilio](https://www.twilio.com/docs/stun-turn)
2. Set in `.env`:
   ```ini
   TURN_SERVER_URL=turn:your-provider-url:3478
   TURN_SECRET=your_secret
   ```

### Option B — Self-hosted with coturn (Linux only)

```yaml
# docker-compose.yml addition (Linux Docker only)
  coturn:
    image: coturn/coturn:latest
    network_mode: host
    volumes:
      - ./coturn/turnserver.conf:/etc/coturn/turnserver.conf:ro
```

---

## API Reference

All endpoints are prefixed with `/api`.

### Auth

| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| `POST` | `/auth/register` | — | `{ email, displayName, password }` | Register, returns access token + sets refresh cookie |
| `POST` | `/auth/login` | — | `{ email, password }` | Login, returns access token + sets refresh cookie |
| `POST` | `/auth/refresh` | cookie | — | Rotate refresh token pair |
| `POST` | `/auth/logout` | Bearer | — | Revoke refresh token, clear cookie |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/users/me` | Bearer | Current user profile |

### Rooms

| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| `GET` | `/rooms` | Bearer | — | List all rooms with participant count |
| `POST` | `/rooms` | Bearer | `{ name, description?, maxParticipants? }` | Create room |
| `GET` | `/rooms/ice-config` | Bearer | — | ICE servers with short-lived TURN credentials |
| `GET` | `/rooms/:id` | Bearer | — | Room details with active participants |
| `GET` | `/rooms/:id/livekit-token` | Bearer | — | LiveKit JWT for joining the room |
| `PATCH` | `/rooms/:id` | Bearer (owner) | `{ name?, description? }` | Update room |
| `DELETE` | `/rooms/:id` | Bearer (owner) | — | Delete room |

### Webhooks (internal)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/rooms/livekit-webhook` | LiveKit signature | LiveKit event receiver — pushes `rooms-updated` via Socket.IO |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | `{ status: "ok" }` — used by Docker healthcheck |

---

## WebSocket API

### Presence — `/signaling` namespace

Connect with the access token:

```js
import { io } from 'socket.io-client';

const socket = io('/signaling', {
  path: '/socket.io',
  auth: { token: accessToken },
  transports: ['websocket', 'polling'],
});
```

**Note:** WebRTC media (offer/answer/ICE) is handled internally by LiveKit. The Socket.IO signaling gateway manages room *presence* (who is in the room) and relays WebRTC messages for any direct peer use cases.

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-room` | `{ roomId }` | Join a room |
| `leave-room` | `{ roomId }` | Leave a room |
| `webrtc-offer` | `{ targetSocketId, offer }` | Send SDP offer to a peer |
| `webrtc-answer` | `{ targetSocketId, answer }` | Send SDP answer to a peer |
| `ice-candidate` | `{ targetSocketId, candidate }` | Send ICE candidate to a peer |
| `participant-state-changed` | `{ state }` | Broadcast mic/camera state |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room-joined` | `{ roomId, peers[] }` | Confirms join, lists existing peers |
| `user-joined` | `{ socketId, userId, displayName }` | New peer entered the room |
| `user-left` | `{ socketId, userId }` | Peer disconnected |
| `webrtc-offer` | `{ fromSocketId, offer }` | Relayed SDP offer |
| `webrtc-answer` | `{ fromSocketId, answer }` | Relayed SDP answer |
| `ice-candidate` | `{ fromSocketId, candidate }` | Relayed ICE candidate |
| `participant-state-changed` | `{ socketId, state }` | Peer muted/unmuted |

### Notifications — `/notifications` namespace

No authentication required. Subscribe on the rooms list page to receive real-time participant count updates.

```js
const socket = io('/notifications', {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
});

socket.on('rooms-updated', () => {
  // Refetch rooms list to get latest participant counts
});
```

| Event | Direction | Description |
|-------|-----------|-------------|
| `rooms-updated` | Server → Client | LiveKit participant joined or left — refetch rooms |

---

## Database Schema

### users

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | auto-generated |
| `email` | varchar unique | login identifier |
| `display_name` | varchar | display name |
| `password_hash` | varchar | bcrypt, cost 12 |
| `refresh_token_hash` | text nullable | bcrypt hash of refresh token |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### rooms

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `name` | varchar(120) | |
| `description` | text nullable | |
| `max_participants` | int | default 10 |
| `status` | enum | `waiting \| active \| closed` |
| `owner_id` | uuid FK → users | cascade delete |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### participants

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `room_id` | uuid FK → rooms | cascade delete |
| `user_id` | uuid FK → users | cascade delete |
| `socket_id` | varchar(64) | Socket.IO connection ID |
| `state` | enum | `connecting \| connected \| muted_audio \| muted_video \| disconnected` |
| `joined_at` | timestamptz | |
| `left_at` | timestamptz nullable | NULL = currently active |

Partial unique index: `UNIQUE (room_id, user_id) WHERE left_at IS NULL` — one active session per user per room.

---

## Database Migrations

```bash
cd backend

# Generate a new migration after changing entities
npm run migration:generate -- src/migrations/MigrationName

# Apply pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

In Docker, migrations run automatically on container startup.

---

## Project Structure

```
webrtc-conf/
├── .env.example
├── docker-compose.yml
├── livekit/
│   └── livekit.yaml          # LiveKit config with webhook
├── nginx/
│   └── nginx.conf
├── backend/
│   └── src/
│       ├── auth/             # register, login, JWT, refresh tokens
│       ├── users/            # user profile
│       ├── rooms/            # room CRUD + ICE config + LiveKit token
│       ├── signaling/        # Socket.IO gateway — room presence events
│       ├── notifications/    # Socket.IO /notifications + LiveKit webhook
│       ├── health/           # GET /api/health
│       └── common/           # guards, decorators, filters
└── frontend/
    └── src/
        ├── hooks/
        │   └── useRoom.ts    # LiveKit connection, media, chat, screen share
        ├── pages/            # Login, Register, Rooms, Room
        ├── components/
        │   └── video/        # VideoGrid, VideoTile, ControlBar, ChatPanel, ParticipantPanel
        ├── store/            # Zustand: authStore, roomStore
        └── api/              # axios client + REST wrappers
```

---

## Scaling

LiveKit SFU is already in use — no P2P mesh limitation. Current architecture supports **5–20+ participants** per room out of the box.

| Scale | Participants | What to add |
|-------|-------------|-------------|
| Current | 5–20 | LiveKit SFU (already active) |
| Medium | 20–100 | LiveKit cluster or Mediasoup |
| Large | 100+ | SFU cluster + CDN egress |
| Multi-region signaling | any | `@socket.io/redis-adapter` + Redis |

---

## Known Limitations

- **No chat persistence** — chat messages exist only in memory for the session duration
- **No recording** — stream recording not implemented
- **LIVEKIT_NODE_IP on Docker Desktop** — on Windows/macOS Docker Desktop, LiveKit must be told the host LAN IP so browsers can reach ports 7881/7882; auto-detection returns the Docker bridge IP which is not reachable from browsers
- **Single-node signaling** — in-memory room state in NestJS; add `@socket.io/redis-adapter` for multi-replica deployments
- **No E2E encryption** — DTLS/SRTP is built into WebRTC but no additional application-layer encryption
