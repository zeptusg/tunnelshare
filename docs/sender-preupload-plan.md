# Sender Pre-Upload Plan

## Goal

Make sending files feel fast by starting file uploads as soon as files are selected, while keeping the actual transfer creation tied to the user clicking `Send`.

This keeps the current product contract intact:

- payload is still created only when the sender clicks `Send`
- upload lifecycle stays separate from transfer lifecycle
- transfer state remains server-owned
- the same model can later support web, native wrapper, or mobile app entry

## Product Summary

Today, selected files do nothing until the user clicks `Send`, so the slowest part of the experience starts late.

The better product behavior is:

1. User selects files.
2. The app quietly starts uploading them in the background.
3. Each file shows a clear status: preparing, uploading, ready, failed, canceled, removed.
4. User can remove, cancel, or retry files before sending.
5. Clicking `Send` only creates or fulfills the transfer with files that are already ready.

This makes the product feel much faster without changing the transfer model.

## Architecture Direction

### Keep The Current Domain Separation

Do not move upload state into the transfer record.

The current architecture is already pointing the right way:

- uploads create short-lived assets
- transfers reference uploaded assets later
- server resolves uploaded asset ids into file references only at transfer creation time

That separation should stay.

### Keep Draft State Out Of The Transfer Domain

Pre-upload should not introduce a new transfer status such as "uploading" or "draft".

Recommended ownership:

- transfer domain: server-owned, starts only at `Send`
- upload asset lifecycle: server-assisted, but separate from transfer
- sender draft/composer state: client-owned

This keeps the transfer model stable and avoids forcing future web or mobile clients to inherit page-specific workflow state.

### Add A Draft Attachment Layer In The Send UI

The sender page should manage a local draft attachment model that is separate from:

- browser `File`
- upload target response
- finalized stored asset
- transfer payload

Suggested client-side shape:

```ts
type DraftAttachmentStatus =
  | "queued"
  | "preparing"
  | "uploading"
  | "finalizing"
  | "ready"
  | "failed"
  | "canceled"
  | "removed";

type DraftAttachment = {
  localId: string;
  file: File;
  status: DraftAttachmentStatus;
  progressPercent: number;
  uploadTarget?: UploadTarget;
  storedAssetId?: string;
  errorMessage?: string;
};
```

The transfer payload should continue to use only `uploadedAssetIds` at send time.

### Make The Draft Workflow Reusable

Even if the first implementation lives in the web sender flow, the draft upload workflow should be treated as a reusable client application module, not as page-only logic.

Recommended direction:

- page component owns rendering
- a shared sender-draft/composer module owns attachment workflow
- server APIs remain the source of truth for upload targets, finalize, and transfer creation

This matters because future native or wrapped clients should be able to reuse the same workflow rules even if they do not share the same UI.

## UX Rules

### On File Selection

- Add the file immediately to the list.
- Start background upload automatically.
- Show clear status text and progress.

### Before Send

Users should be able to:

- remove a file before upload finishes
- cancel an in-flight upload
- retry a failed upload
- keep editing text while uploads continue

### Send Button

Recommended behavior:

- if files are selected and any are still uploading/preparing/finalizing, disable `Send`
- show a clear label such as `Preparing files...`
- allow `Send` only when all kept files are either `ready`, `failed`, `canceled`, or removed
- failed or canceled files should not be silently dropped; user should retry or remove them

This is the safest product behavior because it avoids accidental partial sends.

Product decision:

- if the user selected files, the send action should represent the selected set as a whole
- the app should not silently send only the subset that happened to finish first

If partial-send behavior is ever desired later, it should be an explicit future mode, not an accidental side effect of background upload timing.

### Removal

Removing a file means:

- it disappears from the draft
- it is excluded from the eventual payload
- if the upload is still active, abort it immediately

If the file already finished uploading, the asset should become an orphan candidate and be cleaned up later.

## Upload Lifecycle

### Per-File State Machine

Recommended file-level transitions:

`queued -> preparing -> uploading -> finalizing -> ready`

Failure exits:

- `preparing -> failed`
- `uploading -> failed`
- `finalizing -> failed`

User exits:

- `queued/preparing/uploading/finalizing -> canceled`
- `any non-ready state -> removed`
- `ready -> removed`

Retry path:

- `failed/canceled -> queued`

### Cancellation

Use `AbortController` for fetch requests and `XMLHttpRequest.abort()` for byte upload.

Each draft attachment should own its own abort handles so cancellation stays per-file.

### Retry

Retry should create a fresh upload target and run the upload again.
Do not try to reuse a partially failed upload target.

## Draft Session Boundary

For the first version, draft state can remain in-memory in the sender client.

That is the right tradeoff now because it avoids introducing a new server-side draft domain too early.

Future-safe rule:

- if later you need cross-tab recovery, reload persistence, background mobile continuation, or native handoff, add a separate `draftSession` concept
- do not overload the transfer record to solve those problems

In other words:

- phase 1: local draft session
- future phase: explicit draft session if product needs persistence
- never: use transfer state as draft state

## Transfer Creation Rules

When the user clicks `Send`:

1. Collect only draft attachments in `ready`.
2. Extract their `storedAssetId`s.
3. Build the transfer payload from:
   - text, if present
   - uploaded asset ids from ready attachments
4. Create or fulfill the transfer using the existing transfer routes.

Important:

- upload completion does not create the transfer
- transfer creation still happens exactly once, on `Send`
- this preserves the current domain semantics and future mobile compatibility

## Cleanup Policy

### Phase 1: Safe And Minimal

Do not block this feature on perfect cleanup.

Short-term policy:

- uploaded but unsent assets remain temporary
- they expire naturally with TTL
- they are never attached to a transfer unless the user clicks `Send`

This is realistic and low-risk for the first version.

Important clarification:

- "temporary" must mean server-expiring and cleanup-eligible
- it must not mean "implicitly durable forever if the sender abandons the page"

### Phase 2: Better Cleanup

Add an explicit asset delete path for removed ready files:

- client can request deletion when a user removes an already-uploaded file
- server uses the active storage provider to delete bytes + metadata

This is a quality improvement, not a prerequisite for pre-upload.

Recommended abstraction:

- cleanup should be driven by asset metadata and storage provider interfaces
- cleanup should not depend on UI behavior or transfer payload inspection

### Phase 3: Background Sweeping

Add a cleanup job or on-request sweeper that removes expired orphan assets from storage.

This matters more once usage grows, especially for local storage and future cloud costs.

## Recommended Rollout

### Step 1 — Introduce Draft Attachment State

- replace the current `selectedFiles: File[]` shape with a draft attachment list
- keep UI rendering based on draft attachments
- move workflow rules into a reusable sender-draft/composer layer rather than leaving them embedded in the page
- no server contract changes yet

### Step 2 — Start Upload On Selection

- start upload automatically when a file is added
- show per-file preparing/uploading/finalizing states
- keep current validation rules

### Step 3 — Add Cancel, Remove, Retry

- add per-file cancel for active uploads
- add remove for any draft file
- add retry for failed/canceled files

### Step 4 — Change Send To Use Ready Assets Only

- remove upload work from `submitTransfer()`
- `submitTransfer()` should only gather ready asset ids and create/fulfill the transfer
- disable send while selected files are not in final draft states
- keep the transfer API contract unchanged

### Step 5 — Add Cleanup Improvements

- optional delete endpoint for removed uploaded assets
- later background cleanup for orphan assets

## What Needs To Change

### Client

Main changes are in the sender page:

- move from plain file list to draft attachment list
- add per-file upload controller ownership
- add cancel/retry/remove actions
- separate upload progress from transfer submit state
- move workflow behavior into a reusable sender-draft/composer module

### Server

No transfer-domain rewrite is needed.

Server-side changes are optional at first:

- maybe add asset delete endpoint later
- maybe add orphan cleanup later

The current upload and transfer endpoints already support the core design.

Recommended later server additions:

- explicit asset delete endpoint for removed draft assets
- asset cleanup path that works across local and cloud providers
- asset metadata fields that can distinguish temporary draft assets from attached transfer assets without changing transfer payload shape

## Why This Fits The Current Codebase

This plan works with the existing model instead of fighting it:

- upload already happens before transfer payload resolution
- transfer payload already accepts uploaded asset ids
- server already resolves uploaded asset ids into file references
- transfer lifecycle is already separate from upload lifecycle

That means this is an upgrade, not a redesign.

It also preserves the most important future-friendly rule:

- transfer creation remains a domain event
- pre-upload remains preparation work

That boundary is what keeps later mobile, native-wrapper, and external-client support sane.

## Risk Level

### Low Risk

- background pre-upload itself
- per-file status tracking
- disabling send until draft files settle

### Medium Risk

- cancellation edge cases
- keeping UI state correct when files are removed during upload
- avoiding race conditions between retry/remove/send

### Deferred Risk

- orphan asset cleanup perfection
- resumable uploads
- cross-tab draft recovery

These should not block the first version.

## Recommendation

Implement sender-side pre-upload now.

It is the highest-value performance improvement that:

- matches the current architecture
- keeps transfer rules clean
- improves perceived speed immediately
- does not require a backend refactor

Recommended implementation style:

- strict send semantics
- reusable draft workflow layer
- minimal server changes first
- explicit cleanup improvements second

Do not try to preload receiver-side file bytes by default.
That is less predictable, more wasteful, and a worse fit for mobile behavior.
