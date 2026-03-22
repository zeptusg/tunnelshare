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
- Keep upload lifecycle separate from transfer lifecycle so multi-file progress and retries do not interrupt the transfer model

Acceptance:
- File transfer can be added without redesigning the transfer state machine.
- The payload contract requires at least one of text or files.
- A single file is represented as a one-item file collection.

## M5 — Upload Pipeline
- Add asset/upload handling separate from transfer creation
- Support one or many files with per-file progress and retry
- Finalize a transfer only after the payload is ready to reference uploaded assets
- Keep raw file bytes out of Redis transfer records
- Introduce storage abstraction that can support local development now and cloud/object storage later

Acceptance:
- Multi-file upload progress is resilient and does not depend on transfer state transitions.
- Transfers reference uploaded assets rather than storing file bytes.

## M6 — Compatibility And Hardening
- Keep `/api/sessions` compatibility only as long as the UI still depends on it
- Normalize code handling across transfer routes
- Cover both flows in e2e tests
- Add SSE or WebSocket transport only if polling becomes insufficient

Acceptance:
- Old session routes are either removed or explicitly documented as compatibility paths.
- Dual-flow coverage exists in automated tests.
- Push transport, if added, reuses the same transfer state transitions.

## M7 — Native Share Entry
- Evaluate PWA share-target support only as an optional enhancement where the platform supports it
- Plan a thin native wrapper/app for reliable mobile share-sheet intake
- Reuse the same upload pipeline and transfer payload contract for web and native entry paths

Acceptance:
- Mobile share-sheet integration does not require a separate transfer model.
- Native or wrapped entry flows converge on the same payload finalization path as the web UI.

## M8 — Accounts And Cloud Readiness
- Keep transfer ownership and file metadata models compatible with a future user/account system
- Keep storage and metadata access behind abstractions that are safe for serverless deployment
- Avoid local filesystem assumptions in core transfer logic

Acceptance:
- Anonymous flow continues to work unchanged.
- Future account linkage can be added without redesigning transfer payloads or upload state.
