# HowToResearch.md — VoxAgent Research Guide

> **Purpose**: This document tells you exactly *what* to research, *how* to do it, and in *what order* — so you don't waste weeks going down rabbit holes. Follow this top-to-bottom.

---

## 🧭 Research Philosophy

Your project sits at the intersection of **4 hard domains**:

```
    Telephony ←→ Voice AI (STT/TTS) ←→ LLM Conversation ←→ Hospital Operations
```

You don't need to become an expert in all of them before writing a single line of code.  
The goal of research is to **reduce unknowns enough to make confident technical decisions**.

**Rule of thumb**: If a decision is reversible (can swap later), spend less time researching it. If it's irreversible (locks you into an architecture), research deeply.

---

## 📋 Research Priority Order

Research in this exact order. Each phase builds on the previous one.

| Priority | Research Area                        | Why First                                                                                                   | Time Budget |
| -------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ----------- |
| **P0**   | Bengali STT/TTS Capabilities         | This is your #1 technical risk — if no service can understand Bengali well enough, the product doesn't work | 3-4 days    |
| **P1**   | Telephony in Bangladesh              | If you can't receive calls with decent quality in BD, nothing else matters                                  | 2-3 days    |
| **P2**   | LLM Bengali Conversation Quality     | Can an LLM hold a natural multi-turn conversation in Bengali with function calling?                         | 2-3 days    |
| **P3**   | Hospital Workflow & Domain Knowledge | You need to understand how hospitals actually work to design the right flows                                | 2-3 days    |
| **P4**   | Competitor & Market Analysis         | Who else is doing this? What can you learn from them?                                                       | 1-2 days    |
| **P5**   | Legal & Compliance                   | Patient data laws in Bangladesh, call recording consent                                                     | 1 day       |
| **P6**   | Infrastructure & Cost Modeling       | Cloud hosting, pricing strategy, cost-per-call math                                                         | 1 day       |

**Total: ~2-3 weeks of focused research before serious coding begins.**

---

## P0 — Bengali Speech-to-Text (STT) Research

> **This is the single most important research area.** If the system can't understand patients speaking Bengali (especially dialects), the entire product fails.

### What to Test

1. **Standard Bengali (শুদ্ধ বাংলা)** — Formal/news-style Bengali
2. **Conversational Bengali** — How real people actually talk on the phone
3. **Dialectal Bengali** — Noakhali (নোয়াখাইল্যা), Chittagong (চাটগাঁইয়া), Sylheti (সিলেটি)
4. **Noisy audio** — Phone quality, background noise, low-bandwidth calls

### Services to Evaluate

| Service | What to Test | How to Sign Up |
|---------|-------------|----------------|
| **Google Cloud Speech-to-Text V2** | `bn-BD` locale, streaming mode | [cloud.google.com/speech-to-text](https://cloud.google.com/speech-to-text) — free tier: 60 min/month |
| **OpenAI Whisper API** | Bengali transcription, accuracy on dialects | [platform.openai.com](https://platform.openai.com) — pay-per-use |
| **Self-hosted Whisper Large V3** | Same tests but locally, to measure fine-tuning potential | Download from [HuggingFace](https://huggingface.co/openai/whisper-large-v3) — free, needs GPU |
| **Azure Speech** | `bn-BD` recognition, streaming | [azure.microsoft.com/en-us/products/cognitive-services/speech-to-text](https://azure.microsoft.com/en-us/products/cognitive-services/speech-to-text) |
| **Deepgram** | Bengali support, real-time streaming | [deepgram.com](https://deepgram.com) |

### How to Actually Test

1. **Create test audio samples** — Record yourself and friends speaking Bengali in different styles:
   - 5 samples of appointment booking requests (standard Bengali)
   - 5 samples of the same requests in dialectal Bengali
   - 5 samples with phone-quality audio (record through an actual phone call)
   - 5 samples with background noise (hospital waiting room noise etc.)

2. **Write a simple Python test script**:
   ```
   For each STT service:
       For each audio sample:
           → Send audio to API
           → Record: transcription result, confidence score, latency, cost
           → Have a Bengali speaker rate accuracy: 1-5 scale
   ```

3. **Build a comparison spreadsheet** tracking:
   - Word Error Rate (WER) per service per dialect
   - Latency (time to first result, time to complete)
   - Cost per minute
   - Streaming support (yes/no)
   - Bengali dialect robustness score (your subjective rating)

4. **Key questions to answer**:
   - [ ] Which service has the best base Bengali accuracy?
   - [ ] Can any service handle dialectal Bengali at all?
   - [ ] What's the latency like for real-time conversation? (needs to be < 1.5s)
   - [ ] Is self-hosted Whisper practical for your budget?
   - [ ] Can the LLM "fix" transcription errors? (test this in P2)

### Resources to Study

- Whisper paper: [Robust Speech Recognition via Large-Scale Weak Supervision](https://arxiv.org/abs/2212.04356)
- Google Speech V2 docs: streaming recognition, model adaptation
- Bengali ASR research papers on [arxiv.org](https://arxiv.org) — search "Bengali automatic speech recognition"
- HuggingFace Bengali ASR models: search for community-trained Bengali models
- Mozilla Common Voice Bengali dataset — for understanding available training data

---

## P0 — Bengali Text-to-Speech (TTS) Research

> Runs in parallel with STT research. The agent's voice IS the product experience.

### What to Test

1. **Voice naturalness** — Does it sound like a real Bengali-speaking person?
2. **Pronunciation accuracy** — Medical terms, doctor names, hospital-specific words
3. **Latency** — Time from text input to first audio byte
4. **Emotional tone** — Can it sound professional and warm? (hospital context)

### Services to Evaluate

| Service | Test Focus | Notes |
|---------|-----------|-------|
| **Google Cloud TTS** | `bn-BD` neural voices | Best starting point |
| **Azure Neural TTS** | Bengali voice options | Compare with Google |
| **ElevenLabs** | Custom voice cloning for Bengali | Expensive but customizable |
| **Fish Audio / Coqui XTTS** | Open-source, self-hosted | For eventual custom hospital voice |

### How to Test

1. Prepare 20 sample responses the agent would actually say:
   - "আসসালামু আলাইকুম, [হাসপাতাল নাম]-এ আপনাকে স্বাগতম। আমি আপনাকে কিভাবে সাহায্য করতে পারি?"
   - "ডক্টর আহমেদ আগামীকাল সকাল ১০টায় পাওয়া যাবেন। আপনি কি এই সময়ে আসতে পারবেন?"
   - Various appointment confirmation/cancellation responses
2. Generate audio from each TTS service
3. Rate: naturalness (1-5), pronunciation (1-5), speed, latency
4. **Get non-technical Bengali speakers to rate them** — your perception as a developer will differ from a patient's

---

## P1 — Telephony in Bangladesh

> Can you actually receive phone calls programmatically in Bangladesh?

### What to Research

1. **VoIP/Cloud telephony providers that support BD numbers**
   - Twilio — check BD number availability and restrictions
   - Telnyx — test BD support
   - Vonage — Asian market focus
   - **Local BD providers**: Grameenphone API, Banglalink business, Robi corporate
   - SIP trunking providers in BD

2. **Key questions to answer**:
   - [ ] Can you get a local BD phone number (e.g., 01XXXXXXXXX) through any cloud provider?
   - [ ] If not, can you use a non-BD VoIP number and have calls forwarded?
   - [ ] What's the audio quality like on BD cellular networks via VoIP?
   - [ ] What's the per-minute cost for inbound calls?
   - [ ] Does the provider support WebSocket-based media streaming? (essential for real-time STT)
   - [ ] Can you handle concurrent calls? What are the limits?

3. **How to research**:
   - Sign up for Twilio, Telnyx, Vonage trial accounts
   - Try to buy/provision a BD number on each platform
   - If no cloud provider works, research BD telecom companies' business API offerings
   - Contact local BD VoIP resellers (search: "Bangladesh SIP trunk provider")
   - Look into Asterisk/FreeSWITCH as a self-hosted PBX that connects to BD telecom

4. **Test plan**:
   - Make a test call through each provider
   - Measure: audio quality, latency, dropped calls
   - Test WebSocket streaming if available
   - Test call transfer (to a human agent number)

### Resources

- Twilio BD availability: [twilio.com/en-us/phone-numbers/bangladesh](https://www.twilio.com/en-us/phone-numbers/bangladesh)
- Telnyx global coverage: [telnyx.com/number-lookup](https://telnyx.com/number-lookup)
- Search for "Bangladesh cloud telephony API" and "Bangladesh SIP provider"
- BTRC (Bangladesh Telecommunication Regulatory Commission) for regulations

---

## P2 — LLM Bengali Conversation Quality

> Can an LLM actually have a useful, natural conversation in Bengali?

### What to Test

1. **Bengali comprehension** — Does the LLM understand informal, spoken Bengali?
2. **Bengali generation** — Are its responses natural or textbook-sounding?
3. **Function calling in Bengali context** — Can it correctly extract patient name, doctor, date from Bengali speech?
4. **Dialect normalization** — Can the LLM "fix" a garbled STT transcription of dialectal Bengali?
5. **Conversation flow** — Can it manage a multi-turn appointment booking naturally?

### How to Test

1. **Set up a test bench** — Write a simple script that:
   ```
   Input: Bengali text (simulating STT output)
   → Send to LLM with your system prompt
   → Log: response quality, function calls made, latency
   ```

2. **Test each LLM**:
   | LLM | Bengali Skill | Function Calling | Cost |
   |-----|--------------|-----------------|------|
   | GPT-4o | Test it | ✅ Native | $$$ |
   | GPT-4o-mini | Test it | ✅ Native | $ |
   | Claude 3.5 Sonnet / Claude 4 | Test it | ✅ Native | $$ |
   | Gemini 2.5 Flash / Pro | Test it | ✅ Native | $ |
   | Llama 3 (70B, self-hosted) | Test it | Via prompting | GPU cost |

3. **Create test scenarios** (write these in Bengali):
   - Simple booking: "আমি ডক্টর রহমানের কাছে একটা appointment নিতে চাই"
   - Unclear intent: "ডাক্তার দেখাতে চাই" (which doctor? need to ask)
   - Dialect input: "আঁরে ডাহদার দ্যাহাইন্যা লাগবো" (Noakhali dialect for "I need to see a doctor")
   - Rescheduling: "আমার আগের appointment টা পরের সপ্তাহে নিতে চাই"
   - Abusive caller: [test profanity detection]
   - Symptom-based referral: "আমার মাথা ব্যথা আর জ্বর হচ্ছে"

4. **Key questions to answer**:
   - [ ] Which LLM produces the most natural Bengali responses?
   - [ ] Can the LLM correctly extract structured data (name, date, doctor) from Bengali?
   - [ ] How well does each LLM handle mixed Bengali-English input? (common in BD)
   - [ ] Can the LLM recover from bad STT transcriptions?
   - [ ] What's the response latency? (need < 2s for natural conversation)
   - [ ] What's the cost per conversation turn?

---

## P3 — Hospital Workflow & Domain Knowledge

> You're building for hospitals. You need to understand how they actually work.

### How to Research

1. **Visit 2-3 hospitals in person** (critical — don't skip this):
   - Sit in the reception area for 2-3 hours
   - Watch how patients call and book appointments
   - Note: What questions do receptionists ask? In what order?
   - Note: What are the most common requests?
   - Note: What problems do receptionists face?
   - Note: How is the doctor schedule maintained? (paper? software? whiteboard?)

2. **Interview hospital staff**:
   - Receptionists (2-3 people) — They are your real domain experts
   - Hospital administrator — Decision maker for software purchases
   - At least 1 doctor — Their perspective on scheduling

3. **Interview patients** (5-10 people):
   - How do they currently book appointments? (phone? walk-in? app?)
   - What frustrates them about the current process?
   - Would they trust an AI voice agent?
   - What language/dialect do they speak?

4. **Questions to answer**:
   - [ ] What's the typical appointment booking flow? (Step by step)
   - [ ] What information is collected? (name, phone, symptoms, insurance?)
   - [ ] How do hospitals handle walk-ins vs. phone bookings?
   - [ ] How is doctor availability tracked?
   - [ ] What's the average call duration for a booking?
   - [ ] How often are appointments rescheduled or cancelled?
   - [ ] What are the busiest calling hours?
   - [ ] Do hospitals use any existing software? (if so, what?)
   - [ ] What would make a hospital admin say "yes, I'll pay for this"?

5. **Document everything** — Create `HospitalWorkflows.md` with your findings

---

## P4 — Competitor & Market Analysis

> Know the landscape before you build.

### What to Research

1. **Direct competitors** (AI voice agents for healthcare):
   - Search: "AI voice agent hospital appointment booking"
   - Search: "healthcare voice AI SaaS"
   - Search: "বাংলা AI voice assistant" (Bengali AI voice assistant)
   - Look at: Hyro, Parlance, Infermedica, Luma Health, Syllable

2. **Adjacent competitors** (non-AI appointment systems in BD):
   - Hospital management systems used in Bangladesh
   - DocTime, Praava Health, etc. — existing BD health-tech startups
   - Any existing appointment booking apps in BD

3. **Global voice AI platforms** (learn from their architecture):
   - Bland AI, Vapi, Retell AI, Vocode — study their APIs and architecture
   - How do they handle real-time voice + LLM integration?

4. **Key questions**:
   - [ ] Is anyone doing Bengali voice AI for healthcare?
   - [ ] What's the pricing model of similar international products?
   - [ ] What features do competitors have that we should consider?
   - [ ] What are their weaknesses? (usually: no regional language support — that's our edge)
   - [ ] Can we use any open-source voice agent frameworks as a starting point?

### How to Research

- Sign up for demos of Bland AI, Vapi, Retell AI — experience their product firsthand
- Read their documentation to understand architecture patterns
- Check Product Hunt, G2, Capterra for healthcare voice AI tools
- Read case studies of voice AI in healthcare (even in English — the patterns transfer)

---

## P5 — Legal & Compliance

> Healthcare + Voice + Bangladesh = legal minefields. Research early, avoid pain later.

### What to Research

1. **Bangladesh Digital Security Act (2018)** — What are the data handling requirements?
2. **Call recording laws in Bangladesh** — Do you need consent? How to handle it?
3. **Patient data privacy** — Is there a BD equivalent of HIPAA?
4. **BTRC regulations** — Any rules around automated phone systems/IVR?
5. **If planning international expansion** — HIPAA (US), GDPR (EU) basics

### How to Research

- Read the Bangladesh Digital Security Act 2018 (available online in English)
- Consult a BD lawyer who specializes in tech/data privacy (budget ~5,000-10,000 BDT)
- Contact BTRC for regulations on automated calling systems
- Read HIPAA basics even if not immediately needed — investors will ask about it

### Questions to Answer

- [ ] Do you need explicit consent to record calls? (almost certainly yes)
- [ ] How long can you store patient data?
- [ ] What are the penalties for a data breach in BD?
- [ ] Can you use cloud servers outside Bangladesh for patient data?
- [ ] Do you need any license/registration to operate an automated phone service?

---

## P6 — Infrastructure & Cost Modeling

> Make sure the math works before you build.

### What to Research

1. **Cost per call** — Calculate the actual cost of one appointment booking call:
   ```
   Cost per call = 
       STT cost (avg 2 min audio × rate) +
       LLM cost (avg 6 turns × avg tokens × rate) +
       TTS cost (avg 1 min generated audio × rate) +
       Telephony cost (avg 3 min call × rate)
   ```

2. **Hosting options for BD market**:
   - AWS (Singapore region — closest to BD)
   - Google Cloud (Singapore)
   - Azure (Southeast Asia)
   - Local BD hosting (DigitalOcean/Vultr with BD-optimized routing)
   - Latency to BD from each — test with `ping`/`traceroute`

3. **Pricing strategy research**:
   - What do hospitals currently pay for receptionist staff?
   - What's the price sensitivity of BD hospitals?
   - What would a hospital consider "good value" for this service?
   - Per-call pricing vs. flat monthly fee — which fits BD market better?

### Questions to Answer

- [ ] What's the realistic cost per call with your chosen stack?
- [ ] At what call volume does the product become profitable?
- [ ] What monthly price would hospitals be willing to pay?
- [ ] Which cloud region gives the lowest latency to BD?

---

## 🛠️ Research Tools & Setup

Before starting research, set up these tools:

### Accounts to Create (Free Tiers)
- [ ] Google Cloud Platform account (for Speech-to-Text & TTS testing)
- [ ] OpenAI API account (for Whisper & GPT-4o testing)
- [ ] Anthropic API account (for Claude testing)
- [ ] Twilio trial account (for telephony testing)
- [ ] Telnyx trial account (for telephony testing)
- [ ] HuggingFace account (for open-source model access)

### Software to Install
- [ ] Python 3.12+ with a virtual environment
- [ ] `ffmpeg` (for audio processing)
- [ ] Audacity or similar (for recording test audio samples)
- [ ] A good microphone (for recording clear Bengali test audio)
- [ ] Postman or similar (for API testing)

### Research Repo Structure
```
plan-for-voxagent/
├── BackGround.md               ← (exists) Project background
├── overallProject.md           ← (exists) Full architecture plan  
├── HowToResearch.md            ← (this file) Research guide
├── STT_Evaluation.md           ← (create after P0) STT comparison results
├── TTS_Evaluation.md           ← (create after P0) TTS comparison results
├── TelephonyResearch.md        ← (create after P1) Telephony findings
├── LLM_Evaluation.md           ← (create after P2) LLM comparison results
├── HospitalWorkflows.md        ← (create after P3) Real hospital observations
├── CompetitorAnalysis.md       ← (create after P4) Market landscape
├── LegalCompliance.md          ← (create after P5) Legal requirements
├── CostModel.md                ← (create after P6) Cost calculations
└── ResearchSummary.md          ← (create at end) Key decisions & rationale
```

---

## ✅ Research Completion Checklist

When you finish all phases, you should be able to confidently answer:

- [ ] **STT**: "We will use [X] for STT because it has [Y] accuracy on Bengali with [Z] latency"
- [ ] **TTS**: "We will use [X] for TTS because it sounds [Y] and costs [Z]"
- [ ] **Telephony**: "We will use [X] for phone calls because it [Y] and costs [Z]/min in BD"
- [ ] **LLM**: "We will use [X] as our LLM because it handles Bengali [Y] and costs [Z]/call"
- [ ] **Hospital flow**: "The typical booking flow is [X steps] and takes [Y minutes]"
- [ ] **Competition**: "Our main advantage is [X], competitors lack [Y]"
- [ ] **Legal**: "We need [X consent] and must [Y with data]"
- [ ] **Cost**: "Each call costs us ~[X] BDT, and we'll charge hospitals [Y] BDT/month"

**Only after completing this checklist should you move to coding Phase 1 from the `overallProject.md` roadmap.**

---

## 💡 Research Tips

1. **Document EVERYTHING** — Even negative results ("X doesn't work for Bengali") are valuable
2. **Record your test calls** — You'll reference them later for fine-tuning
3. **Talk to real people** — Hospital visits are more valuable than 10 hours of online research
4. **Time-box each phase** — Don't over-research. "Good enough" decisions now > "perfect" decisions in 3 months
5. **Share findings with your team** — Your 2 co-founders should review research results and help with business/market questions
6. **Build tiny prototypes** — A 50-line Python script testing an API teaches more than reading docs for 2 days
7. **Start with the riskiest unknown** — That's Bengali STT. If it doesn't work, you need to know ASAP
