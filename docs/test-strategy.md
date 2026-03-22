# TunnelShare Test Strategy

## Objective
Build a reliable, maintainable test suite that protects TunnelShare’s transfer model across both sender-first and receiver-first flows.

## Quality Priorities
1. Sender-first and receiver-first transfer flows work end-to-end.
2. Text-only, file-only, and mixed payload transfers all stay valid through the same transfer model.
3. Waiting transfers transition to ready reliably through polling.
4. Invalid, missing, and expired transfers fail gracefully.
5. API contracts stay stable across transfer routes and upload routes.
5. Tests remain deterministic and low-flake.

## Test Types
- **Static checks:** lint + type checks before functional runs.
- **API tests:** validate `POST /api/transfers`, `GET /api/transfers/[code]`, `POST /api/transfers/[code]/payload`, local upload/read routes, and `GET /api/health/redis`.
- **UI tests:** route navigation and page-level behavior.
- **E2E tests:** UI -> API -> Redis -> UI critical journeys.
- **Negative tests:** invalid code, missing transfer, expired transfer, invalid transfer state, oversized payload.

## Prioritization Model
- **P0:** release-blocking core flows.
- **P1:** important confidence and usability paths.
- **P2:** regression depth and polish.

## Automation Principles
- Prefer semantic selectors (`getByRole`, `getByLabel`).
- Keep test data isolated per test.
- Use API setup when UI setup is not the behavior under test.
- Keep one canonical retrieval path in tests: `/receive/[code]`.
- Treat polling as product behavior, not as an implementation detail to mock away.
- Keep upload-pipeline checks separate from transfer-lifecycle checks so failures stay easy to triage.
- Capture traces/screenshots on failure.

## Release Confidence
Ship when P0 is green, high-severity defects are closed, and flakiness is acceptable.
