# Sporttia ZERO Fullstack Architecture Document

This document outlines the complete fullstack architecture for Sporttia ZERO, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for modern fullstack applications where these concerns are increasingly intertwined.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-01-22 | 0.6 | Added Docker containerization for all services (API, Web, Admin) | Claude |
| 2026-01-20 | 0.5 | Added GCP deployment infrastructure (sporttia-zero instance), nginx proxy config, deployment documentation | Claude |
| 2026-01-19 | 0.4 | ZeroService implemented locally with direct MySQL connection to Sporttia database | Claude |
| 2026-01-19 | 0.3 | Updated creation flow: AI calls create_sports_center function to trigger creation | Claude |
| 2026-01-19 | 0.2 | Changed sports center creation from external API to internal ZeroService with direct database access | Claude |
| 2026-01-16 | 0.1 | Initial architecture document | Architect Agent |

---

## 1. High Level Architecture

### 1.1 Technical Summary

Sporttia ZERO is a modular monolith fullstack application built on a Node.js/Express.js backend serving two React frontends (public chat and admin dashboard). The architecture follows a conversational AI pattern where the Express backend orchestrates interactions between the React chat UI, OpenAI's GPT-4 API for natural language processing with function calling, the internal ZeroService for direct sports center provisioning in the Sporttia database, and Resend for transactional email delivery. All data is persisted in a PostgreSQL database hosted on Google Cloud SQL, with the application deployed on a single Google Compute Engine instance for MVP, designed for future migration to Google Kubernetes Engine. This architecture achieves the PRD goals of 24/7 automated onboarding, <10 minute conversation completion, and <€2 cost per acquisition through efficient API usage and stateless scaling patterns.

### 1.2 Platform and Infrastructure

**Platform:** Google Cloud Platform (GCP)

**Key Services:**
- Google Compute Engine (GCE) - Application hosting
- Google Cloud SQL - PostgreSQL database
- Google Cloud Secret Manager - API keys and secrets
- Google Cloud Load Balancer - HTTPS termination and routing
- Google Cloud Storage - Static asset hosting (optional)
- Google Kubernetes Engine (GKE) - Future scaling target

**Deployment Regions:**
- Primary: `europe-west1` (Belgium) - Closest to primary Spanish market
- Future expansion: `us-east1` for Americas coverage

### 1.3 Repository Structure

**Structure:** Monorepo with npm workspaces

**Monorepo Tool:** npm workspaces (native Node.js, zero additional tooling)

**Package Organization:**
- `apps/` - Deployable applications (api, web, admin)
- `packages/` - Shared libraries (shared types, utilities)

### 1.4 High Level Architecture Diagram

```mermaid
graph TB
    subgraph "Users"
        U1[Sports Center Owner<br/>Mobile/Desktop Browser]
        U2[Sporttia Admin<br/>Desktop Browser]
    end

    subgraph "Google Cloud Platform"
        subgraph "Compute Engine Instance"
            subgraph "apps/web"
                WEB[React Chat App<br/>Static Files via Nginx]
            end
            subgraph "apps/admin"
                ADMIN[React Admin App<br/>Static Files via Nginx]
            end
            subgraph "apps/api"
                API[Express.js API<br/>Node.js Runtime]
            end
        end

        subgraph "Cloud SQL"
            DB[(PostgreSQL<br/>Conversations<br/>Messages<br/>Sports Centers)]
        end

        SM[Secret Manager<br/>API Keys]
    end

    subgraph "External Services"
        OPENAI[OpenAI API<br/>GPT-4 Turbo<br/>Function Calling]
        SPORTTIA[Sporttia API<br/>Sports List<br/>Admin Auth]
        RESEND[Resend API<br/>Welcome Emails]
    end

    subgraph "Sporttia Database"
        SPORTTIA_DB[(Sporttia MySQL<br/>customers, sportcenters<br/>users, groups, fields<br/>schedules, etc.)]
    end

    U1 -->|HTTPS| WEB
    U2 -->|HTTPS| ADMIN
    WEB -->|REST API| API
    ADMIN -->|REST API| API
    API -->|SQL| DB
    API -->|API Key| OPENAI
    API -->|HTTP| SPORTTIA
    API -->|MySQL via ZeroService| SPORTTIA_DB
    API -->|API Key| RESEND
    API -->|Fetch| SM

    style WEB fill:#61DAFB
    style ADMIN fill:#61DAFB
    style API fill:#339933
    style DB fill:#336791
    style SPORTTIA_DB fill:#336791
    style OPENAI fill:#412991
    style SPORTTIA fill:#00A859
    style RESEND fill:#000000,color:#fff
```

### 1.5 Architectural Patterns

- **Modular Monolith:** Single Express.js backend with clear module boundaries (chat, ai, sporttia, email, admin, analytics) - _Rationale:_ Simplicity for MVP while maintaining separation of concerns; modules can be extracted to microservices later if needed

- **Component-Based UI:** React functional components with hooks and TypeScript - _Rationale:_ Industry standard for chat interfaces; excellent ecosystem support; type safety catches errors early

- **Repository Pattern:** Data access abstracted through service layer - _Rationale:_ Enables easy testing with mocks; facilitates future ORM changes; keeps business logic separate from database concerns

- **Function Calling for Data Extraction:** OpenAI function calling to capture structured data from conversation - _Rationale:_ More reliable than parsing natural language responses; provides schema validation; enables progressive data collection

- **Optimistic UI:** Chat messages appear immediately before server confirmation - _Rationale:_ Creates responsive feel; matches user expectations from messaging apps; reduces perceived latency

- **Session-Based Conversations:** Each browser session gets a unique conversation ID - _Rationale:_ Stateless server design; no user authentication required for public chat; simplifies architecture

---

## 2. Tech Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Frontend Language | TypeScript | 5.x | Type-safe JavaScript | Catches errors at compile time; better IDE support; shared types with backend |
| Frontend Framework | React | 18.x | UI library | Industry standard; excellent chat UI patterns; large ecosystem |
| UI Component Library | shadcn/ui | Latest | Pre-built accessible components | Full customization control; Radix primitives; Tailwind styling |
| State Management | React Context + useReducer | Built-in | Chat state, auth state | Sufficient for chat app complexity; no external dependency |
| Backend Language | TypeScript | 5.x | Type-safe Node.js | Same language as frontend; shared types in packages/shared |
| Backend Framework | Express.js | 4.x | HTTP server | Lightweight; mature; familiar; easy to understand |
| API Style | REST | OpenAPI 3.0 | HTTP endpoints | Simple; well-understood; sufficient for conversation API |
| Database | PostgreSQL | 15.x | Relational data store | Excellent for structured conversation data; Cloud SQL managed |
| Database Client | pg + Kysely | Latest | SQL query builder | Type-safe queries; no ORM magic; raw SQL when needed |
| Cache | Node.js Memory | Built-in | Sports list cache | Simple LRU for MVP; Redis can be added later |
| Authentication | JWT (Admin only) | N/A | Admin dashboard auth | Sporttia API provides auth; we just validate tokens |
| Frontend Testing | Vitest + Testing Library | Latest | Unit/component tests | Fast; modern; excellent React support |
| Backend Testing | Vitest + Supertest | Latest | Unit/integration tests | Same test runner as frontend; unified tooling |
| E2E Testing | Playwright | Latest | End-to-end flows | Microsoft backed; excellent DX; cross-browser |
| Build Tool | Vite | 5.x | Frontend bundler | Fast; modern; excellent DX |
| Bundler | esbuild (via Vite) | Latest | JavaScript bundling | Fastest available; used by Vite |
| CSS Framework | Tailwind CSS | 3.x | Utility-first CSS | Pairs with shadcn/ui; rapid development; small bundle |
| CI/CD | GitHub Actions | N/A | Automated pipelines | Free for public/private repos; excellent ecosystem |
| Monitoring | Google Cloud Monitoring | N/A | Metrics and alerting | Native GCP integration; no additional setup |
| Logging | Pino | Latest | Structured logging | Fast JSON logging; works well with GCP Logging |

---

## 3. Data Models

### 3.1 Conversation

**Purpose:** Represents a single onboarding session with a potential customer

**Key Attributes:**
- `id`: UUID - Unique identifier for the conversation
- `session_id`: string - Browser session identifier
- `language`: string - ISO-639 language code (detected from browser on conversation creation)
- `status`: enum - Current state (active, completed, abandoned, error)
- `collected_data`: JSON - Structured data collected via function calling
- `created_at`: timestamp - When conversation started
- `updated_at`: timestamp - Last activity timestamp

**TypeScript Interface:**
```typescript
interface Conversation {
  id: string;
  sessionId: string;
  language: string | null;
  status: ConversationStatus;
  collectedData: CollectedData | null;
  sportsCenterId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type ConversationStatus = 'active' | 'completed' | 'abandoned' | 'error';

interface CollectedData {
  sportsCenter?: {
    name: string;
    city: string;
    cityId: number;      // Sporttia city ID from GET /v7/cities
    language: string;
  };
  admin?: {
    name: string;
    email: string;
  };
  facilities?: Facility[];
  confirmed?: boolean;
}

interface Facility {
  name: string;
  sportId: number;
  sportName: string;
  schedules: Schedule[];
}

interface Schedule {
  weekdays: number[]; // 0=Sunday, 1=Monday, etc.
  startTime: string;  // "09:00"
  endTime: string;    // "21:00"
  duration: number;   // minutes
  rate: number;       // price in EUR
}
```

**Relationships:**
- Has many Messages (1:N)
- Has one SportsCenter (1:1, nullable)

---

### 3.2 Message

**Purpose:** Individual message in a conversation (user, assistant, or system)

**Key Attributes:**
- `id`: UUID - Unique identifier
- `conversation_id`: UUID - Foreign key to conversation
- `role`: enum - Message sender (user, assistant, system)
- `content`: text - Message text content
- `metadata`: JSON - Additional data (tokens used, function calls, etc.)
- `created_at`: timestamp - When message was created

**TypeScript Interface:**
```typescript
interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata: MessageMetadata | null;
  createdAt: Date;
}

type MessageRole = 'user' | 'assistant' | 'system';

interface MessageMetadata {
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  functionCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
  functionResult?: Record<string, unknown>;
  model?: string;
  latencyMs?: number;
}
```

**Relationships:**
- Belongs to Conversation (N:1)

---

### 3.3 SportsCenter

**Purpose:** Record of successfully created sports centers

**Key Attributes:**
- `id`: UUID - Local identifier
- `conversation_id`: UUID - The conversation that created this
- `sporttia_id`: string - ID returned from Sporttia API
- `name`: string - Sports center name
- `city`: string - City location
- `language`: string - ISO-639 language code
- `admin_email`: string - Admin user email
- `created_at`: timestamp - When created

**TypeScript Interface:**
```typescript
interface SportsCenter {
  id: string;
  conversationId: string;
  sporttiaId: string;
  name: string;
  city: string;
  language: string;
  adminEmail: string;
  createdAt: Date;
}
```

**Relationships:**
- Belongs to Conversation (1:1)

---

### 3.4 AnalyticsEvent

**Purpose:** Track key events for metrics and debugging

**Key Attributes:**
- `id`: UUID - Unique identifier
- `conversation_id`: UUID - Associated conversation (nullable for global events)
- `event_type`: enum - Type of event
- `event_data`: JSON - Event-specific data
- `created_at`: timestamp - When event occurred

**TypeScript Interface:**
```typescript
interface AnalyticsEvent {
  id: string;
  conversationId: string | null;
  eventType: EventType;
  eventData: Record<string, unknown>;
  createdAt: Date;
}

type EventType =
  | 'conversation_started'
  | 'email_captured'
  | 'facilities_added'
  | 'configuration_confirmed'
  | 'sports_center_created'
  | 'email_sent'
  | 'conversation_abandoned'
  | 'api_error'
  | 'escalation_triggered';
```

**Relationships:**
- Optionally belongs to Conversation (N:1)

---

## 4. API Specification

### 4.1 REST API Specification

```yaml
openapi: 3.0.0
info:
  title: Sporttia ZERO API
  version: 1.0.0
  description: API for Sporttia ZERO conversational onboarding assistant
servers:
  - url: https://zero.sporttia.com/api
    description: Production
  - url: https://pre-zero.sporttia.com/api
    description: Pre-production
  - url: http://localhost:3001/api
    description: Local development

paths:
  /health:
    get:
      summary: Health check
      tags: [System]
      responses:
        '200':
          description: Service healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: ok
                  database:
                    type: string
                    example: connected
                  timestamp:
                    type: string
                    format: date-time

  /conversations:
    post:
      summary: Create new conversation
      tags: [Conversations]
      responses:
        '201':
          description: Conversation created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Conversation'

  /conversations/{id}:
    get:
      summary: Get conversation with messages
      tags: [Conversations]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Conversation details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ConversationWithMessages'
        '404':
          description: Conversation not found

  /conversations/{id}/messages:
    post:
      summary: Send message and get AI response
      tags: [Conversations]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [content]
              properties:
                content:
                  type: string
                  maxLength: 2000
      responses:
        '200':
          description: AI response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageResponse'
        '404':
          description: Conversation not found
        '429':
          description: Rate limited

  /sports:
    get:
      summary: Get available sports
      tags: [Sports]
      responses:
        '200':
          description: List of sports
          content:
            application/json:
              schema:
                type: object
                properties:
                  sports:
                    type: array
                    items:
                      $ref: '#/components/schemas/Sport'

  /admin/auth/login:
    post:
      summary: Admin login via Sporttia
      tags: [Admin]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [login, password]
              properties:
                login:
                  type: string
                password:
                  type: string
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
                  user:
                    $ref: '#/components/schemas/AdminUser'
        '401':
          description: Invalid credentials

  /admin/conversations:
    get:
      summary: List all conversations (admin)
      tags: [Admin]
      security:
        - bearerAuth: []
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [active, completed, abandoned, error]
        - name: from
          in: query
          schema:
            type: string
            format: date
        - name: to
          in: query
          schema:
            type: string
            format: date
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
      responses:
        '200':
          description: Paginated conversation list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedConversations'
        '401':
          description: Unauthorized

  /admin/conversations/{id}:
    get:
      summary: Get conversation detail (admin)
      tags: [Admin]
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Full conversation detail
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ConversationDetail'
        '401':
          description: Unauthorized
        '404':
          description: Not found

  /admin/metrics:
    get:
      summary: Get dashboard metrics
      tags: [Admin]
      security:
        - bearerAuth: []
      parameters:
        - name: from
          in: query
          schema:
            type: string
            format: date
        - name: to
          in: query
          schema:
            type: string
            format: date
      responses:
        '200':
          description: Dashboard metrics
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DashboardMetrics'

  /admin/errors:
    get:
      summary: Get error log
      tags: [Admin]
      security:
        - bearerAuth: []
      parameters:
        - name: type
          in: query
          schema:
            type: string
            enum: [sporttia_api, openai_api, email, validation]
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Error log
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorLog'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Conversation:
      type: object
      properties:
        id:
          type: string
          format: uuid
        sessionId:
          type: string
        language:
          type: string
          nullable: true
        status:
          type: string
          enum: [active, completed, abandoned, error]
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    ConversationWithMessages:
      allOf:
        - $ref: '#/components/schemas/Conversation'
        - type: object
          properties:
            messages:
              type: array
              items:
                $ref: '#/components/schemas/Message'

    Message:
      type: object
      properties:
        id:
          type: string
          format: uuid
        role:
          type: string
          enum: [user, assistant, system]
        content:
          type: string
        createdAt:
          type: string
          format: date-time

    MessageResponse:
      type: object
      properties:
        userMessage:
          $ref: '#/components/schemas/Message'
        assistantMessage:
          $ref: '#/components/schemas/Message'
        collectedData:
          type: object
          nullable: true
        status:
          type: string
          enum: [active, completed, error]

    Sport:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string

    AdminUser:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        email:
          type: string

    PaginatedConversations:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Conversation'
        pagination:
          type: object
          properties:
            page:
              type: integer
            limit:
              type: integer
            total:
              type: integer
            totalPages:
              type: integer

    ConversationDetail:
      allOf:
        - $ref: '#/components/schemas/ConversationWithMessages'
        - type: object
          properties:
            collectedData:
              type: object
              nullable: true
            sportsCenter:
              type: object
              nullable: true
              properties:
                sporttiaId:
                  type: string
                name:
                  type: string
                adminEmail:
                  type: string
            emailStatus:
              type: string
              enum: [pending, sent, failed]
              nullable: true
            errors:
              type: array
              items:
                type: object
                properties:
                  type:
                    type: string
                  message:
                    type: string
                  timestamp:
                    type: string
                    format: date-time

    DashboardMetrics:
      type: object
      properties:
        totalConversations:
          type: integer
        completedConversations:
          type: integer
        completionRate:
          type: number
        abandonmentRate:
          type: number
        errorRate:
          type: number
        averageDurationMinutes:
          type: number
        activeNow:
          type: integer
        funnel:
          type: object
          properties:
            started:
              type: integer
            emailCaptured:
              type: integer
            completed:
              type: integer

    ErrorLog:
      type: object
      properties:
        data:
          type: array
          items:
            type: object
            properties:
              id:
                type: string
              conversationId:
                type: string
                nullable: true
              type:
                type: string
              message:
                type: string
              details:
                type: object
              createdAt:
                type: string
                format: date-time
        pagination:
          type: object
          properties:
            page:
              type: integer
            limit:
              type: integer
            total:
              type: integer
        summary:
          type: object
          additionalProperties:
            type: integer
```

---

## 5. Components

### 5.1 Backend Components

#### Chat Module

**Responsibility:** Manages conversation lifecycle and message handling

**Key Interfaces:**
- `createConversation(): Promise<Conversation>`
- `getConversation(id: string): Promise<ConversationWithMessages>`
- `addMessage(conversationId: string, content: string): Promise<MessageResponse>`
- `updateConversationStatus(id: string, status: ConversationStatus): Promise<void>`

**Dependencies:** Database service, AI module, Analytics module

**Technology Stack:** Express.js routes, Kysely queries, Zod validation

---

#### AI Module

**Responsibility:** Integrates with OpenAI API for chat completions and function calling

**Key Interfaces:**
- `generateResponse(conversation: ConversationWithMessages): Promise<AIResponse>`
- `parseCollectedData(functionCalls: FunctionCall[]): CollectedData`
- `buildSystemPrompt(language: string): string`

**Dependencies:** OpenAI SDK, Sports module (for available sports)

**Technology Stack:** OpenAI Node.js SDK, GPT-4-turbo model

---

#### Sporttia Module

**Responsibility:** Client for Sporttia Service API (sport validation, city lookup, auth) and ZeroService for direct sports center creation

**Key Interfaces:**
- `getSports(): Promise<Sport[]>` (cached, for validation)
- `getCityByName(name: string): Promise<City | null>` - Lookup city ID by name
- `validateAdminLogin(login: string, password: string): Promise<AdminUser>`

**Dependencies:** Environment config (API host)

**Technology Stack:** Native fetch, in-memory cache for sports

---

#### ZeroService

**Responsibility:** Creates complete sports centers directly in Sporttia database with all related entities

**Key Interfaces:**
- `createSportcenter(data: CreateSportcenterInput): Promise<CreateSportcenterResult>` - Creates complete sports center with:
  - Customer record
  - Sportcenter record (visible=1, zero=true)
  - 3-month subscription (ACTIVE status)
  - 3 monthly licences (PAID status)
  - Admin group with privileges 11, 12, 13, 24, 26, 28
  - Admin user with generated login/password
  - Purse for admin user
  - Facilities with terrain, prices, schedules, and slots

**Dependencies:** Sporttia database connection, repositories for each entity

**Technology Stack:** Sequelize ORM, database transactions

**Key Design Decisions:**
- All operations wrapped in single database transaction (rollback on any failure)
- Province and city are created if they don't exist (getOrCreateProvince, getOrCreateCity)
- Admin login generated from sportcenter name, password randomly generated
- Schedules use weekday flags (wd_0=Sunday, wd_1=Monday, etc.)

---

#### Email Module

**Responsibility:** Sends transactional emails via Resend

**Key Interfaces:**
- `sendWelcomeEmail(to: string, data: WelcomeEmailData): Promise<EmailResult>`

**Dependencies:** Resend SDK, Email templates

**Technology Stack:** Resend Node.js SDK, React Email templates (optional)

---

#### Admin Module

**Responsibility:** Admin-specific API endpoints for dashboard

**Key Interfaces:**
- `listConversations(filters: ConversationFilters): Promise<PaginatedResult>`
- `getConversationDetail(id: string): Promise<ConversationDetail>`
- `getMetrics(dateRange: DateRange): Promise<DashboardMetrics>`
- `getErrorLog(filters: ErrorFilters): Promise<ErrorLog>`

**Dependencies:** Database service, Auth middleware

**Technology Stack:** Express.js routes, Kysely aggregation queries

---

#### Analytics Module

**Responsibility:** Tracks events for metrics and debugging

**Key Interfaces:**
- `trackEvent(event: AnalyticsEvent): Promise<void>`
- `aggregateMetrics(dateRange: DateRange): Promise<AggregatedMetrics>`

**Dependencies:** Database service

**Technology Stack:** Async event tracking, batch inserts

---

### 5.2 Frontend Components (apps/web)

#### ChatContainer

**Responsibility:** Main chat interface container, manages conversation state

**Key Interfaces:**
- Props: none (root component)
- State: conversation, messages, isLoading, error

**Dependencies:** ChatMessage, ChatInput, TypingIndicator, API client

---

#### ChatMessage

**Responsibility:** Renders individual message bubble

**Key Interfaces:**
- Props: `{ message: Message, isUser: boolean }`

**Dependencies:** None (pure component)

---

#### ConfigurationSummary

**Responsibility:** Displays collected data for user confirmation

**Key Interfaces:**
- Props: `{ data: CollectedData, onConfirm: () => void, onEdit: (section: string) => void }`

**Dependencies:** shadcn/ui Card, Button components

---

### 5.3 Frontend Components (apps/admin)

#### DashboardLayout

**Responsibility:** Admin layout with sidebar navigation

**Key Interfaces:**
- Props: `{ children: ReactNode }`

**Dependencies:** Sidebar, AuthProvider

---

#### MetricsGrid

**Responsibility:** Displays dashboard metric cards

**Key Interfaces:**
- Props: `{ metrics: DashboardMetrics }`

**Dependencies:** MetricCard component

---

#### ConversationsTable

**Responsibility:** Paginated, filterable conversation list

**Key Interfaces:**
- Props: `{ filters: ConversationFilters, onRowClick: (id: string) => void }`

**Dependencies:** DataTable, StatusBadge, Pagination

---

### 5.4 Component Diagram

```mermaid
graph TB
    subgraph "Frontend Layer"
        subgraph "apps/web"
            WEB_APP[App.tsx]
            CHAT_CONTAINER[ChatContainer]
            CHAT_MESSAGE[ChatMessage]
            CHAT_INPUT[ChatInput]
            CONFIG_SUMMARY[ConfigurationSummary]
            SUCCESS_SCREEN[SuccessScreen]
        end

        subgraph "apps/admin"
            ADMIN_APP[AdminApp.tsx]
            DASHBOARD_LAYOUT[DashboardLayout]
            METRICS_GRID[MetricsGrid]
            CONVOS_TABLE[ConversationsTable]
            CONVO_DETAIL[ConversationDetail]
            ERROR_LOG[ErrorLog]
        end
    end

    subgraph "API Client Layer"
        CHAT_API[chatApi.ts]
        ADMIN_API[adminApi.ts]
    end

    subgraph "Backend Layer - apps/api"
        subgraph "Routes"
            CHAT_ROUTES[/conversations]
            SPORTS_ROUTES[/sports]
            ADMIN_ROUTES[/admin/*]
        end

        subgraph "Modules"
            CHAT_MODULE[Chat Module]
            AI_MODULE[AI Module]
            SPORTTIA_MODULE[Sporttia Module]
            EMAIL_MODULE[Email Module]
            ADMIN_MODULE[Admin Module]
            ANALYTICS_MODULE[Analytics Module]
        end

        subgraph "Data Layer"
            DB_SERVICE[Database Service]
            CACHE[Memory Cache]
        end
    end

    WEB_APP --> CHAT_CONTAINER
    CHAT_CONTAINER --> CHAT_MESSAGE
    CHAT_CONTAINER --> CHAT_INPUT
    CHAT_CONTAINER --> CONFIG_SUMMARY
    CHAT_CONTAINER --> SUCCESS_SCREEN

    ADMIN_APP --> DASHBOARD_LAYOUT
    DASHBOARD_LAYOUT --> METRICS_GRID
    DASHBOARD_LAYOUT --> CONVOS_TABLE
    DASHBOARD_LAYOUT --> CONVO_DETAIL
    DASHBOARD_LAYOUT --> ERROR_LOG

    CHAT_CONTAINER --> CHAT_API
    ADMIN_APP --> ADMIN_API

    CHAT_API --> CHAT_ROUTES
    CHAT_API --> SPORTS_ROUTES
    ADMIN_API --> ADMIN_ROUTES

    CHAT_ROUTES --> CHAT_MODULE
    SPORTS_ROUTES --> SPORTTIA_MODULE
    ADMIN_ROUTES --> ADMIN_MODULE

    CHAT_MODULE --> AI_MODULE
    CHAT_MODULE --> ANALYTICS_MODULE
    AI_MODULE --> SPORTTIA_MODULE
    CHAT_MODULE --> EMAIL_MODULE

    CHAT_MODULE --> DB_SERVICE
    ADMIN_MODULE --> DB_SERVICE
    ANALYTICS_MODULE --> DB_SERVICE
    SPORTTIA_MODULE --> CACHE
```

---

## 6. External APIs

### 6.1 OpenAI API

- **Purpose:** Natural language understanding, conversation generation, structured data extraction via function calling
- **Documentation:** https://platform.openai.com/docs/api-reference
- **Base URL(s):** `https://api.openai.com/v1`
- **Authentication:** Bearer token (API key in header)
- **Rate Limits:** Tier-dependent; start with 500 RPM, 30,000 TPM

**Key Endpoints Used:**
- `POST /chat/completions` - Generate AI responses with function calling

**Integration Notes:**
- Use `gpt-4-turbo` model for best price/performance
- Function calling for: `collect_sports_center_info`, `collect_admin_info`, `collect_facility`, `confirm_configuration`, `create_sports_center`, `request_human_help`
- System prompt sets Sporttia ZERO persona and guides data collection
- Token usage logged for cost monitoring

---

### 6.2 Sporttia API

- **Purpose:** Fetch available sports, authenticate admin users
- **Documentation:** Internal Sporttia API docs
- **Base URL(s):**
  - Pre-production: `https://preapi.sporttia.com`
  - Production: `https://api.sporttia.com`
- **Authentication:** JWT for admin login
- **Rate Limits:** None specified

**Key Endpoints Used:**
- `GET /v7/sports` - Fetch list of available sports for sport validation
- `GET /v7/cities` - Lookup city ID by name for sports center location
- `POST /v7/login` - Authenticate Sporttia admin users for dashboard access

**Integration Notes:**
- Sports list cached in memory for 1 hour (used for validation, not displayed to user)
- City lookup performed when user provides city name to get Sporttia city ID
- Login response includes JWT token for subsequent admin API calls
- Handle 4xx/5xx errors gracefully with retry logic for transient failures

---

### 6.3 Sporttia Database (Direct Access via ZeroService)

- **Purpose:** Create sports centers directly with all related entities
- **Connection:** Direct MySQL connection to Sporttia database (mysql2 package)
- **Authentication:** Database credentials (stored in environment variables)

**Environment Variables:**
```bash
SPORTTIA_DB_HOST=127.0.0.1
SPORTTIA_DB_PORT=3311
SPORTTIA_DB_USER=jperez
SPORTTIA_DB_PASSWORD=********
SPORTTIA_DB_NAME=sporttia_pre
```

**Tables Used by ZeroService:**
- `customers` - Customer records
- `sportcenters` - Sports center records
- `provinces` - Province lookup/creation
- `cities` - City lookup/creation
- `subscriptions` - Subscription records (3-month free trial)
- `licences` - Monthly licence records
- `groups` - Admin group for sportcenter
- `group_privileges` - Group-privilege associations (optional)
- `users` - Admin user records
- `purses` - User purse records
- `fields` - Facility/court records
- `terrains` - Terrain records
- `prices` - Price/tariff records
- `schedules` - Schedule records
- `sports` - Sport type lookup

**Integration Notes:**
- All operations wrapped in MySQL transaction for atomicity (rollback on failure)
- Province and city created if they don't exist
- Sportcenter created with `visible=1` (public) and `zero=true` flag
- 3-month subscription with ACTIVE status and 3 PAID licences created
- Admin user created with generated login and temporary password (MD5 hashed)
- Connection pool managed with mysql2/promise

---

### 6.4 Resend API

- **Purpose:** Send transactional welcome emails to new sports center admins
- **Documentation:** https://resend.com/docs/api-reference
- **Base URL(s):** `https://api.resend.com`
- **Authentication:** Bearer token (API key in header)
- **Rate Limits:** Based on plan; free tier: 3,000 emails/month, 100/day

**Key Endpoints Used:**
- `POST /emails` - Send welcome email with sports center details

**Integration Notes:**
- Email template supports Spanish, English, Portuguese based on conversation language
- From address: `noreply@zero.sporttia.com` (requires domain verification)
- Track email status for debugging (sent, delivered, bounced)
- Fire and forget on success; log errors but don't block user flow

---

## 7. Core Workflows

### 7.1 New Conversation Flow

```mermaid
sequenceDiagram
    participant U as User Browser
    participant W as React Chat App
    participant A as Express API
    participant DB as PostgreSQL
    participant OA as OpenAI API

    U->>W: Visit zero.sporttia.com
    W->>A: POST /api/conversations
    A->>DB: INSERT conversation
    DB-->>A: conversation record
    A-->>W: { id, sessionId }
    W->>W: Store conversationId
    W->>A: GET /api/conversations/{id}
    A->>DB: SELECT messages
    DB-->>A: empty messages[]
    A->>OA: chat/completions (system prompt only)
    OA-->>A: Welcome message
    A->>DB: INSERT assistant message
    A-->>W: { messages: [welcomeMsg] }
    W->>W: Display welcome message
```

### 7.2 Message Exchange with Function Calling

```mermaid
sequenceDiagram
    participant U as User
    participant W as React App
    participant A as Express API
    participant DB as PostgreSQL
    participant OA as OpenAI API

    U->>W: Type message "I want to create a padel club"
    W->>W: Optimistic UI - show user message
    W->>A: POST /api/conversations/{id}/messages
    A->>DB: INSERT user message
    A->>DB: SELECT conversation + messages
    A->>OA: chat/completions (history + functions)

    Note over OA: Decides to call collect_sports_center_info
    OA-->>A: function_call: collect_sports_center_info
    A->>A: Parse function arguments
    A->>DB: UPDATE conversation.collected_data

    Note over OA: Generates response asking for name
    OA-->>A: "Great! What's the name of your sports center?"
    A->>DB: INSERT assistant message
    A-->>W: { userMsg, assistantMsg, collectedData }
    W->>W: Update UI with response
```

### 7.3 Sports Center Creation Flow

The creation flow is triggered by the AI calling the `create_sports_center` function after the user confirms the configuration. This ensures the creation happens automatically as part of the conversational flow.

```mermaid
sequenceDiagram
    participant U as User
    participant W as React App
    participant A as Express API
    participant AI as OpenAI API
    participant DB as PostgreSQL (Zero)
    participant SDB as Sporttia Database
    participant R as Resend API

    U->>W: "Yes, everything looks correct"
    W->>A: POST /api/conversations/{id}/messages
    A->>AI: Chat completion with functions
    AI-->>A: Function calls: confirm_configuration(true), create_sports_center()

    Note over A: Process confirm_configuration
    A->>DB: Set confirmed = true

    Note over A: Process create_sports_center
    A->>DB: Get collected_data
    A->>SDB: ZeroService.createSportcenter() (transaction)

    alt Success
        Note over SDB: Creates customer, sportcenter,<br/>subscription, licences, group,<br/>user, purse, facilities, schedules
        SDB-->>A: { sportcenterId, adminLogin, tempPassword }
        A->>DB: INSERT sports_center
        A->>DB: UPDATE conversation.status = completed
        A->>R: POST /emails (welcome with credentials)
        R-->>A: { emailId }
        Note over A: Inject success context for AI
        A->>AI: Generate congratulations response
        AI-->>A: Congratulations message with credentials
        A->>DB: INSERT assistant message
        A-->>W: { success, assistantMessage with credentials }
        W->>W: Display success message with login info
    else Database Error
        SDB-->>A: Transaction rollback
        A->>DB: Track api_error event
        Note over A: Inject error context for AI
        A->>AI: Generate error response
        AI-->>A: Error message with retry guidance
        A-->>W: { error message, retry guidance }
        W->>W: Show error with retry option
    end
```

### 7.4 Admin Authentication Flow

```mermaid
sequenceDiagram
    participant U as Admin User
    participant A as Admin React App
    participant API as Express API
    participant SA as Sporttia API

    U->>A: Enter credentials
    A->>API: POST /api/admin/auth/login
    API->>SA: POST /v7/login

    alt Valid Credentials
        SA-->>API: { token, user }
        API-->>A: { token, user }
        A->>A: Store token in localStorage
        A->>A: Redirect to dashboard
    else Invalid Credentials
        SA-->>API: 401 Unauthorized
        API-->>A: { error: "Invalid credentials" }
        A->>A: Show error message
    end
```

---

## 8. Database Schema

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE conversation_status AS ENUM ('active', 'completed', 'abandoned', 'error');
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE event_type AS ENUM (
    'conversation_started',
    'email_captured',
    'facilities_added',
    'configuration_confirmed',
    'sports_center_created',
    'email_sent',
    'conversation_abandoned',
    'api_error',
    'escalation_triggered'
);

-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
    language VARCHAR(10),
    status conversation_status NOT NULL DEFAULT 'active',
    collected_data JSONB,
    sports_center_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role message_role NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Sports centers created
CREATE TABLE sports_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL UNIQUE REFERENCES conversations(id),
    sporttia_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    language VARCHAR(10) NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sports_centers_sporttia_id ON sports_centers(sporttia_id);
CREATE INDEX idx_sports_centers_conversation_id ON sports_centers(conversation_id);

-- Analytics events
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    event_type event_type NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_conversation_id ON analytics_events(conversation_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key after sports_centers table exists
ALTER TABLE conversations
ADD CONSTRAINT fk_conversations_sports_center
FOREIGN KEY (sports_center_id) REFERENCES sports_centers(id);
```

---

## 9. Frontend Architecture

### 9.1 Component Architecture

#### Component Organization

```
apps/web/src/
├── components/
│   ├── chat/
│   │   ├── ChatContainer.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ChatInput.tsx
│   │   ├── TypingIndicator.tsx
│   │   └── index.ts
│   ├── summary/
│   │   ├── ConfigurationSummary.tsx
│   │   ├── FacilityCard.tsx
│   │   └── index.ts
│   ├── screens/
│   │   ├── WelcomeScreen.tsx
│   │   ├── SuccessScreen.tsx
│   │   └── ErrorScreen.tsx
│   └── ui/
│       └── (shadcn/ui components)
├── hooks/
│   ├── useConversation.ts
│   ├── useMessages.ts
│   └── useAutoScroll.ts
├── services/
│   └── api.ts
├── stores/
│   └── chatStore.ts
├── types/
│   └── index.ts
├── styles/
│   └── globals.css
├── App.tsx
└── main.tsx

apps/admin/src/
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── dashboard/
│   │   ├── MetricCard.tsx
│   │   ├── MetricsGrid.tsx
│   │   └── FunnelChart.tsx
│   ├── conversations/
│   │   ├── ConversationsTable.tsx
│   │   ├── ConversationDetail.tsx
│   │   └── StatusBadge.tsx
│   ├── errors/
│   │   └── ErrorLog.tsx
│   └── ui/
│       └── (shadcn/ui components)
├── hooks/
│   ├── useAuth.ts
│   ├── useConversations.ts
│   └── useMetrics.ts
├── services/
│   └── adminApi.ts
├── stores/
│   └── authStore.ts
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── ConversationsPage.tsx
│   ├── ConversationDetailPage.tsx
│   └── ErrorsPage.tsx
├── App.tsx
└── main.tsx
```

#### Component Template

```typescript
// apps/web/src/components/chat/ChatMessage.tsx
import { cn } from '@/lib/utils';
import type { Message } from '@sporttia-zero/shared';

interface ChatMessageProps {
  message: Message;
  isUser: boolean;
}

export function ChatMessage({ message, isUser }: ChatMessageProps) {
  return (
    <div
      className={cn(
        'flex w-full mb-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted rounded-bl-md'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <time className="text-xs opacity-70 mt-1 block">
          {new Date(message.createdAt).toLocaleTimeString()}
        </time>
      </div>
    </div>
  );
}
```

### 9.2 State Management Architecture

#### State Structure

```typescript
// apps/web/src/stores/chatStore.ts
import { useReducer, createContext, useContext, ReactNode } from 'react';
import type { Message, CollectedData, ConversationStatus } from '@sporttia-zero/shared';

interface ChatState {
  conversationId: string | null;
  messages: Message[];
  collectedData: CollectedData | null;
  status: ConversationStatus;
  isLoading: boolean;
  error: string | null;
}

type ChatAction =
  | { type: 'SET_CONVERSATION'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'UPDATE_COLLECTED_DATA'; payload: CollectedData }
  | { type: 'SET_STATUS'; payload: ConversationStatus }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: ChatState = {
  conversationId: null,
  messages: [],
  collectedData: null,
  status: 'active',
  isLoading: false,
  error: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CONVERSATION':
      return { ...state, conversationId: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'UPDATE_COLLECTED_DATA':
      return { ...state, collectedData: action.payload };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

const ChatContext = createContext<{
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
} | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}
```

#### State Management Patterns

- Use React Context + useReducer for global chat state
- Local component state for UI-only concerns (input text, focus)
- Optimistic updates for sent messages
- Server state as source of truth, synced on response

### 9.3 Routing Architecture

#### Route Organization

```typescript
// apps/web/src/App.tsx - Simple, no routing needed
export default function App() {
  return (
    <ChatProvider>
      <ChatContainer />
    </ChatProvider>
  );
}

// apps/admin/src/App.tsx - React Router
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

export default function AdminApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/conversations" element={<ConversationsPage />} />
              <Route path="/conversations/:id" element={<ConversationDetailPage />} />
              <Route path="/errors" element={<ErrorsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

#### Protected Route Pattern

```typescript
// apps/admin/src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
```

### 9.4 Frontend Services Layer

#### API Client Setup

```typescript
// apps/web/src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, error.message || 'Request failed');
    }

    return response.json();
  }

  async createConversation(): Promise<Conversation> {
    return this.request('/conversations', { method: 'POST' });
  }

  async getConversation(id: string): Promise<ConversationWithMessages> {
    return this.request(`/conversations/${id}`);
  }

  async sendMessage(conversationId: string, content: string): Promise<MessageResponse> {
    return this.request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async getSports(): Promise<{ sports: Sport[] }> {
    return this.request('/sports');
  }
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = new ApiClient(API_BASE_URL);
```

#### Service Example

```typescript
// apps/admin/src/services/adminApi.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class AdminApiClient {
  private getToken(): string | null {
    return localStorage.getItem('adminToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async login(login: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    });
    localStorage.setItem('adminToken', response.token);
    return response;
  }

  async getMetrics(from?: string, to?: string): Promise<DashboardMetrics> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return this.request(`/admin/metrics?${params}`);
  }

  async getConversations(filters: ConversationFilters): Promise<PaginatedConversations> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    });
    return this.request(`/admin/conversations?${params}`);
  }

  async getConversationDetail(id: string): Promise<ConversationDetail> {
    return this.request(`/admin/conversations/${id}`);
  }

  async getErrors(filters: ErrorFilters): Promise<ErrorLog> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    });
    return this.request(`/admin/errors?${params}`);
  }
}

export const adminApi = new AdminApiClient();
```

---

## 10. Backend Architecture

### 10.1 Service Architecture

#### Controller/Route Organization

```
apps/api/src/
├── routes/
│   ├── index.ts              # Route registration
│   ├── health.routes.ts
│   ├── conversations.routes.ts
│   ├── sports.routes.ts
│   └── admin/
│       ├── index.ts
│       ├── auth.routes.ts
│       ├── conversations.routes.ts
│       ├── metrics.routes.ts
│       └── errors.routes.ts
├── modules/
│   ├── chat/
│   │   ├── chat.service.ts
│   │   └── chat.types.ts
│   ├── ai/
│   │   ├── ai.service.ts
│   │   ├── prompts.ts
│   │   └── functions.ts
│   ├── sporttia/
│   │   ├── sporttia.service.ts
│   │   └── sporttia.types.ts
│   ├── email/
│   │   ├── email.service.ts
│   │   └── templates/
│   │       └── welcome.tsx
│   ├── admin/
│   │   ├── admin.service.ts
│   │   └── metrics.service.ts
│   └── analytics/
│       └── analytics.service.ts
├── middleware/
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   ├── rateLimit.middleware.ts
│   └── validation.middleware.ts
├── db/
│   ├── index.ts              # Kysely client
│   ├── migrations/
│   │   └── 001_initial.ts
│   └── types.ts              # Generated DB types
├── config/
│   ├── index.ts
│   ├── env.ts
│   └── logger.ts
├── utils/
│   └── errors.ts
├── app.ts                    # Express app setup
└── server.ts                 # Entry point
```

#### Controller Template

```typescript
// apps/api/src/routes/conversations.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { chatService } from '@/modules/chat/chat.service';
import { validate } from '@/middleware/validation.middleware';
import { rateLimit } from '@/middleware/rateLimit.middleware';
import { asyncHandler } from '@/utils/errors';

const router = Router();

// Rate limit: 60 requests per minute per IP
const chatRateLimit = rateLimit({ windowMs: 60000, max: 60 });

// POST /api/conversations - Create new conversation
router.post(
  '/',
  chatRateLimit,
  asyncHandler(async (req, res) => {
    const conversation = await chatService.createConversation();
    res.status(201).json(conversation);
  })
);

// GET /api/conversations/:id - Get conversation with messages
router.get(
  '/:id',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const conversation = await chatService.getConversation(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conversation);
  })
);

// POST /api/conversations/:id/messages - Send message
const sendMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(2000),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

router.post(
  '/:id/messages',
  chatRateLimit,
  validate(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;

    const result = await chatService.addMessage(id, content);
    res.json(result);
  })
);

export const conversationsRouter = router;
```

### 10.2 Database Architecture

#### Schema Design

See Section 8 above for full SQL schema.

#### Data Access Layer

```typescript
// apps/api/src/modules/chat/chat.service.ts
import { db } from '@/db';
import { aiService } from '@/modules/ai/ai.service';
import { analyticsService } from '@/modules/analytics/analytics.service';
import { sporttiaService } from '@/modules/sporttia/sporttia.service';
import { emailService } from '@/modules/email/email.service';
import type { Conversation, Message, CollectedData } from '@sporttia-zero/shared';
import { v4 as uuidv4 } from 'uuid';

class ChatService {
  async createConversation(): Promise<Conversation> {
    const sessionId = uuidv4();

    const [conversation] = await db
      .insertInto('conversations')
      .values({
        session_id: sessionId,
        status: 'active',
      })
      .returning(['id', 'session_id', 'status', 'created_at', 'updated_at'])
      .execute();

    await analyticsService.trackEvent({
      conversationId: conversation.id,
      eventType: 'conversation_started',
      eventData: {},
    });

    // Generate initial AI greeting
    const greeting = await aiService.generateGreeting();
    await this.saveMessage(conversation.id, 'assistant', greeting);

    return this.mapConversation(conversation);
  }

  async getConversation(id: string): Promise<ConversationWithMessages | null> {
    const conversation = await db
      .selectFrom('conversations')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!conversation) return null;

    const messages = await db
      .selectFrom('messages')
      .selectAll()
      .where('conversation_id', '=', id)
      .orderBy('created_at', 'asc')
      .execute();

    return {
      ...this.mapConversation(conversation),
      messages: messages.map(this.mapMessage),
    };
  }

  async addMessage(conversationId: string, content: string): Promise<MessageResponse> {
    // Save user message
    const userMessage = await this.saveMessage(conversationId, 'user', content);

    // Get conversation with history
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Generate AI response
    const aiResponse = await aiService.generateResponse(conversation);

    // Handle function calls (data collection)
    if (aiResponse.functionCalls?.length) {
      const collectedData = await this.processFunctionCalls(
        conversationId,
        aiResponse.functionCalls,
        conversation.collectedData
      );

      // Check if user confirmed and we should create sports center
      if (collectedData?.confirmed && this.isDataComplete(collectedData)) {
        return this.handleCreation(conversationId, collectedData, aiResponse.content);
      }
    }

    // Save assistant message
    const assistantMessage = await this.saveMessage(
      conversationId,
      'assistant',
      aiResponse.content,
      { tokensUsed: aiResponse.tokensUsed }
    );

    return {
      userMessage,
      assistantMessage,
      collectedData: conversation.collectedData,
      status: conversation.status,
    };
  }

  private async handleCreation(
    conversationId: string,
    collectedData: CollectedData,
    aiContent: string
  ): Promise<MessageResponse> {
    try {
      // Create sports center
      const result = await sporttiaService.createSportsCenter(collectedData);

      // Save to our database
      await db
        .insertInto('sports_centers')
        .values({
          conversation_id: conversationId,
          sporttia_id: result.sporttiaId,
          name: collectedData.sportsCenter!.name,
          city: collectedData.sportsCenter!.city,
          language: collectedData.sportsCenter!.language,
          admin_email: collectedData.admin!.email,
        })
        .execute();

      // Update conversation status
      await db
        .updateTable('conversations')
        .set({ status: 'completed' })
        .where('id', '=', conversationId)
        .execute();

      // Send welcome email (fire and forget)
      emailService.sendWelcomeEmail(
        collectedData.admin!.email,
        {
          centerName: collectedData.sportsCenter!.name,
          language: collectedData.sportsCenter!.language,
          // ...other data
        }
      ).catch(err => console.error('Email send failed:', err));

      // Track success
      await analyticsService.trackEvent({
        conversationId,
        eventType: 'sports_center_created',
        eventData: { sporttiaId: result.sporttiaId },
      });

      // Return success response
      const successMessage = await this.saveMessage(
        conversationId,
        'assistant',
        aiContent
      );

      return {
        userMessage: null as any, // Already saved
        assistantMessage: successMessage,
        collectedData,
        status: 'completed',
      };
    } catch (error) {
      // Track error
      await analyticsService.trackEvent({
        conversationId,
        eventType: 'api_error',
        eventData: { error: error.message, type: 'sporttia_api' },
      });

      // Update status
      await db
        .updateTable('conversations')
        .set({ status: 'error' })
        .where('id', '=', conversationId)
        .execute();

      throw error;
    }
  }

  private async saveMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<Message> {
    const [message] = await db
      .insertInto('messages')
      .values({
        conversation_id: conversationId,
        role,
        content,
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .returning(['id', 'conversation_id', 'role', 'content', 'metadata', 'created_at'])
      .execute();

    return this.mapMessage(message);
  }

  // ... helper methods
}

export const chatService = new ChatService();
```

### 10.3 Authentication and Authorization

#### Auth Flow

```mermaid
sequenceDiagram
    participant A as Admin Browser
    participant API as Express API
    participant SA as Sporttia API

    A->>API: POST /admin/auth/login {login, password}
    API->>SA: POST /v7/login {login, password}
    SA-->>API: {token, user}
    Note over API: Validate user is admin
    API->>API: Generate session JWT
    API-->>A: {token, user}
    A->>A: Store token in localStorage

    Note over A,API: Subsequent requests
    A->>API: GET /admin/metrics (Authorization: Bearer {token})
    API->>API: Verify JWT
    API-->>A: {metrics}
```

#### Middleware/Guards

```typescript
// apps/api/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config';

interface AdminTokenPayload {
  userId: number;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AdminTokenPayload;
    req.admin = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// apps/api/src/modules/admin/auth.service.ts
import { sporttiaService } from '@/modules/sporttia/sporttia.service';
import jwt from 'jsonwebtoken';
import { config } from '@/config';

class AuthService {
  async login(login: string, password: string) {
    // Authenticate with Sporttia
    const sporttiaResult = await sporttiaService.login(login, password);

    // Generate our own JWT for admin dashboard
    const token = jwt.sign(
      {
        userId: sporttiaResult.user.id,
        email: sporttiaResult.user.email,
        name: sporttiaResult.user.name,
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    return {
      token,
      user: {
        id: sporttiaResult.user.id,
        name: sporttiaResult.user.name,
        email: sporttiaResult.user.email,
      },
    };
  }
}

export const authService = new AuthService();
```

---

## 11. Unified Project Structure

```
sporttia-zero/
├── .github/
│   └── workflows/
│       ├── ci.yaml                 # Lint, test, build on PR
│       └── deploy.yaml             # Deploy to GCE on merge to main
├── apps/
│   ├── api/                        # Express.js backend
│   │   ├── src/
│   │   │   ├── routes/             # API route handlers
│   │   │   ├── modules/            # Business logic modules
│   │   │   │   ├── chat/
│   │   │   │   ├── ai/
│   │   │   │   ├── sporttia/
│   │   │   │   ├── email/
│   │   │   │   ├── admin/
│   │   │   │   └── analytics/
│   │   │   ├── middleware/         # Express middleware
│   │   │   ├── db/                 # Database client & migrations
│   │   │   ├── config/             # Environment config
│   │   │   ├── utils/              # Shared utilities
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   ├── tests/                  # Backend tests
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── web/                        # React public chat
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── chat/
│   │   │   │   ├── summary/
│   │   │   │   ├── screens/
│   │   │   │   └── ui/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── stores/
│   │   │   ├── styles/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── tests/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── tailwind.config.js
│   └── admin/                      # React admin dashboard
│       ├── src/
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   ├── dashboard/
│       │   │   ├── conversations/
│       │   │   ├── errors/
│       │   │   └── ui/
│       │   ├── hooks/
│       │   ├── services/
│       │   ├── stores/
│       │   ├── pages/
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── public/
│       ├── tests/
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── tailwind.config.js
├── packages/
│   └── shared/                     # Shared TypeScript types
│       ├── src/
│       │   ├── types/
│       │   │   ├── conversation.ts
│       │   │   ├── message.ts
│       │   │   ├── sports-center.ts
│       │   │   └── index.ts
│       │   ├── constants/
│       │   └── utils/
│       ├── package.json
│       └── tsconfig.json
├── infrastructure/                 # IaC (future)
│   └── terraform/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── scripts/
│   ├── setup.sh                    # Local dev setup
│   ├── db-migrate.sh               # Run migrations
│   └── deploy.sh                   # Manual deploy script
├── docs/
│   ├── brief.md
│   ├── prd.md
│   ├── front-end-spec.md
│   └── architecture.md
├── .env.example                    # Environment template
├── .eslintrc.js                    # Root ESLint config
├── .prettierrc                     # Prettier config
├── package.json                    # Monorepo root
├── tsconfig.base.json              # Base TypeScript config
└── README.md
```

---

## 12. Development Workflow

### 12.1 Local Development Setup

#### Prerequisites

```bash
# Required software
node --version  # >= 20.x
npm --version   # >= 10.x
docker --version  # For local PostgreSQL

# Environment
cp .env.example .env
# Edit .env with your API keys:
# - OPENAI_API_KEY
# - RESEND_API_KEY
# - DATABASE_URL (or use local Docker PostgreSQL)
```

#### Initial Setup

```bash
# Clone and install
git clone https://github.com/sporttia/sporttia-zero.git
cd sporttia-zero
npm install

# Start local PostgreSQL
docker run -d --name sporttia-zero-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sporttia_zero \
  -p 5432:5432 \
  postgres:15

# Run migrations
npm run db:migrate

# Build shared package
npm run build -w packages/shared
```

#### Development Commands

```bash
# Start all services (API + both frontends)
npm run dev

# Start individual services
npm run dev -w apps/api       # API on :3001
npm run dev -w apps/web       # Chat on :5173
npm run dev -w apps/admin     # Admin on :5174

# Run tests
npm test                      # All tests
npm test -w apps/api          # Backend only
npm test -w apps/web          # Chat frontend only

# Linting
npm run lint
npm run lint:fix

# Type checking
npm run typecheck
```

### 12.2 Environment Configuration

#### Required Environment Variables

```bash
# Frontend (.env.local for apps/web and apps/admin)
VITE_API_URL=http://localhost:3001/api

# Backend (.env for apps/api)
NODE_ENV=development
PORT=3001

# Database (PostgreSQL) - Cloud SQL sporttia-db-hub-pre/sporttia-db-hub-pro
# PRE: postgresql://sporttia:PASSWORD@10.63.50.7:5432/sporttia_zero?sslmode=require
# PRO: postgresql://sporttia:PASSWORD@10.63.50.5:5432/sporttia_zero?sslmode=require
DATABASE_URL=postgresql://sporttia:PASSWORD@10.63.50.7:5432/sporttia_zero?sslmode=require

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo

# Sporttia API
SPORTTIA_API_HOST=https://preapi.sporttia.com

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@zero.sporttia.com

# Admin JWT
JWT_SECRET=your-secret-key-change-in-production

# Shared
LOG_LEVEL=debug
```

---

## 13. Deployment Architecture

> **Note:** For detailed deployment procedures, see [docs/deployment.md](deployment.md)

### 13.1 Deployment Strategy

**Infrastructure:**
- **GCP Project:** `atlantean-app-120410` (Sporttia Web)
- **Instance:** `sporttia-zero` (e2-small, europe-west1-b)
- **IP Address:** 34.22.147.236
- **Domain:** zero.sporttia.com

**URL Routing:**
| Path | Service | Description |
|------|---------|-------------|
| `/` | Web frontend | Public chat interface |
| `/api/*` | API server | REST API (port 3000) |
| `/manager` | Admin frontend | Admin dashboard |

**Frontend Deployment:**
- **Platform:** Google Compute Engine (Nginx static files)
- **Build Command:** `npm run build -w apps/web && VITE_BASE_PATH=/manager npm run build -w apps/admin`
- **Output Directory:** `apps/web/dist`, `apps/admin/dist`
- **Server Path:** `/var/www/sporttia-zero/web`, `/var/www/sporttia-zero/admin`

**Backend Deployment:**
- **Platform:** Google Compute Engine (Node.js process)
- **Build Command:** `npm run build -w apps/api`
- **Server Path:** `/opt/sporttia-zero/api`
- **Deployment Method:** systemd service (`sporttia-zero-api.service`)

### 13.2 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yaml
name: Deploy to GCE

on:
  push:
    branches: [main]

env:
  PROJECT_ID: sporttia-zero
  GCE_INSTANCE: sporttia-zero-vm
  GCE_ZONE: europe-west1-b

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: |
            apps/api/dist
            apps/web/dist
            apps/admin/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      - uses: google-github-actions/setup-gcloud@v2
      - name: Deploy to GCE
        run: |
          gcloud compute scp --recurse ./apps ${{ env.GCE_INSTANCE }}:~/sporttia-zero/ --zone=${{ env.GCE_ZONE }}
          gcloud compute ssh ${{ env.GCE_INSTANCE }} --zone=${{ env.GCE_ZONE }} --command="cd ~/sporttia-zero && ./scripts/deploy.sh"
```

### 13.3 Environments

| Environment | Web Frontend | Admin Dashboard | API | Purpose |
|-------------|--------------|-----------------|-----|---------|
| Development | http://localhost:5173 | http://localhost:5174 | http://localhost:3000 | Local development |
| Production | https://zero.sporttia.com | https://zero.sporttia.com/manager | https://zero.sporttia.com/api | Live environment |

### 13.4 Docker Deployment

**Docker Configuration Files:**
- `docker-compose.yml` - Orchestrates all services
- `apps/api/Dockerfile` - API server container
- `apps/web/Dockerfile` - Web frontend container
- `apps/admin/Dockerfile` - Admin dashboard container
- `deploy/docker-nginx.conf` - Nginx reverse proxy for Docker

**Container Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                    docker-compose.yml                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │  nginx  │    │   api   │    │   web   │    │  admin  │  │
│  │  :80    │───▶│  :3000  │    │   :80   │    │   :80   │  │
│  │  :443   │───▶│         │    │         │    │         │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│       │              │              │              │        │
│       └──────────────┴──────────────┴──────────────┘        │
│                    sporttia-network                          │
└─────────────────────────────────────────────────────────────┘
```

**Quick Start:**
```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

**Port Mapping:**
| Service | Internal Port | External Port |
|---------|---------------|---------------|
| nginx | 80, 443 | 80, 443 |
| api | 3000 | 3000 |
| web | 80 | 4000 |
| admin | 80 | 5000 |

**Environment Configuration:**
Create a `.env` file in the root directory with required variables:
```env
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
# See .env.example for full list
```

---

## 14. Security and Performance

### 14.1 Security Requirements

**Frontend Security:**
- CSP Headers: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.openai.com;`
- XSS Prevention: React automatic escaping, no dangerouslySetInnerHTML
- Secure Storage: No sensitive data in localStorage (admin token exception with short expiry)

**Backend Security:**
- Input Validation: Zod schemas on all endpoints
- Rate Limiting: 60 req/min per IP on chat endpoints, 100 req/min on admin
- CORS Policy: Whitelist `zero.sporttia.com`, `pre-zero.sporttia.com`, localhost for dev

**Authentication Security:**
- Token Storage: JWT in localStorage (admin only), 24h expiry
- Session Management: Stateless JWT, no server-side sessions
- Password Policy: Delegated to Sporttia API

### 14.2 Performance Optimization

**Frontend Performance:**
- Bundle Size Target: <150KB gzipped for chat app, <300KB for admin
- Loading Strategy: Code splitting on routes (admin), lazy load charts
- Caching Strategy: Service worker for static assets (optional)

**Backend Performance:**
- Response Time Target: <500ms for non-AI endpoints, <5s for AI responses
- Database Optimization: Indexes on foreign keys, pagination, connection pooling
- Caching Strategy: In-memory cache for sports list (1 hour TTL)

---

## 15. Testing Strategy

### 15.1 Testing Pyramid

```
          /  E2E Tests (Playwright)  \
         /    ~10 critical paths      \
        /─────────────────────────────\
       /   Integration Tests (API)     \
      /     ~50 endpoint tests          \
     /──────────────────────────────────\
    /      Unit Tests (Logic)            \
   /   ~100+ service & utility tests      \
  /────────────────────────────────────────\
```

### 15.2 Test Organization

#### Frontend Tests

```
apps/web/tests/
├── components/
│   ├── ChatMessage.test.tsx
│   ├── ChatInput.test.tsx
│   └── ConfigurationSummary.test.tsx
├── hooks/
│   └── useConversation.test.ts
└── integration/
    └── chat-flow.test.tsx
```

#### Backend Tests

```
apps/api/tests/
├── unit/
│   ├── chat.service.test.ts
│   ├── ai.service.test.ts
│   └── validation.test.ts
├── integration/
│   ├── conversations.routes.test.ts
│   ├── admin.routes.test.ts
│   └── sporttia.service.test.ts
└── fixtures/
    └── conversations.ts
```

#### E2E Tests

```
e2e/
├── chat-flow.spec.ts
├── admin-login.spec.ts
└── admin-dashboard.spec.ts
```

### 15.3 Test Examples

#### Frontend Component Test

```typescript
// apps/web/tests/components/ChatMessage.test.tsx
import { render, screen } from '@testing-library/react';
import { ChatMessage } from '@/components/chat/ChatMessage';

describe('ChatMessage', () => {
  const userMessage = {
    id: '1',
    conversationId: 'conv-1',
    role: 'user' as const,
    content: 'Hello, I want to create a sports center',
    createdAt: new Date(),
  };

  it('renders user message on the right', () => {
    render(<ChatMessage message={userMessage} isUser={true} />);

    const container = screen.getByText(/Hello, I want/).parentElement?.parentElement;
    expect(container).toHaveClass('justify-end');
  });

  it('renders assistant message on the left', () => {
    const assistantMessage = { ...userMessage, role: 'assistant' as const };
    render(<ChatMessage message={assistantMessage} isUser={false} />);

    const container = screen.getByText(/Hello, I want/).parentElement?.parentElement;
    expect(container).toHaveClass('justify-start');
  });

  it('displays message content', () => {
    render(<ChatMessage message={userMessage} isUser={true} />);

    expect(screen.getByText('Hello, I want to create a sports center')).toBeInTheDocument();
  });
});
```

#### Backend API Test

```typescript
// apps/api/tests/integration/conversations.routes.test.ts
import request from 'supertest';
import { app } from '@/app';
import { db } from '@/db';

describe('POST /api/conversations', () => {
  beforeEach(async () => {
    await db.deleteFrom('messages').execute();
    await db.deleteFrom('conversations').execute();
  });

  it('creates a new conversation and returns initial greeting', async () => {
    const response = await request(app)
      .post('/api/conversations')
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      sessionId: expect.any(String),
      status: 'active',
    });

    // Verify greeting message was created
    const messages = await db
      .selectFrom('messages')
      .selectAll()
      .where('conversation_id', '=', response.body.id)
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('assistant');
  });
});

describe('POST /api/conversations/:id/messages', () => {
  it('returns AI response to user message', async () => {
    // Create conversation first
    const createRes = await request(app).post('/api/conversations');
    const conversationId = createRes.body.id;

    const response = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .send({ content: 'I want to create a padel club' })
      .expect(200);

    expect(response.body).toMatchObject({
      userMessage: { role: 'user', content: 'I want to create a padel club' },
      assistantMessage: { role: 'assistant', content: expect.any(String) },
      status: 'active',
    });
  });

  it('returns 404 for non-existent conversation', async () => {
    await request(app)
      .post('/api/conversations/00000000-0000-0000-0000-000000000000/messages')
      .send({ content: 'Hello' })
      .expect(404);
  });
});
```

#### E2E Test

```typescript
// e2e/chat-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Flow', () => {
  test('user can complete onboarding conversation', async ({ page }) => {
    await page.goto('/');

    // Wait for initial greeting
    await expect(page.locator('[data-testid="assistant-message"]').first())
      .toBeVisible({ timeout: 10000 });

    // User provides sports center name
    await page.fill('[data-testid="chat-input"]', 'Club Padel Valencia');
    await page.click('[data-testid="send-button"]');

    // Wait for AI response
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeHidden({ timeout: 30000 });

    // Continue conversation...
    // (abbreviated for example)

    // Eventually reach success screen
    await expect(page.locator('[data-testid="success-screen"]'))
      .toBeVisible({ timeout: 60000 });
  });
});
```

---

## 16. Coding Standards

### 16.1 Critical Fullstack Rules

- **Type Sharing:** Always define types in `packages/shared` and import from there. Never duplicate types across apps.
- **API Calls (Frontend):** Never make direct fetch calls - use the service layer (`api.ts`, `adminApi.ts`)
- **Environment Variables:** Access only through config objects (`config.ts`), never `process.env` directly in business logic
- **Error Handling:** All API routes must use the `asyncHandler` wrapper and `errorMiddleware`
- **State Updates:** Never mutate state directly - use dispatch/setState with new objects
- **Database Queries:** Use Kysely query builder, no raw SQL except in migrations
- **Validation:** All API inputs validated with Zod schemas
- **Logging:** Use structured logging (Pino), include conversationId in context

### 16.2 Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `ChatMessage.tsx` |
| Hooks | camelCase with 'use' | - | `useConversation.ts` |
| Services | camelCase | camelCase | `chatService.ts` |
| API Routes | - | kebab-case | `/api/conversations` |
| Database Tables | - | snake_case | `sports_centers` |
| Database Columns | - | snake_case | `created_at` |
| TypeScript Types | PascalCase | PascalCase | `Conversation` |
| Constants | UPPER_SNAKE_CASE | UPPER_SNAKE_CASE | `MAX_MESSAGE_LENGTH` |
| Files | kebab-case or PascalCase (components) | kebab-case | `chat.service.ts` |

---

## 17. Error Handling Strategy

### 17.1 Error Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant E as External (OpenAI/Sporttia)

    U->>F: Action
    F->>A: API Request

    alt Success
        A->>E: External Call
        E-->>A: Success Response
        A-->>F: Success JSON
        F-->>U: Update UI
    else Known Error
        A->>E: External Call
        E-->>A: Error Response
        A->>A: Map to AppError
        A-->>F: { error: { code, message } }
        F-->>U: Show user-friendly message
    else Unexpected Error
        A->>A: Catch in errorMiddleware
        A->>A: Log full error
        A-->>F: { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }
        F-->>U: Show generic error + retry option
    end
```

### 17.2 Error Response Format

```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
  };
}

// Error codes
type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'OPENAI_ERROR'
  | 'SPORTTIA_API_ERROR'
  | 'EMAIL_ERROR'
  | 'INTERNAL_ERROR';
```

### 17.3 Frontend Error Handling

```typescript
// apps/web/src/services/api.ts
export async function handleApiError(error: unknown): Promise<never> {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'RATE_LIMITED':
        throw new Error('Too many requests. Please wait a moment and try again.');
      case 'OPENAI_ERROR':
        throw new Error('Our AI assistant is temporarily unavailable. Please try again.');
      case 'SPORTTIA_API_ERROR':
        throw new Error('Could not create your sports center. Please try again or contact sales@sporttia.com');
      default:
        throw new Error(error.message || 'Something went wrong. Please try again.');
    }
  }
  throw new Error('Network error. Please check your connection.');
}
```

### 17.4 Backend Error Handling

```typescript
// apps/api/src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '@/config/logger';
import { v4 as uuidv4 } from 'uuid';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = uuidv4();

  // Log full error
  logger.error({
    requestId,
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Zod validation errors
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors,
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }

  // Known app errors
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }

  // Unknown errors - don't leak details
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}
```

---

## 18. Monitoring and Observability

### 18.1 Monitoring Stack

- **Frontend Monitoring:** Google Analytics 4 (basic), Sentry (errors)
- **Backend Monitoring:** Google Cloud Monitoring (metrics, uptime)
- **Error Tracking:** Sentry for both frontend and backend
- **Performance Monitoring:** Google Cloud Trace (backend latency)

### 18.2 Key Metrics

**Frontend Metrics:**
- Core Web Vitals (LCP, FID, CLS)
- JavaScript errors (Sentry)
- API response times (custom tracking)
- User interactions (conversation started, completed)

**Backend Metrics:**
- Request rate (requests/second)
- Error rate (% 5xx responses)
- Response time (p50, p95, p99)
- Database query performance
- OpenAI token usage
- Sporttia API call success rate

**Business Metrics (tracked in DB):**
- Conversations started per day
- Completion rate
- Average conversation duration
- Error rate by type
- Sports centers created

### 18.3 Logging Structure

```typescript
// Structured log format
{
  "timestamp": "2026-01-16T10:30:00.000Z",
  "level": "info",
  "message": "Message sent",
  "conversationId": "uuid",
  "requestId": "uuid",
  "userId": null,
  "latencyMs": 1234,
  "tokensUsed": 150,
  "context": {
    "role": "user",
    "contentLength": 45
  }
}
```

---

## 19. Next Steps

### 19.1 Pre-Development Validation

1. **Validate Sporttia API payload structure** - Test `POST /v7/zeros/sportcenters` in pre environment
2. **Confirm response format** - What data does Sporttia return after creation?
3. **Set up Resend domain verification** - Configure `zero.sporttia.com` for email sending
4. **Obtain Sporttia brand assets** - Logo, colors for frontend implementation

### 19.2 Development Sequence

1. **Epic 1: Foundation** - Monorepo setup, DB schema, basic chat UI
2. **Epic 2: Onboarding Flow** - AI integration, Sporttia API, email
3. **Epic 3: Admin Dashboard** - Metrics, conversation viewer

### 19.3 Architecture Checklist

- [x] High-level architecture diagram
- [x] Tech stack selection
- [x] Data models defined
- [x] API specification (OpenAPI)
- [x] Database schema
- [x] Frontend component structure
- [x] Backend module organization
- [x] External API integration plan
- [x] Security requirements
- [x] Testing strategy
- [x] Deployment architecture
- [x] CI/CD pipeline
- [ ] Sporttia API payload validation (pending)
- [ ] GCP infrastructure provisioning

---

## Appendix: OpenAI Function Definitions

```typescript
// apps/api/src/modules/ai/functions.ts
export const functions = [
  {
    name: 'collect_sports_center_info',
    description: 'Collect basic sports center information. System will lookup city ID from Sporttia API.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Sports center name' },
        city: { type: 'string', description: 'City where the center is located (country inferred from context; system looks up cityId via GET /v7/cities)' },
        language: { type: 'string', description: 'ISO-639 language code (es, en, pt)' },
      },
      required: ['name', 'city', 'language'],
    },
  },
  {
    name: 'collect_admin_info',
    description: 'Collect administrator information',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Admin full name' },
        email: { type: 'string', description: 'Admin email address' },
      },
      required: ['name', 'email'],
    },
  },
  {
    name: 'collect_facility',
    description: 'Collect information about a facility. Sport must be validated against Sporttia sports list (not displayed to user).',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Facility name (e.g., "Pista 1")' },
        sportId: { type: 'number', description: 'Sport ID from Sporttia API (validated against available sports)' },
        sportName: { type: 'string', description: 'Sport name for display' },
        schedules: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              weekdays: { type: 'array', items: { type: 'number' }, description: '0=Sunday, 1=Monday...' },
              startTime: { type: 'string', description: 'Start time HH:mm' },
              endTime: { type: 'string', description: 'End time HH:mm' },
              duration: { type: 'number', description: 'Slot duration in minutes' },
              rate: { type: 'number', description: 'Price per slot in EUR' },
            },
          },
        },
      },
      required: ['name', 'sportId', 'sportName', 'schedules'],
    },
  },
  {
    name: 'confirm_configuration',
    description: 'User confirms the sports center configuration',
    parameters: {
      type: 'object',
      properties: {
        confirmed: { type: 'boolean', description: 'Whether user confirmed' },
      },
      required: ['confirmed'],
    },
  },
  {
    name: 'request_human_help',
    description: 'User needs human assistance',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Why human help is needed' },
      },
      required: ['reason'],
    },
  },
];
```
