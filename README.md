# TunnelShare

Temporary text sharing between devices using a short code or QR link.

## Stack

- Next.js (App Router)
- TypeScript + React
- Tailwind CSS
- Redis
- Zod

## Quick Start

### 1) Install

```bash
pnpm install
```

### 2) Configure

Create `.env.local`:

```env
APP_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
SESSION_TTL_SECONDS=600
MAX_TEXT_BYTES=51200
```

### 3) Run

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Scripts

```bash
pnpm dev
pnpm lint
pnpm build
pnpm start
```

## Current Features

- Create text session from `/send`
- Share via short code + QR
- Receive on `/receive/[code]`
- Copy code / copy received text
- Redis TTL-based session expiration

## API

### `POST /api/sessions`

Request:

```json
{ "text": "Hello" }
```

Response:

```json
{
  "code": "ABCD-EFGH",
  "receiveUrl": "http://localhost:3000/receive?code=ABCD-EFGH",
  "expiresAt": "2026-03-12T12:00:00.000Z"
}
```

### `GET /api/sessions/[code]`

Success:

```json
{
  "code": "ABCD-EFGH",
  "payload": { "type": "text", "content": "Hello" },
  "expiresAt": "2026-03-12T12:00:00.000Z"
}
```

Not found / expired:

```json
{ "error": "not_found" }
```

## Health

- `GET /api/health/redis` -> `{ "ok": true }` when Redis is reachable.
