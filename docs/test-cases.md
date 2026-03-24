# TunnelShare Test Cases

## Priority Legend
- **P0:** release-blocking
- **P1:** confidence/usability
- **P2:** regression depth

| ID | Scenario | Priority | Layer |
|---|---|---|---|
| TC-001 | Home exposes direct actions for send, receive, and manual code entry | P1 | UI |
| TC-002 | Sender-first text transfer completes from `/send` to `/receive/[code]` | P0 | E2E |
| TC-002A | Sender-first file transfer completes from `/send` to `/receive/[code]` with a downloadable file link | P0 | E2E |
| TC-002B | Sender-first mixed transfer completes with text and file in the same payload | P0 | E2E |
| TC-003 | Send stays disabled for empty/whitespace text | P1 | UI |
| TC-004 | Home `RECEIVE` starts a receiver-first transfer in one click and lands on `/receive/[code]` | P0 | E2E |
| TC-005 | Receiver-first transfer started from `/receive` waits, shows sender QR/link, and becomes ready after sender fulfillment | P0 | E2E |
| TC-005A | Receiver-first file transfer becomes ready after sender upload and exposes the received file link | P0 | E2E |
| TC-006 | Home manual code entry redirects to the existing transfer and retrieves payload | P1 | E2E |
| TC-007 | Manual lowercase code normalizes and retrieves payload | P0 | E2E |
| TC-008 | `/receive?code=` redirects to `/receive/[code]` | P1 | UI |
| TC-009 | Invalid code format shows unavailable state | P0 | API/UI |
| TC-010 | Non-existent valid code shows unavailable state | P0 | API/UI |
| TC-011 | Expired transfer shows unavailable state | P0 | E2E |
| TC-012 | Oversized text rejected by transfer create API | P0 | API |
| TC-013 | Fulfilling a non-waiting transfer returns conflict | P1 | API |
| TC-014 | Transfer read path updates from `awaiting_payload` to `ready` without manual refresh | P0 | E2E |
| TC-015 | Redis health endpoint returns `{ ok: true }` | P1 | API |
| TC-016 | Local upload route allocates an upload target, accepts file bytes, and returns stored asset metadata | P0 | API |
| TC-017 | Local file read route returns uploaded bytes for a stored asset | P1 | API |

## Core Scenario Notes
- **TC-002:** assert code format (`XXXX-XXXX`), receive URL, expiry visibility, and payload rendering.
- **TC-002A:** assert uploaded file name renders as a clickable receive link.
- **TC-002B:** assert both text and file link render from the same transfer.
- **TC-004:** assert the home receive action starts directly, shows only a minimal loading transition, and lands on the canonical transfer page.
- **TC-005:** assert waiting state, sender QR/link visibility, polling transition, and final ready payload rendering.
- **TC-005A:** assert the receiver-first flow reuses the sender composer and ends with a clickable file link on the receive page.
- **TC-006:** assert the home-page manual-entry form submits the existing-code path correctly.
- **TC-007:** assert route normalization to uppercase and payload rendering.
- **TC-011:** run with controlled short TTL for deterministic expiry.
- **TC-013:** create a ready transfer first, then assert `/payload` rejects a second fulfillment attempt.
- **TC-014:** explicitly prove the browser updates from `awaiting_payload` to `ready` without manual reload.
- **TC-016 / TC-017:** keep upload-pipeline checks below the UI layer so local storage behavior can be validated without browser setup.

## Suggested Implementation Order
1. P0 happy paths: TC-002, TC-002A, TC-002B, TC-004, TC-005, TC-005A, TC-007
2. P0 upload and polling behavior: TC-014, TC-016
3. P0 negatives: TC-009, TC-010, TC-011, TC-012
4. P1 coverage: TC-001, TC-003, TC-006, TC-008, TC-013, TC-015, TC-017
