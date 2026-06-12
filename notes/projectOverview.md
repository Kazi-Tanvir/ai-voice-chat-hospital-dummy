# 🏥 CareConnect — Deep Project Overview

> **AI Voice Agent Hospital Appointment Scheduling System**
> Built with Next.js 16 · Prisma 7 · Vapi AI · MySQL/MariaDB

---

## Table of Contents

1. [High-Level Backend Architecture (Mermaid)](#1-high-level-backend-architecture)
2. [End-to-End Request Flow](#2-end-to-end-request-flow)
3. [Detailed Component Breakdown](#3-detailed-component-breakdown)
4. [Full Project Architecture (Directory Tree)](#4-full-project-architecture)
5. [Database Deep Dive](#5-database-deep-dive)
6. [API Endpoint Reference](#6-api-endpoint-reference)
7. [Tech Stack & Dependencies](#7-tech-stack--dependencies)
8. [Environment Variables](#8-environment-variables)
9. [Key Design Patterns & Decisions](#9-key-design-patterns--decisions)
10. [Voice Agent Pipeline](#10-voice-agent-pipeline)

---

## 1. High-Level Backend Architecture

> [!TIP]
> These Mermaid diagrams are designed to be copy-pasted into Excalidraw (via the Mermaid-to-Excalidraw plugin) for further customization.

### 1.1 System Overview

```mermaid
graph TB
    subgraph Client["🖥️ Browser Client"]
        UI["SchedulingClient.tsx<br/>(React Client Component)"]
        VapiSDK["Vapi Web SDK<br/>(@vapi-ai/web)"]
    end

    subgraph NextJS["⚡ Next.js 16 Server (App Router)"]
        SSR["page.tsx<br/>(Server Component)"]

        subgraph API["API Routes Layer"]
            GET_APT["GET /api/appointments"]
            POST_APT["POST /api/appointments"]
            DEL_APT["DELETE /api/appointments/:id"]
            PATCH_APT["PATCH /api/appointments/:id"]
            WEBHOOK["POST /api/vapi/webhook"]
        end
    end

    subgraph External["☁️ External Services"]
        VAPI_CLOUD["Vapi AI Cloud<br/>(Voice Processing)"]
    end

    subgraph Database["🗄️ Database Layer"]
        PRISMA["Prisma ORM 7<br/>(MariaDB Adapter)"]
        MYSQL["MySQL / MariaDB"]
    end

    UI -- "fetch()" --> GET_APT
    UI -- "POST body" --> POST_APT
    UI -- "DELETE" --> DEL_APT
    SSR -- "prisma.doctor.findMany()" --> PRISMA
    SSR -- "prisma.appointment.findMany()" --> PRISMA
    SSR -- "props" --> UI

    GET_APT --> PRISMA
    POST_APT --> PRISMA
    DEL_APT --> PRISMA
    PATCH_APT --> PRISMA
    WEBHOOK --> PRISMA

    PRISMA --> MYSQL

    VapiSDK -- "WebSocket/Audio" --> VAPI_CLOUD
    VAPI_CLOUD -- "HTTP POST (tool-calls)" --> WEBHOOK
    WEBHOOK -- "JSON results" --> VAPI_CLOUD
    VAPI_CLOUD -- "Audio response" --> VapiSDK

    style Client fill:#1a1a2e,stroke:#16213e,color:#e0e0e0
    style NextJS fill:#0f3460,stroke:#533483,color:#e0e0e0
    style API fill:#533483,stroke:#e94560,color:#e0e0e0
    style External fill:#e94560,stroke:#e94560,color:#fff
    style Database fill:#16213e,stroke:#0f3460,color:#e0e0e0
```

### 1.2 Backend Request Routing

```mermaid
graph LR
    REQ["Incoming HTTP Request"] --> ROUTER{"Next.js<br/>App Router"}

    ROUTER -- "GET /" --> PAGE["page.tsx<br/>(SSR)"]
    ROUTER -- "/api/appointments" --> APT_ROUTE["appointments/route.ts"]
    ROUTER -- "/api/appointments/:id" --> APT_ID["appointments/[id]/route.ts"]
    ROUTER -- "/api/vapi/webhook" --> VAPI_WH["vapi/webhook/route.ts"]

    APT_ROUTE -- "GET" --> LIST_ALL["List All Appointments"]
    APT_ROUTE -- "POST" --> CREATE["Create Appointment"]
    APT_ID -- "DELETE" --> CANCEL["Cancel Appointment"]
    APT_ID -- "PATCH" --> UPDATE["Update Appointment"]

    VAPI_WH -- "tool-calls" --> SWITCH{"Function<br/>Router"}
    SWITCH --> BOOK["bookAppointment()"]
    SWITCH --> CANCEL_V["cancelAppointment()"]
    SWITCH --> UPDATE_V["updateAppointment()"]
    SWITCH --> SCHED["getDoctorSchedule()"]

    PAGE --> PRISMA_Q["Prisma Queries"]
    LIST_ALL --> PRISMA_Q
    CREATE --> PRISMA_Q
    CANCEL --> PRISMA_Q
    UPDATE --> PRISMA_Q
    BOOK --> PRISMA_Q
    CANCEL_V --> PRISMA_Q
    UPDATE_V --> PRISMA_Q
    SCHED --> PRISMA_Q

    PRISMA_Q --> DB[("MySQL / MariaDB")]

    style REQ fill:#e94560,stroke:#e94560,color:#fff
    style ROUTER fill:#533483,stroke:#533483,color:#fff
    style SWITCH fill:#533483,stroke:#533483,color:#fff
    style DB fill:#16213e,stroke:#0f3460,color:#e0e0e0
```

### 1.3 Vapi Voice Agent Integration Flow

```mermaid
sequenceDiagram
    actor User
    participant Browser as Browser (SchedulingClient)
    participant VapiSDK as Vapi Web SDK
    participant VapiCloud as Vapi AI Cloud
    participant Webhook as /api/vapi/webhook
    participant DB as MySQL/MariaDB

    User->>Browser: Clicks Call Button
    Browser->>VapiSDK: vapi.start(assistantId)
    VapiSDK->>VapiCloud: WebSocket Connection
    VapiCloud-->>VapiSDK: call-start event
    VapiSDK-->>Browser: setCallStatus('active')

    User->>VapiSDK: Speaks: "Book for Alice with Dr. Smith on Monday at 9 AM"
    VapiSDK->>VapiCloud: Audio Stream
    VapiCloud->>VapiCloud: STT → LLM Processing → Extract Tool Call

    VapiCloud->>Webhook: POST { type: "tool-calls", toolCalls: [...] }
    Webhook->>Webhook: parseArgs() → route to handler
    Webhook->>DB: findDoctorByName("Smith")
    DB-->>Webhook: Doctor record
    Webhook->>DB: Validate schedule + Check double booking
    DB-->>Webhook: Validation result
    Webhook->>DB: prisma.appointment.create()
    DB-->>Webhook: New appointment

    Webhook-->>VapiCloud: { results: [{ result: "Success: Booked..." }] }
    VapiCloud->>VapiCloud: TTS: Generate speech from result
    VapiCloud-->>VapiSDK: Audio: "Appointment booked successfully..."
    VapiSDK-->>User: Hears confirmation

    User->>VapiSDK: Ends call
    VapiCloud-->>VapiSDK: call-end event
    VapiSDK-->>Browser: setCallStatus('idle')
    Browser->>Browser: fetchAppointments() → re-sync UI
```

---

## 2. End-to-End Request Flow

### 2.1 Web UI Booking Flow

```mermaid
flowchart TD
    A["User opens browser at localhost:3000"] --> B["Next.js SSR: page.tsx executes on server"]
    B --> C["Prisma fetches doctors + appointments from MySQL"]
    C --> D["Data passed as props to SchedulingClient"]
    D --> E["React hydrates interactive 3-column dashboard"]

    E --> F{"User action?"}

    F -- "Selects Doctor" --> G["State updates: selectedDoctorId, schedule loads"]
    F -- "Fills form + clicks Book" --> H["POST /api/appointments"]
    F -- "Clicks cancel on appointment" --> I["Optimistic UI removal + DELETE /api/appointments/:id"]
    F -- "Clicks voice call button" --> J["Vapi SDK starts voice session"]

    H --> K{"Server validates"}
    K -- "Missing fields" --> L["400: Missing required fields"]
    K -- "Doctor not found" --> M["404: Doctor not found"]
    K -- "Valid" --> N["prisma.appointment.create()"]
    N --> O["201: Return new appointment"]
    O --> P["Prepend to local appointments state"]

    I --> Q{"DELETE API call"}
    Q -- "Success" --> R["Appointment stays removed"]
    Q -- "Failure" --> S["Rollback: restore original list"]

    style A fill:#0f3460,color:#fff
    style E fill:#533483,color:#fff
    style N fill:#16a34a,color:#fff
    style L fill:#e94560,color:#fff
    style M fill:#e94560,color:#fff
```

### 2.2 Data Loading Strategy

| Stage | Location | Rendering | Caching |
|---|---|---|---|
| Initial page load | `page.tsx` (Server Component) | SSR on every request | `dynamic = 'force-dynamic'` — no cache |
| Doctor + Schedule data | Server → Props → Client | Pre-rendered, hydrated | Fresh on each page load |
| Appointments list | Server → Props → Client | Pre-rendered, then client-managed | State updated via API calls |
| Post-voice-call sync | `fetchAppointments()` client-side | CSR fetch | Always fresh |

---

## 3. Detailed Component Breakdown

### 3.1 Component Dependency Graph

```mermaid
graph TD
    subgraph Server["Server-Side"]
        Layout["layout.tsx<br/>Root Layout"]
        Page["page.tsx<br/>Server Component"]
    end

    subgraph Client["Client-Side"]
        SC["SchedulingClient.tsx<br/>(576 lines)"]
    end

    subgraph APIRoutes["API Route Handlers"]
        AR["appointments/route.ts<br/>(GET, POST)"]
        AID["appointments/[id]/route.ts<br/>(DELETE, PATCH)"]
        VW["vapi/webhook/route.ts<br/>(POST)"]
    end

    subgraph Lib["Shared Library"]
        PC["lib/prisma.ts<br/>(Singleton Client)"]
    end

    subgraph ORM["Data Layer"]
        Schema["schema.prisma"]
        Seed["seed.ts"]
    end

    Layout --> Page
    Page --> SC
    Page --> PC
    AR --> PC
    AID --> PC
    VW --> PC
    PC --> Schema
    Seed --> PC

    style Server fill:#0f3460,color:#e0e0e0
    style Client fill:#533483,color:#e0e0e0
    style APIRoutes fill:#e94560,color:#fff
    style Lib fill:#16213e,color:#e0e0e0
    style ORM fill:#1a1a2e,color:#e0e0e0
```

---

### 3.2 File-by-File Breakdown

#### 📁 `app/layout.tsx` — Root Layout

| Property | Value |
|---|---|
| **Type** | Server Component |
| **Lines** | 34 |
| **Purpose** | HTML shell, font loading, global CSS import |
| **Fonts** | Geist Sans + Geist Mono (via `next/font/google`) |
| **CSS Variables** | `--font-geist-sans`, `--font-geist-mono` |
| **Body Classes** | `min-h-full flex flex-col` |

> [!NOTE]
> The `metadata` in layout.tsx still has the default "Create Next App" title. The actual page title is overridden in `page.tsx` with `"CareConnect Clinic Scheduler"`.

---

#### 📁 `app/page.tsx` — Server Entry Point

| Property | Value |
|---|---|
| **Type** | Async Server Component |
| **Lines** | 45 |
| **Rendering** | `force-dynamic` (SSR on every request) |
| **Data Fetched** | All doctors (with schedules) + All appointments (with doctor + schedules) |
| **Child** | `<SchedulingClient>` (receives data as props) |

**Prisma Queries Made:**

```
1. prisma.doctor.findMany({ include: { schedules: true }, orderBy: { name: 'asc' } })
2. prisma.appointment.findMany({ include: { doctor: { include: { schedules: true } } }, orderBy: { createdAt: 'desc' } })
```

> [!IMPORTANT]
> The `page.tsx` accesses `schedules` (plural) on the include, but the Prisma schema defines the relation field as `schedule` (singular array). Prisma auto-generates the relation accessor — verify this matches at runtime. The schema field name is `schedule` but the page uses `schedules` — this works because the `include` key matches the Prisma model's relation field name.

---

#### 📁 `app/SchedulingClient.tsx` — Main Dashboard UI

| Property | Value |
|---|---|
| **Type** | Client Component (`'use client'`) |
| **Lines** | 576 |
| **Purpose** | Full interactive dashboard: doctor list, profile, booking form, voice agent, appointment tracker |

**State Variables (14 total):**

| State | Type | Purpose |
|---|---|---|
| `doctors` | `Doctor[]` | List of all doctors (set once from props) |
| `appointments` | `Appointment[]` | Live appointment list (mutated by booking/cancel) |
| `selectedDoctorId` | `string` | Currently selected doctor ID |
| `searchTerm` | `string` | Doctor search filter |
| `patientName` | `string` | Booking form: patient name |
| `selectedDay` | `string` | Booking form: chosen day |
| `selectedTimeSlot` | `string` | Booking form: chosen time |
| `isSubmitting` | `boolean` | Loading state for form submission |
| `formFeedback` | `object \| null` | Success/error message for form |
| `vapi` | `Vapi \| null` | Vapi SDK instance |
| `callStatus` | `string` | Voice call state: idle/connecting/active/error |

**UI Layout — 3-Column Grid:**

```mermaid
graph LR
    subgraph Col1["Column 1 (col-span-4)"]
        Search["🔍 Search Bar"]
        DoctorList["📋 Doctor List<br/>(scrollable, filterable)"]
    end

    subgraph Col2["Column 2 (col-span-5)"]
        Profile["👨‍⚕️ Doctor Profile Card<br/>(bio, education, research, contact)"]
        BookingForm["📝 Booking Form<br/>(patient name, day, time slot)"]
    end

    subgraph Col3["Column 3 (col-span-3)"]
        VoiceAgent["🎙️ Voice Assistant<br/>(Vapi call button)"]
        Tracker["📅 Appointments Tracker<br/>(live list + cancel buttons)"]
    end

    style Col1 fill:#1a1a2e,stroke:#533483,color:#e0e0e0
    style Col2 fill:#0f3460,stroke:#533483,color:#e0e0e0
    style Col3 fill:#16213e,stroke:#533483,color:#e0e0e0
```

**Key Functions:**

| Function | Trigger | Action |
|---|---|---|
| `fetchAppointments()` | Call end, manual sync | `GET /api/appointments` → update state |
| `handleToggleCall()` | Voice button click | Start/stop Vapi call |
| `handleSelectDoctor(id)` | Doctor card click | Switch active doctor, reset form |
| `handleDayChange(day)` | Day dropdown change | Set day, clear time slot |
| `handleBookAppointment(e)` | Form submit | `POST /api/appointments` → prepend to state |
| `handleCancelAppointment(id)` | Cancel button click | Optimistic remove → `DELETE /api/appointments/:id` |

---

#### 📁 `app/api/appointments/route.ts` — Appointments CRUD (List + Create)

| Property | Value |
|---|---|
| **Lines** | 56 |
| **Exports** | `GET()`, `POST()` |

**GET Handler:**

```
prisma.appointment.findMany({ include: { doctor: true }, orderBy: { createdAt: 'desc' } })
→ 200: JSON array of appointments
→ 500: Database error
```

**POST Handler — Validation Pipeline:**

```mermaid
flowchart LR
    A["Request Body"] --> B{"All fields<br/>present?"}
    B -- No --> C["400 Missing Fields"]
    B -- Yes --> D{"Doctor<br/>exists?"}
    D -- No --> E["404 Not Found"]
    D -- Yes --> F["Create Appointment"]
    F --> G["201 + Appointment JSON"]
```

---

#### 📁 `app/api/appointments/[id]/route.ts` — Single Appointment (Cancel + Update)

| Property | Value |
|---|---|
| **Lines** | 150 |
| **Exports** | `DELETE()`, `PATCH()` |
| **Params** | `{ params: Promise<{ id: string }> }` (Next.js 16 async params) |

**PATCH Handler — Validation Pipeline (Complex):**

```mermaid
flowchart TD
    A["PATCH Request"] --> B["Load existing appointment"]
    B --> C{"Found?"}
    C -- No --> D["404"]
    C -- Yes --> E["Merge: new values over existing"]
    E --> F{"Schedule<br/>changed?"}

    F -- No --> G["Update patientName only"]
    F -- Yes --> H["Load target doctor + schedules"]
    H --> I{"Doctor<br/>found?"}
    I -- No --> J["404"]
    I -- Yes --> K{"Day in<br/>schedule?"}
    K -- No --> L["400 + available days"]
    K -- Yes --> M{"Time slot<br/>valid?"}
    M -- No --> N["400 + available slots"]
    M -- Yes --> O{"Double<br/>booked?"}
    O -- Yes --> P["409 Conflict"]
    O -- No --> Q["Update appointment"]
    Q --> R["200 + Updated JSON"]
    G --> R

    style D fill:#e94560,color:#fff
    style J fill:#e94560,color:#fff
    style L fill:#e94560,color:#fff
    style N fill:#e94560,color:#fff
    style P fill:#e94560,color:#fff
    style R fill:#16a34a,color:#fff
```

---

#### 📁 `app/api/vapi/webhook/route.ts` — Voice Agent Webhook

| Property | Value |
|---|---|
| **Lines** | 358 |
| **Export** | `POST()` |
| **Purpose** | Receives Vapi tool-call webhooks, routes to handler functions, returns results |

**Helper Functions:**

| Function | Purpose | Lines |
|---|---|---|
| `parseArgs(args)` | Parse tool call arguments (handles string or object input) | 5-14 |
| `findDoctorByName(name)` | Fuzzy doctor search: strips "Dr."/"Doctor" prefix, uses `contains` | 17-23 |
| `validateDay(doctor, day)` | Check if a day exists in the doctor's schedule (case-insensitive) | 26-29 |
| `matchTimeSlot(schedule, slot)` | Fuzzy time slot matching (exact, partial, reverse contains) | 32-42 |

**Tool Handlers:**

| Handler | Vapi Tool Name | Required Args | Optional Args | DB Operations |
|---|---|---|---|---|
| `handleGetDoctorSchedule()` | `getDoctorSchedule` | — | `searchQuery`, `searchType` | `doctor.findMany()` |
| `handleBookAppointment()` | `bookAppointment` | `patientName`, `doctorName`, `day`, `timeSlot` | — | `doctor.findFirst()` → `appointment.findFirst()` → `appointment.create()` |
| `handleCancelAppointment()` | `cancelAppointment` | `patientName` | `doctorName` | `appointment.findMany()` → `appointment.delete()` |
| `handleUpdateAppointment()` | `updateAppointment` | `patientName` | `doctorName`, `newDoctorName`, `newDay`, `newTimeSlot` | `appointment.findMany()` → `doctor.findFirst()` → `appointment.update()` |

**Webhook Message Flow:**

```mermaid
flowchart TD
    A["POST /api/vapi/webhook"] --> B["Parse JSON payload"]
    B --> C{"message.type === 'tool-calls'?"}
    C -- No --> D["200: { status: 'ignored' }"]
    C -- Yes --> E["Loop over toolCalls array"]

    E --> F{"function.name?"}
    F -- "bookAppointment" --> G["handleBookAppointment(args)"]
    F -- "cancelAppointment" --> H["handleCancelAppointment(args)"]
    F -- "updateAppointment" --> I["handleUpdateAppointment(args)"]
    F -- "getDoctorSchedule" --> J["handleGetDoctorSchedule(args)"]
    F -- "unknown" --> K["Error: unsupported function"]

    G --> L["Collect results"]
    H --> L
    I --> L
    J --> L
    K --> L

    L --> M["200: { results: [{ toolCallId, result }] }"]

    style D fill:#6b7280,color:#fff
    style M fill:#16a34a,color:#fff
```

---

#### 📁 `lib/prisma.ts` — Database Client Singleton

| Property | Value |
|---|---|
| **Lines** | 45 |
| **Pattern** | Global singleton (prevents hot-reload connection leaks) |
| **Adapter** | `PrismaMariaDb` from `@prisma/adapter-mariadb` |
| **Connection Pool** | `connectionLimit: 10` |
| **SSL** | Auto-detected: disabled for localhost, enabled for remote hosts |

**Connection Setup Flow:**

```mermaid
flowchart LR
    A["DATABASE_URL"] --> B["Parse with new URL()"]
    B --> C["Extract host, port, user, password, database"]
    C --> D{"Is localhost?"}
    D -- Yes --> E["SSL: false"]
    D -- No --> F["SSL: true"]
    E --> G["Create PrismaMariaDb Adapter"]
    F --> G
    G --> H["new PrismaClient({ adapter })"]
    H --> I["Store in globalThis.prismaGlobal"]
```

---

#### 📁 `prisma/schema.prisma` — Database Schema

| Property | Value |
|---|---|
| **Lines** | 50 |
| **Provider** | `mysql` |
| **Models** | 3: `doctor`, `appointment`, `schedule` |
| **Generator** | `prisma-client-js` |

---

#### 📁 `prisma/seed.ts` — Database Seeder

| Property | Value |
|---|---|
| **Lines** | 396 |
| **Doctors Seeded** | 25 |
| **Specialties Covered** | 18 unique fields |
| **Cleanup** | Deletes all schedules + doctors before re-seeding |

---

#### 📁 `app/globals.css` — Global Styles

| Property | Value |
|---|---|
| **Lines** | 27 |
| **Framework** | Tailwind CSS 4 (`@import "tailwindcss"`) |
| **Theme** | Inline theme with `--background`, `--foreground`, `--font-sans`, `--font-mono` |
| **Dark Mode** | `prefers-color-scheme: dark` media query |

---

## 4. Full Project Architecture

```
ai-voice-agent-hospital/
│
├── 📄 .env                              # Environment variables (DB URL, Vapi keys)
├── 📄 .gitignore                        # Git ignore rules
├── 📄 AGENTS.md                         # Next.js agent rules (breaking changes warning)
├── 📄 CLAUDE.md                         # AI assistant config
├── 📄 README.md                         # Project readme
├── 📄 VAPI_ASSISTANT_CONFIG_GUIDE.md    # Guide for updating Vapi config via API
├── 📄 description.md                    # Detailed project description
│
├── 📄 package.json                      # Dependencies & scripts
├── 📄 package-lock.json                 # Lockfile
├── 📄 tsconfig.json                     # TypeScript config
├── 📄 next.config.ts                    # Next.js config (allowed dev origins)
├── 📄 next-env.d.ts                     # Next.js type declarations
├── 📄 eslint.config.mjs                 # ESLint configuration
├── 📄 postcss.config.mjs                # PostCSS (Tailwind CSS)
├── 📄 prisma.config.ts                  # Prisma config (datasource, migrations)
│
├── 📁 app/                              # ─── Next.js App Router ───
│   ├── 📄 layout.tsx                    # Root layout (fonts, HTML shell)
│   ├── 📄 page.tsx                      # Server Component (data fetching entry)
│   ├── 📄 SchedulingClient.tsx          # Client Component (full dashboard UI)
│   ├── 📄 globals.css                   # Global styles + Tailwind import
│   ├── 📄 favicon.ico                   # Favicon
│   │
│   └── 📁 api/                          # ─── API Routes ───
│       ├── 📁 appointments/
│       │   ├── 📄 route.ts              # GET (list all) + POST (create)
│       │   └── 📁 [id]/
│       │       └── 📄 route.ts          # DELETE (cancel) + PATCH (update)
│       │
│       └── 📁 vapi/
│           └── 📁 webhook/
│               └── 📄 route.ts          # POST (Vapi voice tool-call handler)
│
├── 📁 lib/                              # ─── Shared Libraries ───
│   └── 📄 prisma.ts                     # Prisma client singleton
│
├── 📁 prisma/                           # ─── Database ───
│   ├── 📄 schema.prisma                 # Schema definition (3 models)
│   ├── 📄 seed.ts                       # Seeds 25 doctors with schedules
│   ├── 📄 dev.db                        # Local dev database file (SQLite fallback)
│   └── 📁 migrations/
│       ├── 📁 20260607055258_init_mysql/       # Initial schema migration
│       ├── 📁 20260607061647_add_appointments/ # Added appointments table
│       └── 📄 migration_lock.toml              # Migration lock
│
├── 📁 public/                           # ─── Static Assets ───
│   ├── 📄 file.svg
│   ├── 📄 globe.svg
│   ├── 📄 next.svg
│   ├── 📄 vercel.svg
│   └── 📄 window.svg
│
├── 📁 node_modules/                     # Dependencies
└── 📁 .next/                            # Next.js build output
```

**File Count Summary:**

| Category | Files | Total Lines |
|---|---|---|
| Server Components | 2 (`layout.tsx`, `page.tsx`) | 79 |
| Client Components | 1 (`SchedulingClient.tsx`) | 576 |
| API Routes | 3 (`route.ts` × 3) | 564 |
| Library | 1 (`prisma.ts`) | 45 |
| Database | 2 (`schema.prisma`, `seed.ts`) | 446 |
| Config | 5 (`next.config`, `tsconfig`, `prisma.config`, `eslint`, `postcss`) | ~50 |
| Styles | 1 (`globals.css`) | 27 |
| **Total Source** | **15** | **~1,787** |

---

## 5. Database Deep Dive

### 5.1 Entity-Relationship Diagram

```mermaid
erDiagram
    DOCTOR {
        String id PK "CUID"
        String name
        String field "Specialty"
        String medicalStudy
        String researchBackground
        String email UK "Nullable, Unique"
        String phone "Nullable"
        Int experienceYears "Nullable"
        String bio "Nullable"
        Boolean isActive "Default: true"
        DateTime createdAt "Auto"
        DateTime updatedAt "Auto"
    }

    SCHEDULE {
        String id PK "CUID"
        String doctorId FK
        String day "e.g. Monday"
        String timeSlots "Comma-separated ranges"
        DateTime createdAt "Auto"
        DateTime updatedAt "Auto"
    }

    APPOINTMENT {
        String id PK "CUID"
        String doctorId FK
        String patientName
        String day "e.g. Monday"
        String timeSlot "Single time range"
        DateTime createdAt "Auto"
        DateTime updatedAt "Auto"
    }

    DOCTOR ||--o{ SCHEDULE : "has"
    DOCTOR ||--o{ APPOINTMENT : "receives"
```

### 5.2 Field Analysis

#### `doctor` Model — 12 Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `String` | PK | CUID auto-generated |
| `name` | `String` | Required | Full name with "Dr." prefix |
| `field` | `String` | Required | Medical specialty |
| `medicalStudy` | `String` | Required | Education background |
| `researchBackground` | `String` | Required | Research summary |
| `email` | `String?` | Unique | Nullable, unique constraint |
| `phone` | `String?` | — | Nullable |
| `experienceYears` | `Int?` | — | Nullable |
| `bio` | `String?` | — | Nullable |
| `isActive` | `Boolean` | Default: `true` | Soft-delete flag |
| `createdAt` | `DateTime` | Auto `now()` | |
| `updatedAt` | `DateTime` | Auto-updated | |

#### `schedule` Model — 6 Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `String` | PK | CUID |
| `doctorId` | `String` | FK → `doctor.id` | Cascade delete |
| `day` | `String` | Required | Day of week name |
| `timeSlots` | `String` | Required | Comma-separated time ranges |
| `createdAt` | `DateTime` | Auto | |
| `updatedAt` | `DateTime` | Auto | |

#### `appointment` Model — 7 Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `String` | PK | CUID |
| `doctorId` | `String` | FK → `doctor.id` | Cascade delete |
| `patientName` | `String` | Required | Free-text patient name |
| `day` | `String` | Required | Day of week |
| `timeSlot` | `String` | Required | Single time range |
| `createdAt` | `DateTime` | Auto | |
| `updatedAt` | `DateTime` | Auto | |

### 5.3 Database Indexes

| Table | Index | Columns | Purpose |
|---|---|---|---|
| `doctor` | Primary | `id` | Row identification |
| `doctor` | Unique | `email` (`Doctor_email_key`) | Prevent duplicate emails |
| `schedule` | Primary | `id` | Row identification |
| `schedule` | Index | `doctorId` (`Schedule_doctorId_fkey`) | FK lookup performance |
| `appointment` | Primary | `id` | Row identification |
| `appointment` | Index | `doctorId` (`Appointment_doctorId_fkey`) | FK lookup performance |

### 5.4 Cascade Behavior

```mermaid
graph LR
    DEL_DOC["DELETE doctor"] --> DEL_SCHED["CASCADE → DELETE all schedules"]
    DEL_DOC --> DEL_APT["CASCADE → DELETE all appointments"]

    style DEL_DOC fill:#e94560,color:#fff
    style DEL_SCHED fill:#f97316,color:#fff
    style DEL_APT fill:#f97316,color:#fff
```

> [!WARNING]
> Deleting a doctor cascades to **all** their schedules and appointments. There is no soft-delete mechanism for appointments or schedules — only the `doctor.isActive` flag exists for soft-delete.

### 5.5 Seed Data Statistics

| Metric | Value |
|---|---|
| Total Doctors | 25 |
| Unique Specialties | 18 |
| Schedules per Doctor | 2-3 |
| Total Schedule Records | ~58 |
| Time Slot Format | `"H:MM AM - H:MM PM"` (comma-separated for multiple) |

**Specialty Distribution:**

| Specialty | Count |
|---|---|
| Cardiology | 2 |
| Pediatrics | 2 |
| Neurology | 2 |
| Dermatology | 1 |
| Orthopedics | 1 |
| Oncology | 1 |
| Psychiatry | 1 |
| Gastroenterology | 1 |
| Ophthalmology | 1 |
| Gynecology | 1 |
| Endocrinology | 1 |
| Otolaryngology (ENT) | 1 |
| Urology | 1 |
| Rheumatology | 1 |
| Pulmonology | 1 |
| Nephrology | 1 |
| Hematology | 1 |
| Infectious Disease | 1 |
| Geriatrics | 1 |
| Sports Medicine | 1 |
| Allergy & Immunology | 1 |
| Diagnostic Medicine | 1 |

### 5.6 Database Connection Architecture

```mermaid
flowchart TD
    ENV["DATABASE_URL<br/>mysql://root:***@127.0.0.1:3306/hospital"]
    ENV --> PARSE["URL Parser<br/>(new URL())"]
    PARSE --> CONFIG["Connection Config<br/>host: 127.0.0.1<br/>port: 3306<br/>user: root<br/>database: hospital<br/>connectionLimit: 10<br/>ssl: false"]
    CONFIG --> ADAPTER["PrismaMariaDb Adapter"]
    ADAPTER --> CLIENT["PrismaClient"]
    CLIENT --> GLOBAL["globalThis.prismaGlobal<br/>(dev singleton)"]

    subgraph Queries["Runtime Queries"]
        Q1["doctor.findMany()"]
        Q2["appointment.create()"]
        Q3["appointment.delete()"]
        Q4["appointment.update()"]
        Q5["doctor.findFirst()"]
    end

    GLOBAL --> Queries
    Queries --> DB[("MySQL / MariaDB<br/>Database: hospital")]

    style ENV fill:#f59e0b,color:#000
    style DB fill:#16213e,color:#e0e0e0
```

### 5.7 Migration History

| Migration | Date | Description |
|---|---|---|
| `20260607055258_init_mysql` | June 7, 2026 | Initial schema: `doctor` + `schedule` tables |
| `20260607061647_add_appointments` | June 7, 2026 | Added `appointment` table with FK to `doctor` |

---

## 6. API Endpoint Reference

### 6.1 REST API Endpoints

| Method | Endpoint | Handler File | Purpose | Auth |
|---|---|---|---|---|
| `GET` | `/api/appointments` | [route.ts](file:///d:/02_CODE/04_TEST/ai-voice-agent-hospital/app/api/appointments/route.ts) | List all appointments | None |
| `POST` | `/api/appointments` | [route.ts](file:///d:/02_CODE/04_TEST/ai-voice-agent-hospital/app/api/appointments/route.ts) | Create appointment | None |
| `DELETE` | `/api/appointments/:id` | [route.ts](file:///d:/02_CODE/04_TEST/ai-voice-agent-hospital/app/api/appointments/%5Bid%5D/route.ts) | Cancel appointment | None |
| `PATCH` | `/api/appointments/:id` | [route.ts](file:///d:/02_CODE/04_TEST/ai-voice-agent-hospital/app/api/appointments/%5Bid%5D/route.ts) | Update appointment | None |
| `POST` | `/api/vapi/webhook` | [route.ts](file:///d:/02_CODE/04_TEST/ai-voice-agent-hospital/app/api/vapi/webhook/route.ts) | Vapi voice tool-calls | None |

### 6.2 HTTP Status Code Usage

| Status | Meaning | Used In |
|---|---|---|
| `200` | Success | GET, DELETE, PATCH, Webhook |
| `201` | Created | POST appointments |
| `400` | Bad Request | Missing fields, invalid day/slot |
| `404` | Not Found | Doctor/appointment not found |
| `409` | Conflict | Double booking |
| `500` | Server Error | Unhandled exceptions |

### 6.3 Request/Response Shapes

**POST `/api/appointments`:**

| Direction | Shape |
|---|---|
| Request | `{ doctorId: string, patientName: string, day: string, timeSlot: string }` |
| Response (201) | `{ id, doctorId, patientName, day, timeSlot, createdAt, updatedAt, doctor: {...} }` |

**PATCH `/api/appointments/:id`:**

| Direction | Shape |
|---|---|
| Request | `{ patientName?: string, doctorId?: string, day?: string, timeSlot?: string }` |
| Response (200) | Full appointment object with doctor |

**POST `/api/vapi/webhook`:**

| Direction | Shape |
|---|---|
| Request (from Vapi) | `{ message: { type: "tool-calls", toolCalls: [{ id, function: { name, arguments } }] } }` |
| Response | `{ results: [{ toolCallId: string, result: string }] }` |

---

## 7. Tech Stack & Dependencies

### 7.1 Dependency Graph

```mermaid
graph TD
    subgraph Production["Production Dependencies"]
        NEXT["next@16.2.7"]
        REACT["react@19.2.4"]
        REACT_DOM["react-dom@19.2.4"]
        PRISMA_CLIENT["@prisma/client@7.8.0"]
        PRISMA_MARIA["@prisma/adapter-mariadb@7.8.0"]
        MARIADB["mariadb@3.5.2"]
        VAPI["@vapi-ai/web@2.5.2"]
    end

    subgraph Dev["Dev Dependencies"]
        TAILWIND["tailwindcss@4"]
        TW_POSTCSS["@tailwindcss/postcss@4"]
        PRISMA_CLI["prisma@7.8.0"]
        TSX["tsx@4.22.4"]
        TS["typescript@5"]
        ESLINT["eslint@9"]
        ESLINT_NEXT["eslint-config-next@16.2.7"]
        TYPES_NODE["@types/node@20"]
        TYPES_REACT["@types/react@19"]
        TYPES_RDOM["@types/react-dom@19"]
    end

    NEXT --> REACT
    NEXT --> REACT_DOM
    PRISMA_CLIENT --> PRISMA_MARIA
    PRISMA_MARIA --> MARIADB
    PRISMA_CLI --> PRISMA_CLIENT
    TW_POSTCSS --> TAILWIND

    style Production fill:#16a34a,stroke:#16a34a,color:#fff
    style Dev fill:#6b7280,stroke:#6b7280,color:#fff
```

### 7.2 Stack Summary

| Layer | Technology | Version |
|---|---|---|
| **Runtime** | Node.js | ≥18 (implied by Next 16) |
| **Framework** | Next.js (App Router) | 16.2.7 |
| **UI Library** | React | 19.2.4 |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | 4.x |
| **ORM** | Prisma | 7.8.0 |
| **DB Driver** | MariaDB Node.js connector | 3.5.2 |
| **Database** | MySQL / MariaDB | — |
| **Voice AI** | Vapi Web SDK | 2.5.2 |
| **Fonts** | Geist Sans + Geist Mono | via `next/font/google` |
| **Tunneling** | ngrok | External tool |

---

## 8. Environment Variables

| Variable | Scope | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | Server | ✅ | MySQL/MariaDB connection string |
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | Client | ✅ | Vapi public key (initializes SDK in browser) |
| `NEXT_PUBLIC_VAPI_ASSISTANT_ID` | Client | ✅ | Pre-configured Vapi assistant ID |

> [!CAUTION]
> `NEXT_PUBLIC_` prefixed variables are **exposed to the browser**. Never put private/secret keys with this prefix. The Vapi public key is safe to expose — it can only initiate calls, not modify assistant config.

**Connection String Format:**
```
mysql://USER:PASSWORD@HOST:PORT/DATABASE
mysql://root:R35T1NP3C3@127.0.0.1:3306/hospital
```

---

## 9. Key Design Patterns & Decisions

### 9.1 Pattern Summary

| Pattern | Where Used | Why |
|---|---|---|
| **Server Component → Client Component** | `page.tsx` → `SchedulingClient.tsx` | SSR for initial data, client interactivity |
| **Global Singleton** | `lib/prisma.ts` | Prevent connection pool exhaustion during HMR |
| **Optimistic UI** | `handleCancelAppointment()` | Instant feedback; rollback on failure |
| **Fuzzy Matching** | Webhook handlers | Natural language voice input tolerance |
| **Force-Dynamic SSR** | `page.tsx` | Always-fresh data (voice agent can mutate DB) |
| **Webhook-Based Integration** | Vapi → `/api/vapi/webhook` | Server-side DB logic; Vapi calls your endpoint |
| **Comma-Separated Storage** | `schedule.timeSlots` | Simple schema; parsed at validation time |

### 9.2 Fuzzy Matching Details

The webhook handler implements three levels of time slot matching:

```mermaid
flowchart TD
    INPUT["User says: '9 AM'"] --> A{"Exact match?<br/>slot === input"}
    A -- Yes --> MATCH["✅ Use slot"]
    A -- No --> B{"Slot contains input?<br/>slot.includes(input)"}
    B -- Yes --> MATCH
    B -- No --> C{"Input contains slot?<br/>input.includes(slot)"}
    C -- Yes --> MATCH
    C -- No --> FAIL["❌ No match"]

    style MATCH fill:#16a34a,color:#fff
    style FAIL fill:#e94560,color:#fff
```

Doctor name matching also strips prefixes:
```
"Dr. Jane Smith" → "Jane Smith"
"Doctor Jane Smith" → "Jane Smith"
→ prisma.doctor.findFirst({ where: { name: { contains: "Jane Smith" } } })
```

### 9.3 Security Considerations

> [!WARNING]
> **No Authentication/Authorization**: All API endpoints are publicly accessible. There is no user login, session management, or API key validation on the REST endpoints or webhook.

| Risk | Current State | Recommendation |
|---|---|---|
| API Authentication | ❌ None | Add API key or JWT auth |
| Webhook Verification | ❌ No signature check | Verify Vapi webhook signatures |
| Rate Limiting | ❌ None | Add rate limiting middleware |
| Input Sanitization | ⚠️ Basic (Prisma parameterized) | Add explicit validation layer |
| CORS | ✅ Handled by Next.js | OK for dev; configure for prod |

---

## 10. Voice Agent Pipeline

### 10.1 Full Voice Pipeline Architecture

```mermaid
graph TB
    subgraph UserDevice["👤 User's Browser"]
        MIC["🎤 Microphone"]
        SPEAKER["🔊 Speaker"]
        VAPI_WEB["Vapi Web SDK"]
    end

    subgraph VapiPlatform["☁️ Vapi AI Platform"]
        STT["Speech-to-Text<br/>(Deepgram nova-2)"]
        LLM["LLM Processing<br/>(OpenAI GPT-4o)"]
        TTS["Text-to-Speech<br/>(ElevenLabs)"]
        TOOL_EXEC["Tool Call Dispatcher"]
    end

    subgraph YourServer["⚡ Your Next.js Server"]
        WH_ROUTE["POST /api/vapi/webhook"]
        HANDLERS["Tool Handlers<br/>(book/cancel/update/search)"]
        PRISMA["Prisma ORM"]
    end

    subgraph DB["🗄️ Database"]
        MYSQL["MySQL / MariaDB"]
    end

    MIC -- "Audio stream" --> VAPI_WEB
    VAPI_WEB -- "WebSocket" --> STT
    STT -- "Transcript text" --> LLM
    LLM -- "Tool call JSON" --> TOOL_EXEC
    TOOL_EXEC -- "HTTP POST" --> WH_ROUTE
    WH_ROUTE --> HANDLERS
    HANDLERS --> PRISMA
    PRISMA --> MYSQL
    MYSQL --> PRISMA
    PRISMA --> HANDLERS
    HANDLERS --> WH_ROUTE
    WH_ROUTE -- "Result JSON" --> TOOL_EXEC
    TOOL_EXEC -- "Result text" --> LLM
    LLM -- "Response text" --> TTS
    TTS -- "Audio" --> VAPI_WEB
    VAPI_WEB --> SPEAKER

    style UserDevice fill:#1a1a2e,stroke:#533483,color:#e0e0e0
    style VapiPlatform fill:#e94560,stroke:#e94560,color:#fff
    style YourServer fill:#0f3460,stroke:#533483,color:#e0e0e0
    style DB fill:#16213e,stroke:#0f3460,color:#e0e0e0
```

### 10.2 Vapi Assistant Configuration (External)

The Vapi assistant is configured on the Vapi Dashboard with:

| Setting | Value |
|---|---|
| **LLM** | OpenAI GPT-4o |
| **Voice (TTS)** | ElevenLabs |
| **Transcriber (STT)** | Deepgram nova-2 |
| **Server URL** | `https://<ngrok-subdomain>.ngrok-free.app/api/vapi/webhook` |
| **Tools** | 4 functions: `bookAppointment`, `cancelAppointment`, `updateAppointment`, `getDoctorSchedule` |

### 10.3 Tool Definitions on Vapi

```mermaid
graph LR
    subgraph Tools["Vapi Assistant Tools"]
        T1["📅 bookAppointment<br/>Required: patientName, doctorName, day, timeSlot"]
        T2["❌ cancelAppointment<br/>Required: patientName<br/>Optional: doctorName"]
        T3["✏️ updateAppointment<br/>Required: patientName<br/>Optional: doctorName, newDoctorName, newDay, newTimeSlot"]
        T4["🔍 getDoctorSchedule<br/>Optional: searchQuery, searchType"]
    end

    style Tools fill:#533483,color:#fff
```

---

> [!NOTE]
> **ngrok Dependency**: The voice agent requires a publicly accessible URL for Vapi to send webhook requests. The `next.config.ts` has `allowedDevOrigins` configured with a specific ngrok subdomain (`deranged-rekindle-venue.ngrok-free.dev`). Every time ngrok restarts with a new URL, the Vapi assistant's `serverUrl` must be updated — see [VAPI_ASSISTANT_CONFIG_GUIDE.md](file:///d:/02_CODE/04_TEST/ai-voice-agent-hospital/VAPI_ASSISTANT_CONFIG_GUIDE.md) for instructions.
