# TunnelShare Specification

TunnelShare is a simple web application that allows users to quickly transfer data between devices using a short session code or QR link.

The application is optimized for fast sharing between devices such as:
- Windows → iPhone
- Laptop → Phone
- Desktop → Tablet

No accounts are required. Sessions are temporary and expire automatically.

TunnelShare is designed to support **multiple payload types** in the future.  
The first implemented slice supports **text sharing**, with **file sharing planned next**.


## Core Concept

A sender selects data to share (currently text, later files) and clicks **Send**.

The backend creates a session containing:
- a unique code
- the payload
- the payload type
- an expiration timestamp

The receiver can retrieve the shared data by:
- entering the session code
- opening the generated receive URL
- scanning a QR code pointing to the receive URL

Important rules:

Sessions are created **only after the sender clicks Send**.  
A valid session **always contains a payload**.  
There is **no waiting state**.


## Core Flow

### Sender

1. Sender opens the **Send page**
2. Sender selects the content to send (currently text)
3. Sender clicks **Send**
4. Backend creates a session containing the payload
5. Sender receives:
   - session code
   - receive URL
   - expiration time
6. Sender shares the code or QR with the receiver


### Receiver

1. Receiver enters the code on the Receive page  
   OR opens `/receive/<CODE>`
2. Client fetches the session from the backend
3. If the session exists:
   - the shared content is displayed
4. If the session is expired or missing:
   - an error message is shown


## Session Model

Session object:

{
  code: string
  payloadType: "text" | "file"
  payload: string | fileReference
  expiresAt: timestamp
}

Sessions are stored in Redis with TTL.

For file sharing, the payload will reference a stored file instead of containing the file directly.


## API Endpoints

### Create Session

POST `/api/sessions`

Request (text sharing):

{
  text: string
}

Validation:
- text is required
- text length must be <= MAX_TEXT_BYTES

Future request (file sharing):

multipart/form-data upload with file metadata.

Response:

{
  code: string
  receiveUrl: string
  expiresAt: timestamp
}


### Get Session

GET `/api/sessions/[code]`

Response:

{
  code: string
  payloadType: string
  payload: string | fileReference
  expiresAt: timestamp
}

Errors:
- 404 if session not found or expired


## UI Pages

### Home Page

Entry page with two options:
- Send
- Receive


### Send Page

Components:
- input for text (initial version)
- file upload (future)
- Send button

After sending:
- display session code
- display receive URL
- copy button
- QR code


### Receive Page

Components:
- code input
- button to open session

Redirects to:

/receive/[code]


### Receive Session Page

Displays:
- shared text OR
- downloadable file

Errors:
- session not found
- session expired


## Future Features

Planned extensions:

- File transfer support
- End-to-end encryption
- Device pairing
- Clipboard integration
- Larger payload handling
- Mobile app wrapper