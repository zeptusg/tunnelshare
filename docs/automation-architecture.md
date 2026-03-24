# TunnelShare Playwright Automation Architecture

## Goal
Provide a clean structure for scalable, readable, low-flake Playwright automation.

## Recommended Structure
```text
tests/
  e2e/
  api/
  pages/
  fixtures/
  helpers/
```

## Layer Responsibilities
- **`tests/e2e`**: core user journeys across UI/API/Redis
- **`tests/api`**: fast contract and negative checks for transfer routes and local upload/read routes
- **`tests/pages`**: page objects for readability/reuse
- **`tests/fixtures`**: setup/data isolation per test
- **`tests/helpers`**: shared clients/assertions

## Authoring Standards
- Use semantic locators over CSS chains.
- Keep assertions business-facing and explicit.
- Avoid arbitrary waits; prefer event/state-based waits.
- Use `test.step()` for complex paths.

## Data Strategy
- Unique test data per run/test.
- Prefer API seeding unless UI setup is under test.
- Keep at least one true UI happy-path E2E.
- Run expiry tests in short-TTL env.
- Prefer seeding transfers through `/api/transfers` and `/api/uploads` instead of UI setup when upload UX is not under test.
- Keep receiver-first polling tests in E2E so the real browser behavior is covered.

## Execution Model
- **Local:** Chromium-focused quick feedback.
- **CI gate:** P0 suite mandatory.
- **Nightly:** cross-browser regression.

## Debug & Evidence
- Trace on retry/failure.
- Screenshot/video on failure.
- Publish Playwright HTML report artifacts.

## Done Criteria for Automation PRs
- Mapped to test case IDs.
- Stable in local + CI target runs.
- No brittle selector debt introduced.
