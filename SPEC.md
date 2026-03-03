# TunnelShare MVP Spec

## Goal
A mobile-first web app to share text (later files) between devices using a one-time code + QR. No login for MVP, but code must be structured to add accounts/history later.

## MVP (Text only)
- Sender: paste text → generate session → show code + receive URL (QR can be placeholder).
- Receiver: enter code → waiting → ready → copy text.
- Sessions are reusable until expiry (not single-consume).
- TTL: 10 minutes (configurable).
- Max text size: 50KB (configurable).
- Realtime: SSE for receiver auto-update.

## Security baseline
- HTTPS-ready design (even when developing locally).
- Generic responses for invalid/expired codes.
- Rate-limiting hook for code lookups (simple now, stronger later).
- No permanent storage; session data is ephemeral.

## Domain model
Session fields (minimum):
- code
- type: "text" (future: "file")
- status: CREATED | READY | OPENED | EXPIRED
- payload: string (text for MVP, generic later)
- expiresAt

## Environment variables
- APP_URL=http://localhost:3000
- REDIS_URL=redis://localhost:6379
- SESSION_TTL_SECONDS=600
- MAX_TEXT_BYTES=51200