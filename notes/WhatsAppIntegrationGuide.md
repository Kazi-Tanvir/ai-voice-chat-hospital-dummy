# WhatsApp Voice Calling via Vapi + Twilio — Step-by-Step Integration Guide

> **Goal**: Replace direct phone calls (PSTN) with **WhatsApp voice calls** for VoxAgent, so patients call your AI agent *inside WhatsApp* instead of dialing a regular phone number. The AI pipeline (STT → LLM → TTS) is powered by **Vapi**, and the telephony/WhatsApp bridge is handled by **Twilio**.

---

## 📌 Why This Approach?

| Benefit | Details |
|---------|---------|
| **No BD number needed** | Twilio can't sell local BD phone numbers, but WhatsApp works globally with any number |
| **Patients already use WhatsApp** | ~95%+ smartphone users in Bangladesh have WhatsApp installed |
| **Free inbound calls** | When a patient calls YOU on WhatsApp, Meta does NOT charge per-minute (only Twilio + Vapi costs) |
| **Verified business badge** | Patients see your hospital name + green checkmark = trust |
| **Dual channel** | Same Vapi assistant handles both WhatsApp voice AND WhatsApp text (Chat API) |

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        WHATSAPP VOICE CALL FLOW                             │
│                                                                              │
│  📱 Patient (WhatsApp)                                                       │
│      │                                                                       │
│      │ 1. Opens WhatsApp chat with your business                            │
│      │ 2. Taps "Call" button (or CTA in message)                            │
│      ▼                                                                       │
│  ┌─────────────────┐                                                        │
│  │  META / WHATSAPP │  ← WhatsApp Business Platform (Cloud API)             │
│  │  (Cloud API)     │                                                        │
│  └────────┬────────┘                                                        │
│           │ 3. Voice call event sent to Twilio                              │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │     TWILIO       │  ← Programmable Voice + WhatsApp Business Calling     │
│  │  (Voice + WA)    │                                                        │
│  │                  │  4. TwiML routes call → <Stream> to Vapi              │
│  └────────┬────────┘                                                        │
│           │ 5. Audio streamed via WebSocket / SIP                           │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │      VAPI        │  ← Voice AI Orchestration                             │
│  │  (AI Pipeline)   │                                                        │
│  │                  │  6. Deepgram STT → GPT-4o → Azure TTS                 │
│  └────────┬────────┘                                                        │
│           │ 7. AI audio response returns                                    │
│           ▼                                                                  │
│  📱 Patient hears AI response in WhatsApp call                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites Checklist

Before you start, make sure you have ALL of these ready:

- [ ] **Meta Business Account** — verified at [business.facebook.com](https://business.facebook.com)
- [ ] **WhatsApp Business Account (WABA)** — created inside Meta Business Manager
- [ ] **Twilio Account** — active, billing enabled at [twilio.com](https://twilio.com)
- [ ] **Vapi Account** — created at [vapi.ai](https://vapi.ai)
- [ ] **A phone number** — can be any number (doesn't need to be BD local) that you'll register as your WhatsApp Business number via Twilio
- [ ] **Daily messaging limit ≥ 2,000** — Meta requires this threshold before enabling calling features
- [ ] **Server/Backend** — a publicly accessible server (or ngrok for dev) to host your webhook endpoints

> [!CAUTION]
> **The 2,000 daily messaging limit is a HARD requirement.** You cannot activate WhatsApp Calling until your business has scaled messaging to this level. Plan to send template messages (appointment confirmations, reminders, etc.) to build up this limit first. This may take 1-4 weeks.

---

## 🚀 Step-by-Step Integration

### PHASE 1: Set Up Meta Business & WhatsApp Business Account

> **Time estimate**: 3-7 days (mostly waiting for Meta verification)

#### Step 1.1 — Create Meta Business Account

1. Go to [business.facebook.com](https://business.facebook.com)
2. Click **"Create Account"**
3. Enter your business details:
   - Business name (e.g., "VoxAgent Healthcare Solutions")
   - Your name and business email
   - Business address (use your registered BD address)
4. **Verify your business** — Meta will ask for:
   - Business registration documents
   - Domain verification (add a DNS TXT record or HTML file to your domain)
   - This takes **1-5 business days**

#### Step 1.2 — Create WhatsApp Business Account (WABA)

1. Inside Meta Business Manager → **Business Settings** → **Accounts** → **WhatsApp Accounts**
2. Click **"Add"** → **"Create a WhatsApp account"**
3. Fill in:
   - Account name: "VoxAgent" or your hospital's name
   - Category: "Healthcare/Medical"
   - Business description
4. Select **Twilio** as your BSP (Business Solution Provider) when prompted later

#### Step 1.3 — Register Your Phone Number

1. Choose a phone number to register as your WhatsApp Business number
   - This can be a new number bought from Twilio, OR
   - An existing number (it will be disconnected from personal WhatsApp)
2. Verify the number via SMS or voice OTP
3. Set your business profile:
   - Profile photo (hospital logo)
   - Business description in Bengali + English
   - Business address
   - Website URL

> [!IMPORTANT]
> **Tip for Bangladesh**: If you want a +880 number, you can buy one from Twilio's supported countries list or use a local BSP. Alternatively, use any international number — patients can still reach you via WhatsApp regardless of the country code.

---

### PHASE 2: Set Up Twilio for WhatsApp Business Calling

> **Time estimate**: 1-2 days

#### Step 2.1 — Connect WhatsApp Sender to Twilio

1. Log in to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging** → **Senders** → **WhatsApp Senders**
3. Click **"Add WhatsApp Sender"**
4. Follow the wizard to connect your WABA:
   - Authorize Twilio to access your Meta WhatsApp Business Account
   - Select the phone number you registered in Step 1.3
   - Twilio will provision this as a "WhatsApp Sender"
5. Wait for activation (usually within hours)

#### Step 2.2 — Enable Voice on Your WhatsApp Sender

1. In Twilio Console → **Messaging** → **Senders** → click your WhatsApp Sender
2. Look for the **"Voice Configuration"** section
3. Toggle **"Enable Voice"** to ON
4. You'll need to assign a **TwiML Application** (we'll create this next)

#### Step 2.3 — Create a TwiML Application

This is the "brain" that tells Twilio what to do when a WhatsApp call comes in.

1. Go to **Voice** → **Manage** → **TwiML Apps** in Twilio Console
2. Click **"Create new TwiML App"**
3. Fill in:
   - **Friendly Name**: `VoxAgent WhatsApp Voice Handler`
   - **Voice Request URL**: `https://your-server.com/twilio/whatsapp-voice` (your webhook — we'll build this)
   - **HTTP Method**: POST
4. Click **"Create"**
5. **Copy the TwiML App SID** (starts with `AP...`) — you'll need this

#### Step 2.4 — Assign TwiML App to WhatsApp Sender

1. Go back to your WhatsApp Sender configuration
2. In **Voice Configuration**, select the TwiML App you just created
3. Save changes

Now when a patient calls your WhatsApp number, Twilio will hit your webhook URL.

---

### PHASE 3: Set Up Vapi AI Assistant

> **Time estimate**: 1-2 hours

#### Step 3.1 — Create Vapi Account & Get API Key

1. Go to [vapi.ai](https://vapi.ai) and sign up
2. Navigate to **Dashboard** → **Settings** → **API Keys**
3. Copy your **Private API Key** — you'll need this for all API calls

#### Step 3.2 — Create Your Voice Assistant

You can do this via the Vapi Dashboard UI or via API. Here's the API method:

```bash
curl -X POST "https://api.vapi.ai/assistant" \
  -H "Authorization: Bearer YOUR_VAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "VoxAgent Hospital Assistant",
    "model": {
      "provider": "openai",
      "model": "gpt-4o",
      "systemPrompt": "আপনি একজন হাসপাতালের রিসেপশনিস্ট AI। আপনার নাম VoxAgent। আপনি বাংলায় কথা বলেন। রোগীদের অ্যাপয়েন্টমেন্ট বুকিং, আপডেট এবং বাতিল করতে সাহায্য করেন। সবসময় বিনয়ী এবং পেশাদার থাকুন। চিকিৎসা পরামর্শ দেবেন না। (You are a hospital receptionist AI named VoxAgent. You speak Bengali. You help patients book, update, and cancel appointments. Always be polite and professional. Never give medical advice.)"
    },
    "voice": {
      "provider": "azure",
      "voiceId": "bn-BD-NabanitaNeural"
    },
    "transcriber": {
      "provider": "deepgram",
      "language": "bn"
    },
    "firstMessage": "আসসালামু আলাইকুম! VoxAgent-এ স্বাগতম। আমি আপনাকে কীভাবে সাহায্য করতে পারি? (Welcome to VoxAgent. How can I help you?)"
  }'
```

**Save the returned `assistant_id`** — you'll need this to route calls.

#### Step 3.3 — Configure Vapi for Twilio Integration

**Option A: Import Twilio Number into Vapi (Simplest)**

1. In Vapi Dashboard → **Phone Numbers** → **Import**
2. Enter:
   - Phone number (your WhatsApp number in E.164 format, e.g., `+8801XXXXXXXXX`)
   - Twilio Account SID
   - Twilio Auth Token
3. Click **Import**
4. Assign your VoxAgent assistant to this number

**Option B: Use Twilio SIP Trunk with Vapi (More Control)**

1. In Twilio Console → **Elastic SIP Trunking** → **Create SIP Trunk**
2. Name it: `VoxAgent-Vapi-Bridge`
3. Under **Termination** → **Termination URI**: Note the URI Twilio gives you
4. Under **Origination** → Add Vapi's SIP URI:
   - `sip:YOUR_ASSISTANT_ID@sip.vapi.ai`
5. In Vapi, create BYO SIP Trunk credential:

```bash
curl -X POST "https://api.vapi.ai/credential" \
  -H "Authorization: Bearer YOUR_VAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "byo-sip-trunk",
    "name": "Twilio WhatsApp Bridge",
    "sipTrunkAuthenticationPlan": {
      "type": "credential",
      "username": "YOUR_TWILIO_SIP_USERNAME",
      "password": "YOUR_TWILIO_SIP_PASSWORD"
    },
    "gateways": [
      {
        "ip": "YOUR_TWILIO_TERMINATION_URI_IP",
        "port": 5060
      }
    ]
  }'
```

> [!TIP]
> **For MVP, use Option A** (Import). It's simpler and Vapi handles the SIP plumbing automatically. Use Option B when you need advanced call routing or multi-tenant setups.

---

### PHASE 4: Build the Webhook Server (The Bridge)

> **Time estimate**: 2-4 hours

This is the server that sits between Twilio and Vapi, handling the routing logic.

#### Step 4.1 — Create Your Server

Create a FastAPI (Python) server with the following endpoints:

```python
# server.py — VoxAgent WhatsApp Voice Bridge

from fastapi import FastAPI, Request, Response
from fastapi.responses import PlainTextResponse
import httpx
import os

app = FastAPI()

VAPI_API_KEY = os.getenv("VAPI_API_KEY")
VAPI_ASSISTANT_ID = os.getenv("VAPI_ASSISTANT_ID")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")


@app.post("/twilio/whatsapp-voice")
async def handle_whatsapp_voice(request: Request):
    """
    Twilio hits this webhook when a WhatsApp voice call comes in.
    We respond with TwiML that bridges the call to Vapi.
    """
    form_data = await request.form()
    
    caller = form_data.get("From", "")       # e.g., "whatsapp:+8801XXXXXXXXX"
    called = form_data.get("To", "")         # e.g., "whatsapp:+1234567890"
    call_sid = form_data.get("CallSid", "")
    
    print(f"📱 Incoming WhatsApp call: {caller} → {called} (SID: {call_sid})")
    
    # Option 1: Use <Stream> to stream audio to Vapi via WebSocket
    # This is the most flexible approach
    twiml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="bn-BD">
        আসসালামু আলাইকুম। অনুগ্রহ করে অপেক্ষা করুন, আমি আপনাকে সংযুক্ত করছি।
    </Say>
    <Connect>
        <Stream url="wss://api.vapi.ai/ws?assistant_id={VAPI_ASSISTANT_ID}&amp;apiKey={VAPI_API_KEY}" />
    </Connect>
</Response>"""

    return PlainTextResponse(content=twiml_response, media_type="text/xml")


@app.post("/twilio/whatsapp-voice-status")
async def handle_call_status(request: Request):
    """
    Twilio sends call status updates here (ringing, in-progress, completed).
    Use this for logging and analytics.
    """
    form_data = await request.form()
    
    call_sid = form_data.get("CallSid", "")
    call_status = form_data.get("CallStatus", "")
    duration = form_data.get("CallDuration", "0")
    
    print(f"📞 Call {call_sid}: {call_status} (duration: {duration}s)")
    
    # TODO: Log to your database for analytics
    # await log_call_to_db(call_sid, call_status, duration)
    
    return PlainTextResponse("OK")


@app.post("/twilio/whatsapp-voice-fallback")
async def handle_fallback(request: Request):
    """
    If the primary webhook fails, Twilio hits this fallback.
    Gives the patient a graceful error message.
    """
    twiml_response = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="bn-BD">
        দুঃখিত, আমাদের সিস্টেমে সাময়িক সমস্যা হচ্ছে। অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন।
    </Say>
    <Hangup/>
</Response>"""

    return PlainTextResponse(content=twiml_response, media_type="text/xml")


# --- OUTBOUND CALLING (Brand-initiated) ---

@app.post("/api/call-patient")
async def initiate_outbound_call(request: Request):
    """
    Your backend calls this to initiate an outbound WhatsApp call to a patient.
    Use case: Appointment reminder call, follow-up call.
    
    IMPORTANT: Patient must have given explicit consent first.
    You must send a "call permission" template message before calling.
    """
    body = await request.json()
    patient_phone = body.get("phone")  # e.g., "+8801XXXXXXXXX"
    
    # Step 1: Send consent template via WhatsApp Messaging API
    # (Patient must accept before you can call them)
    
    # Step 2: Once consent received, initiate the call via Twilio
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Calls.json",
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            data={
                "To": f"whatsapp:{patient_phone}",
                "From": f"whatsapp:+YOUR_WA_BUSINESS_NUMBER",
                "Url": "https://your-server.com/twilio/whatsapp-voice",
                "StatusCallback": "https://your-server.com/twilio/whatsapp-voice-status",
                "StatusCallbackEvent": ["initiated", "ringing", "answered", "completed"],
            }
        )
    
    return {"status": "call_initiated", "twilio_response": response.json()}
```

#### Step 4.2 — Alternative: Use n8n (No-Code Option)

If you prefer a no-code approach for the bridge:

1. **Install n8n**: `npm install -g n8n` or use [n8n.cloud](https://n8n.cloud)
2. **Create a new workflow**:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Twilio      │     │  n8n         │     │  Vapi        │
│  Webhook     │────▶│  HTTP Node   │────▶│  API Call     │
│  (WhatsApp)  │     │  (Route)     │     │  (Assistant)  │
└──────────────┘     └──────────────┘     └──────────────┘
```

3. **Configure the Twilio Webhook node**:
   - Trigger: Incoming WhatsApp voice event
   - Response: TwiML with `<Stream>` or `<Dial>` to Vapi
4. **Add Vapi HTTP node**:
   - Method: POST to `https://api.vapi.ai/call`
   - Headers: `Authorization: Bearer YOUR_VAPI_KEY`
   - Body: Include assistant ID and call details

---

### PHASE 5: Set Up Call-to-Action (CTA) for Patients

> **Time estimate**: 1-2 hours

Patients need a way to start calls. There are 3 methods:

#### Method 1 — Call Button in WhatsApp Message (Recommended)

Create a WhatsApp Content Template with a call CTA button:

1. In Twilio Console → **Messaging** → **Content Template Builder**
2. Create a new template:
   - **Name**: `voxagent_call_cta`
   - **Language**: Bengali (`bn`)
   - **Category**: Utility
   - **Body**: `আপনার অ্যাপয়েন্টমেন্ট সংক্রান্ত সহায়তার জন্য কল করুন। (Call for appointment assistance.)`
   - **Button**: Call-to-Action → **Phone Call** → Your WhatsApp business number
3. Submit for Meta approval (takes 24-48 hours)

Then send this template to patients via the Messaging API:

```python
# Send CTA message to patient
async def send_call_cta(patient_phone: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json",
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            data={
                "To": f"whatsapp:{patient_phone}",
                "From": f"whatsapp:+YOUR_WA_BUSINESS_NUMBER",
                "ContentSid": "YOUR_CONTENT_TEMPLATE_SID",
            }
        )
    return response.json()
```

#### Method 2 — wa.me Link on Hospital Website

Add a link on your hospital's website or social media:

```html
<!-- Patients click this to open WhatsApp and can then call -->
<a href="https://wa.me/YOUR_NUMBER?text=I%20want%20to%20book%20an%20appointment">
    📱 Chat with VoxAgent on WhatsApp
</a>
```

#### Method 3 — QR Code at Hospital

Generate a QR code for `https://wa.me/YOUR_NUMBER` and place it:
- At hospital reception desks
- On appointment cards
- On posters in waiting areas

---

### PHASE 6: Testing & Validation

> **Time estimate**: 1-2 days

#### Step 6.1 — Twilio Test Mode

1. Use Twilio's **WhatsApp Sandbox** for initial testing:
   - Twilio Console → Messaging → Try it out → Send a WhatsApp message
   - Join the sandbox by sending the join code from your phone
2. Test inbound messaging first (verify webhooks work)
3. Then test voice calling

#### Step 6.2 — End-to-End Voice Test

1. From your personal WhatsApp, open the chat with your business number
2. Tap the phone icon (voice call)
3. Verify this flow:
   - ✅ Twilio receives the call event
   - ✅ Your webhook returns valid TwiML
   - ✅ Audio streams to Vapi
   - ✅ Vapi's AI agent responds in Bengali
   - ✅ You hear the response in your WhatsApp call
4. Test edge cases:
   - [ ] Long silence (does the agent prompt?)
   - [ ] Bengali dialect input
   - [ ] Hang up mid-conversation
   - [ ] Poor network conditions

#### Step 6.3 — Load Testing

Use a script to simulate multiple concurrent WhatsApp calls:

```python
# Quick concurrency test
import asyncio
import httpx

async def simulate_call(i):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://your-server.com/api/call-patient",
            json={"phone": f"+880170000{i:04d}"}
        )
        print(f"Call {i}: {resp.status_code}")

async def main():
    tasks = [simulate_call(i) for i in range(10)]
    await asyncio.gather(*tasks)

asyncio.run(main())
```

---

### PHASE 7: Production Deployment

> **Time estimate**: 1-2 days

#### Step 7.1 — Environment Variables

```env
# .env — Production Configuration

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WA_NUMBER=+1234567890

# Vapi
VAPI_API_KEY=your_vapi_api_key_here
VAPI_ASSISTANT_ID=your_assistant_id_here

# Server
SERVER_URL=https://your-production-domain.com
PORT=8000

# Database (for call logging)
DATABASE_URL=postgresql://user:pass@host:5432/voxagent
```

#### Step 7.2 — Deploy Your Webhook Server

Recommended deployment options:
- **Railway.app** — Easiest, free tier available
- **Render.com** — Good for FastAPI, auto-deploy from GitHub
- **DigitalOcean App Platform** — Reliable, BD-adjacent servers (Singapore)
- **VPS** — Most control, cheapest long-term

#### Step 7.3 — Update Twilio Webhook URLs

In Twilio Console, update your TwiML App's URLs to your production domain:
- **Voice Request URL**: `https://your-domain.com/twilio/whatsapp-voice`
- **Status Callback URL**: `https://your-domain.com/twilio/whatsapp-voice-status`
- **Fallback URL**: `https://your-domain.com/twilio/whatsapp-voice-fallback`

---

## 💰 Cost Breakdown (WhatsApp Voice via Vapi + Twilio)

### Per-Call Cost (3-minute average)

| Component | Cost | Notes |
|-----------|------|-------|
| **Twilio WhatsApp Voice** | ~$0.02-0.06/min | Per-minute billing, varies by direction |
| **Vapi Platform** | ~$0.05/min | AI orchestration fee |
| **Deepgram STT** | ~$0.01/min | Bengali transcription |
| **GPT-4o LLM** | ~$0.10-0.13/min | Depends on conversation complexity |
| **Azure TTS** | ~$0.01/min | Bengali speech synthesis |
| **Total per 3-min call** | **~$0.57-0.78** | |

### vs. Direct Phone Call Comparison

| Method | Cost per 3-min Call | BD Number Needed? | Patient Reach |
|--------|--------------------|--------------------|---------------|
| **WhatsApp Voice (this guide)** | ~$0.57-0.78 | ❌ No | ★★★★★ (everyone has WhatsApp) |
| **Telnyx + Vapi (PSTN)** | ~$0.52-0.75 | ✅ Yes (hard to get) | ★★★☆☆ (need to know the number) |
| **WhatsApp Text Only** | ~$0.05-0.15 | ❌ No | ★★★★★ |

---

## 🚨 Critical Gotchas & Warnings

> [!CAUTION]
> ### 1. The 2,000 Message Limit Gate
> You **CANNOT** enable WhatsApp Calling until your business reaches a 2,000 daily messaging limit with Meta. This is non-negotiable. **Plan to send appointment reminders, confirmations, and marketing templates to build up volume first.**

> [!WARNING]
> ### 2. Consent for Outbound Calls
> For brand-initiated (outbound) calls, you MUST obtain explicit patient consent via a WhatsApp template message BEFORE calling them. Calling without consent violates Meta's policies and can get your account banned.

> [!WARNING]
> ### 3. WhatsApp Calling ≠ Regular Phone Call
> The patient must have WhatsApp installed and data connectivity. If a patient only has a basic phone or no data, they can't use this channel. **Keep a PSTN fallback option for accessibility.**

> [!IMPORTANT]
> ### 4. Audio Streaming Compatibility
> Vapi's native WebSocket streaming and Twilio's `<Stream>` TwiML verb must be compatible. As of mid-2025, this integration works but **verify the exact WebSocket URL format** with Vapi's latest docs — they update frequently.

> [!IMPORTANT]
> ### 5. Bangladesh is NOT Restricted for Outbound Calling
> Good news: Bangladesh is NOT on Meta's restricted list for business-initiated WhatsApp calls. Both inbound and outbound calls are supported.

---

## 🛣️ Recommended Implementation Order

```
Week 1: ┌─────────────────────────────────────────────┐
        │ Phase 1: Meta Business + WABA Setup         │
        │ Phase 3.1-3.2: Create Vapi Assistant        │
        └─────────────────────────────────────────────┘
                            │
Week 2: ┌─────────────────────────────────────────────┐
        │ Phase 2: Twilio WhatsApp Sender + Voice     │
        │ Phase 3.3: Connect Twilio ↔ Vapi            │
        └─────────────────────────────────────────────┘
                            │
Week 3: ┌─────────────────────────────────────────────┐
        │ Phase 4: Build Webhook Server               │
        │ Phase 5: Set Up CTA Templates               │
        └─────────────────────────────────────────────┘
                            │
Week 4: ┌─────────────────────────────────────────────┐
        │ Phase 6: Testing & Validation               │
        │ Phase 7: Production Deployment              │
        └─────────────────────────────────────────────┘
```

---

## 🔗 Key Links & Documentation

| Resource | URL |
|----------|-----|
| **Twilio WhatsApp Business Calling Docs** | [twilio.com/docs/whatsapp/api/whatsapp-business-calling](https://www.twilio.com/en-us/docs/whatsapp/api/whatsapp-business-calling) |
| **Twilio TwiML `<WhatsApp>` Noun** | [twilio.com/docs/voice/twiml/whatsapp](https://www.twilio.com/docs/voice/twiml/whatsapp) |
| **Twilio `<Stream>` TwiML** | [twilio.com/docs/voice/twiml/stream](https://www.twilio.com/docs/voice/twiml/stream) |
| **Vapi Dashboard** | [vapi.ai](https://vapi.ai) |
| **Vapi API Docs** | [docs.vapi.ai](https://docs.vapi.ai) |
| **Vapi BYO SIP Trunk** | [docs.vapi.ai/phone-numbers/custom-sip](https://docs.vapi.ai) |
| **Meta WhatsApp Business Platform** | [developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp) |
| **Meta WhatsApp Calling API** | [developers.facebook.com/docs/whatsapp/cloud-api/calls](https://developers.facebook.com/docs/whatsapp/cloud-api/calls) |
| **n8n Vapi + Twilio Templates** | [n8n.io/integrations/vapi](https://n8n.io) |

---

## 🧩 Bonus: Dual-Channel Setup (Voice + Text on Same Assistant)

The real power of this architecture is using **Vapi's Chat API** to serve the SAME assistant over WhatsApp text AND voice:

```
┌─────────────────────────────────────────────────────────┐
│            SAME VAPI ASSISTANT, TWO CHANNELS            │
│                                                          │
│  📱 Patient texts on WhatsApp                            │
│      → Twilio Messaging API → Your Server                │
│      → Vapi Chat API (text) → AI responds in text        │
│                                                          │
│  📱 Patient calls on WhatsApp                            │
│      → Twilio Voice API → Your Server                    │
│      → Vapi Voice Pipeline → AI responds in voice        │
│                                                          │
│  ✅ Same assistant config, same memory, same tools        │
│  ✅ Context maintained across channels                    │
│  ✅ Patient can text first, then call — agent remembers   │
└─────────────────────────────────────────────────────────┘
```

### Text Channel Endpoint (add to your server.py):

```python
@app.post("/twilio/whatsapp-message")
async def handle_whatsapp_message(request: Request):
    """
    Handle incoming WhatsApp text messages via Vapi Chat API.
    Same assistant, text mode.
    """
    form_data = await request.form()
    
    patient_phone = form_data.get("From", "").replace("whatsapp:", "")
    message_body = form_data.get("Body", "")
    
    # Call Vapi Chat API with the same assistant
    async with httpx.AsyncClient() as client:
        vapi_response = await client.post(
            "https://api.vapi.ai/chat",
            headers={"Authorization": f"Bearer {VAPI_API_KEY}"},
            json={
                "assistantId": VAPI_ASSISTANT_ID,
                "input": message_body,
                "metadata": {
                    "patientPhone": patient_phone,
                    "channel": "whatsapp_text"
                }
            }
        )
        ai_response = vapi_response.json().get("output", "দুঃখিত, আমি বুঝতে পারিনি।")
    
    # Reply via Twilio Messaging
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{ai_response}</Message>
</Response>"""
    
    return PlainTextResponse(content=twiml, media_type="text/xml")
```

---

## ✅ Final Checklist Before Go-Live

- [ ] Meta Business verified ✓
- [ ] WhatsApp Business Account active ✓
- [ ] Phone number registered as WhatsApp Sender in Twilio ✓
- [ ] Voice enabled on WhatsApp Sender ✓
- [ ] TwiML App created and assigned ✓
- [ ] Vapi assistant configured (Bengali STT + TTS) ✓
- [ ] Webhook server deployed and publicly accessible ✓
- [ ] CTA templates approved by Meta ✓
- [ ] End-to-end voice test passed ✓
- [ ] End-to-end text test passed ✓
- [ ] Fallback/error handling tested ✓
- [ ] Call logging and analytics working ✓
- [ ] Consent flow for outbound calls implemented ✓
- [ ] Daily messaging limit ≥ 2,000 reached ✓

---

> **Bottom Line**: This Vapi + Twilio + WhatsApp architecture gives you the best of all worlds for Bangladesh — no need for a hard-to-get local phone number, patients use an app they already have, and you get both voice AND text AI on the same platform. The main blocker is reaching the 2,000 daily message threshold with Meta. Start building your messaging channel NOW while you work on the voice pipeline.
