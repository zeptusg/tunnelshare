# TunnelShare

TunnelShare is a lightweight web app for moving text, files, or both between devices with a short code or QR link.

It is designed for quick device-to-device sharing without accounts:
- laptop to phone
- desktop to tablet
- one phone to another device

Transfers expire automatically and are backed by short-lived server state.

## What It Does

- Send text, files, or mixed text + file payloads
- Create transfers sender-first or receiver-first
- Share via short code, direct link, or QR code
- Support multi-file uploads with simple progress feedback
- Store file bytes in a storage backend and keep transfer state separate

## How the App Works

TunnelShare supports two entry flows:

### Sender-First

1. Open `/send`
2. Add text, files, or both
3. Click `Send`
4. TunnelShare creates a ready transfer
5. The receiving device opens the code or QR link

### Receiver-First

1. Open `/receive`
2. Click `Start receive request`
3. TunnelShare creates a waiting transfer with a send link
4. Open that send link on the sending device
5. Add text, files, or both
6. The transfer becomes ready for the receiver

## Storage Model

TunnelShare keeps its responsibilities separated:

- Redis stores short-lived transfer state and codes
- Object storage stores raw file bytes
- Transfer payloads store text and file references, not file bytes

Current storage drivers:
- `local` for development
- `supabase` for production-style object storage

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Zod
- Redis
- Supabase Storage or local storage adapter

## Quick Start

### 1. Install

```bash
pnpm install
```

### 2. Configure

Create `.env.local`:

```env
APP_URL=http://localhost:3000
REDIS_URL=your_redis_url

FILE_STORAGE_DRIVER=local

SESSION_TTL_SECONDS=600
MAX_TEXT_BYTES=51200
MAX_UPLOAD_FILE_BYTES=15728640
MAX_UPLOAD_FILES=5
```

If you want to use Supabase storage locally or in production, also add:

```env
FILE_STORAGE_DRIVER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_BUCKET=tunnelshare-uploads
```

### 3. Run

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
pnpm test:e2e
```

## API Overview

Main routes:

- `POST /api/transfers`
  - sender-first create with payload
  - or receiver-first create with `{ "intent": "receive" }`
- `GET /api/transfers/[code]`
  - fetch transfer by code
- `POST /api/transfers/[code]/payload`
  - fulfill a waiting transfer
- `POST /api/uploads`
  - request an upload target
- `POST /api/uploads/[assetId]/complete`
  - finalize an uploaded file asset
- `GET /api/files/[assetId]`
  - download a stored file through the app
- `GET /api/health/redis`
  - basic Redis health check

## Upload Limits

By default:

- text is limited by `MAX_TEXT_BYTES`
- each file is limited by `MAX_UPLOAD_FILE_BYTES`
- each transfer is limited by `MAX_UPLOAD_FILES`

The UI mirrors these limits, but the server is the source of truth.

## Testing

Run static checks:

```bash
pnpm lint
pnpm exec tsc --noEmit
```

Run API and end-to-end tests:

```bash
pnpm test:e2e tests/api
pnpm test:e2e tests/e2e
```

## Notes

- No account system is required today
- Transfer state is temporary by design
- The storage layer is intentionally abstract so the file backend can evolve without changing transfer logic
