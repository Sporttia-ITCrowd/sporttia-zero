# Project Brief: Sporttia ZERO

## Executive Summary

**Sporttia ZERO** is an AI-powered conversational assistant that streamlines the onboarding of new sports centers onto the Sporttia platform. Through an intelligent chat interface powered by ChatGPT, potential customers are guided through a series of questions to capture all necessary information for creating their sports center. Upon completion, the system automatically provisions the sports center via Sporttia's existing API and sends a comprehensive welcome email through Resend with all account details.

---

## Problem Statement

### Current State & Pain Points

Sports center owners wanting to join the Sporttia platform face a fragmented onboarding experience. The current process likely involves:
- Manual form submissions or back-and-forth emails
- Waiting for sales/support staff to process requests
- Multiple touchpoints before the center is live
- Potential for data entry errors and miscommunication

### Impact of the Problem

- **Lost conversions:** Interested prospects drop off due to friction
- **Delayed time-to-value:** New customers wait days/weeks instead of minutes
- **Operational overhead:** Staff time spent on repetitive onboarding tasks
- **Limited scalability:** Growth is bottlenecked by human processing capacity
- **Off-hours abandonment:** Prospects visiting at night/weekends can't complete signup

### Why Existing Solutions Fall Short

Traditional signup forms are impersonal and can't answer questions. Manual sales processes don't scale and aren't available 24/7. Competitors may offer faster onboarding, putting Sporttia at a disadvantage.

### Urgency

In a competitive market for sports center management software, frictionless onboarding is becoming table stakes. Every day without this capability means potential customers going to competitors.

---

## Proposed Solution

### Core Concept

Sporttia ZERO is an AI-powered onboarding assistant accessible at `zero.sporttia.com`. When a potential customer arrives, they engage in a natural conversation with an AI agent that:

1. **Welcomes & qualifies** - Understands what type of sports center they run
2. **Gathers information** - Collects all required data through conversation (name, contact, facilities, sports offered, etc.)
3. **Answers questions** - Handles objections and inquiries about Sporttia in real-time
4. **Confirms configuration** - Shows full summary of the sports center setup before creation
5. **Creates the account** - Calls Sporttia Service API to provision the sports center
6. **Confirms via email** - Sends welcome email through Resend with credentials and next steps

### Key Differentiators

| vs. Traditional Forms | vs. Manual Sales |
|-----------------------|------------------|
| Conversational, not transactional | Available 24/7/365 |
| Adapts to user's pace & questions | Instant provisioning |
| Feels like talking to a helpful expert | Zero labor cost per signup |

### Why This Will Succeed

- **Existing infrastructure:** Leverages proven Sporttia API - no reinventing the wheel
- **Modern UX expectations:** Users increasingly prefer chat interfaces
- **Proven AI capability:** ChatGPT excels at structured information gathering
- **Clear scope:** Single purpose = easier to build and perfect

### High-Level Vision

A prospect can go from "curious visitor" to "active sports center on Sporttia" in a single 5-10 minute conversation, any time of day, in any language ChatGPT supports.

---

## Target Users

### Primary User Segment: Sports Center Owners/Managers

**Profile:**
- Owners or managers of sports facilities (gyms, padel clubs, tennis centers, swimming pools, multi-sport complexes)
- Small to medium business operators
- Age range: 30-55 typically
- May or may not be tech-savvy
- Often wearing multiple hats (operations, marketing, customer service)

**Current Behaviors & Workflows:**
- Managing bookings via phone, WhatsApp, or basic tools
- Struggling with manual scheduling and payment collection
- Researching software solutions to modernize operations
- Visiting competitor websites, comparing features

**Specific Needs & Pain Points:**
- Want to digitize operations but fear complexity
- Need quick setup - can't afford weeks of implementation
- Want to see value before committing
- May have questions about pricing, features, migration

**Goals:**
- Get their sports center online and taking bookings ASAP
- Reduce administrative overhead
- Grow their customer base
- Look professional and modern

### Secondary User Segment: Franchise/Chain Decision Makers

**Profile:**
- Regional managers or corporate staff evaluating solutions for multiple locations
- More structured buying process
- Higher stakes, larger deal size

**Needs:**
- May use ZERO for initial exploration before engaging sales team
- Want to understand platform capabilities quickly

---

## Goals & Success Metrics

### Business Objectives

- **Increase new customer acquisition** by providing a 24/7 frictionless signup channel
- **Reduce cost per acquisition** by automating the onboarding process (target: <€1 per signup in AI costs)
- **Accelerate time-to-activation** from days/weeks to minutes
- **Scale customer growth** without proportional increase in sales/support headcount
- **Capture leads** even when full signup isn't completed (email collection for follow-up)

### User Success Metrics

- **Completion rate:** % of users who start the chat and successfully create a sports center
- **Time to completion:** Average conversation duration from start to account created
- **Satisfaction score:** Post-signup survey or NPS rating
- **First actuation time:** How quickly new centers perform their first meaningful action (booking created, user created, facility configured, etc.)

### Key Performance Indicators (KPIs)

| KPI | Definition | Target |
|-----|------------|--------|
| **Conversation Start Rate** | Visitors who engage with chat / Total visitors | >40% |
| **Completion Rate** | Sports centers created / Conversations started | >25% |
| **Avg. Conversation Time** | Mean time from first message to account created | <10 min |
| **Cost per Acquisition** | Total AI + infra costs / Sports centers created | <€2 |
| **Email Capture Rate** | Emails collected / Conversations started | >60% |
| **Error Rate** | Failed API calls or broken conversations | <2% |

---

## MVP Scope

### Core Features (Must Have)

- **AI Chat Interface:** Conversational UI where users interact with ChatGPT-powered assistant

- **Multi-Language Support:** Detect user's browser language and start conversation in that language
  - Detect browser language via `navigator.language` on page load
  - Initialize conversation with detected language (ISO-639 code)
  - AI responds in detected language from the first message
  - Capture language for the sports center configuration

- **Structured Data Collection:** Gather all required fields through natural conversation:
  - **Sports Center:** Name, language (ISO-639), city
  - **Admin User:** Name, email
  - **Facilities:** Unlimited facilities, each with:
    - Facility name
    - Sport type (fetched from `api.sporttia.com/v7/sports`)
    - Schedules: weekdays, time start, time end, duration, rate

- **Sports API Integration:** Fetch available sports from Sporttia API to guide user selection

- **Configuration Confirmation:** AI presents full summary of sports center setup before creation

- **Conversation Persistence:** Store conversation history in PostgreSQL for context & debugging

- **Sporttia API Integration:** Call `POST /v7/zeros/sportcenters` to create:
  - Freemium sports center (full capabilities enabled)
  - Admin user account
  - Facilities with schedules and rates

- **Email Confirmation:** Send welcome email via Resend with:
  - Account credentials / login link to Sporttia Manager
  - Summary of center details
  - Freemium usage caps/limits
  - Next steps to get started

- **Admin Dashboard:** Web interface for monitoring:
  - Active/completed conversations
  - Conversion funnel metrics
  - Error logs and failed signups
  - Conversation transcripts for review

- **Human Escalation:** When AI can't help, redirect user to sales@sporttia.com

- **Basic Error Handling:** Graceful recovery when API calls fail or AI gets confused

- **Analytics Foundation:** Track key events (conversation start, completion, drop-off points)

### Out of Scope for MVP

- Captcha/anti-abuse protection (monitor for abuse, add if needed)
- Payment/pricing discussions within the chat
- Integration with CRM systems
- A/B testing framework
- Custom branding per referral source
- Voice interface
- Mobile app (web-only)
- Lead nurturing workflows for incomplete signups (just capture email)
- Conversation recovery for returning users (treated as new)
- Advanced conversation branching for complex edge cases

### MVP Success Criteria

The MVP is successful when:
1. A user can complete the full journey: arrive → chat → freemium sports center created (with facilities) → email received
2. The system handles at least 50 concurrent conversations without degradation
3. 80% of test users complete signup without human intervention
4. Average conversation time is under 10 minutes
5. System operates with >99% uptime
6. Conversations work seamlessly in at least Spanish, English, and Portuguese

---

## Post-MVP Vision

### Phase 2 Features

- **Anti-abuse Protection:** Add captcha/Turnstile if spam becomes an issue
- **Lead Nurturing:** Email follow-up for abandoned conversations (captured emails)
- **CRM Integration:** Sync new signups with sales CRM (HubSpot, Salesforce, etc.)
- **A/B Testing:** Experiment with different conversation flows and prompts
- **Advanced Analytics:** Funnel analysis, drop-off heatmaps, conversation insights
- **Conversation Recovery:** Allow returning users to resume previous sessions
- **Referral Tracking:** UTM parameters and source attribution

### Long-term Vision (6-12 months)

- **Voice Interface:** Allow voice-based onboarding via Web Speech API
- **WhatsApp/Telegram Integration:** Meet users on their preferred channels
- **AI-Assisted Onboarding:** Extend ZERO to help configure advanced features post-signup
- **Multi-tenant White-label:** Offer ZERO technology to Sporttia partners/resellers
- **Predictive Insights:** AI identifies high-value prospects based on conversation signals

### Expansion Opportunities

- **Upsell Automation:** AI suggests premium features during or after onboarding
- **Onboarding for Other Products:** Apply ZERO pattern to other Sporttia services
- **Localized Campaigns:** Market-specific landing pages and conversation flows
- **Integration Marketplace:** Connect new sports centers with equipment vendors, insurance, etc.

---

## Technical Considerations

### Platform Requirements

| Requirement | Specification |
|-------------|---------------|
| **Target Platforms** | Web (responsive for desktop & mobile browsers) |
| **Browser Support** | Modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions) |
| **Performance** | Chat response < 3s, API calls < 5s, page load < 2s |
| **Availability** | 99.9% uptime target |
| **Concurrent Users** | Support 50+ simultaneous conversations |

### Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend** | React | New build, chat-focused UI |
| **Backend** | Node.js + Express.js | REST API server |
| **Database** | PostgreSQL | Google Cloud SQL (isolated instance) |
| **AI/LLM** | OpenAI ChatGPT API | GPT-4 or GPT-4-turbo |
| **Email** | Resend | Transactional welcome emails |
| **Hosting** | Google Cloud Platform | Compute Engine instance (GKE later) |

### Architecture

**Repository Structure:**
```
sporttia-zero/
├── apps/
│   ├── api/          # Express.js backend
│   └── web/          # React frontend
├── packages/
│   └── shared/       # Shared types, utilities
├── package.json      # Monorepo root
└── README.md
```

**Service Architecture:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   React     │────▶│  Express    │────▶│  PostgreSQL     │
│   Frontend  │     │  Backend    │     │  (Cloud SQL)    │
└─────────────┘     └──────┬──────┘     └─────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ OpenAI   │ │ Sporttia │ │ Resend   │
        │ ChatGPT  │ │ API      │ │ Email    │
        └──────────┘ └──────────┘ └──────────┘
```

**Deployment Strategy:**
- **Phase 1 (MVP):** Single GCE instance running both frontend (Nginx/static) and backend (Node.js)
- **Phase 2:** Migrate to GKE for horizontal scaling and orchestration

### External Integrations

| Service | Endpoint | Auth | Purpose |
|---------|----------|------|---------|
| **Sporttia API** | `preapi.sporttia.com` (pre) / `api.sporttia.com` (prod) | None | Sport validation, city lookup, sports center creation |
| **Sporttia Sports** | `GET /v7/sports` | None | Fetch sports for validation (not displayed to user) |
| **Sporttia Cities** | `GET /v7/cities` | None | Lookup city ID by name |
| **Sporttia Create** | `POST /v7/zeros/sportcenters` | None | Create sports center |
| **OpenAI** | `api.openai.com` | API Key | Chat completions |
| **Resend** | `api.resend.com` | API Key | Welcome emails |

### Data Model (High-Level)

```
conversations
├── id, session_id, language
├── status (active, completed, abandoned)
├── created_at, updated_at
└── sports_center_id (FK, nullable)

messages
├── id, conversation_id (FK)
├── role (user, assistant, system)
├── content, timestamp
└── metadata (tokens used, etc.)

sports_centers_created
├── id, conversation_id (FK)
├── sporttia_id (from API response)
├── name, city, city_id (from /v7/cities), language
├── admin_email
└── created_at
```

### Security Considerations

- HTTPS everywhere (via GCP load balancer or Let's Encrypt)
- API keys in GCP Secret Manager
- No PII logged in plain text
- GDPR considerations for EU users (consent, data retention)
- Rate limiting on chat endpoints (application-level)
- Monitor for API abuse (no captcha in MVP)

---

## Constraints & Assumptions

### Constraints

| Category | Constraint |
|----------|------------|
| **Technical** | Must integrate with existing Sporttia API |
| **Technical** | PostgreSQL on Google Cloud SQL |
| **Technical** | GCE instance initially, GKE migration planned |
| **Infrastructure** | Use existing GCP project |
| **External** | OpenAI API availability and rate limits |
| **External** | Sporttia API stability (critical path) |
| **External** | Resend email deliverability |

### Key Assumptions

**Business Assumptions:**
- Freemium sports centers have meaningful conversion to paid tiers
- 24/7 availability is important for target market
- Sports center owners are comfortable with chat-based signup
- Multi-language support will drive international adoption

**Technical Assumptions:**
- Sporttia API supports all required operations via `POST /v7/zeros/sportcenters`
- OpenAI GPT-4 function calling can reliably extract structured facility/schedule data
- Single GCE instance can handle initial traffic (50+ concurrent conversations)
- PostgreSQL Cloud SQL provides sufficient performance for conversation storage

**User Assumptions:**
- Users will provide accurate information
- Average conversation will involve 1-3 facilities
- Users have email access to receive welcome message
- Users understand basic concepts (facility, schedule, rate)

---

## Risks & Open Questions

### Key Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **AI hallucination / bad data** | Sports center created with incorrect info | Medium | Confirmation step before API call showing full config |
| **Abuse of public API** | Spam/fake sports centers | Medium | Deferred to post-MVP; monitor for abuse patterns |
| **OpenAI API outage** | Service unavailable | Low | Graceful degradation message |
| **Complex schedule input** | Users struggle via chat | Medium | Smart defaults; examples; visual confirmation |
| **Conversation abandonment** | Users drop off | High | Accept as new user; no recovery needed |
| **Cost overrun** | High API costs | Medium | Token limits; conversation guardrails |
| **Email deliverability** | Emails go to spam | Low | Proper Resend/SPF/DKIM setup |
| **AI unable to help** | Edge cases | Low | Redirect to sales@sporttia.com |

### Resolved Decisions

| Topic | Decision |
|-------|----------|
| After creation | User gets credentials for **Sporttia Manager** |
| Preview before submit | **Yes** - AI shows full config summary |
| Abandoned users | Treated as **new users** (no recovery) |
| Human escalation | Redirect to **sales@sporttia.com** |
| Welcome email sender | **Sporttia ZERO** via Resend |
| Captcha | **Not in MVP** - monitor for abuse |

### Remaining Open Questions

**Technical:**
- Exact payload structure for `POST /v7/zeros/sportcenters`
- What credentials/data does the API return after creation?

**Business:**
- Target launch date?
- Success threshold to consider MVP validated?

---

## Next Steps

### Immediate Actions

1. **Set up monorepo** - Initialize project structure with `apps/api` and `apps/web`
2. **Configure GCP resources** - Cloud SQL instance, GCE VM, networking
3. **Set up Resend** - Domain verification, email template design
4. **Design conversation flow** - Map out the full dialogue tree and data collection points
5. **Create PRD** - Transform this brief into detailed product requirements
6. **Validate Sporttia API** - Test `POST /v7/zeros/sportcenters` in pre environment; document exact payload/response

---

## PM Handoff

This Project Brief provides the full context for **Sporttia ZERO**. Please start in 'PRD Generation Mode', review the brief thoroughly to work with the user to create the PRD section by section as the template indicates, asking for any necessary clarification or suggesting improvements.
