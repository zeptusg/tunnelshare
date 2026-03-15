# TunnelShare Test Strategy

## Objective
Build a reliable, maintainable Playwright suite that protects TunnelShare’s core text-sharing flow.

## Quality Priorities
1. Session create/receive works end-to-end.
2. Invalid or expired sessions fail gracefully.
3. API contracts stay stable.
4. Tests remain deterministic and low-flake.

## Test Types
- **Static checks:** lint + type checks before functional runs.
- **API tests:** validate `POST /api/sessions`, `GET /api/sessions/[code]`, `GET /api/health/redis`.
- **UI tests:** route navigation and page-level behavior.
- **E2E tests:** UI -> API -> Redis -> UI critical journeys.
- **Negative tests:** invalid code, missing session, expired session, oversized payload.

## Prioritization Model
- **P0:** release-blocking core flows.
- **P1:** important confidence and usability paths.
- **P2:** regression depth and polish.

## Automation Principles
- Prefer semantic selectors (`getByRole`, `getByLabel`).
- Keep test data isolated per test.
- Use API setup when UI setup is not the behavior under test.
- Capture traces/screenshots on failure.

## Release Confidence
Ship when P0 is green, high-severity defects are closed, and flakiness is acceptable.
