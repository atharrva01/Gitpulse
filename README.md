<div align="center">

<img src="https://img.shields.io/badge/Go-1.22-00ADD8?style=flat-square&logo=go&logoColor=white" />
<img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" />
<img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
<img src="https://img.shields.io/badge/Docker-Containerized-2496ED?style=flat-square&logo=docker&logoColor=white" />
<img src="https://img.shields.io/badge/Deployed-Render-46E3B7?style=flat-square&logo=render&logoColor=black" />

<br /><br />

```
 ██████╗ ██╗████████╗██████╗ ██╗   ██╗██╗     ███████╗███████╗
██╔════╝ ██║╚══██╔══╝██╔══██╗██║   ██║██║     ██╔════╝██╔════╝
██║  ███╗██║   ██║   ██████╔╝██║   ██║██║     ███████╗█████╗  
██║   ██║██║   ██║   ██╔═══╝ ██║   ██║██║     ╚════██║██╔══╝  
╚██████╔╝██║   ██║   ██║     ╚██████╔╝███████╗███████║███████╗
 ╚═════╝ ╚═╝   ╚═╝   ╚═╝      ╚═════╝ ╚══════╝╚══════╝╚══════╝
```

### **Your commits. Finally quantified.**

*GitHub activity → Impact Score · live streaks · shareable proof*

<br />

**[🚀 Live Demo](https://gitpulse-gsnu.onrender.com)** &nbsp;·&nbsp; **[📖 Docs](#-getting-started)** &nbsp;·&nbsp; **[🐛 Issues](https://github.com/atharrva01/Gitpulse/issues)**

<br />

![GitPulse Hero](https://img.shields.io/badge/Impact_Score-847-00C896?style=for-the-badge)
![Streak](https://img.shields.io/badge/Streak-47d_🔥-FF6B35?style=for-the-badge)
![PRs](https://img.shields.io/badge/PRs_Merged-312-7C3AED?style=for-the-badge)

</div>

---

## The problem with GitHub profiles

Your GitHub profile shows a green square for the day you renamed a variable and the same green square for the day you fixed a CVE. No weighting. No context. No way to show that 50 merged PRs across Kyverno, Hyperledger, and CNCF projects represent months of serious systems work — not just commit spam.

GitPulse fixes that. It pulls your real GitHub activity, runs it through a weighted Impact Score algorithm, and produces a dashboard and shareable profile that actually reflects what you've built.

---

## ✨ Features

| Feature | What it does |
|---|---|
| **Impact Score** | Weighted formula: `(PRs × 10) + (Reviews × 5) + (Issues × 3) + (Comments × 1) + (Streak × 2)`. A number that means something. |
| **Live Streak Tracking** | Counts every day you merged a PR or submitted a review. Calendar heatmap over 52 weeks. |
| **Cross-Repo Dashboard** | Aggregates contributions across all your public repos — not just one project. |
| **Public Profile Page** | `gitpulse.dev/u/{username}` — shareable, no login required to view. |
| **Repository Breakdown** | Per-repo stats: PR count, review count, lines contributed, first and most recent contribution. |
| **Review Latency Tracker** | Average time from PR open to your first review. A metric that shows you're a reliable reviewer, not just an author. |
| **GitHub OAuth** | One-click login. Read-only scope. We never touch your code. |
| **Zero-cost infra** | Built entirely on the free GitHub GraphQL API. No paid third-party services required. |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         GitPulse                            │
│                                                             │
│   ┌───────────────┐         ┌──────────────────────────┐   │
│   │  React + Vite │ ──────► │   Go (Fiber) REST API    │   │
│   │  TypeScript   │ ◄────── │                          │   │
│   │  (frontend/)  │  JSON   │   GitHub OAuth handler   │   │
│   └───────────────┘         │   Impact Score engine    │   │
│                             │   PR sync pipeline       │   │
│                             │   Streak calculator      │   │
│                             └──────────┬───────────────┘   │
│                                        │                    │
│                             ┌──────────▼───────────────┐   │
│                             │      PostgreSQL 15        │   │
│                             │  pull_requests · users   │   │
│                             │  reviews · sync_jobs     │   │
│                             └──────────────────────────┘   │
│                                        │                    │
│                             ┌──────────▼───────────────┐   │
│                             │   GitHub GraphQL API v4  │   │
│                             │   5,000 req/hr · free    │   │
│                             └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Stack breakdown:**

```
backend/    → Go 1.22 + Fiber · PostgreSQL · GitHub GraphQL API
frontend/   → React 18 + TypeScript + Vite · Recharts
infra/      → Docker + docker-compose · Deployed on Render
```

---

## 🚀 Getting Started

### Prerequisites

- Go 1.22+
- Node.js 20+
- PostgreSQL 15+
- A GitHub OAuth App ([create one here](https://github.com/settings/developers))

### 1. Clone the repo

```bash
git clone https://github.com/atharrva01/Gitpulse.git
cd Gitpulse
```

### 2. Configure environment

```bash
# backend/.env
cp backend/.env.example backend/.env
```

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_REDIRECT_URI=http://localhost:8080/auth/callback

# Database
DATABASE_URL=postgres://user:password@localhost:5432/gitpulse

# App
JWT_SECRET=your_jwt_secret
PORT=8080
FRONTEND_URL=http://localhost:5173
```

### 3. Run with Docker (recommended)

```bash
docker-compose up --build
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:8080`

### 4. Run manually

```bash
# Terminal 1 — backend
cd backend
go mod download
go run main.go

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

---

## 📁 Project Structure

```
Gitpulse/
├── backend/
│   ├── main.go              # Entry point, route registration
│   ├── handlers/            # HTTP handlers (auth, dashboard, profile)
│   ├── models/              # PostgreSQL models (User, PR, Review)
│   ├── services/            # GitHub API sync, Impact Score engine
│   ├── middleware/          # JWT auth, CORS
│   └── db/                  # Migrations, connection pool
│
├── frontend/
│   ├── src/
│   │   ├── pages/           # Dashboard, Profile, Landing
│   │   ├── components/      # ImpactScore, StreakCalendar, RepoCard
│   │   ├── hooks/           # useGitHubData, useStreak, useAuth
│   │   └── api/             # Typed fetch wrappers
│   └── vite.config.ts
│
├── Dockerfile
├── docker-compose.yml
└── .dockerignore
```

---

## 📊 The Impact Score

The score is fully transparent and versioned. No black box.

```
Impact Score = (PRs Merged  × 10)
             + (Reviews Given × 5)
             + (Issues Closed × 3)
             + (PR Comments   × 1)
             + (Current Streak × 2)

Max: 1000 · Updated: every 24 hours · Source: GitHub GraphQL API
```

Why weighted this way? Merging a PR takes more sustained effort than leaving a comment. Reviews are undervalued by every other tool, GitPulse gives them real weight. Streak multiplier rewards consistency over burst activity.

The formula lives in `backend/services/impact_score.go` and is open to community tuning.

---

## 🔌 API Reference

All endpoints return JSON. Protected routes require `Authorization: Bearer <jwt>`.

```
GET  /auth/github              → Redirect to GitHub OAuth
GET  /auth/callback            → OAuth callback, issues JWT

GET  /api/me                   → Full dashboard (protected)
GET  /api/me/streak            → Streak + heatmap data (protected)
GET  /api/me/repos             → Per-repo breakdown (protected)
GET  /api/me/wrapped/:year     → OSS Wrapped data (protected)

POST /api/sync                 → Trigger manual sync (protected)

GET  /api/u/:username          → Public profile (no auth)
GET  /api/u/:username/badge.svg → Dynamic README badge (no auth)

GET  /api/maintainer/repo/:owner/:name → Project health (protected)
POST /api/maintainer/repos     → Watch a repository (protected)
```

---

## 🌐 Deployment

GitPulse is deployed on [Render](https://render.com) (free tier).

**Backend:** Render Web Service , Go binary, auto-deploy on push to `main`  
**Database:** Render PostgreSQL , 1GB free  
**Frontend:** Vercel , static React build, CDN edge deployment

To deploy your own instance:

```bash
# Build the Docker image
docker build -t gitpulse .

# Or deploy to Render directly
# 1. Connect your fork to Render
# 2. Set environment variables in Render dashboard
# 3. Push to main — Render auto-deploys
```

---

## 🤝 Contributing

Contributions are welcome. GitPulse is built for the open source community, it should be shaped by it.

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/Gitpulse.git

# Create a feature branch
git checkout -b feat/your-feature

# Make your changes, then open a PR
# PR description should include: what changed, why, and how to test it
```

Check [open issues](https://github.com/atharrva01/Gitpulse/issues) for good first contributions. If you're adding a new metric or changing the Impact Score formula, open a discussion first.

---

## 🔒 Privacy

- GitPulse only requests **read-only** GitHub OAuth scopes (`read:user`, `public_repo`)
- We only fetch data that is **already public** on GitHub
- Access tokens are encrypted at rest
- No private repository data is ever accessed
- You can delete your account and all associated data at any time

---

## 📄 License

MIT - use it, fork it, build on it.

---

<div align="center">

Built with obsession by **[atharrva01](https://github.com/atharrva01)**  
50+ merged PRs across CNCF, Hyperledger, and Linux Foundation projects · and counting

*If GitPulse helped you prove your open source impact, star the repo.*  
⭐

</div>
