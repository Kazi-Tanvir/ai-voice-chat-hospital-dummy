# AI Voice Agent — Hospital Appointment Scheduling System

## Overview

**CareConnect** is a full-stack hospital appointment scheduling application built with **Next.js 16**, **Prisma ORM (MySQL/MariaDB)**, and the **Vapi AI voice SDK**. It allows hospital staff (or patients) to browse doctors, view their availability, and book/cancel/update appointments — either through the **web UI** or by **speaking to an AI voice assistant** powered by Vapi.

---

## How the Project Works (End-to-End)

### 1. Data Layer — Prisma + MySQL

The database stores three core tables managed by Prisma:

| Model | Purpose |
|---|---|
| `doctor` | Stores each doctor's profile — name, specialty field, education, research background, contact info, bio, and active status. |
| `schedule` | Each doctor has one or more schedule rows. Each row represents a **working day** (e.g. "Monday") and the **time slots** available on that day (stored as a comma-separated string like `"9:00 AM - 12:00 PM, 2:00 PM - 5:00 PM"`). |
| `appointment` | Each booked appointment links a **patient name** to a **doctor**, on a specific **day** and **time slot**. |

**Relationships:**
- `doctor` → `schedule` (one-to-many): A doctor can work on multiple days.
- `doctor` → `appointment` (one-to-many): A doctor can have multiple booked appointments.

The database is seeded with **25 doctors** across various specialties (Cardiology, Pediatrics, Neurology, Dermatology, Oncology, etc.) using `prisma/seed.ts`. Each doctor has realistic profile data and 2-3 working days with time slots.

### 2. Frontend — Next.js App Router (React Server Components + Client Component)

The application has a **single-page dashboard** design:

#### Server Component: `app/page.tsx`
- This is the entry point. It runs **on the server** and fetches all doctors (with their schedules) and all appointments (with doctor info) directly from the database using Prisma.
- It passes the data as props to the client component `SchedulingClient`.
- Uses `dynamic = 'force-dynamic'` to always fetch fresh data on every page load.

#### Client Component: `app/SchedulingClient.tsx`
This is the main interactive UI. It renders a **3-column dashboard**:

| Column | Content |
|---|---|
| **Left (col-span-4)** | **Doctor Finder** — A searchable, scrollable list of all doctors. Clicking a doctor selects them. Search filters by name or specialty. |
| **Center (col-span-5)** | **Doctor Profile + Booking Form** — Shows the selected doctor's full profile (bio, education, research, contact). Below that is a booking form where staff enters a patient name, selects an available day (from the doctor's schedule), then selects a time slot, and clicks "Book Appointment". |
| **Right (col-span-3)** | **Voice Assistant + Appointments Tracker** — A Vapi voice call button to talk to the AI assistant, plus a live list of all scheduled appointments with a cancel button on each. |

**Client-side behavior:**
- **Booking:** Sends a `POST /api/appointments` request with `doctorId`, `patientName`, `day`, and `timeSlot`. On success, the new appointment is prepended to the local state.
- **Cancelling:** Sends a `DELETE /api/appointments/:id` request. Uses **optimistic UI** — the appointment is removed from the list immediately, and rolled back if the API call fails.
- **Voice Call:** Initializes the Vapi Web SDK with the public key. When the user clicks the call button, it starts a voice session with the configured Vapi Assistant. When the call ends, it re-fetches all appointments to sync any changes the voice agent made.

### 3. Voice Agent — Vapi Integration

The Vapi voice assistant is an **AI-powered phone/web call agent** that can book, cancel, and update appointments by speaking naturally. Here's how it works:

1. **User clicks the call button** → Vapi Web SDK (`@vapi-ai/web`) starts an audio call session to the Vapi cloud service using the `NEXT_PUBLIC_VAPI_ASSISTANT_ID`.
2. **User speaks** (e.g., *"Book an appointment for Alice Cooper with Dr. Jane Smith on Monday at 9 AM"*).
3. **Vapi's AI processes the speech**, extracts structured data, and sends a **webhook** (`tool-calls` message) to the app's `POST /api/vapi/webhook` endpoint.
4. **The webhook handler executes the requested tool** (e.g., `bookAppointment`) against the database and returns a result string.
5. **Vapi speaks the result** back to the user (e.g., *"Appointment booked successfully for Alice Cooper with Dr. Jane Smith on Monday at 9:00 AM - 12:00 PM"*).
6. **When the call ends**, the frontend re-fetches appointments to display any new/changed bookings.

**The Vapi assistant is configured on the Vapi dashboard** (externally) with three tool definitions: `bookAppointment`, `cancelAppointment`, and `updateAppointment`. The webhook URL must be publicly accessible (hence the `ngrok` tunnel running in the terminal).

---

## API Routes — Detailed Breakdown

### `GET /api/appointments`

**File:** `app/api/appointments/route.ts`

**Purpose:** Fetch all appointments.

**Behavior:**
- Queries `prisma.appointment.findMany()` with the related `doctor` included.
- Orders by `createdAt` descending (newest first).
- Returns a JSON array of appointment objects.

**Response:** `200 OK` — Array of appointments with doctor details.
**Error:** `500` — If the database query fails.

---

### `POST /api/appointments`

**File:** `app/api/appointments/route.ts`

**Purpose:** Create a new appointment (used by the web form).

**Request Body:**
```json
{
  "doctorId": "string (CUID)",
  "patientName": "string",
  "day": "string (e.g. 'Monday')",
  "timeSlot": "string (e.g. '9:00 AM - 12:00 PM')"
}
```

**Behavior:**
1. Validates that all four fields are present → `400` if any are missing.
2. Verifies the doctor exists via `prisma.doctor.findUnique()` → `404` if not found.
3. Creates the appointment via `prisma.appointment.create()`.
4. Returns the newly created appointment with doctor info.

**Response:** `201 Created` — The new appointment object.
**Errors:** `400` (missing fields), `404` (doctor not found), `500` (server error).

---

### `DELETE /api/appointments/:id`

**File:** `app/api/appointments/[id]/route.ts`

**Purpose:** Cancel (delete) a specific appointment by its ID.

**Behavior:**
1. Extracts `id` from the dynamic route params.
2. Verifies the appointment exists → `404` if not found.
3. Deletes the appointment via `prisma.appointment.delete()`.
4. Returns a success message.

**Response:** `200 OK` — `{ "message": "Appointment cancelled successfully" }`
**Errors:** `400` (missing ID), `404` (not found), `500` (server error).

---

### `PATCH /api/appointments/:id`

**File:** `app/api/appointments/[id]/route.ts`

**Purpose:** Update an existing appointment — change patient name, doctor, day, and/or time slot.

**Request Body (all optional):**
```json
{
  "patientName": "string",
  "doctorId": "string",
  "day": "string",
  "timeSlot": "string"
}
```

**Behavior:**
1. Loads the existing appointment (with doctor and schedules) → `404` if not found.
2. Determines final values: uses the new value if provided, otherwise keeps the existing value.
3. **If doctor, day, or timeSlot changed** (schedule-related update):
   - Loads the target doctor with schedules → `404` if the doctor doesn't exist.
   - Validates the day is in the doctor's schedule → `400` with available days listed.
   - Fuzzy-matches the time slot against the doctor's slots for that day → `400` with available slots listed.
   - Checks for double-booking (another appointment at the same doctor/day/slot, excluding this one) → `409 Conflict`.
   - Updates the appointment with the validated values.
4. **If only patientName changed** (or nothing changed):
   - Simply updates the patient name.

**Response:** `200 OK` — The updated appointment object with doctor info.
**Errors:** `400` (invalid day/slot), `404` (appointment or doctor not found), `409` (double booking), `500` (server error).

---

### `POST /api/vapi/webhook`

**File:** `app/api/vapi/webhook/route.ts`

**Purpose:** Handle incoming tool-call webhooks from the Vapi AI voice platform.

**How Vapi sends requests:**
Vapi sends a JSON payload with a `message` object. The handler only processes messages of `type: "tool-calls"`. Other message types (`call.started`, `assistant.request`, etc.) are acknowledged with `200 OK` and ignored.

**Supported tool functions:**

#### `bookAppointment`
**Arguments:** `patientName`, `doctorName`, `day`, `timeSlot`

**Behavior:**
1. Validates all four arguments are present.
2. **Fuzzy-finds the doctor by name** — strips "Dr." or "Doctor" prefix, then uses `contains` search in the database.
3. Validates the day exists in the doctor's schedule.
4. **Fuzzy-matches the time slot** — supports exact match, partial contains match, or reverse contains match (flexible natural language input).
5. Checks for double-booking on that doctor/day/slot.
6. Creates the appointment and returns a success message.

#### `cancelAppointment`
**Arguments:** `patientName`, `doctorName` (optional)

**Behavior:**
1. Requires at least `patientName`.
2. Searches for appointments with a matching patient name (`contains` search). Optionally narrows by doctor name.
3. **If exactly one match** — deletes it and returns a success message.
4. **If multiple matches** — returns a numbered list asking the user to be more specific.
5. **If no matches** — returns an error message.

#### `updateAppointment`
**Arguments:** `patientName`, `doctorName` (to find), `newDoctorName`, `newDay`, `newTimeSlot`

**Behavior:**
1. Requires `patientName` and at least one of `newDoctorName`, `newDay`, or `newTimeSlot`.
2. Finds the existing appointment (fuzzy search by patient name, optionally narrowed by doctor).
3. Resolves the target doctor (new or existing).
4. Validates the new day/slot against the target doctor's schedule.
5. Checks for double-booking (excluding the current appointment).
6. Updates and returns a human-readable summary of what changed.

**Response format for all tools:**
```json
{
  "results": [
    {
      "toolCallId": "string (from Vapi)",
      "result": "Human-readable success/error message string"
    }
  ]
}
```

**Errors:** `500` — If an unhandled exception occurs.

---

## Database Schema

```
doctor
├── id (String, CUID, PK)
├── name (String)
├── field (String — specialty)
├── medicalStudy (String)
├── researchBackground (String)
├── email (String?, unique)
├── phone (String?)
├── experienceYears (Int?)
├── bio (String?)
├── isActive (Boolean, default: true)
├── createdAt (DateTime)
├── updatedAt (DateTime)
├── → schedule[] (one-to-many)
└── → appointment[] (one-to-many)

schedule
├── id (String, CUID, PK)
├── doctorId (String, FK → doctor.id, CASCADE)
├── day (String — e.g. "Monday")
├── timeSlots (String — comma-separated ranges)
├── createdAt (DateTime)
└── updatedAt (DateTime)

appointment
├── id (String, CUID, PK)
├── doctorId (String, FK → doctor.id, CASCADE)
├── patientName (String)
├── day (String)
├── timeSlot (String)
├── createdAt (DateTime)
└── updatedAt (DateTime)
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL/MariaDB connection string for Prisma. |
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | Public API key for initializing the Vapi Web SDK on the client. |
| `NEXT_PUBLIC_VAPI_ASSISTANT_ID` | The ID of the pre-configured Vapi AI assistant that handles voice calls. |

---

## Project File Structure

```
ai-voice-agent-hospital/
├── app/
│   ├── api/
│   │   ├── appointments/
│   │   │   ├── route.ts              ← GET (list) + POST (create) appointments
│   │   │   └── [id]/
│   │   │       └── route.ts          ← DELETE (cancel) + PATCH (update) single appointment
│   │   └── vapi/
│   │       └── webhook/
│   │           └── route.ts          ← POST — Vapi voice agent webhook handler
│   ├── globals.css                   ← Global styles
│   ├── layout.tsx                    ← Root layout (Geist font, HTML shell)
│   ├── page.tsx                      ← Server component — fetches data, renders SchedulingClient
│   └── SchedulingClient.tsx          ← Client component — full dashboard UI + Vapi call logic
├── lib/
│   └── (prisma client — auto-generated)
├── prisma/
│   ├── schema.prisma                 ← Database schema definition
│   ├── seed.ts                       ← Seeds 25 doctors with schedules
│   ├── dev.db                        ← Local SQLite dev database (if used)
│   └── migrations/                   ← Prisma migration history
├── prisma.config.ts                  ← Prisma configuration (datasource URL, migration path)
├── package.json                      ← Dependencies and scripts
├── next.config.ts                    ← Next.js configuration
├── tsconfig.json                     ← TypeScript configuration
└── .env                              ← Environment variables (not committed)
```

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS 4 |
| Database | MySQL / MariaDB |
| ORM | Prisma 7 |
| Voice AI | Vapi (`@vapi-ai/web` SDK + server-side webhook) |
| Fonts | Geist Sans, Geist Mono (via `next/font/google`) |

---

## How to Run

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:** Create a `.env` file with `DATABASE_URL`, `NEXT_PUBLIC_VAPI_PUBLIC_KEY`, and `NEXT_PUBLIC_VAPI_ASSISTANT_ID`.

3. **Run database migrations and seed:**
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

4. **Start the dev server:**
   ```bash
   npm run dev
   ```

5. **Expose the webhook (for Vapi voice calls):**
   ```bash
   ngrok http 3000
   ```
   Then set the ngrok URL + `/api/vapi/webhook` as the server URL in the Vapi assistant dashboard.

---

## Key Design Decisions

- **Fuzzy matching for doctor names and time slots** — The voice agent strips "Dr." prefixes and uses `contains` searches, so users can say "Jane Smith" or "Dr. Jane Smith" and both work.
- **Optimistic UI for cancellations** — The appointment is removed from the list instantly for a snappy feel; if the API call fails, it rolls back.
- **Comma-separated time slots** — Stored as strings to keep the schema simple. Parsed on the fly when validating bookings.
- **Force-dynamic rendering** — The main page always fetches fresh data from the database, ensuring the appointment list is up-to-date (important since the voice agent can modify data in the background).
- **Webhook-based voice integration** — Vapi calls the app's webhook endpoint with structured tool calls, keeping all database logic centralized on the server.
