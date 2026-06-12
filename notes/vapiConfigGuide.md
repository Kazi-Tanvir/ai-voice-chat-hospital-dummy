# How to Update the Vapi Assistant Configuration via the API

This guide explains how to **read** and **update** your Vapi assistant's configuration directly via the Vapi REST API using your **Vapi Private API Key**.

---

## Prerequisites

| Item | Where to Find It |
|---|---|
| **Vapi Private Key** | [Vapi Dashboard](https://dashboard.vapi.ai) → **Settings / Account** → **API Keys** |
| **Assistant ID** | Already in your `.env` file as `NEXT_PUBLIC_VAPI_ASSISTANT_ID` (currently `018c883e-a0de-42a8-8379-7e302ce4d755`) |

> [!CAUTION]
> **Never commit your Private Key** to version control. It grants full read/write access to your Vapi account. Keep it secure and use it as an environment variable or header in your API requests.

---

## Vapi API Capabilities

You can use the **Vapi REST API** with your Private Key to:

### 1. Read Current Configuration
```
GET https://api.vapi.ai/assistant/{assistantId}
```
Retrieve the full current configuration of your assistant — model, voice, system prompt, tools, server URL, etc.

### 2. Update the Configuration
```
PATCH https://api.vapi.ai/assistant/{assistantId}
```
Update specific fields in the configuration by sending a JSON payload containing only the fields you want to change. Unchanged fields remain untouched.

### 3. List All Assistants
```
GET https://api.vapi.ai/assistant
```
List all assistants associated with your account to find their IDs.

---

## Step-by-Step Guide to Updating Configuration

Follow these steps to update your Vapi assistant configuration using `curl`:

### Step 1 — Set up your variables
For convenience, define your credentials and assistant ID:
- **Vapi Private Key**: `YOUR_PRIVATE_KEY`
- **Assistant ID**: `018c883e-a0de-42a8-8379-7e302ce4d755`

### Step 2 — Fetch the current configuration
Run a `GET` request to retrieve the current assistant configuration:

```bash
curl -s https://api.vapi.ai/assistant/018c883e-a0de-42a8-8379-7e302ce4d755 \
  -H "Authorization: Bearer YOUR_PRIVATE_KEY" | python -m json.tool
```

This returns the full JSON configuration, including:
- `name` — The assistant's display name
- `firstMessage` — The greeting spoken when a call starts
- `model` — LLM provider, model name, and system prompt
- `voice` — TTS provider and voice ID
- `transcriber` — STT provider and model
- `serverUrl` — The webhook URL (your ngrok tunnel + `/api/vapi/webhook`)
- `tools` — The function definitions (`bookAppointment`, `cancelAppointment`, `updateAppointment`, `getDoctorSchedule`)

### Step 3 — Prepare your payload
Build a JSON payload containing the fields you want to update. For example, to update the **server URL** and the **system prompt**:

```json
{
  "serverUrl": "https://your-new-ngrok-url.ngrok-free.app/api/vapi/webhook",
  "model": {
    "provider": "openai",
    "model": "gpt-4o",
    "messages": [
      {
        "role": "system",
        "content": "You are a hospital scheduling assistant for CareConnect..."
      }
    ]
  }
}
```

### Step 4 — Apply the update via PATCH
Run a `PATCH` request with the JSON payload to update the assistant:

```bash
curl -X PATCH https://api.vapi.ai/assistant/018c883e-a0de-42a8-8379-7e302ce4d755 \
  -H "Authorization: Bearer YOUR_PRIVATE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "serverUrl": "https://your-new-ngrok-url.ngrok-free.app/api/vapi/webhook",
    "model": {
      "provider": "openai",
      "model": "gpt-4o",
      "messages": [
        {
          "role": "system",
          "content": "You are a hospital scheduling assistant for CareConnect..."
        }
      ]
    }
  }'
```

### Step 5 — Verify the changes
Fetch the configuration once more to confirm the update succeeded:
```bash
curl -s https://api.vapi.ai/assistant/018c883e-a0de-42a8-8379-7e302ce4d755 \
  -H "Authorization: Bearer YOUR_PRIVATE_KEY" | python -m json.tool
```

---

## Configurable Fields Reference

Below are the key configurable fields on your Vapi assistant:

### Core Settings

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Display name of the assistant |
| `firstMessage` | `string` | The greeting the assistant speaks when a call starts |
| `serverUrl` | `string` | Webhook URL where Vapi sends tool-call events (your app's `/api/vapi/webhook` endpoint) |

### Model (LLM)

```json
"model": {
  "provider": "openai",        // openai | anthropic | groq | etc.
  "model": "gpt-4o",           // The specific model name
  "messages": [
    {
      "role": "system",
      "content": "Your system prompt instructions here..."
    }
  ],
  "temperature": 0.7            // Controls randomness (0.0 - 1.0)
}
```

### Voice (Text-to-Speech)

```json
"voice": {
  "provider": "11labs",         // 11labs | cartesia | playht | etc.
  "voiceId": "voice-id-here"   // Specific voice from the provider
}
```

### Transcriber (Speech-to-Text)

```json
"transcriber": {
  "provider": "deepgram",      // deepgram | assemblyai | gladia
  "model": "nova-2"            // Provider-specific model
}
```

### Tools (Function Definitions)

Your CareConnect project currently uses these tools that are defined on the assistant:

```json
"tools": [
  {
    "type": "function",
    "function": {
      "name": "bookAppointment",
      "description": "Book an appointment for a patient with a doctor",
      "parameters": {
        "type": "object",
        "properties": {
          "patientName": { "type": "string", "description": "Full name of the patient" },
          "doctorName":  { "type": "string", "description": "Name of the doctor" },
          "day":         { "type": "string", "description": "Day of the week (e.g. Monday)" },
          "timeSlot":    { "type": "string", "description": "Time slot (e.g. 9:00 AM - 12:00 PM)" }
        },
        "required": ["patientName", "doctorName", "day", "timeSlot"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "cancelAppointment",
      "description": "Cancel an existing appointment",
      "parameters": {
        "type": "object",
        "properties": {
          "patientName": { "type": "string", "description": "Full name of the patient" },
          "doctorName":  { "type": "string", "description": "Name of the doctor (optional)" }
        },
        "required": ["patientName"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "updateAppointment",
      "description": "Update an existing appointment",
      "parameters": {
        "type": "object",
        "properties": {
          "patientName":  { "type": "string", "description": "Full name of the patient" },
          "doctorName":   { "type": "string", "description": "Current doctor name to find the appointment" },
          "newDoctorName": { "type": "string", "description": "New doctor name (if changing)" },
          "newDay":        { "type": "string", "description": "New day (if changing)" },
          "newTimeSlot":   { "type": "string", "description": "New time slot (if changing)" }
        },
        "required": ["patientName"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "getDoctorSchedule",
      "description": "Search for doctors and their available schedules",
      "parameters": {
        "type": "object",
        "properties": {
          "searchQuery": { "type": "string", "description": "Doctor name or specialty to search for" },
          "searchType":  { "type": "string", "enum": ["name", "specialty", "all"], "description": "Type of search to perform" }
        }
      }
    }
  }
]
```

---

## Common Update Scenarios

### 🔄 Update the Server URL (when ngrok restarts)

This is the **most frequent** update. Every time you restart ngrok, you get a new URL and need to update the assistant.

```json
{
  "serverUrl": "https://NEW-NGROK-URL.ngrok-free.app/api/vapi/webhook"
}
```

### 🧠 Change the System Prompt

```json
{
  "model": {
    "provider": "openai",
    "model": "gpt-4o",
    "messages": [
      {
        "role": "system",
        "content": "You are a friendly hospital scheduling assistant for CareConnect Hospital. You help patients book, cancel, and reschedule appointments with doctors. Always confirm details before making changes. Be warm, professional, and concise."
      }
    ]
  }
}
```

### 🎙️ Change the Voice

```json
{
  "voice": {
    "provider": "11labs",
    "voiceId": "new-voice-id"
  }
}
```

### ➕ Add a New Tool

To add a new tool, fetch the current `tools` array, append the new tool definition, and send the entire updated array in your `PATCH` payload.

### 🔧 Update the LLM Model

```json
{
  "model": {
    "provider": "openai",
    "model": "gpt-4o-mini"
  }
}
```

---

## API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/assistant` | List all assistants |
| `GET` | `/assistant/{id}` | Get a specific assistant's full config |
| `POST` | `/assistant` | Create a new assistant |
| `PATCH` | `/assistant/{id}` | Update an existing assistant (partial update) |
| `DELETE` | `/assistant/{id}` | Delete an assistant |

**Base URL:** `https://api.vapi.ai`
**Auth Header:** `Authorization: Bearer YOUR_PRIVATE_KEY`

---

## How It Relates to Your Project

Your CareConnect project uses Vapi in two places:

1. **Client-side** ([SchedulingClient.tsx](file:///d:/02_CODE/04_TEST/ai-voice-agent-hospital/app/SchedulingClient.tsx)):
   - Uses `NEXT_PUBLIC_VAPI_PUBLIC_KEY` to initialize the Vapi Web SDK
   - Uses `NEXT_PUBLIC_VAPI_ASSISTANT_ID` to start voice calls
   - These are **read-only** public keys — they can only initiate calls, not modify config

2. **Server-side** ([webhook/route.ts](file:///d:/02_CODE/04_TEST/ai-voice-agent-hospital/app/api/vapi/webhook/route.ts)):
   - Receives tool-call webhooks from Vapi at `POST /api/vapi/webhook`
   - Handles `bookAppointment`, `cancelAppointment`, `updateAppointment`, and `getDoctorSchedule`
   - The assistant's `serverUrl` must point to this endpoint (via ngrok)

The **Private Key** allows you to programmatically update the assistant configuration (system prompt, tools, server URL, voice, etc.) via the REST API or using custom scripts without having to manually edit things in the Vapi Dashboard.

---

## Quick Start: Update Server URL

To quickly update your server URL (e.g., after restarting ngrok), run the following command:

```bash
curl -X PATCH https://api.vapi.ai/assistant/018c883e-a0de-42a8-8379-7e302ce4d755 \
  -H "Authorization: Bearer YOUR_PRIVATE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"serverUrl": "https://YOUR_NEW_NGROK_SUBDOMAIN.ngrok-free.app/api/vapi/webhook"}'
```
