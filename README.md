# WebRTC Conferencing

Real-time video conferencing with WebRTC P2P mesh, NestJS backend, React frontend, PostgreSQL.

---

## Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS + TypeORM |
| Database | PostgreSQL 16 |
| Realtime | Socket.IO (signaling) |
| Frontend | React + Vite + Zustand |
| Auth | JWT (access token) + httpOnly refresh cookie |
| Deployment | Docker Compose + Nginx |

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

# Leave TURN empty for local testing — Google STUN is enough on a local network
TURN_SERVER_URL=
TURN_SECRET=
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

Register two accounts in separate browser tabs, create a room, join from both — video should connect.

---

## Local Development (without Docker)

### Prerequisites

- Node.js 20+
- PostgreSQL 16 running locally

### 1. Create the database

```sql
CREATE USER webrtc WITH PASSWORD 'devpassword';
CREATE DATABASE webrtc_conf OWNER webrtc;
```

### 2. Configure backend

```bash
cd backend
cp .env.example .env
# Edit .env — set DB_HOST=localhost, DB_USER=webrtc, DB_PASS=devpassword
```

### 3. Start backend

```bash
cd backend
npm install
npm run migration:run   # run DB migrations
npm run start:dev       # starts on http://localhost:3001
```

### 4. Configure and start frontend

```bash
cd frontend
npm install
npm run dev             # starts on http://localhost:5173
```

Vite automatically proxies `/api` and `/socket.io` to the backend — no extra config needed.

### 5. Open

```
http://localhost:5173
```

---

## Environment Variables

All variables are documented in `.env.example` at the project root.

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
| `JWT_REFRESH_SECRET` | yes | Secret for refresh tokens — must differ from access secret |
| `JWT_REFRESH_EXPIRES` | no | Refresh token TTL (default `7d`) |
| `STUN_SERVER_URL` | no | STUN server (default: Google `stun:stun.l.google.com:19302`) |
| `TURN_SERVER_URL` | no | TURN server URL — required for users behind corporate firewalls |
| `TURN_SECRET` | no | TURN static auth secret for HMAC credential generation |
| `CORS_ORIGIN` | no | Allowed CORS origin (default `http://localhost`) |
| `VITE_API_BASE_URL` | no | Frontend API base URL (Vite build-time, default `/api`) |
| `VITE_SOCKET_URL` | no | Socket.IO server URL (Vite build-time, default same origin) |

---

## TURN Server (required for production)

WebRTC works without TURN on a local network. For users behind symmetric NAT or corporate firewalls, a TURN server is required.

### Option A — Hosted (easiest, free tier available)

1. Sign up at [Metered.ca](https://www.metered.ca/) or [Twilio](https://www.twilio.com/docs/stun-turn)
2. Get your TURN URL and credentials
3. Set in `.env`:
   ```ini
   TURN_SERVER_URL=turn:your-provider-url:3478
   TURN_SECRET=your_secret
   ```

### Option B — Self-hosted with coturn (Linux only)

Add to `docker-compose.yml` (Linux Docker only — not supported on Docker Desktop for Windows/macOS):

```yaml
  coturn:
    image: coturn/coturn:latest
    network_mode: host
    volumes:
      - ./coturn/turnserver.conf:/etc/coturn/turnserver.conf:ro
```

`coturn/turnserver.conf`:
```
listening-port=3478
use-auth-secret
static-auth-secret=${TURN_SECRET}
realm=your-domain.com
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
| `PATCH` | `/rooms/:id` | Bearer (owner) | `{ name?, description? }` | Update room |
| `DELETE` | `/rooms/:id` | Bearer (owner) | — | Delete room |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | `{ status: "ok" }` — used by Docker healthcheck |

---

## WebSocket Signaling

Connect to `/signaling` namespace with the access token:

```js
import { io } from 'socket.io-client';

const socket = io('/signaling', {
  path: '/socket.io',
  auth: { token: accessToken },
  transports: ['websocket'],
});
```

### Events

**Client → Server**

| Event | Payload | Description |
|-------|---------|-------------|
| `join-room` | `{ roomId }` | Join a room |
| `leave-room` | `{ roomId }` | Leave a room |
| `webrtc-offer` | `{ targetSocketId, offer }` | Send SDP offer to a peer |
| `webrtc-answer` | `{ targetSocketId, answer }` | Send SDP answer to a peer |
| `ice-candidate` | `{ targetSocketId, candidate }` | Send ICE candidate to a peer |
| `participant-state-changed` | `{ state }` | Broadcast mic/camera state |

**Server → Client**

| Event | Payload | Description |
|-------|---------|-------------|
| `room-joined` | `{ roomId, peers[] }` | Confirms join, lists existing peers |
| `user-joined` | `{ socketId, userId, displayName }` | New peer entered the room |
| `user-left` | `{ socketId, userId }` | Peer disconnected |
| `webrtc-offer` | `{ fromSocketId, offer }` | Relayed SDP offer |
| `webrtc-answer` | `{ fromSocketId, answer }` | Relayed SDP answer |
| `ice-candidate` | `{ fromSocketId, candidate }` | Relayed ICE candidate |
| `participant-state-changed` | `{ socketId, state }` | Peer muted/unmuted |

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

## Scaling Beyond the Prototype

The current setup supports **2–6 participants** per room (P2P mesh).

| Scale | Participants | What to add |
|-------|-------------|-------------|
| Small | 6–20 | `@socket.io/redis-adapter` + Redis + sticky sessions in Nginx |
| Medium | 20–100 | Replace WebRTC mesh with [MediaSoup](https://mediasoup.org/) SFU |
| Large | 100+ | SFU cluster + CDN egress |

To add the Redis adapter (enables multiple NestJS replicas):

```bash
npm install @socket.io/redis-adapter redis
```

```yaml
# docker-compose.yml
  redis:
    image: redis:7-alpine
    expose:
      - "6379"
```

```typescript
// signaling.gateway.ts — afterInit()
const { createAdapter } = await import('@socket.io/redis-adapter');
const { createClient } = await import('redis');
const pub = createClient({ url: process.env.REDIS_URL });
const sub = pub.duplicate();
await Promise.all([pub.connect(), sub.connect()]);
server.adapter(createAdapter(pub, sub));
```

---

## Project Structure

```
webrtc-conf/
├── .env.example            # copy to .env and fill secrets
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
├── backend/
│   └── src/
│       ├── auth/           # register, login, JWT, refresh tokens
│       ├── users/          # user profile
│       ├── rooms/          # room CRUD + ICE config
│       ├── signaling/      # Socket.IO gateway (7 events)
│       ├── health/         # GET /api/health
│       └── common/         # guards, decorators, filters
└── frontend/
    └── src/
        ├── hooks/
        │   ├── useWebRTC.ts      # RTCPeerConnection lifecycle
        │   ├── useSocket.ts      # Socket.IO client
        │   └── useMediaDevices.ts
        ├── pages/          # Login, Register, Rooms, Room
        ├── components/
        │   └── video/      # VideoGrid, VideoTile, ControlBar
        ├── store/          # Zustand: authStore, roomStore
        └── api/            # axios client + REST wrappers
```

---

## Known Limitations

- **P2P mesh** — each participant uploads N-1 streams. CPU/bandwidth degrades above 6 users
- **No persistence** — chat history and recordings not implemented
- **Single-node signaling** — in-memory room state; needs Redis adapter for multi-replica deployments
- **coturn on Windows/macOS Docker** — `network_mode: host` is Linux-only; use a hosted TURN service for local dev on those platforms
- **No end-to-end encryption** — DTLS/SRTP is built into WebRTC but there is no additional application-layer encryption
