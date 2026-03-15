# TunnelShare Test Cases

## Priority Legend
- **P0:** release-blocking
- **P1:** confidence/usability
- **P2:** regression depth

| ID | Scenario | Priority | Layer |
|---|---|---|---|
| TC-001 | Home routes to Send and Receive | P1 | UI |
| TC-002 | Create session happy path from `/send` | P0 | E2E |
| TC-003 | Send disabled for empty/whitespace text | P1 | UI |
| TC-004 | Manual lowercase code normalizes and retrieves payload | P0 | E2E |
| TC-005 | `/receive?code=` redirects to `/receive/[code]` | P1 | UI |
| TC-006 | Invalid code format shows unavailable state | P0 | API/UI |
| TC-007 | Non-existent valid code shows unavailable state | P0 | API/UI |
| TC-008 | Expired session shows unavailable state | P0 | E2E |
| TC-009 | Oversized text rejected by create-session API | P0 | API |
| TC-010 | Redis health endpoint returns `{ ok: true }` | P1 | API |

## Core Scenario Notes
- **TC-002:** assert code format (`XXXX-XXXX`), receive URL, expiry visibility.
- **TC-004:** assert route normalization to uppercase and payload rendering.
- **TC-008:** run with controlled short TTL for deterministic expiry.

## Suggested Implementation Order
1. P0 happy path: TC-002, TC-004
2. P0 negatives: TC-006, TC-007, TC-008, TC-009
3. P1 coverage: TC-001, TC-003, TC-005, TC-010
