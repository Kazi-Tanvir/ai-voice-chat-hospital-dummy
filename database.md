# Database Setup & Scratch Rebuild Guide

This guide explains how the hospital database is configured using **Prisma 7** and **MySQL**, and provides step-by-step instructions to rebuild the entire database from scratch.

---

## 1. Overview of the Setup

* **Database Engine:** MySQL / MariaDB (running locally on port `3306`).
* **ORM:** Prisma (v7.x) which uses an ESM-first architecture and driver adapters.
* **Driver Adapter:** `@prisma/adapter-mariadb` + `mariadb` (npm client).
* **Environment Loader:** `dotenv/config` (loaded in `prisma.config.ts` and runtime scripts).
* **Seeding Executor:** `tsx` (TypeScript Execute) to parse and run TS seed files directly.

---

## 2. Prerequisites

1. **Node.js** (v18+) installed.
2. **MySQL Server** active and listening on port `3306`.
3. An existing empty database (default is named `hospital`). If it does not exist, Prisma will prompt you to create it during migration.

---

## 3. Rebuilding the Database From Scratch (Step-by-Step)

If you are setting this up on a new environment or want to reset/rebuild everything, follow these steps:

### Step 1: Install the Required Packages
Install the runtime driver adapter, client, CLI, and TypeScript script runner:
```bash
# Install runtime client and database drivers
npm install @prisma/client @prisma/adapter-mariadb mariadb

# Install development dependencies
npm install --save-dev prisma tsx dotenv
```

### Step 2: Configure Environment Variables
Create a file named `.env` in the root of the project and add your database connection string:
```env
DATABASE_URL="mysql://YOUR_USER:YOUR_PASSWORD@localhost:3306/hospital"
```
*(Replace `YOUR_USER` and `YOUR_PASSWORD` with your actual MySQL credentials).*

### Step 3: Define the Database Schema
Create `prisma/schema.prisma` containing the database models. Note that in **Prisma 7**, database URLs are no longer allowed inside the `datasource` block:
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
}

model Doctor {
  id                 String     @id @default(cuid())
  name               String
  field              String     // Specialty (e.g. Cardiology)
  medicalStudy       String     // Credentials/Education
  researchBackground String     // Research details
  email              String?    @unique
  phone              String?
  experienceYears    Int?
  bio                String?
  isActive           Boolean    @default(true)
  schedules          Schedule[]
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt
}

model Schedule {
  id        String   @id @default(cuid())
  doctorId  String
  doctor    Doctor   @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  day       String   // e.g., "Saturday", "Wednesday"
  timeSlots String   // e.g., "8:30 AM - 11:20 AM"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Step 4: Configure Prisma CLI Configuration
Create `prisma.config.ts` in the root of the project to tell the Prisma CLI where to load the `.env` database URL, migrations, and seed script:
```typescript
// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

### Step 5: Setup the Database Client Helper
Create the file `lib/prisma.ts`. This initializes the runtime Prisma client using the MariaDB driver adapter, parsing the parameters dynamically from `DATABASE_URL`:
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not defined');
  }

  // Parse credentials and host info from DATABASE_URL using the native URL parser
  const url = new URL(connectionString);
  const host = url.hostname || 'localhost';
  const port = url.port ? parseInt(url.port) : 3306;
  const user = url.username || 'root';
  const password = url.password ? decodeURIComponent(url.password) : undefined;
  const database = url.pathname ? url.pathname.replace(/^\//, '') : undefined;

  const adapter = new PrismaMariaDb({
    host,
    port,
    user,
    password,
    database,
    connectionLimit: 10,
  });
  
  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}
```

### Step 6: Create the Seeding Script
Create `prisma/seed.ts` to populate the database with mock data. Refer to [seed.ts](file:///d:/02_CODE/04_TEST/ai-voice-agent-hospital/prisma/seed.ts) to see the full list of 25 doctors and schedules. The main entry function looks like:
```typescript
// prisma/seed.ts
import prisma from '../lib/prisma';

const doctorsData = [ /* Array of 25 doctor objects */ ];

async function main() {
  console.log('Start seeding...');
  await prisma.schedule.deleteMany();
  await prisma.doctor.deleteMany();

  for (const doc of doctorsData) {
    await prisma.doctor.create({
      data: {
        name: doc.name,
        field: doc.field,
        medicalStudy: doc.medicalStudy,
        researchBackground: doc.researchBackground,
        email: doc.email,
        phone: doc.phone,
        experienceYears: doc.experienceYears,
        bio: doc.bio,
        schedules: {
          create: doc.schedules,
        },
      },
    });
  }
  console.log('Seeding finished.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

### Step 7: Apply Migrations & Seed
Run these terminal commands to initialize the schema and populate the database:
```bash
# 1. Create and apply the MySQL database migration (and create the schema tables)
npx prisma migrate dev --name init_mysql

# 2. Regenerate the Prisma Client typescript types
npx prisma generate

# 3. Seed the database with the doctor records
npx prisma db seed
```

---

## 4. Useful CLI Commands Reference

* **Run Migrations (Apply Schema changes):**
  ```bash
  npx prisma migrate dev
  ```
* **Seed Database:**
  ```bash
  npx prisma db seed
  ```
* **Open Prisma Studio (Visual DB Editor):**
  *(Note: Prisma Studio is a separate web UI to browse tables).*
  ```bash
  npx prisma studio
  ```
* **Verify Count via Shell:**
  ```bash
  npx tsx -r dotenv/config -e "import prisma from './lib/prisma'; const client = (prisma as any).default || prisma; client.doctor.count().then(console.log)"
  ```
