# Plans / Milestones

## M0 — Foundation & Core Architecture
Goal: set up clean, extensible session-based architecture.
- Establish folder structure:
  - `src/lib/*` for config + utilities
  - `src/server/*` for domain/business logic
- Add env config + `.env.example`
- Define Session domain model (generic, supports future file sharing)
- Create Redis client wrapper (TTL support)

Acceptance:
- App runs locally.
- Env config is centralized.
- Redis connectivity can be verified (simple health route or minimal test).

## M1 — Create Session (Sender init)
- API: `POST /api/sessions`
  - generate high-entropy human-friendly code (e.g., ABCD-EFGH)
  - store session in Redis with TTL
  - return `{ code, receiveUrl, expiresAt }`
- Sender UI displays code + receiveUrl (QR placeholder allowed)

Acceptance:
- Session exists in Redis with TTL.
- Sender can generate and see code + link.

## M2 — Receive Session (Join + states)
- Receiver page with code entry
- API: `GET /api/sessions/{code}` returns status
- UI states: waiting / expired / invalid (generic message)

Acceptance:
- Receiver can check session status reliably.

## M3 — Send Text + Realtime
- API: `POST /api/sessions/{code}/text` (validate size, store payload, set READY)
- SSE: receiver auto-updates when READY
- Receiver shows text + Copy button; mark session OPENED

Acceptance:
- Receiver open first → sender posts text → receiver updates without refresh.

