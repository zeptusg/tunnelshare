# TunnelShare Test Plan

## Scope (Current Milestone)
### In Scope
- Home navigation (`/` -> Send/Receive)
- Sender-first transfer creation from `/send`
- Receiver-first transfer creation from `/receive`
- Transfer retrieval via QR URL and manual code entry
- Code normalization and query redirect behavior
- Transfer status transitions: `awaiting_payload` -> `ready`
- Polling behavior while transfer is `awaiting_payload`
- TTL-based expiry handling
- Redis health endpoint sanity check

### Out of Scope
- Real file byte transfer behavior
- SSE/WebSocket transport
- Auth/encryption/device pairing features
- Native mobile wrappers

## Environments
- **Local:** Next.js app + Redis
- **CI:** same runtime shape with Redis service
- Required env: `APP_URL`, `REDIS_URL`, `SESSION_TTL_SECONDS`, `MAX_TEXT_BYTES`

## Entry Criteria
- App starts successfully
- Redis reachable
- Lint/type checks pass

## Exit Criteria
- 100% P0 pass
- No open Sev-1/Sev-2 defects in scope
- API contract checks passing
- Sender-first and receiver-first paths both covered
- Flake rate within agreed threshold

## Key Risks & Mitigations
- **TTL timing instability:** run expiry tests in low-TTL controlled env.
- **Brittle selectors:** enforce semantic locator usage.
- **Environment drift:** use consistent env config for local/CI.
- **Flow divergence:** assert both entry flows converge on the same ready-state retrieval behavior.
- **QR/manual mismatch:** verify manual code entry and QR routes resolve the same transfer.
- **Polling regressions:** assert waiting clients update correctly without requiring manual refresh.
- **Future file shape churn:** lock the domain contract around file collections before file upload work begins.

## Deliverables
- `docs/transfer-architecture-spec.md`
- `docs/test-strategy.md`
- `docs/test-plan.md`
- `docs/test-cases.md`
- `docs/automation-architecture.md`
