# Conduit App Architecture

Conduit is a Flutter/Dart mobile client for [Open WebUI](https://github.com/open-webui/open-webui). It communicates with the Open WebUI backend entirely through its REST API and a Socket.IO real-time connection. This document describes how the app works at a technical level — how requests are made, how streaming is handled, how files are attached, and how auth is managed.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Flutter (Dart) |
| State management | Riverpod 3.0 (code-generated providers) |
| HTTP client | Dio 5.9.0 |
| Real-time | socket_io_client 3.1.2 (Socket.IO) |
| Secure storage | FlutterSecureStorage (iOS Keychain / Android Keystore) |
| Local database | Hive CE |
| Navigation | GoRouter |
| File picking | image_picker, file_picker |

---

## Project Structure

```
conduit/lib/
├── core/
│   ├── auth/               # Auth interceptor, state manager, token validation
│   ├── error/              # Standardized error types
│   ├── models/             # Data models (User, ChatMessage, Conversation, etc.)
│   ├── network/            # Image/network helpers
│   ├── persistence/        # Hive database boxes and migration
│   ├── providers/          # App-wide Riverpod providers
│   ├── router/             # GoRouter config
│   ├── services/           # API service, socket service, storage, streaming
│   ├── utils/              # Logging, parsing, helpers
│   └── widgets/            # Shared UI components
├── features/
│   ├── auth/               # Login/signup views and auth providers
│   ├── chat/               # Chat UI, providers, streaming orchestration
│   ├── channels/           # Channel management
│   ├── navigation/         # Main drawer, router setup
│   ├── notes/              # Notes feature
│   ├── profile/            # User profile & settings
│   ├── prompts/            # Prompt management
│   └── tools/              # Tool/plugin integration
├── l10n/                   # Localization (ARB files)
└── shared/                 # Shared theme, utilities, widgets
```

---

## API Communication

### HTTP Client (Dio)

All API requests go through a single `ApiService` instance (`lib/core/services/api_service.dart`) wrapping a Dio HTTP client.

**Base configuration:**
- Base URL: configurable per `ServerConfig` (user-provided server address)
- Timeouts: 30s connect, 30s receive
- Follows redirects (up to 5)
- Custom headers from server config (e.g., for reverse proxy setups)
- Self-signed certificate support via `ServerTlsHttpClientFactory`

**Interceptor chain (applied in order):**

1. **`ApiAuthInterceptor`** — Injects `Authorization: Bearer {token}` header. Classifies endpoints as public, optional, or required-auth. Only triggers auth failure notifications for critical endpoints (e.g., `/api/v1/auths/`), ignoring 401/403 on non-essential routes.

2. **`ApiErrorInterceptor`** — Transforms `DioException` into standardized `ApiError` objects. Logs errors in debug mode.

3. **Connectivity ping interceptor** — Any 2xx/3xx response suppresses the "offline" indicator for 4 seconds, preventing UI flicker from brief network hiccups.

### Key API Endpoints

| Operation | Method | Endpoint |
|---|---|---|
| Sign in | POST | `/api/v1/auths/signin` |
| LDAP sign in | POST | `/api/v1/auths/ldap` |
| Validate token | GET | `/api/v1/auths/` |
| List models | GET | `/api/models` |
| List conversations | GET | `/api/v1/chats` |
| Search conversations | GET | `/api/v1/chats/search?q=...` |
| Create conversation | POST | `/api/v1/chats/new` |
| Chat completion | POST | `/api/chat/completions` |
| Upload file | POST | `/api/v1/files/` |
| Health check | GET | `/health` |

---

## Chat Streaming — Three Transport Modes

Conduit supports three transport modes for receiving chat completions from the server. The mode is **determined at runtime** by inspecting the actual HTTP response from `/api/chat/completions`, not configured ahead of time.

### Transport 1: HTTP Streaming (SSE)

This is the primary and preferred mode. It works like Server-Sent Events over a standard HTTP response.

**Flow:**
1. Client POSTs to `/api/chat/completions` with `responseType: ResponseType.stream`
2. Server responds with `Content-Type: text/event-stream`
3. Client receives a byte stream of SSE frames
4. The `parseOpenWebUIStream()` parser (`lib/core/services/openwebui_stream_parser.dart`) decodes the stream

**SSE frame format (OpenAI-compatible):**
```
data: {"choices": [{"delta": {"content": "Hello"}}]}

data: {"choices": [{"delta": {"reasoning_content": "Let me think..."}}]}

data: {"usage": {"total_tokens": 42}}

data: [DONE]
```

**The parser handles:**
- Multi-frame SSE messages split across TCP chunks
- UTF-8 characters split across chunk boundaries
- CRLF normalization
- Trailing frames without final `\n\n` terminator

**Typed update events emitted by the parser:**

| Type | Description |
|---|---|
| `OpenWebUIContentDelta` | Incremental text content |
| `OpenWebUIReasoningDelta` | Chain-of-thought reasoning tokens |
| `OpenWebUIUsageUpdate` | Token count statistics |
| `OpenWebUISourcesUpdate` | Citation/source references |
| `OpenWebUIOutputUpdate` | Structured output items (tool calls, code interpreter) |
| `OpenWebUISelectedModelUpdate` | Model ID for arena/routing flows |
| `OpenWebUIErrorUpdate` | Structured error from stream |
| `OpenWebUIStreamDone` | Stream complete signal |

### Transport 2: WebSocket / Task Socket

When the client has an active Socket.IO connection, the server may return a `task_id` in a JSON response instead of streaming SSE. Content then arrives through WebSocket events.

**Flow:**
1. Client POSTs to `/api/chat/completions` (same endpoint)
2. Server sees the `session_id` (from the WebSocket connection) in the request
3. Server returns `{"task_id": "abc123"}` as JSON
4. Client subscribes to WebSocket events for that task
5. Server emits `request:chat:completion` events with message chunks
6. Client aggregates chunks until completion

**Socket.IO service (`lib/core/services/socket_service.dart`):**
- Uses the `socket_io_client` package (Socket.IO protocol, not raw WebSocket)
- Prefers WebSocket transport, falls back to HTTP long-polling
- Auto-reconnects with unlimited retries and exponential backoff
- 30-second heartbeat interval matching Open WebUI's backend
- Tracks connection health (latency, transport type, reconnect count)

**Event buffering for timing races:**
The server can emit events before the client's streaming handler is registered. To handle this, `SocketService` buffers incoming events by `(conversationId, sessionId, messageId)` scope. When a handler registers, all buffered events are immediately replayed. This prevents data loss during the handoff between HTTP response classification and socket event listening.

**Session ID behavior:**
The `session_id` field is only included in the request payload when a real Socket.IO connection exists. When the socket is disconnected, `session_id` is omitted (set to `null`), which causes the backend to fall back to SSE streaming. This mirrors Open WebUI's web frontend behavior: `session_id: $socket?.id`.

### Transport 3: JSON Completion

A non-streamed fallback. The server returns the complete response as a single JSON object instead of streaming it. This can happen with certain model configurations or when streaming is disabled.

**Flow:**
1. Client POSTs to `/api/chat/completions`
2. Server returns `Content-Type: application/json` with the full response body
3. Client parses the JSON and creates a `jsonCompletion` session

### Response Classification

The `classifyChatCompletionResponse()` method determines the transport mode using this precedence:

1. **Check `Content-Type: application/json`** — Buffer the body, parse as JSON:
   - If `task_id` field is present → `taskSocket` mode
   - Otherwise → `jsonCompletion` mode
2. **Sniff the response body** (handles missing/incorrect Content-Type headers):
   - Body starts with `data:` → `httpStream` mode (replays buffered bytes + remaining stream)
   - Body is valid JSON → classify as above
3. **Check `Content-Type: text/event-stream`** → `httpStream` mode
4. **Otherwise** → throws `StateError`

---

## Chat Completion Request Payload

The `_buildChatCompletionPayload()` method constructs the request body for `/api/chat/completions`. It mirrors the Open WebUI web frontend's request shape:

```json
{
  "stream": true,
  "model": "llama3.2",
  "messages": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there!"},
    {"role": "user", "content": "What's the weather?"}
  ],
  "params": {
    "temperature": 0.7,
    "top_p": 0.9
  },
  "features": {
    "voice": false,
    "web_search": true,
    "image_generation": false,
    "code_interpreter": false,
    "memory": true
  },
  "session_id": "socket-abc123",
  "id": "msg-uuid",
  "chat_id": "conversation-uuid",
  "parent_id": "parent-msg-uuid",
  "parent_message": {},
  "variables": {"USER_NAME": "Bob"},
  "tool_ids": ["tool-1", "tool-2"],
  "filter_ids": ["filter-1"],
  "skill_ids": ["skill-1"],
  "tool_servers": [],
  "files": [{"id": "file-123", "type": "file", "name": "data.csv"}],
  "model_item": { ... },
  "background_tasks": {},
  "stream_options": {"include_usage": true}
}
```

**Image handling in messages:**
When a message has image attachments, the `content` field is transformed from a plain string to an OpenAI-compatible content array:

```json
{
  "role": "user",
  "content": [
    {"type": "text", "text": "What's in this image?"},
    {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}
  ]
}
```

Non-image files (PDFs, CSVs, etc.) are separated and sent in the top-level `files` array instead.

---

## File & Photo Attachment Flow

### Phase 1: File Selection

Users select files through `ImagePicker` (for photos/camera) or `FilePicker` (for general files). File metadata is collected: path, name, size, and MIME type.

### Phase 2: Upload

**Endpoint:** `POST /api/v1/files/`

**Request format:** Multipart form-data with a single `file` field containing the binary blob.

```dart
FormData.fromMap({
  'file': MultipartFile.fromFile(
    filePath,
    filename: fileName,
    contentType: DioMediaType.parse(mimeType),
  ),
})
```

**MIME type detection:** Auto-detected from file extension. Supported types include:
- Images: jpg, jpeg, png, gif, webp
- Audio: mp3, wav, m4a, aac, ogg, webm
- Video: mp4
- Documents: pdf, txt, json

**Response:** The server returns a JSON object containing the file's server-assigned `id`.

**Progress tracking:** An optional `onProgress` callback fires on each chunk sent, enabling upload progress bars in the UI.

### Phase 3: Retry Queue

The `AttachmentUploadQueue` (`lib/core/services/attachment_upload_queue.dart`) handles unreliable uploads:
- Queue persisted in Hive database (`attachment_queue` box)
- Max 4 retries with exponential backoff (5s initial, 5m max)
- Queued items processed when connectivity is restored
- Each entry tracks: status (pending/uploading/completed/failed/cancelled), error messages, retry count

### Phase 4: Including Files in Chat Messages

Once uploaded, files are referenced in messages by their server-assigned IDs:

- **Images:** Included inline in the `messages` array as `image_url` content parts (base64 data URIs or server URLs)
- **Non-image files:** Included in the top-level `files` array of the request payload, referenced by their server file IDs — these are used for RAG (Retrieval-Augmented Generation) on the backend

---

## Authentication

### Auth State

The `AuthStateManager` (`lib/core/auth/auth_state_manager.dart`) is the single source of truth for authentication state, implemented as a kept-alive Riverpod provider.

**States:**
```
initial → loading → authenticated
                  → unauthenticated
                  → tokenExpired
                  → error
                  → credentialError
```

### Login Methods

1. **Email + Password** — `POST /api/v1/auths/signin` → returns `{token, token_type, id, ...}`
2. **API Key / Token** — Direct token authentication
3. **LDAP** — `POST /api/v1/auths/ldap` (when LDAP is enabled on the server)

### Token Management

- Bearer token stored in `FlutterSecureStorage` (iOS Keychain / Android Keystore)
- Token validated on app startup via `GET /api/v1/auths/`
- On cold start, secure storage is "warmed up" with retries (up to 3 attempts) to avoid iOS Keychain race conditions
- No explicit token refresh endpoint — tokens are long-lived; on 401, the user re-authenticates
- Token synced to the HTTP client via a Riverpod listener that watches both the API service and auth token providers

### Credential Storage

| Storage | Contents |
|---|---|
| FlutterSecureStorage | Auth token, saved credentials (when "Remember Me" is enabled) |
| Hive database | User object, settings, conversations, attachment queue |
| SharedPreferences | Small preference values |

---

## State Management (Riverpod 3.0)

The app uses Riverpod 3.0 with code generation (`@riverpod` annotations).

**Key provider patterns:**

- **`@Riverpod(keepAlive: true)`** for singletons: auth state, theme, app settings
- **`NotifierProvider`** for synchronous mutable state: chat messages list
- **`AsyncNotifierProvider`** for async operations: data loading, API calls
- **`Provider`** for computed/derived state: `isChatStreaming` uses `.select()` to avoid unnecessary rebuilds
- **Async safety:** All async operations check `ref.mounted` before updating state to prevent disposal errors

**Data flow:**
```
User Action → Provider Method → ApiService → HTTP/Socket → Response
                                                              ↓
UI ← Widget rebuild ← Provider state update ← Response parsing
```

---

## Streaming Pipeline (End-to-End)

Here's the full flow when a user sends a message:

1. **User taps send** → Chat provider calls `sendMessageSession()` on `ApiService`
2. **Payload built** → `_buildChatCompletionPayload()` constructs the OpenAI-compatible request
3. **HTTP POST** → Dio sends request to `/api/chat/completions` with `ResponseType.stream`
4. **Response classified** → `classifyChatCompletionResponse()` inspects headers and body to determine transport
5. **Transport bound:**
   - **httpStream** → `parseOpenWebUIStream()` decodes the SSE byte stream into typed updates
   - **taskSocket** → Socket event handler registered for the task ID, with buffered events replayed
   - **jsonCompletion** → Full response parsed immediately
6. **Streaming helper** (`lib/core/services/streaming_helper.dart`) processes updates:
   - Content deltas appended to the assistant message
   - Reasoning tokens wrapped in `<details>` HTML blocks
   - Image references extracted from response content
   - Tool call results parsed
   - Sources/citations attached
7. **State updated** → `StreamingContent` provider set with each chunk; `ChatMessages` provider updated
8. **UI rebuilt** → Widgets watching the providers re-render with new content

### Cancellation

Each streaming request gets a `CancelToken` (Dio) and an `abort` handle. The user can stop generation mid-stream, which cancels the HTTP request and cleans up socket handlers.

---

## Notable Patterns

### Health Check with Proxy Detection

`checkHealthWithProxyDetection()` hits the `/health` endpoint and distinguishes between:
- **Healthy server** — 200 + valid JSON
- **Proxy auth required** — 302/307/308 redirect or HTML returned on `/health`
- **Unhealthy server** — unexpected status code
- **Unreachable server** — connection timeout

### Conversation Parsing Worker

Large conversation lists (1000+) are parsed in Dart isolates via `WorkerManager` to avoid blocking the UI thread.

### Temporary Chats

Conversation IDs starting with `local:` are never persisted to the server. Users can later save them permanently via the `createConversation()` API.

### Background Streaming

The app continues processing streaming responses when backgrounded, using a background streaming handler that maintains the socket connection and accumulates content until the app returns to the foreground.
