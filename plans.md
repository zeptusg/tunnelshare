# Plans / Milestones

## Completed
- C1 — Transfer Domain Foundation
- C2 — Sender-First Transfer Flow
- C3 — Receiver-First Transfer Flow
- C4 — Transfer Retrieval And Polling
- C5 — File And Mixed Payload Support
- C6 — Upload Pipeline And Storage Abstraction
- C7 — API And E2E Core Flow Coverage

## M1 — Production Hardening
- Add rate limiting or abuse controls for transfer creation, polling, and upload routes
- Tighten upload abuse protection and request validation around anonymous usage
- Ensure download responses use safe, consistent headers across providers
- Define basic operational safeguards for Redis/storage failures

Acceptance:
- Anonymous endpoints have practical abuse protection
- Upload and download behavior is hardened for public use
- Failure modes are explicit and predictable

## M2 — Lifecycle Completion
- Define and implement the remaining transfer lifecycle semantics for `consumed` and `expired`
- Decide whether transfers are single-read, multi-read until expiry, or another explicit policy
- Make expiry behavior consistent across transfer retrieval, file access, and UI messaging
- Keep lifecycle rules server-owned and independent from page behavior

Acceptance:
- Transfer lifecycle is fully defined, not partially modeled
- Retrieval and download behavior match the same lifecycle policy
- UI reflects server lifecycle states without custom inference

## M3 — Retention And Cleanup
- Add cleanup for expired transfer records and uploaded assets where needed
- Use storage-provider deletion paths instead of leaving expiry as a logical-only state
- Keep retention policy compatible with future database-backed asset metadata

Acceptance:
- Expired transfers and stale assets do not accumulate indefinitely
- Cleanup behavior works across storage drivers without changing transfer payloads

## M4 — Observability And Diagnostics
- Add structured logging around transfer create, fulfill, fetch, upload finalize, and download failures
- Add minimal metrics or operational counters where practical
- Keep health checks useful for real deployment debugging, not only local sanity checks

Acceptance:
- Production failures can be diagnosed without reproducing them manually
- Core transfer and upload events are visible enough to support operations

## M5 — Core UX Polish
- Improve send/receive/loading/error/expiry states across the main flows
- Refine mobile responsiveness and make the primary actions feel more intentional
- Improve failure recovery messaging for upload, polling, and invalid/expired codes

Acceptance:
- Core flows feel complete, not just functional
- Users can understand what happened and what to do next when something fails

## M6 — Expansion Readiness
- Keep new transfer, upload, storage, and state-transition rules in shared server/domain code
- Keep pages and route handlers thin as new features are added
- Reuse the same payload and transfer contracts for future mobile, wrapper, or external API clients

Acceptance:
- New features do not push business logic back into UI code
- Web-specific delivery details stay separate from reusable transfer behavior
