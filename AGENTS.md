# Codex Rules — TunnelShare

Follow these rules when working on this project.

## General Rules

- Keep changes **small and focused**. Maximum **5 files per task** unless explicitly approved.
- Do **not refactor, rename, or reorganize** code outside the current task.
- Prefer **clarity and stability** over cleverness.

## TypeScript

- Use **strict TypeScript**.
- Avoid `any`. If it is unavoidable, explain why.

## Validation

- **All API inputs must be validated with Zod.**
- Never trust client input.

## Architecture

- **Business logic must not live in UI code.**
- Session logic must live under:

src/server/

- UI should only call APIs and render results.

## Imports

- Always use the alias:

@/

Example:

import { getRedis } from "@/lib/redis"

Never use deep relative imports like:

../../../lib/redis

## Environment Variables

- Environment variables must only be accessed through:

src/lib/config.ts

- Do not use `process.env` directly in other files.

## Session Rules

- Sessions are **created only when the sender clicks Send**.
- A valid session **always contains a payload**.
- There is **no waiting state**.

Session model:

{
  code: string
  payloadType: "text" | "file"
  payload: string | fileReference
  expiresAt: timestamp
}

## Quality Checks

Before marking a task complete:

- Run `pnpm lint`
- Ensure `pnpm dev` runs without errors

## Response Format

When finishing a task always include:

- Files changed
- What was implemented
- How to test it
- Recommended next step