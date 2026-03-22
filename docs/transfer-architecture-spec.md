# TunnelShare Transfer Architecture Spec

## Goal

Support both transfer entry flows as first-class behavior:

- PC to mobile: sender-first
- mobile to PC: receiver-first

The domain model must support QR-based rendezvous without forcing every transfer to start with a payload.
The same model must also support text now and file collections later, so single-file and multi-file sharing do not require another domain rewrite.
The payload contract must also support text and files together in the same transfer.
The architecture must also leave room for a future native or wrapped mobile share-entry path without changing the transfer model.

## Domain Model

`Transfer` is the primary aggregate.

```ts
type TransferStatus = "awaiting_payload" | "ready" | "consumed" | "expired";

type Transfer = {
  code: string;
  status: TransferStatus;
  initiatedBy: "sender" | "receiver";
  payload?: {
    text?: string;
    files?: FileReference[];
    metadata?: Record<string, unknown>;
  };
  receiveUrl: string;
  sendUrl?: string;
  expiresAt: string;
};
```

Rules:

- `awaiting_payload` is valid only when `payload` is absent.
- `ready` is valid only when `payload` is present.
- `consumed` and `expired` are terminal states.
- A code is the human fallback identifier, not the full QR contract.
- A payload may contain text, files, or both.
- At least one of `payload.text` or `payload.files` must exist when a payload is present.
- File payloads should use `FileReference[]`, even when exactly one file is shared.
- Transfer state must not be used to represent in-progress multi-file upload progress.

## Flow Semantics

### Sender-first

1. Sender submits payload.
2. Server creates a transfer in `ready`.
3. Server returns `code`, `receiveUrl`, and `expiresAt`.
4. Receiver opens the QR URL or enters the code manually.

### Receiver-first

1. Receiver requests a new transfer without payload.
2. Server creates a transfer in `awaiting_payload`.
3. Server returns `code`, `sendUrl`, and `expiresAt`.
4. Sender opens the QR URL and submits payload.
5. Server moves the transfer to `ready`.
6. Receiver polls for state changes until the transfer is `ready`, `expired`, or invalid.

## API Direction

Target route shape:

- `POST /api/transfers`
  - creates `ready` when called with payload
  - creates `awaiting_payload` when called with receiver intent
- `GET /api/transfers/{code}`
  - returns transfer status and public payload data when ready
- `POST /api/transfers/{code}/payload`
  - attaches payload to an `awaiting_payload` transfer

Upload direction:

- File bytes should move through a dedicated asset/upload pipeline, not directly through the transfer record.
- Transfers should be created or fulfilled only after they can reference uploaded assets.
- Per-file progress, retry, and resumable behavior belong to upload handling, not transfer state transitions.

Transport policy:

- Initial implementation uses polling for waiting transfers.
- SSE can be added later for server-to-client updates.
- WebSockets are optional and should only be introduced if bidirectional coordination is actually needed.
- Transport choice must not change transfer state rules or payload shape.

Migration note:

- Existing `/api/sessions` routes can remain temporarily as compatibility endpoints.
- New server logic should be written against transfer concepts, even if compatibility routes still persist `session:` keys during migration.

## QR and Manual Entry

- QR URLs must always be server-issued.
- Manual codes must be stable, human-friendly, and normalized server-side.
- QR routes may be role-specific:
  - receiver QR opens `receiveUrl`
  - sender QR opens `sendUrl`

## Ownership Boundaries

- Validation happens at API boundaries with Zod.
- Transfer lifecycle logic lives in `src/server/`.
- UI pages only submit inputs, poll APIs, and render returned state.
- File storage metadata and file reference resolution also belong to server-side transfer logic.
- Raw file bytes must remain outside the transfer record; transfers store metadata and file references only.

## Future Mobile Share Entry

- PWA share-target support may be used opportunistically where platform support is good enough.
- Reliable cross-platform "share to TunnelShare" behavior should be assumed to require a native wrapper or app later.
- Native share-entry should reuse the same upload pipeline and transfer payload contract as the web UI.

## Non-Goals

- Device pairing
- encryption/auth redesign
- native app protocol handling
- realtime transport beyond polling for the first implementation
