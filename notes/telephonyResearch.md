# TelephonyResearch.md — VoxAgent Telephony Deep Dive

> **Purpose**: Comprehensive research on telephony options for VoxAgent — covering Bangladesh-specific providers, global cloud telephony platforms, VAPI integration, WhatsApp calling, cost analysis, and MVP recommendations.

---

## 📌 Executive Summary

**The single hardest infrastructure problem for VoxAgent is: getting a programmable phone number in Bangladesh that streams real-time audio to an AI pipeline.**

Here's the reality:
- **Twilio**: ❌ Does NOT sell local BD phone numbers
- **Telnyx**: ✅ Offers BD numbers, but requires business registration + 72hr activation
- **Vonage**: ⚠️ Uncertain BD number availability — must contact sales
- **Local BD IPTSPs**: ✅ Best for local numbers, but poor API quality
- **WhatsApp Calling API**: ✅ Game-changer for BD market — patients already use WhatsApp
- **VAPI**: ✅ Supports BYO SIP trunk — can work with any of the above

**Recommended MVP Path**: Use **VAPI + Telnyx** (or local IPTSP SIP trunk) for phone calls + **WhatsApp Business Calling API** as a parallel channel. This gives you the widest patient reach in Bangladesh.

---

## 🌍 Part 1: Global Cloud Telephony Providers

### Provider Comparison Matrix

| Provider | BD Number | WebSocket Streaming | SIP Trunk | Pricing (BD) | API Quality | VAPI Compatible |
|----------|-----------|-------------------|-----------|---------------|-------------|-----------------|
| **Twilio** | ❌ No local | ✅ Yes | ✅ Elastic SIP | $0.056/min outbound | ★★★★★ | ✅ Built-in |
| **Telnyx** | ✅ Yes (business) | ✅ Yes | ✅ Yes | Pay-as-you-go | ★★★★☆ | ✅ Built-in |
| **Vonage** | ⚠️ Unclear | ✅ Yes | ✅ Yes | ~$0.014/min | ★★★★☆ | ✅ Via SIP |
| **DIDWW** | ✅ Yes | ❌ No (SIP only) | ✅ Yes | Custom quote | ★★★☆☆ | ✅ Via SIP |
| **Plivo** | ⚠️ Check | ✅ Yes | ✅ Yes | Competitive | ★★★★☆ | ✅ Built-in |
| **VoIP.ms** | ❌ No | ❌ No | ✅ Yes | Very cheap | ★★★☆☆ | ✅ Via SIP |

---

### 1. Twilio (twilio.com)

**Status for Bangladesh**: ❌ **Cannot buy local BD numbers**

- Twilio does NOT currently provide voice-enabled local phone numbers in Bangladesh
- You CAN use Twilio's Elastic SIP Trunking to route calls TO Bangladesh
- Outbound calls to BD: **$0.056/min** (standard + mobile lines)
- Inbound via SIP interface: **$0.004/min**
- Unlimited call concurrency
- Secure Trunking (SRTP/TLS) included free
- Call recording: $0.0025/min + $0.0005/min/month storage

**For VoxAgent**: Twilio is the most mature platform but useless for getting a local 01XXXXXXXXX number. Could use as a secondary/failover provider, or for call routing logic.

**SMS Note**: Alphanumeric Sender IDs are supported in BD. Registration mandatory for Grameenphone, Robi, and Teletalk.

---

### 2. Telnyx (telnyx.com)

**Status for Bangladesh**: ✅ **Offers BD virtual phone numbers**

- **Requirements** (important — read carefully):
  - Business-only (no personal use)
  - Must provide: authorized representative name + contact details
  - Company name + Business Registration Certificate
  - Copy of representative's passport or ID
  - Signed Letter of Intent (LOI) dated within 1 month
  - Proof of address matching Business Registration (dated within 3 months)
  - **Activation takes ~72 hours** after document submission

- Pay-as-you-go pricing — no minimum commitments
- Growth Plan available: 8% discount on voice/messaging/numbers with monthly minimum
- 24/7/365 in-house support
- Mission Control Portal for management

**For VoxAgent**: **Best global provider option for BD numbers.** The documentation requirements are manageable if you have a registered business. Start the registration process ASAP — it takes time.

> [!IMPORTANT]
> **Action Item**: Register a business entity if you haven't already. You'll need this for Telnyx AND for WhatsApp Business API. Budget 1-2 weeks for the full process.

---

### 3. Vonage (vonage.com)

**Status for Bangladesh**: ⚠️ **Uncertain — must contact sales**

- Voice API: ~$0.01446/min for PSTN calls
- Internet/SIP/WebRTC calls: ~$0.00462/min
- Per-second billing
- BD number availability NOT confirmed in self-service portal
- SMS Sender ID registration required for BD networks

**For VoxAgent**: Worth checking, but not reliable as primary. Contact their sales team specifically asking about BD DID numbers.

---

### 4. DIDWW (didww.com)

**Status for Bangladesh**: ✅ **Offers BD numbers (custom quote)**

- Prepaid model — minimum balance $30 USD
- Non-Recurring Charge (NRC) for setup + Monthly Recurring Charge (MRC)
- SIP-compatible with most PBX systems
- Requires business documentation for BD numbers
- Must log in to portal or email sales@didww.com for exact pricing

**For VoxAgent**: Good backup option. Less developer-friendly than Telnyx but reliable for SIP trunking.

---

## 🇧🇩 Part 2: Bangladesh Local Telephony Providers

### The BD Telephony Landscape

In Bangladesh, VoIP/SIP services are provided by **licensed IPTSP (Internet Protocol Telephony Service Provider)** companies. The major mobile operators (Grameenphone, Banglalink, Robi) do NOT directly offer SIP trunk APIs — they partner with IPTSPs.

### Licensed IPTSP Providers

| Provider | Services | API Available | Notes |
|----------|----------|--------------|-------|
| **Brilliant (Intercloud)** | SIP trunking, Cloud PBX, VoIP API | ✅ Yes | Developer-friendly, CRM integrations |
| **Amber IT** | SIP trunking, IP telephony | ✅ Yes | Established provider |
| **BRACNet** | SIP trunking, business voice | ✅ Limited | Part of BRAC group |
| **RanksITT** | SIP trunking, IVR, VoIP API | ✅ Yes | Good API docs |
| **Link3 Technologies** | SIP trunking, PBX | ✅ Limited | ISP + telephony |
| **Optimal Technologies** | Cloud PBX, SIP | ✅ Limited | Smaller provider |

### How Mobile Operators Fit In

- **Grameenphone**: Offers "mCentrex" — a virtual PBX service with central business number routing to mobile extensions. NOT a standard SIP trunk, but could be useful for human agent fallback.
- **Banglalink**: Enterprise internet + connectivity. Partners with IPTSPs for voice. No direct SIP API.
- **Robi**: Enterprise solutions available, but no public SIP/API offering.

### Recommendation for Local BD Provider

> [!TIP]
> Contact **Brilliant (brilliant.com.bd)** and **RanksITT (ranksitt.net)** first. They're the most developer-friendly local providers. Ask specifically for:
> 1. SIP trunk credentials (username/password auth)
> 2. Local DID number provisioning
> 3. Per-minute pricing for inbound calls
> 4. WebSocket or SIP streaming capabilities
> 5. API documentation

### BTRC Regulatory Considerations

- All VoIP services must be provided by BTRC-licensed IPTSPs
- Using unlicensed VoIP is technically illegal in BD
- Automated calling systems may need additional BTRC clearance
- **Action Item**: Contact BTRC directly to ask about regulations for AI-powered automated phone systems

---

## 📱 Part 3: WhatsApp Business Calling API

### Why WhatsApp Matters for Bangladesh

WhatsApp is THE dominant messaging platform in Bangladesh. Nearly every smartphone user has it. For your target audience (hospital patients), WhatsApp is likely the most natural way to reach you.

### WhatsApp Business Calling API Overview

Meta now offers a **Calling API** that enables bi-directional VoIP calls directly within WhatsApp.

| Feature | Details |
|---------|---------|
| **Incoming calls** | ✅ **FREE** — patient calls you, no charge |
| **Outgoing calls** | 💰 Per-minute, billed in 6-second pulses |
| **Audio quality** | High (VoIP over data) — better than cellular in many cases |
| **Patient trust** | ✅ Verified business badge — reduces suspicion |
| **Setup** | Need WhatsApp Business account + Cloud API + BSP |

### Cost Structure

Your WhatsApp Calling cost has 3 layers:
1. **Meta's connectivity fee**: Base per-minute rate (varies by country code)
2. **Permission template fee**: If calling outside 24hr service window, must send consent template first (charged at template messaging rates)
3. **BSP (Business Solution Provider) fees**: May add markup on top

### WhatsApp + VAPI Integration

**Critical limitation**: VAPI does NOT natively stream voice calls directly within WhatsApp. WhatsApp doesn't provide a public API for real-time audio streaming to third-party platforms.

**Workaround architecture**:

```
Patient opens WhatsApp → Calls your business number → 
  Twilio/Voximplant bridges the call → 
    Audio streams to VAPI → 
      AI processes (STT → LLM → TTS) → 
        Audio returns via bridge → 
          Patient hears response in WhatsApp
```

### 3 Approaches to WhatsApp + Voice AI

| Approach | How It Works | Best For | Complexity |
|----------|-------------|----------|------------|
| **Hybrid Voice** | Twilio routes calls to VAPI; WhatsApp for triggers/follow-up | Full voice automation | High |
| **Chat API** | Use VAPI's Chat API for text conversations in WhatsApp | Text-first, same persona as voice | Medium |
| **No-Code** | Use Make/n8n to connect VAPI triggers to WhatsApp | Quick MVP deployment | Low |

### VAPI Chat API (Game-changer for WhatsApp)

As of mid-2025, VAPI has a **Chat API** that lets you use the same agent config, memory, and tools across both voice AND text. This means:
- Patient texts on WhatsApp → Same AI agent responds in text
- Patient calls on phone → Same AI agent responds in voice
- **Context is maintained** across channels

> [!TIP]
> **For your MVP, consider starting with WhatsApp text-based chat first**, using VAPI's Chat API. It's easier to implement, cheaper (no telephony costs), and lets you validate the AI conversation quality in Bengali before adding voice.

### WhatsApp Setup in Bangladesh

**Option A — Local BSP Partner** (recommended for BD):
- Companies like **Whatsfly**, **Automas Technologies**, **ServerBD**
- Handle Meta verification, Bangla support, compliance
- Multi-agent support

**Option B — Global CPaaS**:
- **Twilio** (Meta partnership for calling)
- **Voximplant**, **Gupshup**, **Infobip**
- Enterprise-grade, custom-coded integrations

### Setup Steps

1. Register business + get verified on WhatsApp Business Platform
2. Choose a BSP (local or global)
3. Enable Voice Calling in WhatsApp Manager
4. Configure Webhooks for call events
5. Connect to your voice pipeline via SIP/WebRTC bridge

---

## 🤖 Part 4: VAPI (Voice AI Platform)

### What is VAPI?

VAPI is a **voice AI orchestration platform** — it's the "middleware" that connects telephony → STT → LLM → TTS into a seamless voice conversation. You bring your own components.

### VAPI Pricing Breakdown

| Component | Cost | Notes |
|-----------|------|-------|
| **Platform fee** | ~$0.05/min | Hosting + orchestration |
| **Free Telephony** | $0/min | US numbers only — NOT for BD |
| **LLM inference** | $0.10-0.30/min | Depends on model (GPT-4o, Claude, etc.) |
| **STT** | $0.008-0.15/min | Depends on provider (Deepgram, Google) |
| **TTS** | $0.008-0.15/min | Depends on provider (Azure, Google, ElevenLabs) |
| **External telephony** | $0.01-0.05/min | Your Telnyx/Twilio charges |

### VAPI Plans

| Plan | Monthly Fee | Included Minutes | Overage Rate |
|------|-------------|-----------------|--------------|
| **Ad-Hoc** | $0 | 0 | ~$0.18/min (all-in) |
| **Agency** | ~$400/mo | Bundled mins | Discounted |
| **Startup** | ~$800/mo | More mins | More discounted |
| **Enterprise** | Custom | Custom | Volume pricing |

### VAPI Bengali Language Support

VAPI supports Bengali (`bn-IN` / `bn-BD`) through:

**STT Options**:
- **Deepgram** — Recommended for real-time Bengali. Best latency for voice agents.
- **Google STT** — Good Bengali support, broad language coverage.

**TTS Options**:
- **Azure TTS** — Wide range of Bengali voices, natural-sounding
- **Google TTS** — High-quality Bengali voices
- **ElevenLabs** — Expanding Bengali support, custom voice cloning possible
- **Custom TTS via webhook** — You can plug in ANY TTS engine that returns PCM audio

### VAPI + BYO SIP Trunk (How You Connect BD Numbers)

Since VAPI's free telephony is US-only, you MUST bring your own telephony for Bangladesh. Here's how:

**Setup Process**:
1. Get SIP trunk credentials from your telephony provider (Telnyx/local IPTSP)
2. Create a `byo-sip-trunk` credential in VAPI API
3. Configure inbound routing: Forward your BD number to VAPI's SIP URI
4. Configure outbound: Whitelist VAPI's signaling IPs (`44.229.228.186/32`, `44.238.177.138/32`)
5. Register the phone number in VAPI dashboard and assign to your assistant

**Technical Notes**:
- Username/password auth recommended (more reliable than IP-based)
- Inbound gateways require numeric IPv4 (not hostname)
- Use E.164 format for all numbers (e.g., `+8801XXXXXXXXX`)
- Telnyx and Plivo have built-in VAPI support for easier setup

---

## 🏗️ Part 5: Architecture Options for VoxAgent MVP

### Option A: VAPI + Telnyx (Recommended for MVP)

```
Patient calls BD number (Telnyx) →
  Telnyx streams audio via SIP to VAPI →
    VAPI orchestrates: Deepgram STT → GPT-4o → Azure TTS →
      Audio returns to patient via Telnyx
```

**Pros**: Fastest to MVP, managed infrastructure, Bengali support built-in
**Cons**: Higher per-minute cost, dependent on VAPI uptime
**Estimated cost per 3-min call**: ~$0.45-0.65

**Cost breakdown per call (3 min avg)**:
| Component | Cost |
|-----------|------|
| VAPI platform | $0.15 |
| Deepgram STT | $0.02-0.05 |
| GPT-4o LLM | $0.30-0.40 |
| Azure TTS | $0.02-0.05 |
| Telnyx telephony | $0.03-0.10 |
| **Total** | **~$0.52-0.75** |

---

### Option B: VAPI + Local BD IPTSP

```
Patient calls BD number (Brilliant/RanksITT) →
  Local IPTSP routes via SIP to VAPI →
    VAPI orchestrates: Deepgram STT → GPT-4o → Azure TTS →
      Audio returns to patient via local IPTSP
```

**Pros**: Cheapest telephony rates, local BD number guaranteed, BTRC compliant
**Cons**: Poor IPTSP API docs, possible audio quality issues, more setup work
**Estimated cost per 3-min call**: ~$0.40-0.60

---

### Option C: Self-Hosted PBX + VAPI

```
Patient calls BD number (Local IPTSP) →
  Call lands on your FreeSWITCH/Asterisk PBX →
    PBX bridges to VAPI via SIP →
      VAPI orchestrates AI pipeline →
        Audio returns through PBX to patient
```

**Pros**: Full control, can add call routing/queuing, cheapest long-term, human transfer via internal extensions
**Cons**: Most complex, need server ops skills, single point of failure
**Estimated cost per 3-min call**: ~$0.35-0.55 (telephony savings)

**When to use**: When you have 5+ hospitals and need multi-tenant call routing, queuing, and internal extension transfers.

---

### Option D: WhatsApp-First MVP (Lowest Cost & Fastest)

```
Patient messages on WhatsApp →
  VAPI Chat API processes text →
    AI responds in Bengali text →
      (Optional) Escalate to voice call via Twilio bridge
```

**Pros**: Zero telephony cost for text, patients already use WhatsApp, fastest to build
**Cons**: Text-only (no voice initially), requires WhatsApp Business API setup
**Estimated cost per conversation**: ~$0.05-0.15 (LLM only, no telephony/STT/TTS)

> [!IMPORTANT]
> **This is the dark horse option.** For a hospital in Bangladesh, a WhatsApp chatbot that books appointments in Bengali might be MORE useful than a voice agent initially. You can add voice later. The cost savings are dramatic — 5-10x cheaper than voice.

---

### Option E: Full DIY (No VAPI — Custom Pipeline)

```
Patient calls BD number →
  Your FastAPI server handles WebSocket audio →
    You pipe to Google STT / Whisper →
      You call GPT-4o / Claude →
        You pipe to Google TTS →
          Audio returns to patient
```

**Pros**: No VAPI fee ($0.05/min saved), maximum control, can optimize for Bengali
**Cons**: MUCH more engineering effort, you handle concurrency/streaming/latency yourself
**Estimated cost per 3-min call**: ~$0.30-0.50

**When to use**: When you've validated the product with VAPI and want to reduce costs at scale (1000+ calls/day). This is your Phase 3+ play.

---

## 💰 Part 6: Complete Cost Comparison

### Per-Call Cost (3-minute average call)

| Architecture | Telephony | STT | LLM | TTS | Platform | Total/Call |
|-------------|-----------|-----|-----|-----|----------|-----------|
| **VAPI + Telnyx** | $0.06 | $0.04 | $0.35 | $0.04 | $0.15 | **~$0.64** |
| **VAPI + Local IPTSP** | $0.03 | $0.04 | $0.35 | $0.04 | $0.15 | **~$0.61** |
| **Self-hosted PBX + VAPI** | $0.02 | $0.04 | $0.35 | $0.04 | $0.15 | **~$0.60** |
| **WhatsApp Text Only** | $0.00 | $0.00 | $0.10 | $0.00 | $0.00 | **~$0.10** |
| **Full DIY (no VAPI)** | $0.03 | $0.04 | $0.35 | $0.04 | $0.00 | **~$0.46** |

### Monthly Cost at Different Scales

| Architecture | 100 calls/mo | 500 calls/mo | 2,000 calls/mo | 5,000 calls/mo |
|-------------|-------------|-------------|----------------|----------------|
| **VAPI + Telnyx** | $64 | $320 | $1,280 | $3,200 |
| **WhatsApp Text** | $10 | $50 | $200 | $500 |
| **Full DIY** | $46 | $230 | $920 | $2,300 |

### Cost in BDT (at ≈121 BDT/USD)

| Architecture | 100 calls/mo | 500 calls/mo | 2,000 calls/mo |
|-------------|-------------|-------------|----------------|
| **VAPI + Telnyx** | ৳7,744 | ৳38,720 | ৳154,880 |
| **WhatsApp Text** | ৳1,210 | ৳6,050 | ৳24,200 |
| **Full DIY** | ৳5,566 | ৳27,830 | ৳111,320 |

---

## 🔥 Part 7: VAPI vs Retell AI vs Bland AI

### Which Voice AI Platform for VoxAgent?

| Criteria | VAPI | Retell AI | Bland AI |
|----------|------|-----------|----------|
| **Best for** | Engineering teams, max flexibility | Growth teams, quick launch | High-volume outbound |
| **Bengali support** | ✅ Deepgram + Google + Azure | ✅ Similar providers | ⚠️ Limited |
| **Latency** | ~720ms | ~680ms (fastest) | ~850ms |
| **BYO Telephony** | ✅ Full SIP trunk support | ✅ Yes | ✅ Yes |
| **Pricing model** | Usage-based + BYOK | Usage-based (transparent) | Tiered subscription |
| **All-in cost/min** | $0.15-0.25 | $0.13-0.31 | $0.15-0.30+ |
| **Chat API** | ✅ Yes (WhatsApp ready) | ⚠️ Limited | ❌ No |
| **HIPAA-like compliance** | ⚠️ Via config | ⚠️ Via config | ✅ Self-hosted option |
| **Multi-tenant** | ✅ Via API | ✅ Via dashboard | ⚠️ Limited |
| **Community/Docs** | ★★★★☆ | ★★★★★ | ★★★☆☆ |

### Recommendation

> [!TIP]
> **Use VAPI** for VoxAgent because:
> 1. **Chat API** — You can deploy WhatsApp text + phone voice with the SAME agent
> 2. **BYO SIP trunk** — Essential for connecting BD telephony
> 3. **BYOK model** — Bring your own LLM keys to control costs
> 4. **200+ integrations** — Swap STT/TTS/LLM providers without code changes
> 5. **Developer-first** — Fits your tech lead role and custom pipeline needs

> **Use Retell AI** if you want faster time-to-first-call and less configuration. It's slightly simpler but less flexible.

> **Avoid Bland AI** for this project — it's optimized for outbound sales campaigns, not inbound customer service.

---

## 🛣️ Part 8: Recommended MVP Strategy

### The 3-Phase Telephony Rollout

#### Phase 1: WhatsApp Text MVP (Week 1-3)
**Goal**: Validate AI conversation quality in Bengali with ZERO telephony cost

1. Set up WhatsApp Business API via local BSP (Whatsfly/Automas)
2. Connect VAPI Chat API to WhatsApp
3. Build appointment booking flow in Bengali
4. Test with real patients at 1 pilot hospital
5. **Cost**: ~৳1,200/month ($10) for 100 conversations

#### Phase 2: Add Phone Voice (Week 4-6)
**Goal**: Enable phone call support alongside WhatsApp

1. Register business on Telnyx → Get BD phone number
2. OR: Contract with local IPTSP (Brilliant/RanksITT) for SIP trunk
3. Connect SIP trunk to VAPI as BYO telephony
4. Configure same AI agent for voice (add Deepgram STT + Azure TTS)
5. Test call quality, latency, Bengali accuracy
6. **Cost**: ~৳15,000-40,000/month ($125-330) for 200-500 calls

#### Phase 3: Scale & Optimize (Week 7+)
**Goal**: Multi-hospital, cost-optimized, production-ready

1. Set up FreeSWITCH PBX for call routing/queuing
2. Migrate to self-hosted Whisper for STT (reduce costs)
3. Add WhatsApp voice calling via Twilio bridge
4. Implement concurrent call handling
5. Build cost monitoring dashboard
6. **Target cost**: <$0.40/call at 2000+ calls/month

---

## ❓ Part 9: Key Questions Still to Answer

### Must Research (Before Coding)

- [ ] **Can you actually buy a Telnyx BD number?** — Sign up for trial and try provisioning one
- [ ] **What is Brilliant's SIP trunk pricing?** — Call/email brilliant.com.bd
- [ ] **Does BTRC require a license for automated calling?** — Contact BTRC
- [ ] **What's the actual audio quality from BD cell network → Telnyx SIP?** — Test call
- [ ] **Does Deepgram's Bengali STT handle BD dialects?** — Run test samples
- [ ] **What is Meta's WhatsApp Calling rate for Bangladesh?** — Check with BSP

### Nice to Have (Can Research Later)

- [ ] Vonage BD number availability — contact sales
- [ ] DIDWW BD number pricing — request quote
- [ ] FreeSWITCH vs Asterisk benchmarks for your server specs
- [ ] Kamailio as SIP proxy for high-concurrency scenarios

---

## 📊 Part 10: Decision Matrix — Final Recommendations

### For MVP (Start Here)

| Decision | Choice | Reason |
|----------|--------|--------|
| **Voice AI Platform** | VAPI | Chat API + BYO SIP + flexibility |
| **Primary channel** | WhatsApp Text (Chat API) | Free, patients already use it, fastest to build |
| **Secondary channel** | Phone (via Telnyx or local IPTSP) | For patients who prefer calling |
| **STT** | Deepgram (bn-IN) | Fastest, best real-time performance |
| **TTS** | Azure (Bengali) | Most natural Bengali voices |
| **LLM** | GPT-4o-mini (start) → GPT-4o (upgrade) | Cost vs quality balance |

### For Production (Target)

| Decision | Choice | Reason |
|----------|--------|--------|
| **Telephony** | Local IPTSP + FreeSWITCH PBX | Cheapest, full control, BTRC compliant |
| **Voice AI** | Custom pipeline (retire VAPI) | Save $0.05/min at scale |
| **STT** | Self-hosted Whisper Large V3 | Fine-tunable for BD dialects |
| **WhatsApp** | Text + Voice (via Twilio bridge) | Full omnichannel |

---

## 🔗 Resources & Links

### Sign Up (Do These First)
- [ ] [VAPI](https://vapi.ai) — Create account, explore dashboard
- [ ] [Telnyx](https://telnyx.com) — Trial account, attempt BD number provisioning
- [ ] [Twilio](https://twilio.com) — Trial for SIP trunking tests
- [ ] [Meta Business](https://business.facebook.com) — WhatsApp Business API setup

### BD-Specific Contacts
- **Brilliant (IPTSP)**: brilliant.com.bd — SIP trunk inquiry
- **RanksITT**: ranksitt.net — VoIP API inquiry
- **Amber IT**: amberit.com.bd — Enterprise SIP
- **Whatsfly**: whatsfly.net — WhatsApp Business API (BD)
- **Automas Technologies**: automas.com.bd — WhatsApp API (BD)
- **BTRC**: btrc.gov.bd — Regulatory inquiry

### Technical Docs
- [VAPI BYO SIP Trunk Docs](https://docs.vapi.ai)
- [VAPI Chat API Docs](https://docs.vapi.ai)
- [Telnyx SIP Trunking Guide](https://telnyx.com/products/sip-trunking)
- [WhatsApp Calling API Docs](https://developers.facebook.com/docs/whatsapp)
- [Deepgram Bengali Support](https://deepgram.com)
- [FreeSWITCH Documentation](https://freeswitch.org)

---

## 💡 Final Thoughts

### The #1 Insight From This Research

**Don't start with phone calls. Start with WhatsApp text.**

Here's why:
1. **Zero telephony cost** — You only pay for LLM inference
2. **Faster iteration** — Text conversations are easier to debug than voice
3. **Bengali text is better understood** — LLMs handle Bengali text well; STT adds error
4. **Patient familiarity** — Every BD smartphone user knows WhatsApp
5. **Same AI agent** — VAPI Chat API means the same agent works for text AND voice later
6. **Regulatory simplicity** — Text doesn't trigger automated calling regulations

Once you've proven the AI can book appointments in Bengali via WhatsApp text, THEN add voice. You'll have real conversation data to evaluate STT accuracy, and you'll know the LLM can handle the job.

### The #2 Insight

**Telnyx is your best bet for a BD phone number via a global provider, but always have a local IPTSP as backup.** The BD telecom market is relationship-driven — having a local provider contact who can fix issues quickly is invaluable.

### The #3 Insight

**VAPI is the right choice for now, but plan to outgrow it.** At 5,000+ calls/month, the $0.05/min platform fee adds up to $750/month. Build your own pipeline (FastAPI + WebSocket + STT/LLM/TTS) as a Phase 3+ goal. VAPI teaches you the architecture pattern without the engineering burden upfront.
