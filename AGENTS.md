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
- Transfer and session logic must live under:

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

## Transfer Rules

- A transfer can begin from either side:
  - sender-first
  - receiver-first
- Payloads are created only when the sender clicks Send.
- Waiting state is allowed only for transfer coordination, not for completed payload records.
- Manual entry uses a short code. QR uses a server-issued URL.
- A ready payload record must always contain a payload.
- Transfer lifecycle and state transitions must be owned by server code.
- Polling is the default coordination mechanism for `awaiting_payload`.
- SSE or WebSockets may be added later, but must layer on top of the same transfer state model.
- File transfer must be modeled to support one or many files without changing the core transfer shape later.

Transfer model:

{
  code: string
  status: "awaiting_payload" | "ready" | "consumed" | "expired"
  initiatedBy: "sender" | "receiver"
  payload?: {
    text?: string
    files?: fileReference[]
    metadata?: Record<string, unknown>
  }
  receiveUrl: string
  sendUrl?: string
  expiresAt: timestamp
}

Payload rules:

- A payload may contain text, files, or both.
- At least one of `payload.text` or `payload.files` must be present when a payload exists.
- If `payload.files` is present, it must contain at least one file reference.

Coordination rules:

- Receiver-first flow may create a transfer in `awaiting_payload`.
- Sender-first flow may create a transfer directly in `ready`.
- UI must not infer transfer state; it must render server responses.
- Clients should poll transfer status while waiting. Push transport is an optimization, not a separate state model.
- Any compatibility session record used during migration must be derived from the transfer state, not treated as the primary domain model.

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
