# WhatsApp Voice Calls via Vapi — Deep Research (June 2026)

> **Purpose**: Exhaustive analysis of every option available to route WhatsApp voice calls through a Vapi-powered AI agent. Covers direct integration, bridge architectures, alternative platforms, prerequisites, costs, and specific recommendations for VoxAgent.

---

## 📌 TL;DR — The Reality Check

**Vapi does NOT natively support WhatsApp voice calling.** There is no button in the Vapi dashboard to "connect WhatsApp calls." As of June 2026, Vapi has **no public roadmap commitment** for native WhatsApp calling support.

However, you have **6 distinct options** to make it work — ranging from simple no-code bridges to full custom WebRTC implementations. Here's the quick comparison:

| # | Option | Complexity | Cost/Call (3min) | WhatsApp Voice? | Requires Vapi? |
|---|--------|-----------|------------------|-----------------|----------------|
| 1 | **Vapi + Twilio WhatsApp Bridge** | Medium | ~$0.57-0.78 | ✅ Real voice call in WhatsApp | ✅ Yes |
| 2 | **Vapi Chat API + WhatsApp Text** | Low | ~$0.05-0.15 | ❌ Text only | ✅ Yes |
| 3 | **Vapi + n8n/Make Callback** | Low-Medium | ~$0.64 | ⚠️ PSTN call triggered from WhatsApp | ✅ Yes |
| 4 | **Pipecat + WhatsApp Direct (No Vapi)** | High | ~$0.30-0.45 | ✅ Real voice call in WhatsApp | ❌ Replaces Vapi |
| 5 | **CPaaS Native (Vonage/Infobip/Gupshup)** | Medium | ~$0.50-0.70 | ✅ Real voice call in WhatsApp | ❌ Replaces Vapi |
| 6 | **All-in-One Platforms (Autocalls, etc.)** | Very Low | ~$0.27+ | ✅ Voice + Text + Web | ❌ Replaces Vapi |

---

## Option 1: Vapi + Twilio WhatsApp Voice Bridge (Best documented)

### How It Works

```
Patient opens WhatsApp → Taps "Call" button →
  Meta routes call to Twilio →
    Twilio TwiML <Stream> sends audio to Vapi WebSocket →
      Vapi processes: Deepgram STT → LLM → Azure TTS →
        Audio returns via Twilio → Patient hears AI in WhatsApp
```

### Architecture Details

This is the **most widely documented approach** in the community. Twilio acts as the "telephone company" that Meta trusts, and you use Twilio's TwiML `<Stream>` verb to pipe the raw audio into Vapi's WebSocket endpoint.

**Key Components**:
1. **Meta Business Account** (verified) + WhatsApp Business Account (WABA)
2. **Twilio Account** with WhatsApp Sender + Voice enabled
3. **TwiML Application** pointing to your webhook server
4. **Vapi Assistant** configured for Bengali STT/TTS
5. **Webhook Server** (FastAPI/Node.js) that returns TwiML to bridge Twilio → Vapi

### Prerequisites (HARD Requirements)

| Requirement | Details | Timeline |
|-------------|---------|----------|
| Meta Business Verification | Need business registration docs, domain verification | 1-5 business days |
| WABA creation | WhatsApp Business Account inside Meta Business Manager | Same day |
| **2,000 daily messaging limit** | ⚠️ **CANNOT enable calling without this** | 1-4 weeks to reach |
| Twilio WhatsApp Sender | Register your WA number in Twilio console | 1-2 days |
| Voice enabled on Sender | Toggle voice ON + assign TwiML app | Same day |

> [!CAUTION]
> **The 2,000 daily messaging limit is the #1 blocker.** New accounts start at 250 messages/day. You MUST either:
> - **Path A**: Complete Meta Business Verification (fastest — can jump straight to 2,000)
> - **Path B**: Send 2,000 delivered template messages to unique users within 30 days with high quality rating
> 
> **Until you reach 2,000/day, WhatsApp Calling is completely locked.**

### TwiML Bridge Code

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="bn-BD">
        আসসালামু আলাইকুম। অনুগ্রহ করে অপেক্ষা করুন।
    </Say>
    <Connect>
        <Stream url="wss://api.vapi.ai/ws?assistant_id={ASSISTANT_ID}&apiKey={VAPI_KEY}" />
    </Connect>
</Response>
```

For outbound calls (business → patient), use `<Dial><WhatsApp>`:
```xml
<Response>
    <Dial callerId="whatsapp:+YourVerifiedSenderNumber">
        <WhatsApp>+RecipientWhatsAppNumber</WhatsApp>
    </Dial>
</Response>
```

### Cost Breakdown (3-min call)

| Component | Cost |
|-----------|------|
| Twilio WhatsApp Voice | ~$0.02-0.06/min |
| Vapi Platform | ~$0.05/min |
| Deepgram STT (Bengali) | ~$0.01/min |
| GPT-4o LLM | ~$0.10-0.13/min |
| Azure TTS (Bengali) | ~$0.01/min |
| **Total per 3-min call** | **~$0.57-0.78** |

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| Most documented approach — tutorials everywhere | Requires Twilio + Vapi + your server (3 billing accounts) |
| Uses Vapi's full AI pipeline | 2,000 message limit gate takes weeks |
| Same Vapi assistant for phone + WhatsApp | Twilio adds cost layer on top of Vapi |
| Twilio handles all Meta compliance | Must maintain webhook server |
| Supports both inbound & outbound calls | Audio stream compatibility must be verified with Vapi's exact WebSocket URL format |

---

## Option 2: Vapi Chat API + WhatsApp Text (Cheapest, Fastest MVP)

### How It Works

```
Patient sends text on WhatsApp →
  Twilio Messaging API receives it → Webhook to your server →
    Your server calls Vapi Chat API (text mode) →
      AI responds in Bengali text →
        Your server sends response back via Twilio → Patient sees text reply
```

### Why This Matters

**Vapi's Chat API is OpenAI-compatible** and lets you use the **exact same assistant** (same prompt, tools, memory) for both voice AND text. This means:
- Patient texts on WhatsApp → Same AI agent responds in text
- Patient calls on phone → Same AI agent responds in voice
- **Context is maintained across channels** (patient can text first, then call — agent remembers)

### Cost Breakdown (per conversation)

| Component | Cost |
|-----------|------|
| Twilio WhatsApp Messaging | FREE (inbound) / $0.005-0.05 (template) |
| Vapi Chat API | ~$0.01-0.03/message |
| LLM inference | ~$0.02-0.05/message |
| STT/TTS | $0 (text only) |
| **Total per conversation (~6 turns)** | **~$0.05-0.15** |

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| **5-10x cheaper** than any voice option | No actual voice — text only |
| Zero telephony cost | Some patients may prefer calling |
| Fastest to build (~1-2 days) | Doesn't showcase "voice agent" capability |
| Same Vapi assistant as voice | Still needs 2,000 message limit for future calling |
| Bengali text better understood by LLMs than Bengali STT | |
| No BTRC regulatory concerns | |

> [!TIP]
> **This is still the smartest MVP move.** Start here, validate your AI conversation quality in Bengali, build up your messaging volume (needed for calling later), and add voice when ready. You already have this documented in your [WhatsAppIntegrationGuide.md](file:///d:/02_CODE/04_TEST/plan-for-voxagent/WhatsAppIntegrationGuide.md).

---

## Option 3: Vapi + n8n/Make "Callback" Bridge

### How It Works

```
Patient sends WhatsApp message saying "I want to book" →
  Twilio receives message → triggers n8n/Make webhook →
    n8n calls Vapi API: POST /call/phone →
      Vapi initiates a regular PSTN call to patient's phone number →
        Patient receives a normal phone call (NOT in WhatsApp) →
          Vapi AI agent handles the call
```

### Important Distinction

**This is NOT a WhatsApp voice call.** The patient initiates contact via WhatsApp text, but the actual voice conversation happens over a regular phone call. WhatsApp is just the trigger.

### When This Makes Sense

- You already have a working Vapi + Telnyx/Twilio phone setup
- You want WhatsApp as an "entry point" but voice happens over PSTN
- You don't want to deal with the WhatsApp Calling API complexity

### Tools for This Approach

| Tool | Role | Cost |
|------|------|------|
| **n8n** (self-hosted) | Webhook orchestration | Free (self-hosted) |
| **n8n Cloud** | Managed version | $20+/month |
| **Make.com** | Visual automation | $9+/month |
| **Pabbly Connect** | Budget automation | $25/month (lifetime deals available) |

Pre-built templates exist on both n8n and Make for "WhatsApp → Vapi Call" workflows.

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| Uses existing Vapi phone setup | NOT a WhatsApp call — it's a regular phone call |
| Low-code, fast to build | Patient must answer a separate phone call |
| No 2,000 message limit needed for voice part | Requires BD phone number (back to Telnyx problem) |
| Popular community templates available | Two-step UX is confusing for patients |

---

## Option 4: Pipecat + WhatsApp Direct (Replace Vapi entirely)

### How It Works

```
Patient calls on WhatsApp →
  Meta sends webhook with SDP offer to your server →
    Pipecat WhatsAppTransport handles WebRTC signaling →
      Pipecat pipeline: Deepgram STT → LLM → Cartesia/Azure TTS →
        Audio streams back via WebRTC → Patient hears AI in WhatsApp
```

### What is Pipecat?

**Pipecat** is an **open-source framework** (by Daily.co) for building real-time voice and multimodal AI agents. It's essentially a **self-hosted alternative to Vapi** — you build your own pipeline instead of using Vapi's managed service.

Key difference: Pipecat has a **native `WhatsAppTransport`** that handles the WebRTC signaling directly with Meta's API. **No Twilio bridge needed.**

### Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   YOUR SERVER (Pipecat)                  │
│                                                          │
│  Webhook endpoint (/whatsapp)                            │
│      │                                                   │
│      ▼                                                   │
│  WhatsAppTransport                                       │
│      ├── Handles webhook events (call_connect, etc.)     │
│      ├── WebRTC SDP offer/answer exchange with Meta      │
│      ├── ICE candidate negotiation                       │
│      └── DTLS/SRTP encrypted media stream                │
│              │                                           │
│              ▼                                           │
│  Pipecat Pipeline                                        │
│      ├── Deepgram STT (streaming Bengali)                │
│      ├── GPT-4o / Claude (conversation logic)            │
│      └── Azure TTS / Cartesia (Bengali voice)            │
│              │                                           │
│              ▼                                           │
│  Audio → WebRTC → Meta → Patient's WhatsApp             │
└─────────────────────────────────────────────────────────┘
```

### Setup Requirements

```bash
# Install Pipecat with WebRTC support
uv add "pipecat-ai[webrtc]"
```

**Environment Variables**:
```env
WHATSAPP_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_WEBHOOK_VERIFICATION_TOKEN=your_verify_token
```

**Reference Repository**: [daily-co/pcc-gemini-whatsapp](https://github.com/daily-co/pcc-gemini-whatsapp)

### ⚠️ Critical Technical Gotcha: The 20-Second Timeout

Meta will **automatically terminate** a WhatsApp call if no audio media is flowing within **20 seconds** of the call being accepted. This means:
- Your WebRTC `RTCPeerConnection` must have audio tracks attached BEFORE sending the SDP answer
- You cannot "pick up" the call and then lazily set up your AI pipeline — it must be ready instantly
- This is the #1 cause of failed integrations

### Cost Breakdown (3-min call)

| Component | Cost |
|-----------|------|
| Meta WhatsApp Calling (inbound) | **$0.00** (FREE for inbound) |
| Deepgram STT | ~$0.01/min |
| GPT-4o LLM | ~$0.10-0.13/min |
| Azure TTS | ~$0.01/min |
| Server hosting | ~$0.01/min (amortized) |
| **Total per 3-min call** | **~$0.39-0.45** |

> Note: **No Vapi platform fee ($0.05/min)** and **no Twilio voice fee ($0.02-0.06/min)**. This is the cheapest voice option.

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| **Cheapest voice option** — no Vapi or Twilio fees | **Replaces Vapi entirely** — you build your own pipeline |
| Direct WhatsApp integration — no bridge | High engineering effort (WebRTC is complex) |
| Open-source — no vendor lock-in | Must handle WebRTC signaling, ICE, DTLS yourself |
| Full control over latency & pipeline | 20-second timeout is tricky to handle |
| No Twilio dependency | Still needs Meta 2,000 message limit |
| Community & docs growing fast | Less mature than Vapi for production |

---

## Option 5: CPaaS Native Platforms (Replace Vapi with all-in-one)

### Overview

Several large **Communication Platform as a Service (CPaaS)** providers now offer built-in WhatsApp Calling + AI agent capabilities, eliminating the need for Vapi entirely.

### Provider Comparison

| Platform | WhatsApp Calling | AI Agent | Bengali Support | Pricing Model |
|----------|-----------------|----------|-----------------|---------------|
| **Vonage** | ✅ Via AI Studio + Voice API | ✅ Built-in (WebSocket to LLM) | ⚠️ Limited native, BYO STT/TTS | Per-minute + platform fee |
| **Infobip** | ✅ Native Voice AI | ✅ Built-in (OpenAI, ElevenLabs) | ⚠️ Limited | Conversation-based pricing |
| **Gupshup** | ✅ Conversation Cloud | ✅ Agentic Framework | ⚠️ Limited | Per-message/call |
| **Telnyx** | ✅ Via SIP bridge | ⚠️ Basic (needs custom AI) | ⚠️ Limited | Per-minute, cheaper |

### How These Differ from Vapi

These platforms handle **both** the telephony AND the AI orchestration. You don't need Vapi as a separate layer — the CPaaS provider IS the voice AI platform.

```
Patient calls on WhatsApp →
  CPaaS (e.g., Vonage) handles SIP/WebRTC bridge →
    Built-in Voice AI processes: STT → LLM → TTS →
      Audio returns to patient
```

### When This Makes Sense

- You want **one vendor** instead of Vapi + Twilio + your server
- You don't need Vapi's specific features (Chat API, Squads, etc.)
- You want enterprise support and SLA guarantees
- You're okay with less customization in exchange for simplicity

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| One vendor = one bill, one support team | Less flexible than Vapi's BYO model |
| Enterprise-grade reliability | Bengali support varies — may need BYO STT/TTS |
| WhatsApp calling handled natively | Vendor lock-in |
| Contact center features (queuing, routing) built-in | More expensive at low volume |

---

## Option 6: All-in-One No-Code Platforms

### Overview

Newer platforms like **Autocalls**, **ConvoCore**, **Synthflow**, and **waBotX** offer "zero-engineering" WhatsApp voice AI agents.

### Autocalls (Most Notable)

| Feature | Details |
|---------|---------|
| **Channels** | Voice + WhatsApp + Web Widget |
| **Starting price** | $34/month |
| **Per-minute cost** | ~$0.09/min (all-inclusive) |
| **Languages** | 100+ (Bengali likely included) |
| **Builder** | No-code flow builder |
| **Integrations** | 300+ (HubSpot, Shopify, etc.) |
| **White-label** | Available on agency plans ($249-419/mo) |

### When This Makes Sense

- You want the absolute fastest path to a working demo
- You're not building custom infrastructure
- Bengali is supported out-of-the-box
- You want a product demo for hospitals ASAP

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| Deploy in hours, not weeks | Limited customization |
| All-inclusive pricing — no surprise bills | Bengali quality unknown — must test |
| WhatsApp + Voice + Web built-in | Vendor lock-in (can't export your pipeline) |
| No engineering needed | May not handle BD-specific dialects |
| White-label available for your SaaS | Not suitable for production at scale |

---

## 🔍 Deep Dive: The WhatsApp Calling API Itself

Understanding the underlying Meta API helps evaluate all options above.

### Protocol Support

| Protocol | Use Case | Complexity |
|----------|----------|------------|
| **WebRTC** | Peer-to-peer style, low-latency | High (SDP, ICE, DTLS, SRTP) |
| **SIP** | Enterprise telephony, PBX integration | Medium (standard SIP tooling) |

### Audio Codecs Supported
- **OPUS** (primary — best quality/bandwidth ratio)
- **PCMA** (G.711 A-law)
- **PCMU** (G.711 μ-law)

### Call Flow (WebRTC path)

```
1. Patient taps "Call" in WhatsApp
2. Meta sends webhook to your registered endpoint:
   {
     "type": "call_connect",
     "sdp_offer": "v=0\no=...\n..."
   }
3. Your server creates RTCPeerConnection
4. Adds audio tracks (your AI's output stream)
5. Creates SDP answer from the offer
6. Sends SDP answer back via Graph API:
   POST /{PHONE_NUMBER_ID}/calls
   {
     "call_id": "...",
     "sdp_answer": "v=0\no=...\n..."
   }
7. ICE negotiation completes
8. Bidirectional audio flows
9. ⚠️ MUST have audio flowing within 20 seconds or Meta kills the call
```

### Pricing (Meta's Side)

| Direction | Cost |
|-----------|------|
| **Inbound** (patient → you) | **FREE** ✅ |
| **Outbound** (you → patient) | Per-minute, 6-second pulse billing |
| **Outbound consent template** | Standard template message rate (~$0.01-0.05) |

### Requirements to Activate

| Requirement | How to Achieve |
|-------------|----------------|
| Cloud API hosting | Phone number must be on WhatsApp Cloud API |
| 2,000 messages/day limit | Meta Business Verification OR send 2,000 high-quality templates in 30 days |
| `whatsapp_business_messaging` permission | Enable in Meta app settings |
| Webhook subscription to `calls` field | Configure in Meta Developer Console |
| Business Verification | Submit docs to Meta Business Manager (1-5 days) |

---

## 📊 Master Comparison Matrix

| Criteria | Option 1: Twilio Bridge | Option 2: Chat API | Option 3: Callback | Option 4: Pipecat | Option 5: CPaaS | Option 6: No-Code |
|----------|------------------------|--------------------|--------------------|-------------------|-----------------|-------------------|
| **Real WhatsApp voice** | ✅ | ❌ | ❌ (PSTN call) | ✅ | ✅ | ✅ |
| **Uses Vapi** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Engineering effort** | Medium | Low | Low | High | Medium | Very Low |
| **Cost per 3min call** | $0.57-0.78 | $0.05-0.15 | $0.64 | $0.39-0.45 | $0.50-0.70 | $0.27+ |
| **Bengali control** | ✅ BYO STT/TTS | ✅ LLM handles | ✅ | ✅ Full control | ⚠️ Limited | ⚠️ Limited |
| **Time to first call** | 2-4 weeks | 1-2 days | 1 week | 3-5 weeks | 2-3 weeks | 1-3 days |
| **Vendor dependencies** | 3 (Meta+Twilio+Vapi) | 2 (Meta+Vapi) | 3+ | 1 (Meta only) | 1-2 | 1 |
| **Production readiness** | ★★★★☆ | ★★★★★ | ★★★☆☆ | ★★★☆☆ | ★★★★★ | ★★★☆☆ |
| **BD number needed** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Scalability** | Good | Excellent | Good | Best (self-hosted) | Excellent | Limited |

---

## 🎯 Recommendations for VoxAgent

### Immediate (Now → Week 2): Start with Option 2

**Use Vapi Chat API + WhatsApp Text.** This is already in your plan ([TelephonyResearch.md](file:///d:/02_CODE/04_TEST/plan-for-voxagent/TelephonyResearch.md) Option D).

Why first:
- ৳1,200/month (~$10) for 100 conversations
- Validates Bengali AI quality with zero telephony complexity
- Builds your messaging volume toward the 2,000 limit gate
- Same Vapi assistant transfers to voice later

### Short-term (Week 3-6): Add Option 1

**Deploy Vapi + Twilio WhatsApp Voice Bridge** once you've:
- Reached 2,000 daily messaging limit
- Validated Bengali conversation quality via text
- Got Meta Business Verification

This gives you **real WhatsApp voice calls** with the Vapi pipeline you've already built.

### Long-term (Month 3+): Evaluate Option 4

**Consider migrating to Pipecat** for self-hosted WhatsApp calling when:
- You're paying $0.05/min to Vapi at scale (adds up to $750+/mo at 5K calls)
- You want to fine-tune Bengali STT with self-hosted Whisper
- You need maximum control over latency and pipeline
- You're comfortable managing WebRTC infrastructure

### Alternative Path (if you want to move FAST):

**Test Autocalls or Synthflow** (Option 6) for a quick hospital demo. If Bengali quality is acceptable, you can have a working WhatsApp voice agent in HOURS instead of weeks. Use it to impress pilot hospitals while you build the real thing.

---

## ❓ Open Questions to Investigate Next

- [ ] **Verify Twilio `<Stream>` + Vapi WebSocket compatibility** — The exact WebSocket URL format (`wss://api.vapi.ai/ws?...`) must be confirmed with Vapi's latest docs. They update frequently.
- [ ] **Test Pipecat WhatsAppTransport** — Clone [daily-co/pcc-gemini-whatsapp](https://github.com/daily-co/pcc-gemini-whatsapp) and run locally with ngrok to validate the 20-second timeout handling.
- [ ] **Check Autocalls Bengali quality** — Sign up for trial, test Bengali voice agent, record results.
- [ ] **Get exact Meta calling rates for Bangladesh** — Check the Meta Developer portal rate cards for BD outbound per-minute rates.
- [ ] **Confirm Twilio WhatsApp Voice works with non-US numbers** — Can you register a +880 number as a WhatsApp Sender with voice enabled?
- [ ] **Ask Vapi support about WhatsApp roadmap** — Join Vapi Discord, check if native WhatsApp calling is planned.

---

## 🔗 Key Resources

| Resource | URL |
|----------|-----|
| **Twilio WhatsApp Calling Docs** | [twilio.com/docs/whatsapp/api/whatsapp-business-calling](https://www.twilio.com/en-us/docs/whatsapp/api/whatsapp-business-calling) |
| **Twilio TwiML `<Stream>`** | [twilio.com/docs/voice/twiml/stream](https://www.twilio.com/docs/voice/twiml/stream) |
| **Meta WhatsApp Calling API** | [developers.facebook.com/docs/whatsapp/cloud-api/calls](https://developers.facebook.com/docs/whatsapp/cloud-api/calls) |
| **Vapi Chat API** | [docs.vapi.ai](https://docs.vapi.ai) |
| **Pipecat Framework** | [github.com/pipecat-ai/pipecat](https://github.com/pipecat-ai/pipecat) |
| **Pipecat WhatsApp Example** | [github.com/daily-co/pcc-gemini-whatsapp](https://github.com/daily-co/pcc-gemini-whatsapp) |
| **Vonage AI Studio** | [vonage.com/ai-studio](https://www.vonage.com) |
| **Infobip Voice AI** | [infobip.com](https://www.infobip.com) |
| **Autocalls** | [autocalls.ai](https://autocalls.ai) |
| **n8n WhatsApp+Vapi Templates** | [n8n.io/integrations](https://n8n.io) |

---

## 💡 The Bottom Line

**For VoxAgent in Bangladesh, the optimal path is:**

1. **Start with WhatsApp text** (Option 2) → cheapest, fastest, builds messaging volume
2. **Add Twilio WhatsApp voice bridge** (Option 1) → real voice calls once 2,000 limit reached
3. **Migrate to Pipecat** (Option 4) → self-hosted, cheapest at scale, maximum control

**The biggest gate is not technical — it's the Meta 2,000 daily messaging limit.** Start building your messaging channel NOW. Every day you wait is a day further from unlocking WhatsApp Calling.
