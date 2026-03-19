# TunnelShare Transfer Architecture Spec

## Goal

Support both transfer entry flows as first-class behavior:

- PC to mobile: sender-first
- mobile to PC: receiver-first

The domain model must support QR-based rendezvous without forcing every transfer to start with a payload.

## Domain Model

`Transfer` is the primary aggregate.

```ts
type TransferStatus = "awaiting_payload" | "ready" | "consumed" | "expired";

type Transfer = {
  code: string;
  status: TransferStatus;
  initiatedBy: "sender" | "receiver";
  payload?: {
    type: "text" | "file";
    content: string;
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

## API Direction

Target route shape:

- `POST /api/transfers`
  - creates `ready` when called with payload
  - creates `awaiting_payload` when called with receiver intent
- `GET /api/transfers/{code}`
  - returns transfer status and public payload data when ready
- `POST /api/transfers/{code}/payload`
  - attaches payload to an `awaiting_payload` transfer

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

## Non-Goals

- Device pairing
- encryption/auth redesign
- native app protocol handling
- realtime transport beyond polling for the first implementation
