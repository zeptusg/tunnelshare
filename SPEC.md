# TunnelShare Specification

TunnelShare is a simple web application that allows users to quickly transfer data between devices using a short code or QR link.

The application is optimized for fast sharing between devices such as:
- Windows → iPhone
- Laptop → Phone
- Desktop → Tablet

No accounts are required. Transfers are temporary and expire automatically.

TunnelShare is designed to support **multiple payload types** in the future.  
The first implemented slice supports **text sharing**, with **file sharing planned next**.  
File transfer should be designed as a **file collection** model so single-file and multi-file sharing use the same domain contract.
The transfer payload model should also allow **text and files together** in the same transfer.


## Core Concept

A transfer can begin from either side:

- sender-first: a sender creates a ready transfer with payload
- receiver-first: a receiver creates a waiting transfer and a sender fulfills it later

The backend creates a transfer containing:
- a unique code
- a lifecycle status
- role-specific URLs for QR entry
- an optional payload
- an expiration timestamp

Users can complete the transfer by:
- entering the code manually
- opening a server-issued URL
- scanning a QR code pointing to a server-issued URL

Important rules:

- Payloads are created **only after the sender clicks Send**.  
- A ready payload record **always contains a payload**.  
- Waiting state is allowed only for transfer coordination.  
- QR URLs are server-issued and may be role-specific.
- Waiting transfers use polling first. SSE or WebSockets can be added later on top of the same transfer lifecycle.


## Core Flow

### Sender-First

1. Sender opens the **Send page**
2. Sender selects the content to send (currently text)
3. Sender clicks **Send**
4. Backend creates a transfer in `ready`
5. Sender receives:
   - transfer code
   - receive URL
   - expiration time
6. Sender shares the code or QR with the receiver


### Receiver-First

1. Receiver opens the **Receive page**
2. Receiver starts a transfer without payload
3. Backend creates a transfer in `awaiting_payload`
4. Receiver receives:
   - transfer code
   - send URL
   - expiration time
5. Receiver shares the sender QR or link with the sending device
6. Sender opens the provided URL and submits content
7. Backend moves the transfer to `ready`
8. Receiver can then open the ready transfer by code or QR


### Retrieval

1. User enters the code on the Receive page  
   OR opens the server-issued receive URL
2. Client fetches the transfer from the backend
3. If the transfer is `ready`:
   - the shared content is displayed
4. If the transfer is `awaiting_payload`:
   - a waiting state is shown
   - the client polls until the transfer becomes `ready`, expires, or is invalid
5. If the transfer is expired or missing:
   - an error message is shown


## Transfer Model

Transfer object:

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

Rules:

- `awaiting_payload` transfers do not contain payload
- `ready` transfers always contain payload
- `consumed` and `expired` are terminal states
- payloads may contain text, files, or both
- at least one of `payload.text` or `payload.files` must be present when payload exists
- file payloads should use an array-based reference model, even for a single file

Transfers are stored in Redis with TTL.

Compatibility note:

- Existing session routes may remain temporarily during migration
- Transfer is the primary domain concept going forward

For file sharing, the payload will reference one or more stored files instead of containing file bytes directly.


## API Endpoints

### Create Transfer

Target route: POST `/api/transfers`

Sender-first request (text sharing):

{
  payload: {
    text: string
  }
}

Validation:
- at least one of `payload.text` or `payload.files` is required
- if `payload.text` exists, its length must be <= MAX_TEXT_BYTES

Receiver-first request:

{
  intent: "receive"
}

Future request (file sharing):

multipart/form-data upload with file metadata.

Future file payload contract:

{
  payload: {
    files: fileReference[]
  }
}

Future mixed payload contract:

{
  payload: {
    text?: string
    files?: fileReference[]
  }
}

Sender-first response:

{
  code: string
  receiveUrl: string
  expiresAt: timestamp
}

Receiver-first response:

{
  code: string
  sendUrl: string
  expiresAt: timestamp
}

### Get Transfer

Target route: GET `/api/transfers/[code]`

Response:

{
  code: string
  status: string
  payload?: {
    text?: string
    files?: fileReference[]
  }
  expiresAt: timestamp
}

Errors:
- 404 if transfer is not found or expired


### Fulfill Waiting Transfer

Target route: POST `/api/transfers/[code]/payload`

Request:

{
  payload: {
    text?: string
    files?: fileReference[]
  }
}

Behavior:
- validates payload input
- attaches payload to an `awaiting_payload` transfer
- moves the transfer to `ready`
- supports text-only now and should later support files-only or mixed payloads through the same endpoint family


## UI Pages

### Home Page

Entry page with two options:
- Send
- Receive


### Send Page

Components:
- input for text
- file upload (future, designed for one or many files)
- Send button

Sender-first mode after sending:
- display transfer code
- display receive URL
- copy button
- QR code

Receiver-first fulfillment mode:
- open a receiver-issued send URL
- submit payload into an existing waiting transfer


### Receive Page

Components:
- code input
- button to open transfer
- option to start a receiver-first transfer and generate sender QR/link

Redirects to:

/receive/[code]


### Receive Transfer Page

Displays:
- shared text when present
- downloadable file list when present

States:
- awaiting payload
- ready
- invalid
- expired

Errors:
- transfer not found
- transfer expired


## Future Features

Planned extensions:

- Real file upload and download support
- Multiple file sharing
- Mixed text + file sending in one composed UI
- End-to-end encryption
- Device pairing
- Clipboard integration
- Larger payload handling
- Mobile app wrapper
