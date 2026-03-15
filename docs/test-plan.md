# TunnelShare Test Plan

## Scope (Current Milestone)
### In Scope
- Home navigation (`/` -> Send/Receive)
- Session creation from `/send`
- Session retrieval via `/receive` and `/receive/[code]`
- Code normalization and query redirect behavior
- TTL-based expiry handling
- Redis health endpoint sanity check

### Out of Scope
- Real file transfer behavior
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
- Flake rate within agreed threshold

## Key Risks & Mitigations
- **TTL timing instability:** run expiry tests in low-TTL controlled env.
- **Brittle selectors:** enforce semantic locator usage.
- **Environment drift:** use consistent env config for local/CI.

## Deliverables
- `docs/test-strategy.md`
- `docs/test-plan.md`
- `docs/test-cases.md`
- `docs/automation-architecture.md`
