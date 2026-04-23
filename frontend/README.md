# GitPulse — Frontend

React + TypeScript + Vite frontend for [GitPulse](https://gitpulse.dev), the open-source contribution intelligence platform.

## Stack

- **React 18** + **TypeScript**
- **Vite** — dev server and bundler
- **TailwindCSS v4** — utility styling
- **React Query** — server state / data fetching
- **React Router v6** — client-side routing
- `html-to-image` — downloadable Wrapped card and badge PNG export

## Pages

| Route | Component | Notes |
|---|---|---|
| `/` | `Landing` | Public landing page |
| `/dashboard` | `Dashboard` | Impact score, streaks, stats (auth required) |
| `/repos` | `Repos` | Per-repo breakdown (auth required) |
| `/wrapped` | `Wrapped` | OSS Wrapped year-in-review (auth required) |
| `/maintainer` | `Maintainer` | Watched-repo dashboard (auth required) |
| `/settings` | `Settings` | Profile visibility, email digest, README badge |
| `/u/:login` | `PublicProfile` | Public profile page |
| `/u/:login/wrapped` | `PublicWrapped` | Shareable Wrapped card |
| `/auth/callback` | `AuthCallback` | GitHub OAuth callback handler |

## Dev setup

```bash
npm install
npm run dev        # starts on http://localhost:5173
```

The frontend proxies `/api` and `/auth` to the backend (see `vite.config.ts`).

## Environment

No env vars needed for local dev — the Vite proxy handles backend requests. In production the backend serves the built frontend as a SPA.

## Key components

- `BadgePopper` — confetti reveal modal shown once per user/year on Wrapped
- `BadgeCard` — downloadable impact badge card (PNG export)
- `AppCanvas` — subtle 3D canvas background rendered on all auth'd pages
- `Navbar` — sticky nav with desktop links and mobile hamburger menu
