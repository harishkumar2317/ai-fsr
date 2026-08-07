# AI-FSR — Technical Documentation

## 1. Product Overview

**AI-FSR** is an AI-powered Food Safety & Regulatory Compliance Platform designed for the food industry. It automates audits, tracks incidents, manages CAPA (Corrective and Preventive Actions), and ensures compliance with FSSAI, HACCP, and ISO 22000 regulations.

**Live URL:** https://ai-fsr-production.up.railway.app

---

## 2. Architecture

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│          HTML + CSS + Vanilla JavaScript          │
│         (Standalone pages, shared assets)         │
└──────────────────────┬──────────────────────────┘
                       │ HTTP/REST API
┌──────────────────────▼──────────────────────────┐
│                   BACKEND                        │
│            Node.js + Express.js                   │
│         (REST API, JWT Auth, SSE Streaming)       │
└──────────┬──────────────────┬───────────────────┘
           │                  │
┌──────────▼──────┐  ┌───────▼────────┐
│   PostgreSQL    │  │   Groq API      │
│   (Neon Cloud)  │  │  (Llama 3.3)    │
│   Database      │  │  AI Assistant    │
└─────────────────┘  └────────────────┘
```

**Deployment:** Railway (Node.js runtime)
**Database:** PostgreSQL on Neon (serverless, auto-scaling)
**AI Model:** Llama 3.3 70B Versatile via Groq SDK

---

## 3. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | HTML5, CSS3, Vanilla JavaScript | UI rendering, no framework overhead |
| Backend | Node.js v18+ | Server runtime |
| Web Framework | Express.js | REST API, routing, middleware |
| Database | PostgreSQL (Neon) | Production data storage |
| Local DB | SQLite (sql.js) | Local development fallback |
| Authentication | JWT (jsonwebtoken) | Token-based auth |
| Password Hashing | bcrypt.js | Secure password storage |
| AI Assistant | Groq SDK (groq-sdk) | LLM inference (Llama 3.3 70B) |
| Streaming | Server-Sent Events (SSE) | Real-time AI response streaming |
| Hosting | Railway | Production deployment |
| Database Hosting | Neon | Serverless PostgreSQL |

---

## 4. Project Structure

```
ai-fsr/
├── backend/
│   ├── server.js                  # Express app entry point
│   ├── db/
│   │   └── database.js            # PostgreSQL/SQLite dual-mode adapter
│   ├── middleware/
│   │   └── auth.js                # JWT authenticate + role authorize
│   └── routes/
│       ├── auth.js                # Login, signup, OTP, password reset
│       ├── organizations.js       # Organization CRUD
│       ├── users.js               # User management
│       ├── audits.js              # Audit CRUD
│       ├── incidents.js           # Incident CRUD
│       ├── capa.js                # CAPA CRUD
│       ├── dashboard.js           # Dashboard statistics
│       ├── checklist.js           # Compliance checklist
│       ├── invite.js              # Team invite, members, roles
│       ├── assistant.js           # AI chat (Groq streaming)
│       └── messages.js            # Team messaging
├── website/
│   ├── index.html                 # Dashboard
│   ├── login.html                 # Login / Signup
│   ├── verify.html                # 2FA OTP verification
│   ├── landing.html               # Public landing page
│   ├── organizations.html         # Orgs + team + messaging
│   ├── audit.html                 # Audit management
│   ├── incidents.html             # Incident tracking
│   ├── capa.html                  # CAPA kanban
│   ├── checklist.html             # Compliance checklists
│   ├── documents.html             # Document management
│   ├── label.html                 # Label validation
│   ├── reports.html               # Reports & analytics
│   ├── assistant.html             # AI compliance assistant
│   ├── styles.css                 # Design system
│   ├── app.js                     # Nav, sidebar, auth, theme
│   └── api.js                     # Frontend API client
├── package.json                   # Dependencies
├── railway.toml                   # Railway config
└── .gitignore
```

---

## 5. Database Schema

### Core Tables

#### organizations
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Auto-increment ID |
| name | TEXT NOT NULL | Organization name |
| plant | TEXT NOT NULL | Plant/Unit name |
| code | TEXT | Organization code |
| address | TEXT | Physical address |
| fssai_license | TEXT | FSSAI license number |
| fssai_category | TEXT | FSSAI category (State/Central) |
| contact_person | TEXT | Primary contact |
| designation | TEXT | Contact designation |
| email | TEXT | Contact email |
| phone | TEXT | Contact phone |
| status | TEXT | Active/Inactive |
| compliance_score | INTEGER | Current compliance score |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

#### users
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Auto-increment ID |
| name | TEXT NOT NULL | Full name |
| email | TEXT UNIQUE NOT NULL | Login email |
| password | TEXT NOT NULL | bcrypt hashed password |
| role | TEXT NOT NULL | User role (see Section 6) |
| organization_id | INTEGER | FK → organizations.id |
| phone | TEXT | Phone number |
| avatar | TEXT | Avatar URL |
| status | TEXT | active/inactive |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

#### audits
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Auto-increment ID |
| audit_id | TEXT UNIQUE | Human-readable audit ID |
| type | TEXT NOT NULL | Internal/External/Regulatory |
| organization_id | INTEGER | FK → organizations.id |
| plant | TEXT | Plant name |
| auditor | TEXT | Auditor name |
| date | TEXT | Audit date |
| score | INTEGER | Compliance score |
| status | TEXT | Scheduled/In Progress/Completed |
| findings | TEXT | Audit findings |

#### incidents
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Auto-increment ID |
| incident_id | TEXT UNIQUE | Human-readable incident ID |
| title | TEXT NOT NULL | Incident title |
| description | TEXT | Detailed description |
| severity | TEXT | Low/Medium/High/Critical |
| status | TEXT | Open/In Progress/Resolved |
| organization_id | INTEGER | FK → organizations.id |
| reported_by | TEXT | Reporter name |
| assigned_to | TEXT | Assignee name |
| date | TEXT | Incident date |

#### capa
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Auto-increment ID |
| capa_id | TEXT UNIQUE | Human-readable CAPA ID |
| title | TEXT NOT NULL | CAPA title |
| description | TEXT | Detailed description |
| type | TEXT | Corrective/Preventive |
| priority | TEXT | Low/Medium/High/Critical |
| status | TEXT | Open/In Progress/Closed |
| organization_id | INTEGER | FK → organizations.id |
| assigned_to | TEXT | Assignee name |
| due_date | TEXT | Due date |
| progress | INTEGER | Progress percentage |

#### checklist
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| title | TEXT NOT NULL | Checklist item title |
| category | TEXT | Category (Hygiene, HACCP, etc.) |
| frequency | TEXT | Daily/Weekly/Monthly |
| status | TEXT | Pending/Compliant/Non-Compliant |
| assignee | TEXT | Assigned person |
| regulation | TEXT | Applicable regulation |
| action | TEXT | Required action |
| organization_id | INTEGER | FK → organizations.id |
| due_date | TEXT | Due date |

#### messages
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Auto-increment ID |
| sender_id | INTEGER | FK → users.id |
| receiver_id | INTEGER | FK → users.id |
| message | TEXT NOT NULL | Message content |
| read | INTEGER | 0=unread, 1=read |
| created_at | TIMESTAMP | Message time |

---

## 6. Role-Based Access Control (RBAC)

### System Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| super_admin | Platform super admin | Full access to everything |
| admin | Organization admin | Manage org, members, all features |
| food_safety_officer | FSO | Checklists, audits, incidents |
| auditor | Internal/external auditor | Audits, read-only access |
| viewer | Read-only user | View only |

### Industry-Specific Roles

| Role | Description |
|------|-------------|
| qa_manager | Quality Assurance Manager |
| quality_inspector | Quality Inspector |
| lab_technician | Laboratory Technician |
| hygiene_supervisor | Hygiene Supervisor |
| production_manager | Production Manager |
| plant_manager | Plant Manager |
| warehouse_manager | Warehouse Manager |
| supply_chain | Supply Chain Manager |
| regulatory_affairs | Regulatory Affairs |
| capa_manager | CAPA Manager |
| document_controller | Document Controller |
| internal_auditor | Internal Auditor |

### Custom Role Support
Admins can create custom roles during team member invitation.

---

## 7. Authentication Flow

### Signup Flow
```
1. User fills signup form (name, email, password, organization)
2. Backend creates organization record
3. Backend creates user with role='admin'
4. Returns JWT token + user object
5. Frontend stores token in localStorage
```

### Login Flow
```
1. User enters email + password
2. Backend validates credentials (bcrypt)
3. Checks user status (active/inactive)
4. Returns JWT token + user object
5. Frontend stores token in localStorage
6. All subsequent requests include Authorization: Bearer <token>
```

### Password Reset Flow
```
1. User enters email → POST /api/auth/forgot-password
2. Backend generates 6-digit OTP
3. OTP displayed in response (dev mode — no email service)
4. User enters OTP → POST /api/auth/verify-reset-otp
5. Backend verifies OTP, returns reset_token (JWT, 15min expiry)
6. User enters new password + reset_token → POST /api/auth/reset-password
7. Backend updates password
```

### JWT Token Structure
```json
{
  "userId": 1,
  "email": "user@example.com",
  "role": "admin",
  "iat": 1786049076,
  "exp": 1786135476
}
```

---

## 8. API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/signup | No | Create account + organization |
| POST | /api/auth/login | No | Login |
| POST | /api/auth/verify | Yes | Verify JWT token |
| GET | /api/auth/me | Yes | Get current user |
| POST | /api/auth/change-password | Yes | Change password |
| POST | /api/auth/forgot-password | No | Send reset OTP |
| POST | /api/auth/verify-reset-otp | No | Verify reset OTP |
| POST | /api/auth/reset-password | No | Reset password |

### Organizations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/organizations | Yes | List orgs (admin sees all) |
| POST | /api/organizations | Yes | Create org |
| PUT | /api/organizations/:id | Yes | Update org |
| DELETE | /api/organizations/:id | Yes | Delete org |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/users | Yes | List users (org-isolated) |
| POST | /api/users | Yes | Create user |
| PUT | /api/users/:id | Yes | Update user |
| DELETE | /api/users/:id | Yes | Delete user |

### Audits
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/audits | Yes | List audits (org-isolated) |
| POST | /api/audits | Yes | Create audit |
| PUT | /api/audits/:id | Yes | Update audit |
| DELETE | /api/audits/:id | Yes | Delete audit |

### Incidents
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/incidents | Yes | List incidents (org-isolated) |
| POST | /api/incidents | Yes | Create incident |
| PUT | /api/incidents/:id | Yes | Update incident |
| DELETE | /api/incidents/:id | Yes | Delete incident |

### CAPA
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/capa | Yes | List CAPA items (org-isolated) |
| POST | /api/capa | Yes | Create CAPA |
| PUT | /api/capa/:id | Yes | Update CAPA |
| DELETE | /api/capa/:id | Yes | Delete CAPA |

### Checklist
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/checklist | Yes | List items (filter by frequency, category) |
| GET | /api/checklist/stats | Yes | Compliance stats |
| POST | /api/checklist | Yes | Add item |
| PUT | /api/checklist/:id | Yes | Update item |
| DELETE | /api/checklist/:id | Yes | Delete item |

### Team & Invites
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/invite | Yes | Invite team member |
| GET | /api/invite/members | Yes | List members (org-isolated) |
| PUT | /api/invite/members/:id/role | Yes | Update member role |
| DELETE | /api/invite/members/:id | Yes | Remove member |

### Messages
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/messages/conversations | Yes | List conversations |
| GET | /api/messages/:userId | Yes | Get messages with user |
| POST | /api/messages/:userId | Yes | Send message |

### AI Assistant
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/assistant/chat | Yes | Chat with AI (SSE streaming) |

### System
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/health | No | Health check |

---

## 9. AI Assistant Technical Details

### Model
- **Provider:** Groq (groq-sdk v1.5.0)
- **Model:** llama-3.3-70b-versatile
- **Response Type:** Server-Sent Events (SSE) streaming

### System Prompt
The AI assistant has a comprehensive system prompt covering:
- FSSAI compliance requirements
- Food Safety Management Systems (FSMS)
- HACCP principles and implementation
- ISO 22000 requirements
- Good Manufacturing Practices (GMP)
- Good Hygiene Practices (GHP)
- Regulatory compliance guidance
- Audit preparation and documentation
- CAPA methodology
- Risk assessment frameworks

### Streaming Architecture
```
Client → POST /api/assistant/chat { messages: [...] }
Server → SSE Response (text/event-stream)
         data: {"content": "chunk1"}
         data: {"content": "chunk2"}
         ...
         data: [DONE]
```

---

## 10. Organization Isolation

All data is isolated by organization. Users only see data belonging to their organization.

### Implementation
1. User has `organization_id` foreign key
2. On login, backend resolves user's organization
3. All queries filter by `organization_id`
4. Multi-plant support: users across plants of same org see each other's data

### Multi-Plant Query Pattern
```sql
-- Find all org IDs with same name (all plants)
SELECT id FROM organizations WHERE name = $1
-- Query across all plants of same org
SELECT * FROM table WHERE organization_id = ANY($1)
```

---

## 11. Database Adapter (Dual-Mode)

The `database.js` module supports both PostgreSQL and SQLite:

```javascript
const USE_PG = !!process.env.DATABASE_URL;

if (USE_PG) {
  // PostgreSQL mode (production)
  // Uses pg Pool, native SQL syntax
} else {
  // SQLite mode (local development)
  // Uses sql.js, converts PostgreSQL syntax:
  // - $1, $2 → ? placeholders
  // - RETURNING → INSERT + last_insert_rowid + SELECT
  // - NOW() → CURRENT_TIMESTAMP
  // - COUNT(*) FILTER (WHERE ...) → SUM(CASE WHEN ...)
  // - ANY($1) → IN (?, ?, ...)
  // - ::int → CAST(... AS INTEGER)
}
```

---

## 12. Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 3000 | Server port |
| DATABASE_URL | Yes (prod) | — | PostgreSQL connection string (Neon) |
| GROQ_API_KEY | Yes | — | Groq API key for AI assistant |
| JWT_SECRET | Yes | ai-fsr-fallback-secret-2026 | JWT signing secret |
| JWT_EXPIRES_IN | No | 24h | Token expiry |
| NODE_ENV | No | development | production/development |

---

## 13. Deployment

### Railway
1. Push to GitHub
2. Connect repo to Railway
3. Set environment variables in Variables tab
4. Auto-deploys on push
5. Port: 3000

### Local Development
```bash
git clone https://github.com/harishkumar2317/ai-fsr.git
cd ai-fsr/backend
npm install
node server.js
# Opens at http://localhost:3000
```

No DATABASE_URL needed locally — falls back to SQLite automatically.

---

## 14. Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with configurable expiry
- CORS configured for production and development
- Rate limiting: 200 requests/15min general, 50 requests/15min for login
- Organization data isolation
- Role-based access control (RBAC)
- Environment variables for secrets (not hardcoded)

---

## 15. Frontend Architecture

### Page Structure
Each page is a standalone HTML file sharing:
- `styles.css` — Design system with CSS variables
- `app.js` — Navigation, sidebar, auth, theme
- `api.js` — API client with all endpoints

### Design System
- **Primary:** Sky blue (#0284c7)
- **Sidebar:** Dark navy (#0d1b2e)
- **Fonts:** Inter (body), DM Sans (headings), JetBrains Mono (mono)
- **Responsive:** Mobile (<480px), Tablet (<768px), Desktop (<1200px)

### Auth Persistence
- Token stored in `localStorage`
- Auto-redirect to login if no token
- Profile dropdown with logout

---

Document prepared for AI-FSR Technical Review.
