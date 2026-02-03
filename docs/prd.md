# Sporttia ZERO Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- **Enable 24/7 automated onboarding** of new sports centers onto the Sporttia platform via AI chat
- **Reduce customer acquisition friction** from days/weeks to minutes
- **Achieve >25% conversation-to-signup conversion rate** with <10 minute average completion time
- **Support multi-language onboarding** (Spanish, English, Portuguese minimum) with ISO-639 language capture
- **Provide operations visibility** through an admin dashboard for monitoring conversations and metrics
- **Deliver freemium sports centers** with full capabilities, including facilities and schedules configured via chat
- **Scale acquisition** without proportional increase in sales/support headcount

### Background Context

Sporttia is a sports center management platform serving gyms, padel clubs, tennis centers, and multi-sport facilities. Currently, onboarding new sports centers involves manual processes, sales interactions, and multi-day delays—creating friction that causes prospect drop-off and limits growth.

Sporttia ZERO addresses this by providing an AI-powered conversational assistant at `zero.sporttia.com`. Using ChatGPT, the system guides prospective customers through a natural dialogue to collect all required information (center details, admin user, facilities with schedules), then automatically provisions a freemium sports center directly in the Sporttia database (via the internal ZeroService) and sends a welcome email with credentials to access Sporttia Manager.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-01-19 | 0.4 | ZeroService now connects directly to Sporttia MySQL database (not external API) | Claude |
| 2026-01-19 | 0.3 | Updated creation flow: AI now calls create_sports_center function instead of outputting JSON | Claude |
| 2026-01-19 | 0.2 | Changed sports center creation from external Sporttia API to internal ZeroService | Claude |
| 2026-01-16 | 0.1 | Initial PRD draft from Project Brief | BMad Master |

---

## Requirements

### Functional Requirements

**Chat & Conversation**
- **FR1:** The system shall provide a web-based chat interface where users interact with an AI assistant powered by ChatGPT
- **FR2:** The system shall detect the user's browser language (via `navigator.language`) and initialize the conversation in that language. The AI shall then conduct the conversation in that language
- **FR3:** The AI shall capture the ISO-639 language code to set as the sports center's default language
- **FR4:** The system shall persist all conversation messages in the database with timestamps and metadata
- **FR5:** The AI shall collect the following sports center data through conversation:
  - Sports center name
  - City
  - Language (ISO-639)
- **FR6:** The AI shall collect admin user data:
  - Name
  - Email
- **FR7:** The AI shall collect facility information (one or more facilities):
  - Facility name
  - Sport type (selected from available sports via API)
  - Schedule: weekdays, start time, end time, duration, rate
- **FR8:** The system shall fetch available sports from `GET /v7/sports` to guide sport selection
- **FR9:** The AI shall present a complete configuration summary to the user before final submission
- **FR10:** The user shall explicitly confirm the configuration before the sports center is created
- **FR11:** When AI cannot assist the user, it shall redirect them to sales@sporttia.com

**Sports Center Creation**
- **FR12:** Upon user confirmation, the system shall use the internal ZeroService to create the sports center directly in the Sporttia database with all collected data (customer, sportcenter, subscription, licences, admin user, facilities, schedules)
- **FR13:** The system shall store the created sports center reference (sporttia_id) in the local database
- **FR14:** The system shall handle creation errors gracefully and inform the user of any issues

**Email Notification**
- **FR15:** Upon successful sports center creation, the system shall send a welcome email via Resend containing:
  - Account credentials / login link to Sporttia Manager
  - Summary of sports center configuration
  - Freemium usage caps/limits
  - Next steps to get started
- **FR16:** The email shall be sent from the Sporttia ZERO system (not Sporttia Service)

**Admin Dashboard**
- **FR17:** The system shall provide an admin web interface to view all conversations
- **FR18:** The admin dashboard shall display conversation status (active, completed, abandoned)
- **FR19:** The admin dashboard shall show conversion funnel metrics (started, completed, abandoned)
- **FR20:** The admin dashboard shall display error logs and failed signup attempts
- **FR21:** The admin dashboard shall allow viewing full conversation transcripts
- **FR22:** Admin users shall authenticate via Sporttia API (`POST /v7/login`)
- **FR23:** Only authenticated Sporttia admin users can access the admin dashboard

**Analytics**
- **FR24:** The system shall track and store key events: conversation start, email captured, completion, abandonment, errors

### Non-Functional Requirements

**Performance**
- **NFR1:** Chat responses shall be delivered within 3 seconds under normal load
- **NFR2:** API calls to Sporttia and Resend shall complete within 5 seconds
- **NFR3:** Page load time shall be under 2 seconds
- **NFR4:** The system shall support at least 50 concurrent conversations

**Availability & Reliability**
- **NFR5:** The system shall maintain 99.9% uptime
- **NFR6:** The system shall gracefully degrade when OpenAI API is unavailable, displaying an appropriate message

**Security**
- **NFR7:** All traffic shall be served over HTTPS
- **NFR8:** API keys shall be stored in GCP Secret Manager, not in code
- **NFR9:** No PII shall be logged in plain text
- **NFR10:** Application-level rate limiting shall be implemented on chat endpoints

**Internationalization**
- **NFR11:** The system shall support conversations in at least Spanish, English, and Portuguese
- **NFR12:** The chat interface shall adapt to the detected user language

**Compliance**
- **NFR13:** The system shall support GDPR requirements for EU users (consent, data handling)

**Cost**
- **NFR14:** Target cost per acquisition shall be under €2 (AI + infrastructure costs)

---

## User Interface Design Goals

### Overall UX Vision

Sporttia ZERO should feel like chatting with a knowledgeable, friendly Sporttia expert who guides you effortlessly through setting up your sports center. The experience should be:

- **Conversational first** - Natural dialogue, not a form in disguise
- **Confidence-building** - Clear progress indication and confirmation before commitment
- **Frictionless** - Minimal clicks, smart defaults, instant feedback
- **Professional** - Reflects Sporttia brand quality and trustworthiness

The admin dashboard should be utilitarian and data-focused, prioritizing quick access to conversation status, metrics, and transcripts over visual flourish.

### Key Interaction Paradigms

| Paradigm | Application |
|----------|-------------|
| **Chat/Messaging** | Primary user interaction - familiar mobile/web chat UX |
| **Progressive Disclosure** | Reveal complexity gradually (facilities → schedules → rates) |
| **Confirmation Pattern** | Summary screen before final submission |
| **Real-time Feedback** | Typing indicators, message delivery status |
| **Dashboard/Tables** | Admin interface for viewing conversations and metrics |

### Core Screens and Views

**Public Chat Application:**
1. **Welcome/Landing** - Brief intro + chat initiation
2. **Chat Interface** - Main conversation view with message history
3. **Configuration Summary** - Review all collected data before submission
4. **Success Screen** - Confirmation with next steps after sports center created
5. **Error/Escalation** - Graceful failure with redirect to sales@sporttia.com

**Admin Dashboard:**
1. **Login** - Authentication via Sporttia API
2. **Dashboard Overview** - Key metrics (conversations today, conversion rate, active chats)
3. **Conversations List** - Filterable table of all conversations with status
4. **Conversation Detail** - Full transcript view with metadata
5. **Error Log** - Failed API calls and issues

### Accessibility

**WCAG AA** - Standard accessibility compliance including:
- Keyboard navigation support
- Screen reader compatibility
- Sufficient color contrast
- Focus indicators

### Branding

- Align with existing Sporttia visual identity (sporttia.com)
- Use Sporttia brand colors, typography, and logo
- Clean, modern, professional aesthetic

### Target Devices and Platforms

**Web Responsive** - Optimized for:
- Desktop browsers (primary admin dashboard use)
- Mobile browsers (primary chat use)
- Tablet (supported but not primary)

Modern browsers: Chrome, Firefox, Safari, Edge (last 2 versions)

---

## Technical Assumptions

### Repository Structure: Monorepo

```
sporttia-zero/
├── apps/
│   ├── api/          # Express.js backend (serves both web and admin)
│   ├── web/          # React - Public chat interface
│   └── admin/        # React - Admin dashboard (conversations, metrics)
├── packages/
│   └── shared/       # Shared types, utilities, components
├── package.json      # Monorepo root
└── README.md
```

### Service Architecture

**Modular Monolith** - Single Express.js backend with clear module separation:

| Module | Responsibility |
|--------|----------------|
| `chat` | Conversation management, message handling |
| `ai` | OpenAI integration, prompt engineering |
| `sporttia` | Sporttia API client (sports list, center creation) |
| `email` | Resend integration, email templates |
| `admin` | Dashboard API endpoints (conversations list, transcripts, metrics) |
| `analytics` | Event tracking, metrics aggregation |

### Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Frontend** | React | User preference; strong ecosystem for chat UIs |
| **Backend** | Node.js + Express.js | User preference; good for real-time chat, async operations |
| **Database** | PostgreSQL (Cloud SQL) | Relational data fits conversation/message model; existing GCP infra |
| **AI/LLM** | OpenAI GPT-4 / GPT-4-turbo | Best-in-class for conversational AI; function calling for structured extraction |
| **Email** | Resend | Modern API, good deliverability, simple integration |
| **Hosting** | Google Compute Engine | User preference; simple single instance for MVP |
| **Future Scaling** | Google Kubernetes Engine | Planned migration path when scale requires |

### External Integrations

| Service | Endpoint | Auth | Purpose |
|---------|----------|------|---------|
| **Sporttia Sports** | `GET /v7/sports` | None | Fetch available sports |
| **Sporttia Auth** | `POST /v7/login` | None | Admin authentication |
| **OpenAI** | `api.openai.com` | API Key | Chat completions with function calling |
| **Resend** | `api.resend.com` | API Key | Welcome emails |

**Note:** Sports center creation is handled internally by ZeroService (not via external API), which directly creates records in the Sporttia database (customers, sportcenters, subscriptions, licences, groups, users, purses, fields, terrains, prices, schedules).

**Sporttia API Hosts:**
- Pre-production: `preapi.sporttia.com`
- Production: `api.sporttia.com`

### Testing Requirements

| Type | Scope | Tools (Suggested) |
|------|-------|-------------------|
| **Unit Tests** | Business logic, utilities, AI prompt functions | Jest / Vitest |
| **Integration Tests** | API endpoints, database operations | Supertest + test database |
| **E2E Tests** | Critical user journeys (optional for MVP) | Playwright / Cypress |

### Additional Technical Assumptions

- TypeScript for both frontend and backend
- Shared types in `packages/shared`
- Environment-based configuration (pre, prod)
- Structured logging for debugging conversations
- No captcha in MVP (monitor for abuse, add post-MVP if needed)
- Secrets stored in GCP Secret Manager

---

## Epic List

| Epic | Title | Goal |
|------|-------|------|
| **Epic 1** | Foundation & Chat Infrastructure | Establish project setup, database, and basic AI chat functionality that can hold a conversation |
| **Epic 2** | Sports Center Onboarding Flow | Enable complete end-to-end flow: data collection → Sporttia API → email confirmation |
| **Epic 3** | Admin Dashboard | Provide operations visibility into conversations, metrics, and errors |

---

## Epic 1: Foundation & Chat Infrastructure

**Goal:** Establish project setup, database, and basic AI chat functionality that allows a user to have a multi-turn conversation with an AI assistant.

**Value Delivered:** A working chat application that proves the conversational AI works before adding Sporttia-specific business logic.

### Story 1.1: Monorepo Project Scaffolding

**As a** developer,
**I want** a properly structured monorepo with all apps and packages initialized,
**so that** I have a solid foundation to build upon.

**Acceptance Criteria:**
1. Monorepo root initialized with `package.json` and npm workspaces (or Turborepo)
2. `apps/api` created with Express.js + TypeScript configuration
3. `apps/web` created with React + TypeScript (Vite recommended)
4. `apps/admin` created with React + TypeScript (placeholder, minimal setup)
5. `packages/shared` created for shared TypeScript types
6. ESLint and Prettier configured at root level
7. `.gitignore` properly configured
8. Environment variable structure defined (`.env.example` files)
9. `README.md` with basic setup instructions
10. All apps can be started with a single command from root

### Story 1.2: Database Schema & Connection

**As a** developer,
**I want** the PostgreSQL database schema created and connected,
**so that** I can persist conversations and messages.

**Acceptance Criteria:**
1. PostgreSQL connection configured in `apps/api` using environment variables
2. Database client/ORM set up (e.g., Prisma, Drizzle, or raw pg)
3. `conversations` table created with: id, session_id, language, status (active/completed/abandoned), created_at, updated_at
4. `messages` table created with: id, conversation_id (FK), role (user/assistant/system), content, timestamp, metadata (JSON)
5. Database migrations script or setup documented
6. Connection pooling configured for production use
7. Health check endpoint verifies database connectivity
8. Shared types for Conversation and Message exported from `packages/shared`

### Story 1.3: Core API Endpoints

**As a** developer,
**I want** basic API endpoints for conversation management,
**so that** the frontend can create and interact with conversations.

**Acceptance Criteria:**
1. `POST /api/conversations` - Creates new conversation, returns conversation ID and session
2. `GET /api/conversations/:id` - Retrieves conversation with all messages
3. `POST /api/conversations/:id/messages` - Adds a user message to conversation
4. API responses follow consistent JSON structure with proper error handling
5. Request validation implemented (conversation exists, required fields present)
6. Structured logging for all API requests
7. CORS configured to allow frontend origins
8. API health check endpoint (`GET /api/health`) returns status and DB connectivity

### Story 1.4: Chat UI Foundation

**As a** user,
**I want** a clean chat interface where I can type and see messages,
**so that** I can have a conversation.

**Acceptance Criteria:**
1. React app displays a chat interface with message history area and input field
2. Messages display with visual distinction between user and assistant
3. Input field allows typing and sending via Enter key or send button
4. Chat auto-scrolls to latest message
5. Loading/typing indicator shown while waiting for response
6. Basic responsive design (works on mobile and desktop)
7. Conversation session created on first page load
8. Messages sent to API and response displayed in chat
9. Basic error handling (show user-friendly message if API fails)

### Story 1.5: OpenAI Integration

**As a** developer,
**I want** the API to integrate with OpenAI ChatGPT,
**so that** the assistant can generate intelligent responses.

**Acceptance Criteria:**
1. OpenAI client configured in `apps/api` using API key from environment
2. System prompt defined for Sporttia ZERO assistant persona
3. `POST /api/conversations/:id/messages` now calls OpenAI and returns AI response
4. Conversation history sent to OpenAI for context (multi-turn support)
5. AI response saved to database as assistant message
6. Token usage logged for cost monitoring
7. Timeout handling for slow OpenAI responses
8. Error handling for OpenAI API failures (rate limits, outages)
9. Response streaming optional (can be added, but basic request/response works first)

### Story 1.6: Language Detection & Adaptation

**As a** user,
**I want** the assistant to respond in my language,
**so that** I can communicate naturally.

**Acceptance Criteria:**
1. Frontend detects user's browser language via `navigator.language` on page load
2. Conversation is created with the detected browser language (ISO-639 code)
3. AI receives the language in the system prompt and responds in that language from the first message
4. AI may adjust language if user explicitly writes in a different language
5. Works correctly for Spanish, English, and Portuguese at minimum
6. Language stored in conversation record for later use

---

## Epic 2: Sports Center Onboarding Flow

**Goal:** Enable the complete end-to-end flow where a user provides all required information through conversation, confirms the configuration, and gets a freemium sports center created with a welcome email.

**Value Delivered:** The core product value - a user can actually create a sports center through chat.

### Story 2.1: Sporttia API Client & ZeroService

**As a** developer,
**I want** a client module to interact with Sporttia APIs and a ZeroService to create sports centers,
**so that** I can fetch sports and create complete sports centers with all related entities.

**Acceptance Criteria:**
1. Sporttia API client module created in `apps/api`
2. Environment-based host configuration (`preapi.sporttia.com` / `api.sporttia.com`)
3. `GET /v7/sports` implemented - fetches and caches sports list for validation (not displayed to user)
4. `GET /v7/cities` implemented - looks up city ID by name for sports center location
5. ZeroService created to handle sports center creation directly in database:
   - Creates customer record
   - Creates sportcenter record with visible=1 (public) and zero=true flag
   - Creates 3-month subscription with ACTIVE status
   - Creates 3 monthly licences with PAID status
   - Creates admin group with privileges 11, 12, 13, 24, 26, 28
   - Creates admin user with generated login and temporary password
   - Creates purse for admin user
   - Creates facilities (fields) with terrain, prices, schedules, and slots
6. Proper error handling with transaction rollback on failures
7. Response types defined in `packages/shared`
8. Logging for all operations (API calls and database operations)
9. Sports list cached in memory with reasonable TTL (for validation)

### Story 2.2: OpenAI Function Calling Setup

**As a** developer,
**I want** OpenAI function calling configured for structured data extraction,
**so that** the AI can reliably capture sports center information.

**Acceptance Criteria:**
1. OpenAI function definitions created for data collection and actions:
   - `collect_sports_center_info` (name, city, language)
   - `collect_admin_info` (name, email)
   - `collect_facility` (name, sport, schedules)
   - `confirm_configuration` (user confirms readiness)
   - `create_sports_center` (triggers sports center creation in Sporttia)
   - `request_human_help` (escalation trigger)
2. Functions integrated into chat completion calls
3. Function call results parsed and stored in conversation metadata
4. AI guided by system prompt to use functions at appropriate moments
5. Collected data accumulated across conversation turns
6. Partial data persisted (survives page refresh within session)

### Story 2.3: Sports Center Data Collection Flow

**As a** user,
**I want** the AI to guide me through providing my sports center details,
**so that** I can set up my center information.

**Acceptance Criteria:**
1. AI asks for and captures sports center name
2. AI asks for city only (country is inferred from context; AI asks for clarification if ambiguous)
3. AI confirms/captures language (ISO-639 code based on conversation)
4. AI asks for admin name
5. AI asks for and validates admin email format
6. Data collection feels conversational, not like a form
7. AI handles corrections gracefully ("Actually, the name should be...")
8. Collected data visible in conversation metadata/state
9. AI provides encouraging feedback as data is collected

### Story 2.4: Facility & Schedule Collection

**As a** user,
**I want** to add facilities with their schedules through conversation,
**so that** my sports center is configured with bookable resources.

**Acceptance Criteria:**
1. AI lets user mention any sport; validates against Sporttia API (sports list not displayed)
2. AI collects facility name for each facility
3. AI collects schedule details:
   - Weekdays (which days)
   - Start time
   - End time
   - Duration (slot length)
   - Rate (price)
4. AI confirms each facility before moving to next
5. AI asks if user wants to add another facility
6. AI handles multiple facilities in single conversation
7. Smart defaults suggested (e.g., "typical hours are 9:00-21:00")
8. AI validates logical consistency (end > start, reasonable durations)
9. User can go back and modify a previously entered facility

### Story 2.5: Configuration Summary & Confirmation

**As a** user,
**I want** to see a complete summary of my sports center configuration,
**so that** I can verify everything before it's created.

**Acceptance Criteria:**
1. AI presents full configuration summary including:
   - Sports center name, city, language
   - Admin name and email
   - All facilities with their schedules and rates
2. Summary is clearly formatted and easy to read
3. AI explicitly asks for confirmation ("Does this look correct?")
4. User can request changes before confirming
5. Changes loop back to relevant collection step
6. Only after explicit confirmation does creation proceed
7. Confirmation state tracked in conversation

### Story 2.6: Sports Center Creation

**As a** user,
**I want** my sports center created automatically after I confirm,
**so that** I can start using Sporttia immediately.

**Acceptance Criteria:**
1. When user confirms, the AI calls the `confirm_configuration` function followed by the `create_sports_center` function
2. The `create_sports_center` function triggers ZeroService to create the sports center directly in database with:
   - Customer and sportcenter records
   - 3-month subscription and licences
   - Admin group with appropriate privileges
   - Admin user with generated credentials
   - All facilities with terrains, prices, and schedules
3. All operations wrapped in a database transaction (rollback on any failure)
4. Sporttia sportcenter ID stored locally
5. `sports_centers_created` table updated with:
   - conversation_id
   - sporttia_id (sportcenter.id from database)
   - name, city, language
   - admin_email
   - admin_login (generated username)
   - created_at
6. Conversation status updated to "completed"
7. AI automatically receives creation result (success with credentials, or error)
8. AI informs user of successful creation with their login credentials (username, password, and link to manager.sporttia.com)
9. AI provides next steps (check email, log into Sporttia Manager, change password)

### Story 2.7: Welcome Email via Resend

**As a** user,
**I want** to receive a welcome email with my account details,
**so that** I know how to access my new sports center.

**Acceptance Criteria:**
1. Resend client configured in `apps/api`
2. Welcome email template created with:
   - Sporttia branding
   - Account credentials / login link to Sporttia Manager
   - Summary of sports center configuration
   - Freemium usage caps/limits information
   - Getting started next steps
3. Email sent immediately after sports center creation
4. Email sent to admin email address collected in conversation
5. Email send status logged
6. Failure to send email doesn't block success message (log error, continue)
7. Email works correctly for Spanish, English, Portuguese (based on conversation language)

### Story 2.8: Error Handling & Human Escalation

**As a** user,
**I want** graceful handling when things go wrong,
**so that** I'm not left stranded.

**Acceptance Criteria:**
1. Sporttia API errors show user-friendly message, not technical details
2. AI offers to retry on transient failures
3. After repeated failures, AI suggests contacting sales@sporttia.com
4. When AI cannot understand or help user, it proactively offers escalation
5. Escalation message includes sales email and brief explanation
6. Failed creation attempts logged with full context for debugging
7. Conversation marked with error status for admin visibility
8. User can restart conversation if desired

---

## Epic 3: Admin Dashboard

**Goal:** Provide the operations team with visibility into conversations, conversion metrics, and errors so they can monitor system health and debug issues.

**Value Delivered:** Internal team can monitor Sporttia ZERO without direct database access.

### Story 3.1: Admin App Setup & Authentication

**As an** admin user,
**I want** to log in using my Sporttia credentials,
**so that** only authorized team members can access the dashboard.

**Acceptance Criteria:**
1. `apps/admin` React app properly configured (building on placeholder from 1.1)
2. Login page with login and password fields
3. Authentication calls `POST /v7/login` on Sporttia API
4. Successful login stores auth token/session
5. Failed login shows appropriate error message
6. Protected routes redirect to login if not authenticated
7. Logout functionality clears session
8. Session persists across page refreshes (localStorage/cookies)
9. API endpoints for admin routes validate authentication
10. Basic admin layout with navigation (sidebar or top nav)

### Story 3.2: Conversations List View

**As an** admin user,
**I want** to see a list of all conversations,
**so that** I can monitor activity and find specific conversations.

**Acceptance Criteria:**
1. Table/list view of all conversations
2. Columns displayed: ID, Language, Status, Created At, Updated At, Sports Center (if created)
3. Status shown with visual indicator (active=blue, completed=green, abandoned=gray, error=red)
4. Sortable by date (newest first by default)
5. Filterable by status (all, active, completed, abandoned, error)
6. Filterable by date range
7. Search by conversation ID or admin email
8. Pagination for large datasets (20-50 per page)
9. Click on row navigates to conversation detail
10. Auto-refresh option or manual refresh button

### Story 3.3: Conversation Detail View

**As an** admin user,
**I want** to see the full transcript of a conversation,
**so that** I can understand what happened and debug issues.

**Acceptance Criteria:**
1. Full message history displayed in chat-like format
2. Messages show: role (user/assistant/system), content, timestamp
3. Visual distinction between user and assistant messages
4. Conversation metadata displayed:
   - Status, language, created/updated timestamps
   - Session ID
5. Collected data summary (if available):
   - Sports center info, admin info, facilities
6. Sports center creation result (if completed):
   - Sporttia ID, success/failure status
7. Email send status (sent, failed, pending)
8. Error details if conversation has errors
9. Back navigation to conversations list
10. Copy conversation ID button for support reference

### Story 3.4: Dashboard Metrics Overview

**As an** admin user,
**I want** to see key metrics at a glance,
**so that** I can understand system performance.

**Acceptance Criteria:**
1. Dashboard home page shows summary metrics
2. Metrics displayed:
   - Total conversations (today, this week, all time)
   - Completion rate (completed / started)
   - Abandonment rate
   - Error rate
   - Average conversation duration (for completed)
3. Conversion funnel visualization:
   - Started → Email captured → Completed
4. Metrics filterable by date range
5. Comparison to previous period (optional, nice-to-have)
6. Visual charts/graphs for key metrics (bar chart, line chart)
7. Quick links to filtered conversation views (e.g., click "errors" → error conversations)

### Story 3.5: Error Log View

**As an** admin user,
**I want** to see a log of errors and failed operations,
**so that** I can identify and troubleshoot issues.

**Acceptance Criteria:**
1. Dedicated error log view/page
2. List of error events with: timestamp, conversation ID, error type, message
3. Error types categorized:
   - Sporttia API failures
   - OpenAI API failures
   - Email send failures
   - Validation errors
4. Filterable by error type
5. Filterable by date range
6. Click on error links to related conversation
7. Error details expandable (full error context, stack trace if available)
8. Most recent errors first
9. Count of errors by type (summary at top)

---

## Next Steps

### UX Expert Prompt

> Review this PRD for Sporttia ZERO, an AI-powered sports center onboarding assistant. Create a detailed front-end specification (`front-end-spec.md`) covering the public chat interface and admin dashboard. Focus on the conversational UX patterns, the configuration summary/confirmation flow, and the admin monitoring experience. Align with Sporttia branding and ensure WCAG AA accessibility.

### Architect Prompt

> Review this PRD for Sporttia ZERO. Create a comprehensive fullstack architecture document covering the monorepo structure (apps/api, apps/web, apps/admin, packages/shared), Express.js backend modules, React frontends, PostgreSQL schema, OpenAI integration with function calling, Sporttia API client, Resend email integration, and GCE deployment. Consider the path to GKE for future scaling.
