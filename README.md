# AI-FSR — Food Safety & Regulatory Compliance Platform

AI-powered compliance platform for the food industry. Automate audits, track incidents, manage CAPA, and stay compliant with FSSAI, HACCP, and ISO 22000 regulations.

**Live:** [https://ai-fsr-production.up.railway.app](https://ai-fsr-production.up.railway.app/login.html)

## Features

- **Dashboard** — Real-time compliance scores, alerts, and analytics
- **Audit Management** — Schedule, conduct, and track internal/external audits
- **Incident Tracking** — Report, investigate, and resolve food safety incidents
- **CAPA Management** — Corrective and preventive actions with kanban boards
- **Smart Checklists** — Daily, weekly, monthly inspection checklists
- **Label Validation** — AI-powered food label compliance checking
- **Document Intelligence** — OCR and compliance mapping
- **Multi-Organization** — Manage multiple plants and units with isolated data
- **Role-Based Access** — Super Admin, Admin, Food Safety Officer, Auditor, Viewer
- **Team Invites** — Invite members via email with role assignment
- **Forgot Password** — OTP-based password reset flow
- **Dark Mode** — Full dark theme support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | SQLite (via sql.js — pure JS, no native build) |
| Auth | JWT tokens, bcrypt password hashing |
| Design | Custom CSS with CSS variables, responsive |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher

### Setup

```bash
git clone https://github.com/harishkumar2317/ai-fsr.git
cd ai-fsr
npm install
npm start
```

Open **http://localhost:3000** in your browser.

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@ai-fsr.com | Demo@123 |
| Quality Manager | priya.sharma@agrofood.in | Demo@123 |
| Food Safety Officer | ravi.kumar@agrofood.in | Demo@123 |
| Auditor | sunita.rao@agrofood.in | Demo@123 |

## Project Structure

```
ai-fsr/
├── backend/
│   ├── server.js              # Express entry point
│   ├── db/database.js          # SQLite schema, seed data, helpers
│   ├── middleware/auth.js       # JWT auth + role middleware
│   └── routes/
│       ├── auth.js             # Login, signup, OTP, password reset
│       ├── organizations.js    # Organization CRUD
│       ├── users.js            # User management
│       ├── audits.js           # Audit CRUD
│       ├── incidents.js        # Incident CRUD
│       ├── capa.js             # CAPA CRUD
│       ├── dashboard.js        # Dashboard stats
│       └── invite.js           # Team invite system
├── website/
│   ├── index.html              # Dashboard
│   ├── login.html              # Login / Signup / Forgot Password
│   ├── verify.html             # 2FA OTP verification
│   ├── landing.html            # Public landing page
│   ├── organizations.html      # Org management + team invites
│   ├── audit.html              # Audit management
│   ├── incidents.html          # Incident tracking
│   ├── capa.html               # CAPA kanban board
│   ├── checklist.html          # Compliance checklists
│   ├── documents.html          # Document management
│   ├── label.html              # Label validation
│   ├── reports.html            # Reports & analytics
│   ├── assistant.html          # AI compliance assistant
│   ├── styles.css              # Shared design system
│   ├── app.js                  # Nav, sidebar, auth, theme
│   └── api.js                  # Frontend API client
├── package.json
├── railway.json                # Railway deployment config
├── render.yaml                 # Render deployment config
├── Procfile
└── .gitignore
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | `ai-fsr-fallback-secret-2026` | JWT signing secret |
| `JWT_EXPIRES_IN` | `24h` | Token expiry |
| `NODE_ENV` | `development` | Set to `production` for deploy |
| `DB_PATH` | auto | Custom SQLite file path |

## Deploy to Railway

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set environment variables (see above)
4. Set networking port to **3000**
5. Generate domain

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account + org |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/verify` | Verify JWT |
| POST | `/api/auth/forgot-password` | Send reset OTP |
| POST | `/api/auth/verify-reset-otp` | Verify reset OTP |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/organizations` | List orgs (org-isolated) |
| GET | `/api/audits` | List audits |
| GET | `/api/incidents` | List incidents |
| GET | `/api/capa` | List CAPA items |
| GET | `/api/dashboard` | Dashboard stats |
| POST | `/api/invite` | Invite team member |
| GET | `/api/health` | Health check |

## License

MIT
