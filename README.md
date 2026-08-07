# AI-FSR — Food Safety & Regulatory Compliance Platform

AI-powered compliance platform for the food industry. Automate audits, track incidents, manage CAPA, and stay compliant with FSSAI, HACCP, and ISO 22000 regulations. Built with real-time AI chat powered by Groq (Llama 3.3 70B).

**Live:** [https://ai-fsr-production.up.railway.app](https://ai-fsr-production.up.railway.app/login.html)

## Features

- **Dashboard** — Real-time compliance scores, score trends, alerts, audit summary, risk heatmap
- **Audit Management** — Schedule, conduct, and track internal/external audits
- **Incident Tracking** — Report, investigate, and resolve food safety incidents
- **CAPA Management** — Corrective and preventive actions with kanban boards
- **Compliance Checklist** — Daily, weekly, monthly inspection checklists with stats, category filters, add/edit/delete
- **AI Compliance Assistant** — Real-time streaming chat powered by Groq (Llama 3.3 70B) with FSSAI system prompt, persistent chat history
- **Label Validation** — AI-powered food label compliance checking
- **Document Intelligence** — OCR and compliance mapping
- **Team Messaging** — Chat between admins and members across org plants, unread badges, auto-refresh
- **Multi-Organization** — Manage multiple plants and units with isolated data
- **Role-Based Access** — Super Admin, Admin, Food Safety Officer, Auditor, Viewer, + 14 industry roles (QA Manager, Lab Technician, Hygiene Supervisor, etc.) with custom role support
- **Team Invites** — Invite members with org/plant selection and role assignment
- **Forgot Password** — OTP-based password reset flow
- **Dark Mode** — Full dark theme support
- **Responsive Design** — Mobile, tablet, and desktop with collapsible sidebar

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JavaScript (standalone pages) |
| Backend | Node.js, Express.js |
| Database | PostgreSQL (Neon) on production, SQLite (sql.js) for local dev |
| AI Assistant | Groq SDK — Llama 3.3 70B Versatile with streaming SSE |
| Auth | JWT tokens, bcrypt password hashing, 2FA OTP flow |
| Design | Custom CSS with CSS variables, responsive breakpoints |
| Hosting | Railway (production) |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher

### Setup

```bash
git clone https://github.com/harishkumar2317/ai-fsr.git
cd ai-fsr
npm install
cd backend
npm install
node server.js
```

Open **http://localhost:3000** in your browser.

Local mode uses SQLite (no database setup needed). Production uses PostgreSQL via Neon.

### Create Account

Sign up at `/login.html` — the first user of a new organization becomes the Admin.

## Project Structure

```
ai-fsr/
├── backend/
│   ├── server.js              # Express entry point, route registration
│   ├── db/
│   │   └── database.js        # PostgreSQL/SQLite dual-mode schema, pool, query helpers
│   ├── middleware/
│   │   └── auth.js            # JWT authenticate + role-based authorize
│   └── routes/
│       ├── auth.js            # Signup, login, verify, forgot/change/reset password
│       ├── organizations.js   # Organization CRUD (org-isolated, admin sees all)
│       ├── users.js           # User CRUD (org-isolated)
│       ├── audits.js          # Audit CRUD (org-isolated)
│       ├── incidents.js       # Incident CRUD (org-isolated)
│       ├── capa.js            # CAPA CRUD (org-isolated)
│       ├── dashboard.js       # Dashboard stats (org-isolated)
│       ├── checklist.js       # Compliance checklist CRUD + stats + frequency/category filters
│       ├── invite.js          # Invite, members list, update role, remove member
│       ├── assistant.js       # AI chat with Groq streaming (SSE)
│       └── messages.js        # Conversations, send/receive messages, unread counts
├── website/
│   ├── index.html             # Dashboard with collapsible sections
│   ├── login.html             # Login / Signup / Forgot Password
│   ├── verify.html            # 2FA OTP verification
│   ├── landing.html           # Canva-style public landing page
│   ├── organizations.html     # Orgs table + team members + messaging chat
│   ├── audit.html             # Audit management
│   ├── incidents.html         # Incident tracking
│   ├── capa.html              # CAPA kanban board
│   ├── checklist.html         # Compliance checklists with stats/tabs/filters
│   ├── documents.html         # Document management
│   ├── label.html             # Label validation
│   ├── reports.html           # Reports & analytics
│   ├── assistant.html         # AI compliance assistant (Groq streaming)
│   ├── styles.css             # Shared design system (sky blue primary, dark navy sidebar)
│   ├── app.js                 # Nav, sidebar, auth, theme, profile, toast
│   └── api.js                 # Frontend API client (all endpoints + streaming)
├── package.json               # Root dependencies (pg, groq-sdk for Railway)
├── railway.toml               # Railway deployment config
└── .gitignore
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `DATABASE_URL` | — | PostgreSQL connection string (Neon). If unset, falls back to SQLite locally |
| `GROQ_API_KEY` | — | Groq API key for AI assistant |
| `JWT_SECRET` | `ai-fsr-fallback-secret-2026` | JWT signing secret |
| `JWT_EXPIRES_IN` | `24h` | Token expiry |
| `NODE_ENV` | `development` | Set to `production` for deploy |

## Deploy to Railway

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. In **Variables** tab, set:
   - `DATABASE_URL` — Your Neon PostgreSQL connection string
   - `GROQ_API_KEY` — Your Groq API key
   - `JWT_SECRET` — A secure random string
4. Set networking port to **3000**
5. Generate domain

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account + org |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/verify` | Verify JWT |
| POST | `/api/auth/forgot-password` | Send reset OTP |
| POST | `/api/auth/verify-reset-otp` | Verify reset OTP |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/change-password` | Change password (auth) |
| GET | `/api/auth/me` | Current user info (auth) |

### Core
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/organizations` | List orgs (admin sees all) |
| GET | `/api/users` | List users (org-isolated) |
| GET | `/api/audits` | List audits (org-isolated) |
| GET | `/api/incidents` | List incidents (org-isolated) |
| GET | `/api/capa` | List CAPA items (org-isolated) |
| GET | `/api/dashboard` | Dashboard stats (org-isolated) |

### Checklist
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/checklist` | List items (filter by frequency, category) |
| GET | `/api/checklist/stats` | Compliance stats |
| POST | `/api/checklist` | Add checklist item |
| PUT | `/api/checklist/:id` | Update checklist item |
| DELETE | `/api/checklist/:id` | Delete checklist item |

### Team
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/invite` | Invite team member |
| GET | `/api/invite/members` | List members (org-isolated) |
| PUT | `/api/invite/members/:id/role` | Update member role |
| DELETE | `/api/invite/members/:id` | Remove member |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/conversations` | List conversations |
| GET | `/api/messages/:userId` | Get messages with user |
| POST | `/api/messages/:userId` | Send message |

### AI Assistant
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/assistant/chat` | Chat with AI (SSE streaming) |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

## Database

**Production:** PostgreSQL on Neon — all tables auto-created on startup, missing columns added via `ALTER TABLE`.

**Local:** SQLite via sql.js — auto-created at `backend/db/ai_fsr.db`. No setup needed.

The adapter in `database.js` transparently converts PostgreSQL syntax (`$1` params, `RETURNING`, `FILTER`, `ANY()`) to SQLite equivalents for local development.

## License

MIT
