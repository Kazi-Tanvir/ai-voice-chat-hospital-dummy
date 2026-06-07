# Migrating from Local MySQL to TiDB Cloud Serverless

This guide walks you through migrating the **CareConnect Hospital** database from your local MySQL server to **TiDB Cloud Serverless** (free tier), so the app can be deployed to Vercel/Netlify without needing ngrok.

---

## Prerequisites

- A [TiDB Cloud](https://tidbcloud.com) account (free)
- Node.js 18+ installed
- Your project dependencies already installed (`npm install`)

---

## Step 1: Create a TiDB Cloud Serverless Cluster

1. Go to [https://tidbcloud.com](https://tidbcloud.com) and sign up / sign in.
2. Click **"Create Cluster"** on the dashboard.
3. Select **Serverless** (free tier — 5 GiB storage, 50 million Request Units/month).
4. Choose your preferred **Region** (pick one closest to your deployment — e.g., `us-east-1` for Vercel US).
5. Give your cluster a name (e.g., `hospital-db`).
6. Click **Create** and wait ~30 seconds for it to provision.

---

## Step 2: Get Your Connection String

1. Once the cluster is ready, click **"Connect"** on the cluster overview page.
2. In the connection dialog:
   - **Connect With**: Select **General**
   - **Framework**: Select **Prisma** (this gives you the exact format)
   - **Password**: Click **"Generate Password"** and **save it somewhere safe** — you can only see it once.
3. Copy the connection string. It will look like this:

```
mysql://USERNAME.root:PASSWORD@gateway01.region.prod.mysql.tidbcloud.com:4000/hospital?sslaccept=strict
```

> [!IMPORTANT]
> Save the password immediately — TiDB Cloud only shows it once during generation.

---

## Step 3: Update `.env`

Replace your local `DATABASE_URL` with the TiDB Cloud connection string:

```diff
- DATABASE_URL="mysql://root:R35T1NP3C3@localhost:3306/hospital"
+ DATABASE_URL="mysql://USERNAME.root:PASSWORD@gateway01.region.prod.mysql.tidbcloud.com:4000/hospital?sslaccept=strict"
```

Replace `USERNAME`, `PASSWORD`, and the gateway host with your actual values from Step 2.

---

## Step 4: Update `lib/prisma.ts` for TiDB Cloud SSL

TiDB Cloud requires **SSL** connections. Update the `PrismaMariaDb` adapter options in `lib/prisma.ts`:

```diff
  const adapter = new PrismaMariaDb({
    host,
    port,
    user,
    password,
    database,
    connectionLimit: 10,
    allowPublicKeyRetrieval: true,
+   ssl: true,
  });
```

The full updated file should look like:

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not defined');
  }

  const url = new URL(connectionString);
  const host = url.hostname || 'localhost';
  const port = url.port ? parseInt(url.port) : 4000;  // TiDB uses port 4000
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
    allowPublicKeyRetrieval: true,
    ssl: true,
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

---

## Step 5: Push Schema to TiDB Cloud

Since TiDB is MySQL-compatible, Prisma migrations work out of the box.

### Option A: Push Schema Directly (Recommended for Fresh Setup)

This is the fastest way — it creates all tables without a migration history:

```bash
npx prisma db push
```

### Option B: Run Full Migrations (If You Want Migration History)

```bash
npx prisma migrate dev --name migrate_to_tidb
```

> [!NOTE]
> If you get a migration error about "shadow database", use `npx prisma db push` instead — TiDB Serverless doesn't support shadow databases on the free tier.

---

## Step 6: Regenerate the Prisma Client

```bash
npx prisma generate
```

---

## Step 7: Seed the Database

Populate TiDB Cloud with the 25 doctors and their schedules:

```bash
npx prisma db seed
```

You should see:

```
Start seeding...
Seeding finished. Created 25 doctor records.
```

---

## Step 8: Verify the Connection

Run a quick test to make sure everything is connected:

```bash
npx tsx -r dotenv/config -e "import prisma from './lib/prisma'; const client = (prisma as any).default || prisma; client.doctor.count().then(console.log).catch(console.error)"
```

Expected output: `25`

---

## Step 9: Test Locally

Start your dev server and confirm the app loads with data from TiDB Cloud:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see all 25 doctors and their schedules loading from the cloud database.

---

## Step 10: Deploy to Vercel (Recommended)

Now that your database is in the cloud, you can deploy the full app.

### 10a. Push to GitHub

```bash
git add .
git commit -m "migrate to TiDB Cloud"
git push origin main
```

### 10b. Deploy on Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **"Import Project"** → select your `ai-voice-agent-hospital` repo.
3. In the **Environment Variables** section, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your TiDB Cloud connection string |
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | `dba428d4-6802-4064-9381-3dafe0829f65` |
| `NEXT_PUBLIC_VAPI_ASSISTANT_ID` | `15deb84c-a60e-470a-ab5a-82ddd1361022` |

4. Click **Deploy**.

### 10c. Update Vapi Assistant Server URL

After Vercel assigns you a domain (e.g., `your-app.vercel.app`), update the Vapi assistant's webhook:

```bash
# Replace YOUR_VERCEL_DOMAIN with your actual Vercel URL
curl -X PATCH "https://api.vapi.ai/assistant/15deb84c-a60e-470a-ab5a-82ddd1361022" \
  -H "Authorization: Bearer YOUR_VAPI_PRIVATE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"serverUrl": "https://YOUR_VERCEL_DOMAIN/api/vapi/webhook"}'
```

Or go to the Vapi Dashboard → Assistants → your assistant → update the **Server URL** field.

---

## Troubleshooting

### "Connection refused" or "ETIMEDOUT"
- Double-check the `DATABASE_URL` — TiDB Cloud uses port **4000**, not 3306.
- Make sure `ssl: true` is set in the adapter config.

### "Access denied"
- Verify the username format is `USERNAME.root` (with the prefix).
- Make sure the password is URL-encoded if it contains special characters.

### "Shadow database error" during migrations
- Use `npx prisma db push` instead of `npx prisma migrate dev`.
- TiDB Serverless free tier doesn't support creating shadow databases.

### "Unknown column" or schema mismatch
- Run `npx prisma db push --force-reset` to drop and recreate all tables.
- Then re-seed with `npx prisma db seed`.

---

## Quick Reference: Before vs After

| Setting | Before (Local) | After (TiDB Cloud) |
|---|---|---|
| **Host** | `localhost` | `gateway01.region.prod.mysql.tidbcloud.com` |
| **Port** | `3306` | `4000` |
| **SSL** | Not required | **Required** (`ssl: true`) |
| **Webhook URL** | `https://xxx.ngrok-free.dev/api/vapi/webhook` | `https://your-app.vercel.app/api/vapi/webhook` |
| **ngrok needed?** | Yes | **No** |
