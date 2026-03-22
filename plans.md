# Plans / Milestones

## M0 — Transfer Domain Shift
Goal: move from sender-only sessions to a transfer model that supports both entry flows.
- Establish folder structure:
  - `src/lib/*` for config + utilities
  - `src/server/*` for transfer lifecycle and domain logic
- Add env config + `.env.example`
- Define Transfer domain model and status rules
- Define transport policy: polling first, SSE/WebSockets later without changing transfer state semantics
- Define file payload model as a file collection shape that can represent one or many files
- Create Redis client wrapper (TTL support)

Acceptance:
- App runs locally.
- Env config is centralized.
- Redis connectivity can be verified (simple health route or minimal test).
- Architecture docs define sender-first and receiver-first behavior clearly.

## M1 — Sender-First Transfer
- API: `POST /api/transfers`
  - generate high-entropy human-friendly code (e.g., ABCD-EFGH)
  - create a `ready` transfer when payload is supplied
  - store transfer in Redis with TTL
  - return `{ code, receiveUrl, expiresAt }`
- Sender UI displays code + `receiveUrl`

Acceptance:
- Ready transfer exists in Redis with TTL.
- Sender can generate and see code + link.

## M2 — Receiver-First Rendezvous
- API: `POST /api/transfers`
  - create an `awaiting_payload` transfer when receiver intent is supplied
  - return `{ code, sendUrl, expiresAt }`
- Receiver page can start a transfer and display sender QR/link
- Sender page can open a receiver-issued transfer and submit payload into it

Acceptance:
- Receiver-first transfer can be created without payload.
- Sender can fulfill a waiting transfer.

## M3 — Transfer Retrieval And Completion
- API: `GET /api/transfers/{code}` returns transfer status
- API: `POST /api/transfers/{code}/payload`
  - validate payload size and type
  - attach payload to `awaiting_payload`
  - move transfer to `ready`
- Receiver UI states:
  - awaiting payload
  - ready
  - expired
  - invalid
- Waiting clients poll while transfer is `awaiting_payload`

Acceptance:
- Both entry flows converge on the same `ready` retrieval path.
- Receiver can retrieve payload reliably by QR or manual code.
- Polling behavior is explicit and testable.

## M4 — File Payload Evolution
- Extend transfer payload schema from text-only to a mixed payload envelope
- Support:
  - text only
  - files only
  - text and files together
- Use the same transfer lifecycle for single-file and multi-file payloads
- Keep file metadata/reference storage separate from UI concerns

Acceptance:
- File transfer can be added without redesigning the transfer state machine.
- The payload contract requires at least one of text or files.
- A single file is represented as a one-item file collection.

## M5 — Compatibility And Hardening
- Keep `/api/sessions` compatibility only as long as the UI still depends on it
- Normalize code handling across transfer routes
- Cover both flows in e2e tests
- Add SSE or WebSocket transport only if polling becomes insufficient

Acceptance:
- Old session routes are either removed or explicitly documented as compatibility paths.
- Dual-flow coverage exists in automated tests.
- Push transport, if added, reuses the same transfer state transitions.
