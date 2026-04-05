# Open WebUI API Reference for OpenNativeUI

> This document is a comprehensive reference for building out the OpenNativeUI React Native client against an Open WebUI backend. It covers authentication, all major API endpoints, data models, streaming patterns, and feature capabilities.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Authentication](#authentication)
- [API Conventions](#api-conventions)
- [Core APIs](#core-apis)
  - [Chat Completions (Streaming)](#chat-completions-streaming)
  - [Chat Management](#chat-management)
  - [Models](#models)
  - [Files & Uploads](#files--uploads)
  - [Knowledge Bases (RAG)](#knowledge-bases-rag)
  - [Prompts & Templates](#prompts--templates)
  - [Tools & Functions](#tools--functions)
  - [Folders & Tags](#folders--tags)
  - [User Management](#user-management)
  - [Memories](#memories)
  - [Channels (Team Messaging)](#channels-team-messaging)
  - [Notes](#notes)
  - [Image Generation](#image-generation)
  - [Audio (TTS / STT)](#audio-tts--stt)
  - [Tasks (Auto-Generation)](#tasks-auto-generation)
  - [Evaluations & Feedback](#evaluations--feedback)
- [Real-Time: Socket.IO](#real-time-socketio)
- [Data Models](#data-models)
- [Access Control System](#access-control-system)
- [Current App Status](#current-app-status)
- [Feature Roadmap Opportunities](#feature-roadmap-opportunities)

---

## Architecture Overview

Open WebUI is a FastAPI (Python) backend with a Svelte frontend. Our React Native app replaces the Svelte frontend and communicates with the same backend APIs.

**Base URL patterns** (relative to the server URL configured by the user):

| Prefix | Purpose |
|--------|---------|
| `/api/v1/*` | Primary REST API |
| `/api/chat/completions` | OpenAI-compatible chat endpoint |
| `/api/models` | Model listing (OpenAI-compatible) |
| `/ollama/*` | Ollama API proxy |
| `/openai/*` | OpenAI API proxy |

**Backend source reference:** `open-webui/backend/open_webui/routers/` contains all route handlers. `open-webui/backend/open_webui/models/` contains all data models.

---

## Authentication

### Sign In

```
POST /api/v1/auths/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "user",
  "profile_image_url": "/api/v1/users/{id}/profile/image",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Sign Up

```
POST /api/v1/auths/signup
Content-Type: application/json

{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password"
}
```

Returns the same shape as sign in.

### Validate Session

```
GET /api/v1/auths/
Authorization: Bearer <token>
```

Returns the current user object (without token).

### Sign Out

```
GET /api/v1/auths/signout
Authorization: Bearer <token>
```

### Token Format

- **Type:** JWT Bearer token
- **Header:** `Authorization: Bearer <token>`
- **Storage:** Persist locally (we use MMKV)
- **Expiration:** Configurable server-side; check with `GET /api/v1/auths/token/expires`

### API Keys

For programmatic access (useful for background sync, notifications, etc.):

- `POST /api/v1/auths/api_key` - Generate new API key
- `GET /api/v1/auths/api_key` - Get existing API key
- `DELETE /api/v1/auths/api_key` - Delete API key

### LDAP Authentication

```
POST /api/v1/auths/ldap
{ "user": "username", "password": "password" }
```

### OAuth

```
POST /api/v1/auths/oauth/{provider}/token/exchange
```

---

## API Conventions

### Request Format

All requests use JSON unless uploading files (multipart/form-data).

```
Content-Type: application/json
Authorization: Bearer <token>
```

### Error Responses

FastAPI returns errors as:
```json
{ "detail": "Error message string" }
```

Some proxied endpoints (OpenAI) return:
```json
{ "error": { "message": "Error message" } }
```

### Pagination

List endpoints support query parameters:
- `?page=1` - Page number (1-indexed)
- `?limit=50` - Items per page
- `?search=query` - Text search (on supported endpoints)

### Timestamps

All timestamps are **Unix epoch integers** (seconds or nanoseconds depending on model). Channel messages use nanosecond precision (`time_ns`).

---

## Core APIs

### Chat Completions (Streaming)

This is the primary endpoint for sending messages and receiving AI responses.

```
POST /api/chat/completions
Authorization: Bearer <token>
Content-Type: application/json

{
  "stream": true,
  "model": "model-id-string",
  "messages": [
    { "role": "system", "content": "System prompt" },
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" },
    { "role": "user", "content": "New message" }
  ],
  "params": {
    "temperature": 0.7,
    "top_p": 0.9,
    "top_k": 40,
    "num_ctx": 4096,
    "stop": ["\n"]
  },
  "files": [
    { "type": "file", "id": "file-uuid" }
  ],
  "tool_ids": ["tool-id"],
  "skill_ids": ["skill-id"],
  "features": {
    "web_search": true
  },
  "session_id": "socket-session-id",
  "chat_id": "chat-uuid",
  "id": "response-message-uuid",
  "stream_options": {
    "include_usage": true
  }
}
```

#### Streaming Response (SSE)

The response is a stream of Server-Sent Events. Each event contains a JSON object:

```
data: {"choices":[{"delta":{"content":"Hello"}}]}

data: {"choices":[{"delta":{"content":" world"}}]}

data: {"sources":[{"title":"doc.pdf","content":"..."}]}

data: {"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}

data: [DONE]
```

**Event types in the stream:**
| Field | Description |
|-------|-------------|
| `choices[0].delta.content` | Text token delta |
| `sources` | RAG retrieval sources |
| `selected_model_id` | Dynamic model routing info |
| `usage` | Token usage statistics |
| `error` | Error object if something failed |
| `[DONE]` | Stream completion marker |

#### Streaming Implementation

Our app uses two strategies (see `src/services/streaming.ts`):

1. **Socket.IO** (primary) - Matches the web frontend's approach. Emits a `chat` event and listens for streamed tokens.
2. **SSE via fetch + ReadableStream** (fallback) - Direct HTTP streaming when Socket.IO is unavailable.

#### Non-Streaming

Set `"stream": false` to get a complete response in one JSON payload:
```json
{
  "choices": [{ "message": { "content": "Full response text" } }],
  "usage": { "prompt_tokens": 10, "completion_tokens": 50, "total_tokens": 60 }
}
```

---

### Chat Management

Chats are stored server-side. The native app should sync conversations with these endpoints.

#### List User Chats

```
GET /api/v1/chats/?page=1
GET /api/v1/chats/list  (alias)
```

Returns paginated chat list with metadata (id, title, updated_at, etc.).

#### Get Pinned Chats

```
GET /api/v1/chats/pinned
```

#### Search Chats

```
GET /api/v1/chats/search?q=search+term&page=1
```

#### Create New Chat

```
POST /api/v1/chats/new
{
  "chat": {
    "id": "uuid",
    "title": "New Chat",
    "models": ["model-id"],
    "system": "optional system prompt",
    "params": {},
    "history": {
      "messages": { "message-id": { ... } },
      "currentId": "latest-message-id"
    },
    "messages": [...],
    "tags": [],
    "timestamp": 1712300000
  },
  "folder_id": null
}
```

**Important:** The `chat.history` field uses a **tree structure** where each message has `parentId` and `childrenIds`. The `chat.messages` field is a flat array for display order. Our app converts between these formats using `historyToMessages()` / `messagesToHistory()` in `src/services/conversationApi.ts`.

#### Get Chat by ID

```
GET /api/v1/chats/{chat_id}
```

#### Update Chat

```
POST /api/v1/chats/{chat_id}
{
  "chat": { ... updated chat object ... }
}
```

#### Delete Chat

```
DELETE /api/v1/chats/{chat_id}
```

#### Pin / Unpin

```
POST /api/v1/chats/{chat_id}/pin
{ "is_pinned": true }
```

#### Archive / Unarchive

```
POST /api/v1/chats/{chat_id}/archive
```

```
GET /api/v1/chats/archived        # List archived chats
POST /api/v1/chats/archive/all    # Archive all
POST /api/v1/chats/unarchive/all  # Unarchive all
```

#### Share Chat

```
POST /api/v1/chats/{chat_id}/share
```

Returns a `share_id` that can be used to access the chat publicly.

```
GET /api/v1/chats/share/{share_id}     # Get shared chat
DELETE /api/v1/chats/{chat_id}/share    # Unshare
```

#### Clone Chat

```
POST /api/v1/chats/{chat_id}/clone
```

#### Chat Folders

```
POST /api/v1/chats/{chat_id}/folder
{ "folder_id": "folder-uuid" }

GET /api/v1/chats/folder/{folder_id}
```

#### Chat Tags

```
GET /api/v1/chats/all/tags           # All user tags
GET /api/v1/chats/{chat_id}/tags     # Tags for a chat
POST /api/v1/chats/{chat_id}/tags    # Add tag
{ "tag_name": "work" }
DELETE /api/v1/chats/{chat_id}/tags  # Remove tag
{ "tag_name": "work" }
```

#### Update Chat Message

```
POST /api/v1/chats/{chat_id}/messages/{message_id}
{ ... message fields to update ... }
```

#### Chat Usage Stats

```
GET /api/v1/chats/stats/usage
```

---

### Models

#### List Available Models

```
GET /api/models
```

This is the OpenAI-compatible endpoint that returns all models the user has access to. Used by our model selector.

```json
{
  "data": [
    {
      "id": "llama3:latest",
      "name": "Llama 3",
      "owned_by": "ollama",
      "info": { "meta": { "description": "...", "profile_image_url": "..." } }
    }
  ]
}
```

#### Detailed Model List

```
GET /api/v1/models/list    # Full model objects with access grants
GET /api/v1/models/base    # Base models only (no custom wrappers)
```

#### Model CRUD (Admin/Privileged)

```
POST /api/v1/models/create         # Create custom model
POST /api/v1/models/model/update   # Update model
POST /api/v1/models/model/delete   # Delete model
POST /api/v1/models/model/toggle   # Toggle active status
```

#### Model Tags

```
GET /api/v1/models/tags
```

#### Get Model Profile Image

```
GET /api/v1/models/model/profile/image?id=model-id
```

---

### Files & Uploads

#### Upload a File

```
POST /api/v1/files/
Content-Type: multipart/form-data

file: <binary>
```

Returns a `FileModel` object with the file's `id`.

#### Check Processing Status

After upload, files may need processing (for RAG). Poll this endpoint:

```
GET /api/v1/files/{file_id}/process/status
```

Returns status like `"uploading"`, `"processing"`, `"completed"`, `"error"`.

#### List Files

```
GET /api/v1/files/
GET /api/v1/files/search?query=filename
```

#### Get / Delete File

```
GET /api/v1/files/{file_id}
DELETE /api/v1/files/{file_id}
```

#### Get File Content

```
GET /api/v1/files/{file_id}/content         # Raw file content
GET /api/v1/files/{file_id}/content/html     # HTML rendering
GET /api/v1/files/{file_id}/data/content     # Processed data content
```

---

### Knowledge Bases (RAG)

Knowledge bases organize files for retrieval-augmented generation.

#### List Knowledge Bases

```
GET /api/v1/knowledge/
GET /api/v1/knowledge/search?q=term
```

#### CRUD

```
POST /api/v1/knowledge/create
{
  "name": "My Knowledge Base",
  "description": "Documents about X"
}

GET /api/v1/knowledge/{id}
POST /api/v1/knowledge/{id}/update
DELETE /api/v1/knowledge/{id}/delete
POST /api/v1/knowledge/{id}/reset
```

#### File Management in Knowledge Base

```
GET /api/v1/knowledge/{id}/files
POST /api/v1/knowledge/{id}/file/add       { "file_id": "..." }
POST /api/v1/knowledge/{id}/file/remove    { "file_id": "..." }
POST /api/v1/knowledge/{id}/files/batch/add
```

#### Search Knowledge Files

```
GET /api/v1/knowledge/search/files?query=term
```

#### Access Control

```
POST /api/v1/knowledge/{id}/access/update
```

---

### Prompts & Templates

Prompts are reusable templates triggered by slash commands.

#### List Prompts

```
GET /api/v1/prompts/
GET /api/v1/prompts/list    # Slim list format
GET /api/v1/prompts/tags    # All prompt tags
```

#### CRUD

```
POST /api/v1/prompts/create
{
  "command": "/summarize",
  "name": "Summarize",
  "content": "Summarize the following: {{content}}"
}

GET /api/v1/prompts/command/{command}   # e.g., /summarize
GET /api/v1/prompts/id/{prompt_id}
POST /api/v1/prompts/id/{prompt_id}/update
DELETE /api/v1/prompts/id/{prompt_id}/delete
```

#### Prompt Versioning

```
GET /api/v1/prompts/id/{id}/history
POST /api/v1/prompts/id/{id}/update/version
GET /api/v1/prompts/id/{id}/history/diff
```

---

### Tools & Functions

Tools are callable capabilities exposed to models. Functions are server-side code modules (filters, pipes, actions).

#### Tools

```
GET /api/v1/tools/               # List tools
GET /api/v1/tools/list           # Slim list
POST /api/v1/tools/create        # Create tool
POST /api/v1/tools/id/{id}/update
DELETE /api/v1/tools/id/{id}/delete
```

**Tool Valves (Configuration):**
```
GET /api/v1/tools/id/{id}/valves
GET /api/v1/tools/id/{id}/valves/spec
POST /api/v1/tools/id/{id}/valves/update
```

#### Functions

```
GET /api/v1/functions/
GET /api/v1/functions/list
POST /api/v1/functions/create
POST /api/v1/functions/id/{id}/update
DELETE /api/v1/functions/id/{id}/delete
POST /api/v1/functions/id/{id}/toggle
POST /api/v1/functions/id/{id}/toggle/global
```

#### Skills

```
GET /api/v1/skills/
POST /api/v1/skills/create
GET /api/v1/skills/id/{id}
POST /api/v1/skills/id/{id}/update
DELETE /api/v1/skills/id/{id}/delete
POST /api/v1/skills/id/{id}/toggle
```

---

### Folders & Tags

#### Folders

Folders support nested hierarchy via `parent_id`.

```
GET /api/v1/folders/
POST /api/v1/folders/              { "name": "Work" }
GET /api/v1/folders/{id}
POST /api/v1/folders/{id}/update           { "name": "New Name" }
POST /api/v1/folders/{id}/update/parent    { "parent_id": "parent-uuid" }
POST /api/v1/folders/{id}/update/expanded  { "is_expanded": true }
DELETE /api/v1/folders/{id}
```

#### Tags

Tags are automatically created when added to chats. They're user-scoped.

```
GET /api/v1/chats/all/tags         # All tags for current user
GET /api/v1/chats/{id}/tags        # Tags on a specific chat
POST /api/v1/chats/{id}/tags       # Add tag to chat
DELETE /api/v1/chats/{id}/tags     # Remove tag from chat
```

---

### User Management

#### Current User Profile

```
GET /api/v1/auths/                        # Session user info
POST /api/v1/auths/update/profile         # Update name/profile_image_url
POST /api/v1/auths/update/password        # Change password
POST /api/v1/auths/update/timezone        # Set timezone
```

#### User Settings & Preferences

```
GET /api/v1/users/user/settings           # Get user settings (JSON blob)
POST /api/v1/users/user/settings/update   # Update settings
GET /api/v1/users/user/info               # Get user info/profile
POST /api/v1/users/user/info/update       # Update user info
```

#### User Status (Presence)

```
GET /api/v1/users/user/status
POST /api/v1/users/user/status/update
{
  "status_emoji": "🟢",
  "status_message": "Available",
  "status_expires_at": 1712400000
}
```

#### User Permissions

```
GET /api/v1/users/user/permissions
```

#### User Groups

```
GET /api/v1/users/groups
```

#### Admin: User Management

```
GET /api/v1/users/                  # List users
GET /api/v1/users/search?q=name    # Search users
GET /api/v1/users/{user_id}        # Get user by ID
POST /api/v1/users/{user_id}/update
DELETE /api/v1/users/{user_id}
POST /api/v1/auths/add             # Create user (admin)
```

---

### Memories

User memories are vector-stored context that persists across conversations.

```
GET /api/v1/memories/                  # List memories
POST /api/v1/memories/add              # Add memory
{ "content": "User prefers dark mode" }

POST /api/v1/memories/query            # Query memories (semantic search)
{ "content": "user preferences", "k": 5 }

POST /api/v1/memories/{id}/update      # Update memory
DELETE /api/v1/memories/{id}           # Delete memory
DELETE /api/v1/memories/delete/user    # Delete all user memories
POST /api/v1/memories/reset            # Reset from vector DB
```

---

### Channels (Team Messaging)

Channels provide Slack-like team messaging within Open WebUI.

#### Channel CRUD

```
GET /api/v1/channels/               # List channels
POST /api/v1/channels/create
{
  "name": "general",
  "description": "General discussion"
}
GET /api/v1/channels/{id}
POST /api/v1/channels/{id}/update
DELETE /api/v1/channels/{id}/delete
```

#### Channel Members

```
GET /api/v1/channels/{id}/members
POST /api/v1/channels/{id}/update/members/add      { "user_ids": [...] }
POST /api/v1/channels/{id}/update/members/remove   { "user_ids": [...] }
```

#### Channel Messages

```
GET /api/v1/channels/{id}/messages?page=1&limit=50
POST /api/v1/channels/{id}/messages/post
{
  "content": "Hello team!",
  "data": {},
  "parent_id": null
}
GET /api/v1/channels/{id}/messages/{msg_id}
POST /api/v1/channels/{id}/messages/{msg_id}/update
DELETE /api/v1/channels/{id}/messages/{msg_id}/delete
```

#### Message Threads

```
GET /api/v1/channels/{id}/messages/{msg_id}/thread
```

#### Reactions

```
POST /api/v1/channels/{id}/messages/{msg_id}/reactions/add     { "name": "thumbsup" }
POST /api/v1/channels/{id}/messages/{msg_id}/reactions/remove  { "name": "thumbsup" }
```

#### Pinned Messages

```
GET /api/v1/channels/{id}/messages/pinned
POST /api/v1/channels/{id}/messages/{msg_id}/pin
```

#### DMs

```
GET /api/v1/channels/users/{user_id}    # Get/create DM channel with user
```

---

### Notes

Collaborative documents with real-time editing via Y.js.

```
GET /api/v1/notes/
GET /api/v1/notes/search?q=term
POST /api/v1/notes/create        { "title": "Meeting Notes", "content": "..." }
GET /api/v1/notes/{id}
POST /api/v1/notes/{id}/update   { "title": "Updated", "content": "..." }
DELETE /api/v1/notes/{id}/delete
POST /api/v1/notes/{id}/access/update
```

---

### Image Generation

```
GET /api/v1/images/config         # Get config (admin)
GET /api/v1/images/models         # Available image models
POST /api/v1/images/generations   # Generate image
{
  "model": "dall-e-3",
  "prompt": "A sunset over mountains",
  "n": 1,
  "size": "1024x1024"
}
POST /api/v1/images/edit          # Edit existing image
```

---

### Audio (TTS / STT)

#### Text-to-Speech

```
POST /api/v1/audio/speech
{
  "model": "tts-1",
  "input": "Hello world",
  "voice": "alloy"
}
```

Returns audio binary stream.

#### Speech-to-Text

```
POST /api/v1/audio/transcriptions
Content-Type: multipart/form-data

file: <audio binary>
```

Returns transcribed text.

#### Voices & Models

```
GET /api/v1/audio/voices
GET /api/v1/audio/models
```

---

### Tasks (Auto-Generation)

The backend can auto-generate metadata for chats:

```
POST /api/v1/tasks/title/completions        # Generate chat title
{ "model": "model-id", "messages": [...], "chat_id": "..." }

POST /api/v1/tasks/tags/completions         # Generate chat tags
{ "model": "model-id", "messages": [...], "chat_id": "..." }

POST /api/v1/tasks/follow_up/completions    # Generate follow-up suggestions
{ "model": "model-id", "messages": [...] }

POST /api/v1/tasks/emoji/completions        # Generate emoji for message
POST /api/v1/tasks/queries/completions      # Generate search queries
POST /api/v1/tasks/auto/completions         # Autocomplete suggestions
POST /api/v1/tasks/moa/completions          # Mixture-of-agents response
```

---

### Evaluations & Feedback

#### Model Leaderboard

```
GET /api/v1/evaluations/leaderboard
```

#### Feedback

```
POST /api/v1/evaluations/feedback
{
  "type": "rating",
  "data": { "rating": 5, "model_id": "..." }
}
GET /api/v1/evaluations/feedbacks/user
GET /api/v1/evaluations/feedback/{id}
POST /api/v1/evaluations/feedback/{id}
DELETE /api/v1/evaluations/feedback/{id}
```

---

## Real-Time: Socket.IO

Open WebUI uses Socket.IO for real-time features. The server runs at the same URL as the HTTP API.

### Connection

```javascript
import { io } from "socket.io-client";

const socket = io(serverUrl, {
  auth: { token: bearerToken },
  transports: ["websocket", "polling"]
});
```

### Key Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `usage` | Client -> Server | Track user activity |
| `user-join` | Client -> Server | User joining session |
| `heartbeat` | Client -> Server | Keep-alive |
| `join-channels` | Client -> Server | Subscribe to channel rooms |
| `events:channel` | Bidirectional | Channel message streaming |
| `ydoc:document:join` | Client -> Server | Join collaborative document editing |
| `ydoc:document:update` | Bidirectional | Y.js document sync |
| `ydoc:awareness:update` | Bidirectional | Cursor positions |

### Chat Streaming via Socket.IO

The web frontend sends chat completion requests through Socket.IO for real-time streaming. Our app currently implements this as the primary streaming method in `src/services/streaming.ts`.

---

## Data Models

### User

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID primary key |
| `email` | string | User email |
| `name` | string | Display name |
| `role` | string | `"admin"`, `"user"`, or `"pending"` |
| `profile_image_url` | string | Avatar URL |
| `settings` | object | User preferences (UI, model defaults, etc.) |
| `info` | object | Additional profile info |
| `timezone` | string | User timezone |
| `status_emoji` | string | Presence emoji |
| `status_message` | string | Status text |
| `last_active_at` | number | Unix timestamp |
| `created_at` | number | Unix timestamp |
| `updated_at` | number | Unix timestamp |

### Chat

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID primary key |
| `user_id` | string | Owner user ID |
| `title` | string | Chat title |
| `chat` | object | Full chat data (see below) |
| `share_id` | string? | Public share identifier |
| `archived` | boolean | Whether archived |
| `pinned` | boolean? | Whether pinned |
| `meta` | object | Additional metadata |
| `folder_id` | string? | Parent folder ID |
| `created_at` | number | Unix timestamp |
| `updated_at` | number | Unix timestamp |

#### Chat.chat Structure (Tree-Based History)

```json
{
  "id": "chat-uuid",
  "title": "Chat Title",
  "models": ["model-id"],
  "system": "Optional system prompt",
  "params": { "temperature": 0.7 },
  "history": {
    "messages": {
      "msg-uuid-1": {
        "id": "msg-uuid-1",
        "parentId": null,
        "childrenIds": ["msg-uuid-2"],
        "role": "user",
        "content": "Hello",
        "timestamp": 1712300000
      },
      "msg-uuid-2": {
        "id": "msg-uuid-2",
        "parentId": "msg-uuid-1",
        "childrenIds": [],
        "role": "assistant",
        "content": "Hi there!",
        "models": ["model-id"],
        "model": "model-id",
        "done": true,
        "timestamp": 1712300001
      }
    },
    "currentId": "msg-uuid-2"
  },
  "messages": ["msg-uuid-1", "msg-uuid-2"],
  "tags": [],
  "timestamp": 1712300000
}
```

**Key detail:** Messages form a tree (branching conversations are possible). `currentId` points to the latest message in the active branch.

### ChatMessage (Flat DB Model)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Message UUID |
| `chat_id` | string | Parent chat ID |
| `user_id` | string | Author user ID |
| `role` | string | `"user"`, `"assistant"`, `"system"` |
| `parent_id` | string? | Parent message ID |
| `content` | string/list | Text or content blocks |
| `model_id` | string? | Model used (assistant messages) |
| `files` | list? | Attached file references |
| `sources` | list? | RAG sources |
| `done` | boolean | Completion status |
| `usage` | object? | Token counts |
| `error` | object? | Error info |
| `created_at` | number | Unix timestamp |
| `updated_at` | number | Unix timestamp |

### Model

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Model identifier (e.g., `llama3:latest`) |
| `name` | string | Display name |
| `base_model_id` | string? | Underlying model for custom models |
| `params` | object | Model parameters |
| `meta` | object | `{ profile_image_url, description, capabilities, tags }` |
| `is_active` | boolean | Availability toggle |
| `access_grants` | list | Access control entries |

### File

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID |
| `user_id` | string | Owner |
| `filename` | string | Original filename |
| `hash` | string? | Content hash |
| `path` | string? | Storage path |
| `meta` | object | `{ name, content_type, size }` |
| `data` | object? | Processed content data |

### Knowledge Base

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID |
| `name` | string | Display name |
| `description` | string | Description |
| `meta` | object? | Additional metadata |
| `access_grants` | list | Access control |

### Folder

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID |
| `parent_id` | string? | Parent folder for nesting |
| `name` | string | Display name |
| `is_expanded` | boolean | UI expanded state |

### Channel

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID |
| `name` | string | Channel name |
| `description` | string? | Description |
| `type` | string? | e.g., `"group"` |
| `is_private` | boolean? | Private channel flag |

### Channel Message

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID |
| `user_id` | string | Author |
| `channel_id` | string | Parent channel |
| `content` | string | Message text |
| `parent_id` | string? | Thread parent |
| `reply_to_id` | string? | Reply reference |
| `is_pinned` | boolean | Pinned status |
| `reactions` | list | Message reactions |

---

## Access Control System

Open WebUI uses a unified access control model across resources:

### AccessGrant

| Field | Type | Description |
|-------|------|-------------|
| `resource_type` | string | `"knowledge"`, `"model"`, `"prompt"`, `"tool"`, `"note"`, `"channel"`, `"file"`, `"skill"` |
| `resource_id` | string | ID of the resource |
| `principal_type` | string | `"user"` or `"group"` |
| `principal_id` | string | User/group ID, or `"*"` for public |
| `permission` | string | `"read"` or `"write"` |

Most resources that support access control have an endpoint:
```
POST /api/v1/{resource}/{id}/access/update
```

---

## Current App Status

Features already implemented in our React Native client:

- **Authentication** - Sign in/out, token persistence, session validation
- **Chat** - Send messages, stream responses (Socket.IO + SSE fallback)
- **Conversations** - List, create, rename, delete, date-grouped sidebar
- **Models** - List models, select model, persist selection
- **File Uploads** - Document picker, upload progress, attach to messages
- **Web Search** - Toggle for web search integration
- **Settings** - Theme (system/light/dark), server URL, sign out
- **Markdown** - Render assistant messages with code blocks and formatting

**Tech stack:** Expo 54, React Native 0.81, NativeWind, Zustand + MMKV, Socket.IO Client, react-native-sse

---

## Feature Roadmap Opportunities

Based on the API analysis, here are features available in Open WebUI that could be added to the native app:

### High Priority
- **Chat organization** - Folders, tags, pinning, archiving
- **Chat sharing** - Generate share links
- **Knowledge bases** - Browse, search, manage RAG collections
- **Prompt templates** - Browse and use slash-command prompts
- **User profile** - Edit name, avatar, status, preferences
- **Search** - Search across conversations

### Medium Priority
- **Channels** - Team messaging with threads, reactions, pins
- **Notes** - Collaborative document editing
- **Memories** - View and manage user memories
- **Image generation** - Generate images from chat
- **Audio** - TTS playback of responses, STT input
- **Multiple models** - Model comparison / mixture-of-agents
- **Follow-up suggestions** - Show auto-generated follow-up questions
- **Auto-title generation** - Automatically title new chats

### Lower Priority
- **Tools & skills** - Browse and configure available tools
- **Evaluations** - Rate model responses, view leaderboard
- **Admin features** - User management, system config
- **LDAP / OAuth** - Additional auth methods
- **File management** - Browse and manage uploaded files
- **Export** - Export chats as PDF or other formats
